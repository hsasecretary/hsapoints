// Redeeming an event code: turns a code a Member typed into an Attendance
// (docs/adr/0002-attendance-ledger-calculated-on-read.md). Takes the
// Firestore instance so tests can run it against the emulator.
import { arrayUnion, doc, increment, runTransaction, type Firestore } from 'firebase/firestore';
import { isHeldToCabinetRules } from './members';
import { eventType } from './rubric';
import { currentSemester } from './semester';

export type RedeemResult =
    | { ok: true }
    | { ok: false; reason: 'not-found' | 'already-redeemed' | 'not-active' | 'cabinet-only' };

export type RedeemOptions = {
    /** Local date as 'YYYY-MM-DD'; a code only works on its eventDate. */
    today: string;
    /** E-Board or a Web-team Tester previewing the Cabinet Member view. */
    viewingAsCabinet?: boolean;
};

export async function redeemCode(
    db: Firestore,
    email: string,
    typedCode: string,
    { today, viewingAsCabinet = false }: RedeemOptions,
): Promise<RedeemResult> {
    const codeId = typedCode.trim().toUpperCase();
    const codeRef = doc(db, 'codes', codeId);
    const attendanceRef = doc(db, 'attendances', `${email}__${codeId}`);
    const userRef = doc(db, 'users', email);

    return runTransaction(db, async (tx) => {
        const code = (await tx.get(codeRef)).data();
        if (!code) return { ok: false, reason: 'not-found' } as const;
        const member = (await tx.get(userRef)).data();
        // Codes redeemed before the ledger live only in eventCodes (some in
        // mixed case) until the migration backfills their Attendance.
        const redeemedBeforeLedger = (member.eventCodes ?? [])
            .some((redeemed: string) => String(redeemed).toUpperCase() === codeId);
        // Only a code with an Event Type has (or gets) an Attendance, so an
        // untyped one never touches `attendances`: redeeming today's codes
        // keeps working even if this ships before the new firestore.rules.
        const hasAttendance = Boolean(code.eventTypeId) && (await tx.get(attendanceRef)).exists();
        if (redeemedBeforeLedger || hasAttendance) {
            return { ok: false, reason: 'already-redeemed' } as const;
        }
        if (code.eventDate !== today) return { ok: false, reason: 'not-active' } as const;
        if (eventType(code.eventTypeId)?.cabinetOnly && !viewingAsCabinet && !isHeldToCabinetRules(member)) {
            return { ok: false, reason: 'cabinet-only' } as const;
        }
        // A code made before Event Types existed has no eventTypeId yet; the
        // migration (#77) types it and writes its Attendance from eventCodes.
        if (code.eventTypeId) {
            tx.set(attendanceRef, {
                email,
                eventTypeId: code.eventTypeId,
                eventDate: code.eventDate,
                source: 'code',
                codeId,
            });
        }
        tx.update(codeRef, { attendeeCount: increment(1), ateendecode: true });
        tx.update(userRef, legacyCounters(codeId, code));
        return { ok: true } as const;
    });
}

// Old codes.category values and the users/{email} counter each one fed.
const legacyCategoryFields: Record<string, string> = {
    'GBM': 'gbmPoints',
    'MLP Fall': 'mlpFallPoints',
    'MLP Spring': 'mlpSpringPoints',
    'OPA': 'opaPoints',
    'Programming': 'programmingPoints',
};

/**
 * The old stored counters the live dashboard still reads, bumped the way the
 * old EventCodeForm did. Temporary: the cut-over task (#78) deletes this.
 * A code made after the Event Codes page stops setting category/points/
 * semester counts its rubric VE Points under otherPoints.
 */
function legacyCounters(codeId: string, code: Record<string, any>) {
    const points: number = code.points ?? eventType(code.eventTypeId)?.vePoints ?? 0;
    const semester: string = code.semester ?? currentSemester(parseDate(code.eventDate));
    const categoryField = code.category === 'Cabinet'
        ? 'cabinetPoints'
        : legacyCategoryFields[code.category]
            ? legacyCategoryFields[code.category] + (code.voterEligible === false ? 'NVE' : 'VE')
            : 'otherPoints';
    return {
        eventCodes: arrayUnion(codeId),
        [semester]: increment(points),
        [categoryField]: increment(points),
    };
}

/** 'YYYY-MM-DD' as a local date (new Date('YYYY-MM-DD') would be UTC). */
function parseDate(isoDate: string): Date {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
}
