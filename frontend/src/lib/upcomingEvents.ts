// The Overview's "Coming up" list (part of #98): the events in the next week,
// from the codes the Overview already loads (useMemberStanding), so it costs
// no extra Firestore reads. An event is its code: title, date and Event Type
// all come from codes/{CODE}. The code itself never makes it into an
// UpcomingEvent, since it's what Members type to check in.
import type { Code } from './computeStanding';
import { eventType } from './rubric';
import { addDays, fromIsoDate } from './semester';

/** How far ahead the list looks: today through the same day next week. */
export const UPCOMING_DAYS = 7;
/** At most this many, soonest first. */
export const UPCOMING_LIMIT = 5;

export type UpcomingEvent = {
    /** For React lists; deliberately not the code. */
    key: string;
    title: string;
    /** 'YYYY-MM-DD'. */
    eventDate: string;
    /** "Today", "Tomorrow" or the weekday. */
    dayName: string;
    /** The Event Type's label, e.g. "GBM". */
    typeLabel: string;
};

/** "Today", "Tomorrow", or the weekday, e.g. "Thursday". */
export function dayName(eventDate: string, today: string): string {
    if (eventDate === today) return 'Today';
    if (eventDate === addDays(today, 1)) return 'Tomorrow';
    return fromIsoDate(eventDate).toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * The events from today through UPCOMING_DAYS ahead, soonest first, at most
 * UPCOMING_LIMIT. Cabinet-only events show only to someone held to the
 * Cabinet rules (`cabinetView`, which includes E-Board previewing the Cabinet
 * view). Codes from before Event Types have none and are left out: they're
 * all in the past.
 */
export function upcomingEvents(codes: Code[], { today, cabinetView }: { today: string; cabinetView: boolean }): UpcomingEvent[] {
    const last = addDays(today, UPCOMING_DAYS);
    return codes
        .flatMap((code) => {
            const type = code.eventTypeId ? eventType(code.eventTypeId) : undefined;
            if (!type || !code.eventDate || code.eventDate < today || code.eventDate > last) return [];
            if (type.cabinetOnly && !cabinetView) return [];
            return [{ title: code.event?.trim() || type.label, eventDate: code.eventDate, typeLabel: type.label }];
        })
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.title.localeCompare(b.title))
        .slice(0, UPCOMING_LIMIT)
        .map((event, i) => ({ key: `${event.eventDate}-${i}`, ...event, dayName: dayName(event.eventDate, today) }));
}
