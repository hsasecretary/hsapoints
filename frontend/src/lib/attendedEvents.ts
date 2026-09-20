// Turning a member's `eventCodes` array into the events they attended.
//
// Both the member dashboard (PointsOverview) and the E-Board User Lookup used
// to do this by downloading the whole `codes` collection and filtering it in
// the browser, which costs one Firestore read per event code ever created —
// every dashboard load, growing every semester. Here we fetch only the codes
// the member actually redeemed.
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export type AttendedEvent = {
    code: string;
    event: string;
    category: string;
    points: number;
    semester: string;
    eventDate: string;
    voterEligible: boolean;
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
            const data = docSnap.data();
            events.push({
                code: docSnap.id.toUpperCase(),
                event: data.event,
                category: data.category,
                points: data.points,
                semester: data.semester,
                eventDate: data.eventDate,
                voterEligible: data.voterEligible,
                attended: true,
            });
        }
    }

    return events.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}

/** Voter-eligible points: the eligible events attended, plus uncategorized `otherPoints`. */
export function sumVoterEligiblePoints(events: AttendedEvent[], otherPoints: number): number {
    const fromEvents = events.reduce((sum, e) => (e.voterEligible ? sum + (e.points || 0) : sum), 0);
    return fromEvents + (otherPoints || 0);
}
