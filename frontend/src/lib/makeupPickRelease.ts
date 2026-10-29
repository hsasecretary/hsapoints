// The release dry run for #121 (ADR-0005): which Members' standing changes
// now that a Make-up pick beats filling a requirement. Run before deploy
// through scripts/makeup_pick_dry_run.py; remove with `legacyPicks` once
// #121 has shipped.
import { computeStanding, HLHM, type Semester, type Standing } from './computeStanding';
import type { MigrationInput } from './migrationStandings';
import { rubric } from './rubric';

export type PickRuleChange = {
    email: string;
    /** Missed Events whose Make-up moved: the Attendance before and after (null: still owed). */
    madeUp: { codeId: string; before: string | null; after: string | null }[];
    /** Requirements met under the old rule and open under the new; HLHM is yearly, so no Semester. */
    reopened: { eventTypeId: string; semester: Semester | null }[];
    openStrikes: { before: number; after: number };
};

function filledRequirements(standing: Standing, hlhmFilled: boolean): string[] {
    const filled = (['fall', 'spring'] as const).flatMap((semester) => standing.semesterRequirements[semester]
        .filter((req) => req.met && !req.waived)
        .map((req) => `${semester}:${req.eventTypeId}`));
    return hlhmFilled ? [...filled, `:${HLHM}`] : filled;
}

export function pickRuleChanges({ today, codes, members }: MigrationInput): PickRuleChange[] {
    const changes: PickRuleChange[] = [];
    for (const { email, member, attendances } of members) {
        const before = computeStanding(member, attendances, rubric, codes, { today, legacyPicks: true });
        const after = computeStanding(member, attendances, rubric, codes, { today });
        const hlhmFilled = (standing: Standing) => attendances.some((attendance) => attendance.eventTypeId === HLHM
            && !standing.surplus.some((row) => row.attendanceId === attendance.id));

        const madeUp = after.missedEvents
            .map((missed, i) => ({ codeId: missed.codeId, before: before.missedEvents[i].madeUpBy, after: missed.madeUpBy }))
            .filter((row) => row.before !== row.after);
        const stillFilled = new Set(filledRequirements(after, hlhmFilled(after)));
        const reopened = filledRequirements(before, hlhmFilled(before))
            .filter((key) => !stillFilled.has(key))
            .map((key) => {
                const [semester, eventTypeId] = key.split(':');
                return { eventTypeId, semester: (semester || null) as Semester | null };
            });
        const openStrikes = { before: before.openStrikes, after: after.openStrikes };
        if (madeUp.length || reopened.length || openStrikes.before !== openStrikes.after) {
            changes.push({ email, madeUp, reopened, openStrikes });
        }
    }
    return changes;
}
