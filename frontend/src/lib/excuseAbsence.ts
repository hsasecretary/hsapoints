// Excuse Absence (#73): what E-Board can do to a Cabinet Member's Missed
// Event, the facts that writes to users/{email}, and its effect before
// saving. The facts `excusals`, `strikeRemovals` and `missedEventOverrides`
// hold the current state; every change, undo included, is also appended to
// `absenceLog`, which is never edited (firestore.rules enforces it), so the
// history survives an undo. Strikes and Make-ups come only from
// computeStanding. The Firestore function takes the instance so tests can
// run it against the emulator.
import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import {
    AT_RISK_STRIKES, computeStanding, type Attendance, type Code, type Member, type MissedEvent, type Standing,
} from './computeStanding';
import { rubric } from './rubric';

export type AbsenceActionKind = 'excuse' | 'unexcuse' | 'remove-strike' | 'restore-strike' | 'close' | 'reopen';
export type AbsenceAction = { kind: AbsenceActionKind; codeId: string; note: string };

/** An `excusals` entry. */
export type Excusal = { codeId: string; note: string; by: string; at: string };
/** A `strikeRemovals` or `missedEventOverrides` entry. */
export type ReasonedEntry = { codeId: string; reason: string; by: string; at: string };

export type AbsenceLogKind = 'excused' | 'unexcused' | 'strike-removed' | 'strike-restored' | 'closed' | 'reopened';
export type AbsenceLogEntry = { kind: AbsenceLogKind; codeId: string; note: string; by: string; at: string };

/** The users/{email} fields Excuse Absence reads and writes. */
export type AbsenceFacts = {
    excusals: Excusal[];
    strikeRemovals: ReasonedEntry[];
    missedEventOverrides: ReasonedEntry[];
    absenceLog: AbsenceLogEntry[];
};
export type AbsenceMember = Partial<AbsenceFacts>;

export const ACTION_LABEL: Record<AbsenceActionKind, string> = {
    excuse: 'Mark excused',
    unexcuse: 'Undo excuse',
    'remove-strike': 'Remove Strike',
    'restore-strike': 'Restore Strike',
    close: 'Close without a Make-up',
    reopen: 'Reopen Missed Event',
};

export const LOG_TEXT: Record<AbsenceLogKind, string> = {
    excused: 'Marked excused',
    unexcused: 'Undid excuse',
    'strike-removed': 'Removed Strike',
    'strike-restored': 'Restored Strike',
    closed: 'Closed without a Make-up',
    reopened: 'Reopened Missed Event',
};

/** Actions that need a written reason before they can be saved. */
export const NEEDS_REASON: readonly AbsenceActionKind[] = ['remove-strike', 'close'];

const LOG_KIND: Record<AbsenceActionKind, AbsenceLogKind> = {
    excuse: 'excused',
    unexcuse: 'unexcused',
    'remove-strike': 'strike-removed',
    'restore-strike': 'strike-restored',
    close: 'closed',
    reopen: 'reopened',
};

/** Which actions make sense on a Missed Event right now. */
export function actionsFor(missed: MissedEvent): AbsenceActionKind[] {
    if (missed.overridden) return ['reopen'];
    const out: AbsenceActionKind[] = [];
    if (missed.excused) out.push('unexcuse');
    else {
        out.push('excuse');
        if (missed.strikeRemoved) out.push('restore-strike');
        else if (missed.strike) out.push('remove-strike');
    }
    out.push('close');
    return out;
}

export type Applied = { ok: true; patch: AbsenceFacts } | { ok: false; error: string };

/** Shown when a change that needs a reason has none. */
export const REASON_REQUIRED = "Write a reason. It's kept in the history.";

/**
 * The facts after `action`, plus its absenceLog entry. Excusing a miss
 * leaves any removed Strike on it in place, so undoing the excuse brings
 * back exactly what the History says. Refuses a change that no longer
 * applies (someone else already made it).
 */
