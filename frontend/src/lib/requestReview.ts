// E-Board's Point Request review (#72): confirming a request's Event Type,
// attaching it to a code, and the Attendance approving it writes
// (docs/adr/0002-attendance-ledger-calculated-on-read.md). Every Tabling hour
// and CRASH event arrives here, since neither gets a code. The Firestore
// functions take the instance so tests can run them against the emulator.
import {
    arrayUnion, doc, increment, runTransaction, serverTimestamp, type DocumentReference, type Firestore,
} from 'firebase/firestore';
import type { Attendance, Code, Member } from './computeStanding';
import { isHeldToCabinetRules } from './members';
import { standingChange, type RequestPreview } from './pointRequests';
import { eventType } from './rubric';
import { academicYear, currentSemester, fromIsoDate, semesterOf } from './semester';

/** The pointRequests/{id} fields review reads, with its doc ID as `id`.
 *  Requests from before Event Types (#71) have none of the optional ones. */
export type ReviewRequest = {
    id: string;
    userEmail: string;
    codeId?: string | null;
    typeChoiceId?: string | null;
    eventTypeId?: string | null;
    /** 'YYYY-MM-DD'. */
    date: string;
    hours?: number;
    makeupFor?: (string | null)[];
};

/** What E-Board settles before approving. */
export type ReviewDecision = {
    /** Required: pre-filled from the Member's pick, '' until confirmed. */
    eventTypeId: string;
    /** The Member's code, or one E-Board attached; its Event Type and date win. */
    codeId: string | null;
    /** One per Attendance: the Missed Event (codeId) to make up, or null for "Pick for me". */
    makeupFor: (string | null)[];
};

/** An attendances/{id} doc approval would write, with its ID. */
export type NewAttendance = { id: string; data: Omit<Attendance, 'id'> & { email: string } };

/** How many Attendances approving a request makes: one per Tabling hour, else one. */
export function attendanceCountFor(request: ReviewRequest, eventTypeId: string): number {
    return eventType(eventTypeId)?.perHour ? Math.max(1, Math.floor(request.hours ?? 1) || 1) : 1;
}

/** The review form as it opens: the Member's own picks. */
export function initialDecision(request: ReviewRequest): ReviewDecision {
    const eventTypeId = eventType(request.eventTypeId ?? '') ? request.eventTypeId : '';
    return {
        eventTypeId,
        codeId: request.codeId ?? null,
        makeupFor: Array.from({ length: attendanceCountFor(request, eventTypeId) }, (_, i) => request.makeupFor?.[i] ?? null),
    };
}

/**
 * A code-less request may be attached to a code of its confirmed Event Type
 * from the same Semester, even one created after the request.
 */
export function attachableCodes(request: ReviewRequest, eventTypeId: string, codes: Code[]): Code[] {
    if (request.codeId || !eventType(eventTypeId)?.codeable) return [];
    const { start, end } = academicYear(request.date);
    const semester = semesterOf(request.date);
    return codes
        .filter((code) => code.eventTypeId === eventTypeId
            && code.eventDate >= start && code.eventDate <= end
            && semesterOf(code.eventDate) === semester)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.id.localeCompare(b.id));
}

export type Planned = { ok: true; attendances: NewAttendance[] } | { ok: false; error: string };

/**
 * The Attendance approving a request writes, with the IDs ADR-0002 fixes:
 * `{email}__{CODE}` for a coded event (the same doc redeeming it writes, so
 * the two can't double count), `{email}__req-{id}` otherwise, and one
 * `{email}__req-{id}-h{n}` per Tabling hour. `code` is the decision's code
 * doc, or null if it has none or the code is gone.
 */
export function approvalAttendances(request: ReviewRequest, code: Code | null, decision: ReviewDecision, member: Member): Planned {
    if (decision.codeId && !code) return { ok: false, error: `${decision.codeId} is no longer a code.` };
    const type = eventType(code?.eventTypeId ?? decision.eventTypeId);
    if (!type) return { ok: false, error: 'Confirm the Event Type.' };
    if (type.cabinetOnly && !isHeldToCabinetRules(member)) return { ok: false, error: `${type.label} is Cabinet-only.` };

    const email = request.userEmail.toLowerCase();
    const count = code ? 1 : attendanceCountFor(request, type.id);
    const attendances = Array.from({ length: count }, (_, i): NewAttendance => {
        const makeupFor = decision.makeupFor[i];
        return {
            id: code ? `${email}__${code.id}` : `${email}__req-${request.id}${count > 1 ? `-h${i + 1}` : ''}`,
            data: {
                email,
                eventTypeId: type.id,
                eventDate: code?.eventDate ?? request.date,
                source: 'request',
                requestId: request.id,
                ...(code ? { codeId: code.id } : {}),
                ...(makeupFor ? { makeupFor } : {}),
            },
        };
    });
    return { ok: true, attendances };
}

export type ApprovalPreview = Omit<RequestPreview, 'attendances'> & {
    /** One per Attendance approval would write, in hour order. */
    attendances: { id: string; alreadyCounted: boolean; surplus: boolean; makeupFor: string | null }[];
};

/**
 * "If you approve it": the points it earns and the Missed Event each
 * Attendance would make up. An Attendance that already exists (the Member
 * redeemed that code) earns nothing. Null until the decision is valid.
 */
