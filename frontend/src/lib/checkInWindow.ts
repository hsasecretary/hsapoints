// When a code takes check-ins. A code with a start time works from that time
// until three hours after it. A code without one (every code made before
// start times, and any made without picking one) works all day on its event
// date, as every code did before. Times are the device's local time, like
// every other date in the app. Pure, so it's tested without Firestore.
import { fromIsoDate } from './semester';

/** How long check-in stays open after a code's start time. */
export const CHECK_IN_HOURS = 3;

/**
 * The start times E-Board picks from: 6 AM to 12 AM, on the hour. A start
 * time is stored as the hour of the event date, so 12 AM is 24: the
 * midnight that ends the event date, not the one that starts it.
 */
export const START_HOURS: readonly number[] = Array.from({ length: 19 }, (_, i) => i + 6);

export type CheckInWindow = {
    opens: Date;
    closes: Date;
    /** No start time: open the whole event date. */
    allDay: boolean;
};

/** The code's fields this needs; `startHour` is missing on all-day codes. */
export type Timed = { eventDate: string; startHour?: number | null };

/** '6 AM', '12 PM', '11 PM', '12 AM'. */
export function startHourLabel(hour: number): string {
    const suffix = hour < 12 || hour === 24 ? 'AM' : 'PM';
    return `${hour % 12 || 12} ${suffix}`;
}

/** A code's check-in hours as E-Board's forms show them: 'All day' or '7 PM to 10 PM'. */
export function checkInHoursLabel(startHour?: number | null): string {
    if (!isStartHour(startHour)) return 'All day';
    return `${startHourLabel(startHour)} to ${startHourLabel((startHour + CHECK_IN_HOURS) % 24 || 24)}`;
}

/** Whether a stored start time is one E-Board can pick. */
export function isStartHour(hour: unknown): hour is number {
    return typeof hour === 'number' && START_HOURS.includes(hour);
}

export function checkInWindow({ eventDate, startHour }: Timed): CheckInWindow {
    const day = fromIsoDate(eventDate);
    // Through the Date constructor, so hour 24 and a window past midnight
    // roll into the next day, and a DST change keeps local wall-clock hours.
    const at = (hour: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
    if (!isStartHour(startHour)) return { opens: at(0), closes: at(24), allDay: true };
    return { opens: at(startHour), closes: at(startHour + CHECK_IN_HOURS), allDay: false };
}

/** Whether `now` falls inside the code's window: from its opening up to (not at) its closing. */
export function checkInState(code: Timed, now: Date): 'open' | 'not-open' | 'closed' {
    const { opens, closes } = checkInWindow(code);
    if (now < opens) return 'not-open';
    if (now >= closes) return 'closed';
    return 'open';
}

/** '7 PM': a window's opening or closing (always on the hour) as the code box says it. */
export function clockLabel(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric' });
}
