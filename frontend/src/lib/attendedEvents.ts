// Turning a member's `eventCodes` array into the events they attended.
//
// Both the member dashboard (PointsOverview) and the E-Board User Lookup used
// to do this by downloading the whole `codes` collection and filtering it in
// the browser, which costs one Firestore read per event code ever created —
// every dashboard load, growing every semester. Here we fetch only the codes
// the member actually redeemed.
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { eventType } from './rubric';
import { currentSemester, fromIsoDate } from './semester';

export type AttendedEvent = {
    code: string;
    event: string;
    category: string;
    points: number;
    semester: string;
    eventDate: string;
    voterEligible: boolean;
    /**
     * A code with only an Event Type: redeeming it added its VE Points to
     * `otherPoints` (redeemCode's legacyCounters), so they're shown here but
     * not summed again.
     */
    inOtherPoints: boolean;
    attended: true;
};

/** Firestore's cap on values in an `in` filter. */
const IN_FILTER_LIMIT = 30;

/**
 * Load the `codes` documents for the codes a member redeemed, newest first.
 *
 * Codes are stored uppercase (EventCodeForm uppercases before writing), and
 * doc IDs are the code, so we can look them up by document ID. Codes with no
 * matching document (a deleted event) are simply left out, the same as before.
 */
export async function fetchAttendedEvents(eventCodes: string[] | undefined): Promise<AttendedEvent[]> {
    // Uppercase to match the doc IDs: EventCodeForm's own duplicate check does
    // the same, so a few older rows may have been stored in mixed case.
    const ids = [...new Set((eventCodes || []).filter(Boolean).map((c) => String(c).toUpperCase()))];
    if (ids.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += IN_FILTER_LIMIT) {
        chunks.push(ids.slice(i, i + IN_FILTER_LIMIT));
    }

    const snapshots = await Promise.all(
        chunks.map((chunk) => getDocs(query(collection(db, 'codes'), where(documentId(), 'in', chunk))))
    );

    const events: AttendedEvent[] = [];
    for (const snapshot of snapshots) {
        for (const docSnap of snapshot.docs) {
            events.push(attendedEventFromCode(docSnap.id, docSnap.data()));
        }
    }

    return events.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}

/**
 * One `codes` doc as an attended event. Codes made on the rebuilt Event Codes
 * page (#70) store only an Event Type, so their points, category and Semester
 * come from the rubric and the date. Temporary: the cut-over (#78) replaces
 * this dashboard.
 */
export function attendedEventFromCode(codeId: string, data: Record<string, any>): AttendedEvent {
    const type = data.points === undefined ? eventType(data.eventTypeId ?? '') : undefined;
    return {
        code: codeId.toUpperCase(),
        event: data.event,
        category: type ? type.label : data.category,
        points: type ? type.vePoints : data.points,
        semester: type ? currentSemester(fromIsoDate(data.eventDate)) : data.semester,
        eventDate: data.eventDate,
        voterEligible: type ? type.vePoints > 0 : data.voterEligible,
        inOtherPoints: Boolean(type),
        attended: true,
    };
}

/** Voter-eligible points: the eligible events attended, plus uncategorized `otherPoints`. */
export function sumVoterEligiblePoints(events: AttendedEvent[], otherPoints: number): number {
    const fromEvents = events.reduce(
        (sum, e) => (e.voterEligible && !e.inOtherPoints ? sum + (e.points || 0) : sum),
        0,
    );
    return fromEvents + (otherPoints || 0);
}
