// The re-scoring migration's new numbers (#77): scripts/migrate_to_ledger.py
// hands every Member's planned Attendance here, through
// frontend/scripts/migration-standings.ts, so the per-Member diff it writes
// comes from the same computeStanding the app runs.
import { computeStanding, type Attendance, type Code, type Member } from './computeStanding';
import { rubric } from './rubric';

export type MigrationInput = {
    /** Local date as 'YYYY-MM-DD'. */
    today: string;
    codes: Code[];
    members: { email: string; member: Member; attendances: Attendance[] }[];
};

export type MigrationStanding = {
    vePoints: number;
    cabinetPoints: number;
    /** codeIds of every Missed Event, oldest first, made up or closed or not. */
    missedEvents: string[];
    openStrikes: number;
    /** How many Attendances of each Event Type, for the diff's reason. */
    attendance: Record<string, number>;
};

export function migrationStandings({ today, codes, members }: MigrationInput): Record<string, MigrationStanding> {
    const result: Record<string, MigrationStanding> = {};
    for (const { email, member, attendances } of members) {
        const standing = computeStanding(member, attendances, rubric, codes, { today });
        const attendance: Record<string, number> = {};
        for (const { eventTypeId } of attendances) attendance[eventTypeId] = (attendance[eventTypeId] ?? 0) + 1;
        result[email] = {
            vePoints: standing.vePoints,
            cabinetPoints: standing.cabinetPoints,
            missedEvents: standing.missedEvents.map((missed) => missed.codeId),
            openStrikes: standing.openStrikes,
            attendance,
        };
    }
    return result;
}