export function applyAbsenceAction(member: AbsenceMember, action: AbsenceAction, by: string, at: string): Applied {
    const note = action.note.trim();
    if (NEEDS_REASON.includes(action.kind) && !note) return { ok: false, error: REASON_REQUIRED };

    const key = codeKey(action.codeId);
    const has = (list: { codeId: string }[]) => list.some((entry) => codeKey(entry.codeId) === key);
    const without = <T extends { codeId: string }>(list: T[]) => list.filter((entry) => codeKey(entry.codeId) !== key);
    const excusals = member.excusals ?? [];
    const strikeRemovals = member.strikeRemovals ?? [];
    const missedEventOverrides = member.missedEventOverrides ?? [];
    const reasoned: ReasonedEntry = { codeId: action.codeId, reason: note, by, at };

    let facts: Omit<AbsenceFacts, 'absenceLog'>;
    let applies: boolean;
    switch (action.kind) {
        case 'excuse':
            applies = !has(excusals);
            facts = { excusals: [...excusals, { codeId: action.codeId, note, by, at }], strikeRemovals, missedEventOverrides };
            break;
        case 'unexcuse':
            applies = has(excusals);
            facts = { excusals: without(excusals), strikeRemovals, missedEventOverrides };
            break;
        case 'remove-strike':
            applies = !has(strikeRemovals) && !has(excusals);
            facts = { excusals, strikeRemovals: [...strikeRemovals, reasoned], missedEventOverrides };
            break;
        case 'restore-strike':
            applies = has(strikeRemovals);
            facts = { excusals, strikeRemovals: without(strikeRemovals), missedEventOverrides };
            break;
        case 'close':
            applies = !has(missedEventOverrides);
            facts = { excusals, strikeRemovals, missedEventOverrides: [...missedEventOverrides, reasoned] };
            break;
        case 'reopen':
            applies = has(missedEventOverrides);
            facts = { excusals, strikeRemovals, missedEventOverrides: without(missedEventOverrides) };
            break;
    }
    if (!applies) return { ok: false, error: 'Someone already changed this Missed Event. Refresh to see it.' };

    const logEntry: AbsenceLogEntry = { kind: LOG_KIND[action.kind], codeId: action.codeId, note, by, at };
    return { ok: true, patch: { ...facts, absenceLog: [...(member.absenceLog ?? []), logEntry] } };
}

/** A Surplus Attendance whose Make-up changes: `from`/`to` are Missed Event codeIds, null for none. */
export type MakeupMove = { attendanceId: string; eventTypeId: string; eventDate: string; from: string | null; to: string | null };

export type AbsenceEffect = {
    strikes: { before: number; after: number };
    owed: { before: number; after: number };
    moves: MakeupMove[];
};

/** What an action would change, by working out the standing before and after it. */
export function previewAbsenceAction(
    member: Member,
    attendances: Attendance[],
    codes: Code[],
    action: AbsenceAction,
    today: string,
): AbsenceEffect {
    // The preview shouldn't need a reason typed yet.
    const applied = applyAbsenceAction(member as AbsenceMember, { ...action, note: action.note.trim() || '-' }, '', '');
    const before = computeStanding(member, attendances, rubric, codes, { today });
    const after = applied.ok ? computeStanding({ ...member, ...applied.patch }, attendances, rubric, codes, { today }) : before;
    const owed = (standing: Standing) => standing.missedEvents.filter((missed) => missed.owed).length;
    const moves = after.surplus.flatMap((surplus): MakeupMove[] => {
        const was = before.surplus.find((s) => s.attendanceId === surplus.attendanceId);
        if (!was || was.makeupFor === surplus.makeupFor) return [];
        const { attendanceId, eventTypeId, eventDate } = surplus;
        return [{ attendanceId, eventTypeId, eventDate, from: was.makeupFor, to: surplus.makeupFor }];
    });
    return {
        strikes: { before: before.openStrikes, after: after.openStrikes },
        owed: { before: owed(before), after: owed(after) },
        moves,
    };
}

/** The Members at risk of probation (3+ open Strikes), most Strikes first, for the Chief of Staff. */
export function atRiskMembers<T extends { standing: Standing | null }>(rows: T[]): T[] {
    return rows
        .filter((row) => (row.standing?.openStrikes ?? 0) >= AT_RISK_STRIKES)
        .sort((a, b) => b.standing.openStrikes - a.standing.openStrikes);
}

/**
 * Saves one action on a Member's Missed Event: reads their facts and writes
 * the new ones in one transaction, so two E-Board members can't overwrite
 * each other's changes or the log.
 */
export async function saveAbsenceAction(db: Firestore, email: string, action: AbsenceAction, by: string): Promise<Applied> {
    const userRef = doc(db, 'users', email.toLowerCase());
    return runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists()) return { ok: false, error: 'That member no longer exists.' } as const;
        const applied = applyAbsenceAction(snap.data() as AbsenceMember, action, by, new Date().toISOString());
        if (applied.ok) tx.update(userRef, applied.patch);
        return applied;
    });
}

/**
 * The fact holding a Missed Event in its current state, whose note or
 * reason the page shows: its override, else its removed Strike, else its
 * excusal.
 */
export function factFor(member: AbsenceMember, missed: MissedEvent): { note: string } | undefined {
    const key = codeKey(missed.codeId);
    const find = <T extends { codeId: string }>(list: T[] | undefined) => list?.find((entry) => codeKey(entry.codeId) === key);
    if (missed.overridden) return { note: find(member.missedEventOverrides)?.reason ?? '' };
    if (missed.excused) return { note: find(member.excusals)?.note ?? '' };
    if (missed.strikeRemoved) return { note: find(member.strikeRemovals)?.reason ?? '' };
    return undefined;
}

/** Code IDs are uppercase doc IDs, but a few older rows were stored in mixed case. */
function codeKey(codeId: string): string {
    return codeId.toUpperCase();
}