export function previewApproval(
    member: Member,
    attendances: Attendance[],
    codes: Code[],
    request: ReviewRequest,
    code: Code | null,
    decision: ReviewDecision,
    today: string,
): ApprovalPreview | null {
    const planned = approvalAttendances(request, code, decision, member);
    if (!planned.ok) return null;
    const existing = new Set(attendances.map((attendance) => attendance.id));
    const added = planned.attendances.filter((attendance) => !existing.has(attendance.id));
    const change = standingChange(member, attendances, codes, added.map(({ id, data }) => ({ id, ...data })), { today });
    return {
        ...change,
        attendances: planned.attendances.map(({ id }) => {
            const index = added.findIndex((attendance) => attendance.id === id);
            return index < 0
                ? { id, alreadyCounted: true, surplus: false, makeupFor: null }
                : { id, alreadyCounted: false, ...change.attendances[index] };
        }),
    };
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

const ALREADY_REVIEWED = { ok: false, error: 'Someone already reviewed this request. Refresh to see it.' } as const;

/**
 * Approves a request: writes its Attendance and marks it approved, in one
 * transaction. Only a pending request can be approved, and an Attendance
 * that already exists is left alone, so approving twice creates nothing.
 */
export async function approveRequest(db: Firestore, requestId: string, decision: ReviewDecision, reviewer: string): Promise<ReviewResult> {
    const requestRef = doc(db, 'pointRequests', requestId);
    return runTransaction(db, async (tx) => {
        const snap = await tx.get(requestRef);
        const request = { id: requestId, ...snap.data() } as ReviewRequest & { status?: string };
        if (request.status !== 'pending') return ALREADY_REVIEWED;
        const userRef = doc(db, 'users', request.userEmail.toLowerCase());
        const member = ((await tx.get(userRef)).data() ?? {}) as Member;
        const codeRef = decision.codeId ? doc(db, 'codes', decision.codeId) : null;
        const codeData = codeRef && (await tx.get(codeRef)).data();
        const code = codeData ? ({ id: decision.codeId, ...codeData } as Code) : null;

        const planned = approvalAttendances(request, code, decision, member);
        if (!planned.ok) return planned;
        const refs = planned.attendances.map((attendance) => doc(db, 'attendances', attendance.id));
        const exists = await Promise.all(refs.map(async (ref) => (await tx.get(ref)).exists()));
        const created = planned.attendances.filter((_, i) => !exists[i]);
        created.forEach((attendance) => tx.set(doc(db, 'attendances', attendance.id), attendance.data));

        const vePoints = eventType(planned.attendances[0].data.eventTypeId).vePoints;
        tx.update(requestRef, {
            status: 'approved',
            reviewedAt: serverTimestamp(),
            reviewedBy: reviewer,
            reviewNotes: '',
            eventTypeId: planned.attendances[0].data.eventTypeId,
            codeId: code?.id ?? null,
            makeupFor: planned.attendances.map((attendance) => attendance.data.makeupFor ?? null),
            attendanceIds: planned.attendances.map((attendance) => attendance.id),
            // What My Requests shows: the points it earned.
            pointsRequested: vePoints * created.length,
        });
        if (code && created.length) tx.update(codeRef, { attendeeCount: increment(1) });
        if (created.length) {
            tx.update(userRef, legacyCredit(request.date, vePoints * created.length, code ? code.id : null));
        }
        return { ok: true } as const;
    });
}

/** Denies a pending request, with the reason the Member will see. */
export async function denyRequest(db: Firestore, requestId: string, reason: string, reviewer: string): Promise<ReviewResult> {
    const note = reason.trim();
    if (!note) return { ok: false, error: 'Say why, so the Member knows.' };
    const requestRef = doc(db, 'pointRequests', requestId);
    return runTransaction(db, async (tx) => {
        if ((await tx.get(requestRef)).data()?.status !== 'pending') return ALREADY_REVIEWED;
        tx.update(requestRef, { status: 'denied', reviewedAt: serverTimestamp(), reviewedBy: reviewer, reviewNotes: note });
        return { ok: true } as const;
    });
}

export type AdjustmentForm = { points: number; note: string };

/**
 * Approves a request that fits no Event Type as an Adjustment: points and a
 * note on the Member's `adjustments`, which count toward VE Points and
 * write no Attendance.
 */
export async function adjustRequest(db: Firestore, requestId: string, form: AdjustmentForm, reviewer: string): Promise<ReviewResult> {
    const note = form.note.trim();
    if (!Number.isInteger(form.points) || form.points === 0) return { ok: false, error: 'Enter the points as a whole number.' };
    if (!note) return { ok: false, error: 'Add a note saying what the points are for.' };
    const requestRef = doc(db, 'pointRequests', requestId);
    return runTransaction(db, async (tx) => {
        const request = (await tx.get(requestRef)).data();
        if (request?.status !== 'pending') return ALREADY_REVIEWED;
        const userRef: DocumentReference = doc(db, 'users', String(request.userEmail).toLowerCase());
        tx.update(requestRef, {
            status: 'approved',
            reviewedAt: serverTimestamp(),
            reviewedBy: reviewer,
            reviewNotes: note,
            adjustment: { points: form.points, note },
            pointsRequested: form.points,
        });
        tx.update(userRef, {
            // requestId keeps two identical Adjustments from collapsing into one.
            adjustments: arrayUnion({ points: form.points, note, date: request.date, requestId }),
            ...legacyCredit(request.date, form.points, null),
        });
        return { ok: true } as const;
    });
}

/**
 * The old stored counters the live dashboard still reads, credited the way
 * the old review page did (under otherPoints), but to the event's Semester.
 * Temporary: the cut-over task (#78) deletes this.
 */
function legacyCredit(eventDate: string, points: number, codeId: string | null) {
    return {
        [currentSemester(fromIsoDate(eventDate))]: increment(points),
        otherPoints: increment(points),
        ...(codeId ? { eventCodes: arrayUnion(codeId) } : {}),
    };
}
