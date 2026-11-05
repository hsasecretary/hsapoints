// The Firestore side of Excuse Requests (see lib/excuseRequests.ts for the
// pure side): a Member filing and withdrawing, and E-Board approving or
// denying. Approving writes the Excused Absence through the existing Excuse
// Absence logic (lib/excuseAbsence.ts). The functions take the Firestore
// instance so tests can run them against the emulator.
import { deleteDoc, doc, runTransaction, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { applyAbsenceAction, type AbsenceFacts, type AbsenceMember } from './excuseAbsence';
import type { ExcuseRequest, ExcuseRequestStatus, NewExcuseRequest } from './excuseRequests';

export const DENIAL_REASON_REQUIRED = 'Say why, so the Member knows.';

export type ReviewResult = { ok: true } | { ok: false; error: string };

/** A Firestore Timestamp (anything with toDate) as an ISO string, or '' before the server has stamped it. */
function isoOf(stamp: unknown): string {
    const date = (stamp as { toDate?: () => Date } | null | undefined)?.toDate?.();
    return date ? date.toISOString() : '';
}

/** An excuseRequests doc's data as an ExcuseRequest, with its timestamps as ISO strings. */
export function toExcuseRequest(id: string, data: Record<string, unknown>): ExcuseRequest {
    return {
        id,
        email: String(data.email ?? ''),
        codeId: String(data.codeId ?? ''),
        eventName: String(data.eventName ?? ''),
        eventTypeId: String(data.eventTypeId ?? ''),
        eventDate: String(data.eventDate ?? ''),
        reason: String(data.reason ?? ''),
        filedAt: isoOf(data.filedAt),
        status: (data.status as ExcuseRequestStatus) ?? 'pending',
        reviewedBy: (data.reviewedBy as string | null | undefined) ?? null,
        reviewedAt: isoOf(data.reviewedAt) || null,
        reviewNotes: String(data.reviewNotes ?? ''),
    };
}

export type Approval = { ok: true; memberPatch: AbsenceFacts | null } | { ok: false; error: string };

/**
 * What approving a request writes to the Member: the excusal, through the
 * existing Excuse Absence logic, with the Member's reason as its note. When
 * E-Board already excused that event by hand there is nothing to write, and
 * the request is still closed as approved.
 */
export function approvalFor(
    member: AbsenceMember,
    request: Pick<ExcuseRequest, 'codeId' | 'reason'>,
    by: string,
    at: string,
): Approval {
    const key = request.codeId.toUpperCase();
    if ((member.excusals ?? []).some((excusal) => excusal.codeId.toUpperCase() === key)) {
        return { ok: true, memberPatch: null };
    }
    const applied = applyAbsenceAction(member, { kind: 'excuse', codeId: request.codeId, note: request.reason }, by, at);
    if (applied.ok === false) return { ok: false, error: applied.error };
    return { ok: true, memberPatch: applied.patch };
}

/**
 * Saves a Member's requests together, all or nothing. The doc IDs are
 * deterministic and firestore.rules lets a Member only create, so filing an
 * event twice makes the whole batch fail rather than overwrite the first.
 * Build the requests with `filedAt: serverTimestamp()`.
 */
export async function fileExcuseRequests(db: Firestore, requests: NewExcuseRequest[]): Promise<void> {
    const batch = writeBatch(db);
    for (const request of requests) batch.set(doc(db, 'excuseRequests', request.id), request.data);
    await batch.commit();
}

/** A Member takes back a request. firestore.rules allows it only while the request is pending. */
export async function withdrawExcuseRequest(db: Firestore, id: string): Promise<void> {
    await deleteDoc(doc(db, 'excuseRequests', id));
}

/**
 * E-Board approves a request: marks it approved and writes the excusal onto
 * the Member in one transaction, so the two can't disagree, and a request the
 * Member withdrew meanwhile is never approved.
 */
export async function approveExcuseRequest(
    db: Firestore,
    id: string,
    { by, note = '' }: { by: string; note?: string },
): Promise<ReviewResult> {
    const requestRef = doc(db, 'excuseRequests', id);
    return runTransaction(db, async (tx) => {
        const requestSnap = await tx.get(requestRef);
        if (!requestSnap.exists()) return { ok: false, error: 'The Member withdrew this request.' } as const;
        const request = requestSnap.data();
        if (request.status !== 'pending') return { ok: false, error: 'This request was already decided. Refresh to see it.' } as const;

        const userRef = doc(db, 'users', request.email);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) return { ok: false, error: 'That member no longer exists.' } as const;

        const approval = approvalFor(userSnap.data() as AbsenceMember, { codeId: request.codeId, reason: request.reason }, by, new Date().toISOString());
        if (approval.ok === false) return approval;
        if (approval.memberPatch) tx.update(userRef, approval.memberPatch);
        tx.update(requestRef, { status: 'approved', reviewedBy: by, reviewedAt: serverTimestamp(), reviewNotes: note.trim() });
        return { ok: true } as const;
    });
}

/**
 * E-Board denies a request, with the reason the Member will see. Touches no
 * standing: a denial writes the request only.
 */
export async function denyExcuseRequest(db: Firestore, id: string, { by, reason }: { by: string; reason: string }): Promise<ReviewResult> {
    const reviewNotes = reason.trim();
    if (!reviewNotes) return { ok: false, error: DENIAL_REASON_REQUIRED };
    const requestRef = doc(db, 'excuseRequests', id);
    return runTransaction(db, async (tx) => {
        const requestSnap = await tx.get(requestRef);
        if (!requestSnap.exists()) return { ok: false, error: 'The Member withdrew this request.' } as const;
        if (requestSnap.data().status !== 'pending') return { ok: false, error: 'This request was already decided. Refresh to see it.' } as const;
        tx.update(requestRef, { status: 'denied', reviewedBy: by, reviewedAt: serverTimestamp(), reviewNotes });
        return { ok: true } as const;
    });
}
