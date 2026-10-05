// E-Board adding an event to a Member from the User Lookup: an Entered
// Attendance (see CONTEXT.md). It counts exactly like a redeemed code, so it
// is an attendances doc with `source: 'eboard'`, written under the same IDs
// the other sources use (docs/adr/0002-attendance-ledger-calculated-on-read.md).
// Takes the Firestore instance so tests can run it against the emulator.
import { doc, increment, runTransaction, type Firestore } from 'firebase/firestore';
import type { Attendance, Code, Member } from './computeStanding';
import { isHeldToCabinetRules } from './members';
import { eventType } from './rubric';
import { academicYear } from './semester';

/** An event with a code, or one with none (given by name, date and Event Type). */
export type EntryInput =
    | { codeId: string; note?: string }
    | { name: string; date: string; eventTypeId: string; /** Tabling only. */ hours?: number; note?: string };

export type EntryContext = {
    /** The signed-in E-Board member. */
    by: string;
    /** Local date as 'YYYY-MM-DD'. */
    today: string;
    /** Ties a code-less event's Attendances together; random unless a test fixes it. */
    entryId?: string;
};

export type EnterResult = { ok: true } | { ok: false; error: string };

export type PlannedEntry = { ok: true; attendances: (Attendance & { email: string })[] } | { ok: false; error: string };

/** A short random ID, enough to keep two code-less entries for one Member apart. */
function newEntryId(): string {
    return `eb-${Math.random().toString(36).slice(2, 10)}`;
}

/** Why `date` can't be entered, or null: not in the future, and in the school year the Lookup shows. */
function dateProblem(date: string, today: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Pick the date of the event.';
    if (date > today) return "That event hasn't happened yet.";
    const { start, end } = academicYear(today);
    if (date < start || date > end) return 'That date is outside this school year.';
    return null;
}

/**
 * The Attendances an entry writes, with their IDs: `{email}__{CODE}` for a
 * coded event (the doc redeeming it writes, so the two can't double count),
 * else `{email}__req-{entryId}`, and one `...-h{n}` per Tabling hour. `code`
 * is the input's code doc, or null if it has none or the code is gone.
 */
export function planEntry(email: string, member: Member, input: EntryInput, code: Code | null, { by, today, entryId }: EntryContext): PlannedEntry {
    const memberEmail = email.toLowerCase();
    const note = input.note?.trim();
    const audit = { source: 'eboard' as const, enteredBy: by, enteredOn: today, ...(note ? { note } : {}) };

    if ('codeId' in input) {
        if (!code) return { ok: false, error: `${input.codeId.toUpperCase()} is no longer a code.` };
        const type = eventType(code.eventTypeId ?? '');
        if (!type) return { ok: false, error: 'This code has no Event Type yet. Give it one on Event Codes first.' };
        if (type.cabinetOnly && !isHeldToCabinetRules(member)) return { ok: false, error: `${type.label} is Cabinet-only, and this Member isn't a Cabinet Member.` };
        const problem = dateProblem(code.eventDate, today);
        if (problem) return { ok: false, error: problem };
        return {
            ok: true,
            attendances: [{ id: `${memberEmail}__${code.id}`, email: memberEmail, eventTypeId: type.id, eventDate: code.eventDate, codeId: code.id, ...audit }],
        };
    }

    const name = input.name.trim();
    if (!name) return { ok: false, error: 'Give the event a name.' };
    const type = eventType(input.eventTypeId);
    if (!type) return { ok: false, error: 'Pick the Event Type.' };
    if (type.cabinetOnly && !isHeldToCabinetRules(member)) return { ok: false, error: `${type.label} is Cabinet-only, and this Member isn't a Cabinet Member.` };
    const problem = dateProblem(input.date, today);
    if (problem) return { ok: false, error: problem };
    const count = type.perHour ? Math.floor(input.hours ?? 0) : 1;
    if (!(count >= 1)) return { ok: false, error: 'Enter how many hours (a whole number, at least 1).' };

    const id = entryId ?? newEntryId();
    return {
        ok: true,
        attendances: Array.from({ length: count }, (_, i) => ({
            id: `${memberEmail}__req-${id}${count > 1 ? `-h${i + 1}` : ''}`,
            email: memberEmail,
            eventTypeId: type.id,
            eventDate: input.date,
            eventName: name,
            entryId: id,
            ...audit,
        })),
    };
}

/**
 * Enters an event for a Member, in one transaction. A coded entry is refused
 * when the Member already has that code (as an Attendance, or redeemed before
 * the ledger), so nothing double counts; a Removed Check-in for it stays on
 * the Member as it was.
 */
export async function enterAttendance(db: Firestore, email: string, input: EntryInput, context: EntryContext): Promise<EnterResult> {
    const memberEmail = email.toLowerCase();
    const userRef = doc(db, 'users', memberEmail);
    const codeId = 'codeId' in input ? input.codeId.trim().toUpperCase() : null;
    const codeRef = codeId ? doc(db, 'codes', codeId) : null;

    return runTransaction(db, async (tx) => {
        const member = ((await tx.get(userRef)).data() ?? {}) as Member & { eventCodes?: string[] };
        const codeData = codeRef && (await tx.get(codeRef)).data();
        const code = codeData ? ({ id: codeId, ...codeData } as Code) : null;

        const planned = planEntry(memberEmail, member, codeId ? { ...input, codeId } : input, code, context);
        if (!planned.ok) return planned;

        const refs = planned.attendances.map((attendance) => doc(db, 'attendances', attendance.id));
        const exists = await Promise.all(refs.map(async (ref) => (await tx.get(ref)).exists()));
        const redeemedBeforeLedger = codeId && (member.eventCodes ?? []).some((redeemed) => String(redeemed).toUpperCase() === codeId);
        if (redeemedBeforeLedger || exists.some(Boolean)) {
            return { ok: false, error: 'This Member already has that event.' } as const;
        }

        planned.attendances.forEach(({ id, ...data }, i) => tx.set(refs[i], data));
        if (codeRef) tx.update(codeRef, { attendeeCount: increment(1) });
        return { ok: true } as const;
    });
}
