// The Closet's open hours, Due Date and Overdue logic (see CONTEXT.md
// "Closet"). Pure and free of Firestore imports, so it can be tested without
// the emulator; every function here takes closure dates and `now` as
// arguments rather than reading the real clock itself.
import { toIsoDate, fromIsoDate } from './semester';

type DayHours = { openHour: number; closeHour: number };

/**
 * Weekly open hours, keyed by Date#getDay() (0 = Sunday). A day with no
 * entry is closed all day (Saturday).
 */
const WEEKLY_HOURS: Partial<Record<number, DayHours>> = {
    0: { openHour: 12, closeHour: 17 }, // Sunday
    1: { openHour: 8, closeHour: 20 }, // Monday
    2: { openHour: 8, closeHour: 20 }, // Tuesday
    3: { openHour: 8, closeHour: 20 }, // Wednesday
    4: { openHour: 8, closeHour: 20 }, // Thursday
    5: { openHour: 8, closeHour: 17 }, // Friday
};

/** Whether the Closet is open at `now`, by its weekly hours and any closure dates ('YYYY-MM-DD'). */
export function isClosetOpen(now: Date, closureDates: readonly string[] = []): boolean {
    if (closureDates.includes(toIsoDate(now))) return false;
    const hours = WEEKLY_HOURS[now.getDay()];
    if (!hours) return false;
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    return minutesNow >= hours.openHour * 60 && minutesNow < hours.closeHour * 60;
}

/**
 * The Due Date for a Checkout made on `checkoutDate`: closing time of the
 * second business day (Mon-Fri) after it. Sunday never counts as a business
 * day, so a Sunday Checkout is due the same as a Friday one. A closure date
 * doesn't count either, exactly like a weekend, so the Due Date rolls
 * forward to the next open business day instead.
 */
export function closetDueDate(checkoutDate: string, closureDates: readonly string[] = []): Date {
    let businessDaysFound = 0;
    let day = fromIsoDate(checkoutDate);
    let dueDay = day;
    while (businessDaysFound < 2) {
        day = addDays(day, 1);
        const isBusinessWeekday = day.getDay() >= 1 && day.getDay() <= 5;
        if (isBusinessWeekday && !closureDates.includes(toIsoDate(day))) {
            businessDaysFound += 1;
            dueDay = day;
        }
    }
    const hours = WEEKLY_HOURS[dueDay.getDay()];
    return new Date(dueDay.getFullYear(), dueDay.getMonth(), dueDay.getDate(), hours.closeHour, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** A Closet Checkout, as needed to tell whether it's Overdue. */
export type ClosetCheckout = {
    /** 'YYYY-MM-DD', local: the day it went out. */
    checkoutDate: string;
    /** Set once it comes back; an open Checkout has none. */
    returnedAt?: string | null;
};

/** An open Checkout is Overdue once `now` passes the Closet's close on its Due Date; a returned one never is. */
export function isOverdue(checkout: ClosetCheckout, closureDates: readonly string[], now: Date): boolean {
    if (checkout.returnedAt) return false;
    return now.getTime() > closetDueDate(checkout.checkoutDate, closureDates).getTime();
}
