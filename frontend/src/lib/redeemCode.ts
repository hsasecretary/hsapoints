// Redeeming an event code: turns a code a Member typed into an Attendance
// (docs/adr/0002-attendance-ledger-calculated-on-read.md); and E-Board
// removing one, a Removed Check-in (see CONTEXT.md). Takes the
// Firestore instance so tests can run it against the emulator.
import { doc, increment, runTransaction, type Firestore, type Transaction } from 'firebase/firestore';
import type { Code } from './computeStanding';
import { isHeldToCabinetRules } from './members';
import { eventType } from './rubric';

type Refusal = { ok: false; reason: 'not-found' | 'already-redeemed' | 'removed' | 'not-active' | 'cabinet-only' };

export type RedeemResult = { ok: true } | Refusal;

export type LookupResult = { ok: true; code: Code } | Refusal;

export type RedeemOptions = {
    /** Local date as 'YYYY-MM-DD'; a code only works on its eventDate. */
    today: string;
    /** E-Board or a Web-team Tester previewing the Cabinet Member view. */
    viewingAsCabinet?: boolean;
};

function refs(db: Firestore, email: string, typedCode: string) {
    // Member docs and Attendance IDs are keyed by the lowercase email, which
    // is also what firestore.rules compares against.
    const memberEmail = email.toLowerCase();
    const codeId = typedCode.trim().toUpperCase();
    return {
        memberEmail,
        codeId,
        codeRef: doc(db, 'codes', codeId),
        attendanceRef: doc(db, 'attendances', `${memberEmail}__${codeId}`),
        userRef: doc(db, 'users', memberEmail),
    };
}

/** The code, if the Member may redeem it today; else why not. Reads only. */
async function checkRedeemable(
    tx: Transaction,
    { codeId, codeRef, attendanceRef, userRef }: ReturnType<typeof refs>,
    { today, viewingAsCabinet = false }: RedeemOptions,
): Promise<LookupResult> {
    const code = (await tx.get(codeRef)).data();
    if (!code) return { ok: false, reason: 'not-found' };
    const member = (await tx.get(userRef)).data();
    // Codes redeemed before the ledger live only in eventCodes (some in
    // mixed case) until the migration backfills their Attendance.
    const redeemedBeforeLedger = (member.eventCodes ?? [])
        .some((redeemed: string) => String(redeemed).toUpperCase() === codeId);
    // Only a code with an Event Type has (or gets) an Attendance, so an
    // untyped one never touches `attendances`: redeeming today's codes
    // keeps working even if this ships before the new firestore.rules.
    const hasAttendance = Boolean(code.eventTypeId) && (await tx.get(attendanceRef)).exists();
    if (redeemedBeforeLedger || hasAttendance) return { ok: false, reason: 'already-redeemed' };
    if (member.removedCheckIns?.[codeId]) return { ok: false, reason: 'removed' };
    if (code.eventDate !== today) return { ok: false, reason: 'not-active' };
    if (eventType(code.eventTypeId)?.cabinetOnly && !viewingAsCabinet && !isHeldToCabinetRules(member)) {
        return { ok: false, reason: 'cabinet-only' };
    }
    return { ok: true, code: { id: codeId, eventTypeId: code.eventTypeId, eventDate: code.eventDate, event: code.event } };
}

/**
 * The code box's first step when the Member may owe a Missed Event: the
 * code, refused exactly as redeeming it would be, so the Make-up pick is
 * only asked for a code that will work.
 */
export async function lookupCode(db: Firestore, email: string, typedCode: string, options: RedeemOptions): Promise<LookupResult> {
    const docRefs = refs(db, email, typedCode);
    return runTransaction(db, (tx) => checkRedeemable(tx, docRefs, options));
}

/**
 * Redeems a code: writes its Attendance and bumps its check-in count.
 * `makeupFor` is the Missed Event (a codeId) the Member picked for it to
 * make up, kept on the Attendance; it's final for the Member.
 */
export async function redeemCode(
    db: Firestore,
    email: string,
    typedCode: string,
    options: RedeemOptions & { makeupFor?: string | null },
): Promise<RedeemResult> {
    const docRefs = refs(db, email, typedCode);
    const makeupFor = options.makeupFor?.trim().toUpperCase();

    return runTransaction(db, async (tx) => {
        const checked = await checkRedeemable(tx, docRefs, options);
        if (checked.ok === false) return checked;
        const { code } = checked;
        // A code made before Event Types existed has no eventTypeId yet; the
        // migration (#77) types it and writes its Attendance from eventCodes.
        // Nothing writes the old point counters or eventCodes any more (#78).
        if (code.eventTypeId) {
            tx.set(docRefs.attendanceRef, {
                email: docRefs.memberEmail,
                eventTypeId: code.eventTypeId,
                eventDate: code.eventDate,
                source: 'code',
                codeId: docRefs.codeId,
                ...(makeupFor ? { makeupFor } : {}),
            });
        }
        tx.update(docRefs.codeRef, { attendeeCount: increment(1) });
        return { ok: true } as const;
    });
}

export type RemoveResult = { ok: true } | { ok: false; error: string };

/**
 * E-Board takes away a check-in the Member made with a code, e.g. one used
 * without attending: deletes its Attendance, so the Member is treated as
 * never having attended, and records why on `removedCheckIns`, which also
 * stops them redeeming the code again. A check-in a Point Request made is
 * revoked with its request instead.
 */
export async function removeCheckIn(
    db: Firestore,
    attendanceId: string,
    { reason, reviewer, today }: { reason: string; reviewer: string; today: string },
): Promise<RemoveResult> {
    const note = reason.trim();
    if (!note) return { ok: false, error: 'Say why, so the Member knows.' };
    const attendanceRef = doc(db, 'attendances', attendanceId);

    return runTransaction(db, async (tx) => {
        const attendance = (await tx.get(attendanceRef)).data();
        if (attendance?.source !== 'code' || !attendance.codeId) {
            return { ok: false, error: 'There is no check-in with this code to remove.' } as const;
        }
        const codeId: string = attendance.codeId;
        const codeRef = doc(db, 'codes', codeId);
        const code = (await tx.get(codeRef)).data();
        tx.delete(attendanceRef);
        if (code) tx.update(codeRef, { attendeeCount: increment(-1) });
        // Keyed upper-cased, as redeeming and firestore.rules look it up.
        tx.update(doc(db, 'users', attendance.email), {
            [`removedCheckIns.${codeId.toUpperCase()}`]: {
                event: code?.event ?? codeId,
                eventTypeId: attendance.eventTypeId,
                eventDate: attendance.eventDate,
                reason: note,
                by: reviewer,
                on: today,
            },
        });
        return { ok: true } as const;
    });
}
