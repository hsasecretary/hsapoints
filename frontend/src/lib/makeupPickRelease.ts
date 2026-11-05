// The release step for #121 (ADR-0005): the new rule applies from the
// release on, so a Point Request approved before it keeps the standing it
// had. Its pick, if the old rule ignored it, is set aside (makeupFor →
// ignoredMakeupFor) by scripts/set_aside_old_makeup_picks.py. Remove with
// `legacyPicks` once that has been applied.
import { computeStanding, HLHM, type Attendance, type Standing } from './computeStanding';
import type { MigrationInput } from './migrationStandings';
import { rubric } from './rubric';

export type SetAsideInput = MigrationInput & {
    /** IDs of Attendance from Point Requests approved before the release: the only picks that may be set aside. */
    approvedBefore: string[];
};

export type SetAsideResult = {
    setAside: { email: string; attendanceId: string; makeupFor: string }[];
    /** Members whose standing would still change after setting their picks aside: apply nothing until it's empty. */
    mismatches: string[];
};

/** What a Member sees: who made up each Missed Event, open Strikes, and the requirements filled. */
function outcome(standing: Standing, attendances: Attendance[]): string {
    const hlhmFilled = attendances.some((attendance) => attendance.eventTypeId === HLHM
        && !standing.surplus.some((row) => row.attendanceId === attendance.id));
    return JSON.stringify({
        madeUp: standing.missedEvents.map((missed) => [missed.codeId, missed.madeUpBy, missed.owed, missed.strike]),
        openStrikes: standing.openStrikes,
        requirements: standing.semesterRequirements,
        hlhmFilled,
    });
}

export function picksToSetAside({ today, codes, members, approvedBefore }: SetAsideInput): SetAsideResult {
    const eligible = new Set(approvedBefore);
    const result: SetAsideResult = { setAside: [], mismatches: [] };
    for (const { email, member, attendances } of members) {
        const scored = (rows: Attendance[], legacyPicks: boolean) => computeStanding(member, rows, rubric, codes, { today, legacyPicks });
        // A pick made after the release follows the new rule, so it's left out
        // of both the old scoring and the check.
        const before = attendances.filter((attendance) => !attendance.makeupFor || eligible.has(attendance.id));
        const old = scored(before, true);
        // The old rule only honoured a pick on Attendance that was Surplus anyway.
        const ignored = before.filter((attendance) => attendance.makeupFor
            && !old.surplus.some((row) => row.attendanceId === attendance.id));
        if (!ignored.length) continue;

        const setAside = new Set(ignored.map((attendance) => attendance.id));
        const after = before.map(({ makeupFor, ...rest }) => (setAside.has(rest.id) ? rest : { ...rest, makeupFor }));
        if (outcome(scored(after, false), after) !== outcome(old, before)) result.mismatches.push(email);
        for (const attendance of ignored) {
            result.setAside.push({ email, attendanceId: attendance.id, makeupFor: attendance.makeupFor });
        }
    }
    return result;
}
