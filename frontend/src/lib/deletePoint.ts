// E-Board deleting a point from the User Lookup's points list. Two kinds of
// point have no other way out, so they are deleted here:
//  - an Entered Attendance (source 'eboard'): the doc E-Board's "Add an event"
//    writes. Every Attendance of the entry goes (a Tabling entry has one per
//    hour), and a coded entry gives its code its attendee back.
//  - an Adjustment E-Board added by hand (no Point Request behind it).
// A redeemed code is removed with removeCheckIn (lib/redeemCode.ts) and an
// approved Point Request, or an Adjustment one made, is revoked with
// revokeRequest (lib/requestReview.ts); the lookup picks which one by the
// row's source. Takes the Firestore instance so tests can run it against the
// emulator.
import { collection, doc, getDoc, getDocs, increment, query, runTransaction, where, writeBatch, type Firestore } from 'firebase/firestore';
import type { Adjustment } from './computeStanding';

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes an Entered Attendance, and the rest of its entry. Refuses anything
 * E-Board didn't enter: a code check-in or a Point Request's Attendance has
 * its own way to be taken back, which also tells the Member why.
 */
export async function deleteEnteredPoint(db: Firestore, attendanceId: string): Promise<DeleteResult> {
    const attendanceRef = doc(db, 'attendances', attendanceId);
    const snap = await getDoc(attendanceRef);
    const attendance = snap.data();
    if (!attendance) return { ok: false, error: 'That point is already gone. Refresh to see it.' };
    if (attendance.source !== 'eboard') return { ok: false, error: 'Only a point E-Board entered can be deleted here.' };

    // One entry can be several Attendances (a Tabling hour each).
    const refs = [attendanceRef];
    if (attendance.entryId) {
        const siblings = await getDocs(query(
            collection(db, 'attendances'),
            where('email', '==', attendance.email),
            where('entryId', '==', attendance.entryId),
        ));
        siblings.docs.forEach((sibling) => {
            if (sibling.id !== attendanceId && sibling.data().source === 'eboard') refs.push(sibling.ref);
        });
    }

    const batch = writeBatch(db);
    refs.forEach((ref) => batch.delete(ref));
    // A coded entry counted as one attendee of its code.
    if (attendance.codeId) {
        const codeRef = doc(db, 'codes', String(attendance.codeId).toUpperCase());
        if ((await getDoc(codeRef)).exists()) batch.update(codeRef, { attendeeCount: increment(-1) });
    }
    await batch.commit();
    return { ok: true };
}

/** What the lookup knows of an Adjustment row, to find it again in `users/{email}.adjustments`. */
export type AdjustmentMatch = { points: number; note: string; date: string };

function sameAdjustment(adjustment: Adjustment, match: AdjustmentMatch): boolean {
    return !adjustment.requestId
        && (adjustment.points || 0) === match.points
        && (adjustment.note ?? '') === match.note
        && (adjustment.date ?? '') === match.date;
}

/**
 * Deletes one Adjustment E-Board added by hand (not one a Point Request made:
 * revoke that request instead). Only the first of several identical ones goes.
 */
export async function deleteAdjustment(db: Firestore, email: string, match: AdjustmentMatch): Promise<DeleteResult> {
    const userRef = doc(db, 'users', email.toLowerCase());
    return runTransaction(db, async (tx) => {
        const adjustments = ((await tx.get(userRef)).data()?.adjustments ?? []) as Adjustment[];
        const index = adjustments.findIndex((adjustment) => sameAdjustment(adjustment, match));
        if (index < 0) return { ok: false, error: 'That adjustment is already gone. Refresh to see it.' } as const;
        tx.update(userRef, { adjustments: adjustments.filter((_, i) => i !== index) });
        return { ok: true } as const;
    });
}
