// What the Requirements page shows a Cabinet Member (#58, #75): Tier 1 as a
// short summary with the full year of Core Events by month behind it, the Fall | Spring Semester Requirement
// grid, the Missed Events still to make up, and "By category" as a table of
// Event Types where each event says what it did. Pure, so it's tested without
// Firestore; every fact comes from computeStanding. Members see whether a miss
// carries a Strike, never whether it was excused.
import {
    AT_RISK_STRIKES,
    CABINET_POINTS_GOAL,
    type Attendance,
    type Code,
    type Member,
    type MissedEvent,
    type Semester,
    type Standing,
} from './computeStanding';
import type { MemberRequest } from './pointsOverview';
import { missedEventName } from './pointRequests';
import { eventType, rubric } from './rubric';
import { academicYear, fromIsoDate, semesterOf, shortDate } from './semester';

export type TileState = 'done' | 'madeup' | 'open' | 'upcoming';

/** What tapping a tile says. */
export type TileDetail =
    | { kind: 'attended' }
    | { kind: 'upcoming' }
    | { kind: 'madeup'; by: string; byDate: string; clearedStrike: boolean }
    /** E-Board closed the miss without a Make-up. */
    | { kind: 'closed' }
    | { kind: 'open'; strike: boolean };

export type Tile = {
    /** The code ID. */
    key: string;
    name: string;
    date: string;
    state: TileState;
    /** An open miss that carries a Strike. */
    strike: boolean;
    detail: TileDetail;
};

/** `fall-only`: HLHM is once a year, so its Spring cell is just a note. */
export type Cell = { kind: 'done'; by: string } | { kind: 'pending' } | { kind: 'waived' } | { kind: 'open' } | { kind: 'fall-only' };

export type SemesterColumn = { label: string; done: number; needed: number; started: boolean };

export type GridRow = { eventTypeId: string; name: string; fall: Cell; spring: Cell; note?: string };

export type OwedMiss = {
    codeId: string;
    name: string;
    date: string;
    strike: boolean;
    /** A pending Point Request already names it. */
    pending: boolean;
};

export type TypeEvent = { id: string; name: string; date: string; did: string };

export type TypeRow = { key: string; name: string; cabinetPoints: number; vePoints: number; events: TypeEvent[] };

export type RequirementsBoard = {
    months: { label: string; tiles: Tile[] }[];
    /** E-Board: owes nothing, so the page says "Exempt" over Tier 1 and Tier 2. */
    exempt: boolean;
    /** Tier 1 in one line: past Core Events attended (made-up misses don't count) and the next one. */
    core: { attended: number; past: number; next: { name: string; date: string } | null };
    grid: { fall: SemesterColumn; spring: SemesterColumn; rows: GridRow[] };
    /** Oldest first. */
    toMakeUp: OwedMiss[];
    openStrikes: number;
    atRisk: boolean;
    /** Surplus covering nothing yet: it makes up the next miss. */
    extras: string[];
    byType: {
        rows: TypeRow[];
        /** `events` counts Attendance only, not Adjustments. */
        total: { events: number; cabinetPoints: number; cabinetGoal: number; vePoints: number; veGoal: number };
    };
};

const HLHM = 'hlhm';
const SEMESTER_NAMES: Record<Semester, string> = { fall: 'Fall', spring: 'Spring' };

/** 'YYYY-MM-DD' as 'Sep'. */
const monthOf = (isoDate: string) => fromIsoDate(isoDate).toLocaleDateString('en-US', { month: 'short' });

export function requirementsBoard({ member, standing, attendances, codes, requests, today }: {
    member: Member;
    standing: Standing;
    attendances: Attendance[];
    codes: Code[];
    requests: MemberRequest[];
    today: string;
}): RequirementsBoard {
    const names = attendanceNames(attendances, codes, requests);
    const nameOf = (attendanceId: string) => names.get(attendanceId) ?? 'An event';
    const dateOf = new Map(attendances.map((attendance) => [attendance.id, attendance.eventDate]));
    const missedByCode = new Map(standing.missedEvents.map((missed) => [missed.codeId, missed]));
    const missName = (missed: MissedEvent) => missedEventName(codes, missed);
    const codeName = (codeId: string, eventTypeId: string) => missedEventName(codes, { codeId, eventTypeId });

    const tiles: Tile[] = [];
    for (const core of standing.coreEvents) {
        const base = { key: core.codeId, name: codeName(core.codeId, core.eventTypeId), date: core.eventDate };
        if (core.status === 'attended') {
            tiles.push({ ...base, state: 'done', strike: false, detail: { kind: 'attended' } });
        } else if (core.status === 'upcoming') {
            tiles.push({ ...base, state: 'upcoming', strike: false, detail: { kind: 'upcoming' } });
        } else {
            const missed = missedByCode.get(core.codeId);
            if (!missed) continue;
            if (missed.overridden || standing.exempt) {
                tiles.push({ ...base, state: 'madeup', strike: false, detail: { kind: 'closed' } });
            } else if (missed.madeUpBy) {
                tiles.push({
                    ...base,
                    state: 'madeup',
                    strike: false,
                    detail: { kind: 'madeup', by: nameOf(missed.madeUpBy), byDate: dateOf.get(missed.madeUpBy), clearedStrike: hadStrike(missed) },
                });
            } else {
                tiles.push({ ...base, state: 'open', strike: missed.strike, detail: { kind: 'open', strike: missed.strike } });
            }
        }
    }
    const byDate = [...attendances].sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.id.localeCompare(b.id));
    const hlhmAttendance = byDate.find((attendance) => attendance.eventTypeId === HLHM);
    tiles.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
    const months: RequirementsBoard['months'] = [];
    for (const tile of tiles) {
        const label = monthOf(tile.date);
        const last = months[months.length - 1];
        if (last?.label === label) last.tiles.push(tile);
        else months.push({ label, tiles: [tile] });
    }

    // Semester Requirements, Fall | Spring.
    const codeTypes = new Map(codes.map((row) => [row.id.toUpperCase(), row.eventTypeId]));
    const pending = requests.filter((request) => request.status === 'pending');
    const pendingIn = (semester: Semester, eventTypeId: string) => pending.some((request) =>
        (request.eventTypeId ?? codeTypes.get((request.codeId ?? '').toUpperCase())) === eventTypeId
        && semesterOf(request.date || today) === semester);
    const cell = (semester: Semester, eventTypeId: string): Cell => {
        const requirement = standing.semesterRequirements[semester].find((row) => row.eventTypeId === eventTypeId);
        if (!requirement) return { kind: 'open' };
        if (requirement.waived) return { kind: 'waived' };
        if (requirement.met) return { kind: 'done', by: nameOf(requirement.filledBy) };
        return pendingIn(semester, requirement.eventTypeId) ? { kind: 'pending' } : { kind: 'open' };
    };
    // HLHM is once a year, run Sept 15 - Oct 15: one Fall cell, and a note in Spring.
    const hlhmRow: GridRow = {
        eventTypeId: HLHM,
        name: eventType(HLHM)?.label ?? 'HLHM',
        note: 'Only runs Sept 15 – Oct 15',
        fall: hlhmAttendance ? { kind: 'done', by: nameOf(hlhmAttendance.id) }
            : pendingIn('fall', HLHM) || pendingIn('spring', HLHM) ? { kind: 'pending' } : { kind: 'open' },
        spring: { kind: 'fall-only' },
    };
    const fallYear = Number(academicYear(today).start.slice(0, 4));
    const column = (semester: Semester, year: number, start: string): SemesterColumn => {
        const counted = standing.semesterRequirements[semester].filter((requirement) => !requirement.waived);
        const hlhm = semester === 'fall' ? 1 : 0;
        return {
            label: `${SEMESTER_NAMES[semester]} ${year}`,
            done: counted.filter((requirement) => requirement.met).length + (hlhm && hlhmAttendance ? 1 : 0),
            needed: counted.length + hlhm,
            started: today >= start,
        };
    };
    const grid = {
        fall: column('fall', fallYear, `${fallYear}-06-01`),
        spring: column('spring', fallYear + 1, `${fallYear + 1}-01-01`),
        rows: [hlhmRow, ...standing.semesterRequirements.fall.map((requirement) => ({
            eventTypeId: requirement.eventTypeId,
            name: eventType(requirement.eventTypeId)?.label ?? requirement.eventTypeId,
            fall: cell('fall', requirement.eventTypeId),
            spring: cell('spring', requirement.eventTypeId),
        }))],
    };

    // To make up.
    const pendingPicks = new Set(pending
        .flatMap((request) => [request.codeId, ...(request.makeupFor ?? [])])
        .filter(Boolean)
        .map((codeId) => codeId.toUpperCase()));
    const toMakeUp = standing.missedEvents
        .filter((missed) => missed.owed)
        .map((missed) => ({
            codeId: missed.codeId,
            name: missName(missed),
            date: missed.eventDate,
            strike: missed.strike,
            pending: pendingPicks.has(missed.codeId.toUpperCase()),
        }));

    // By category: what each Attendance did.
    const did = new Map<string, string>();
    for (const core of attendances) {
        if (eventType(core.eventTypeId)?.tier === 'core') did.set(core.id, 'Core Event');
    }
    for (const semester of ['fall', 'spring'] as Semester[]) {
        for (const requirement of standing.semesterRequirements[semester]) {
            if (requirement.filledBy) {
                did.set(requirement.filledBy, `${SEMESTER_NAMES[semester]} requirement: ${eventType(requirement.eventTypeId)?.label}`);
            }
        }
    }
    for (const surplus of standing.surplus) {
        const missed = surplus.makeupFor && missedByCode.get(surplus.makeupFor);
        did.set(surplus.attendanceId, missed
            ? `Made up ${missName(missed)}${hadStrike(missed) ? ' and its Strike' : ''}`
            : 'Extra. It will make up your next miss');
    }
    const typeRows = new Map<string, TypeRow>();
    for (const attendance of byDate) {
        const type = eventType(attendance.eventTypeId);
        const row = typeRows.get(attendance.eventTypeId)
            ?? { key: attendance.eventTypeId, name: type?.label ?? 'Other', cabinetPoints: 0, vePoints: 0, events: [] };
        row.cabinetPoints += type?.cabinetPoints ?? 0;
        row.vePoints += type?.vePoints ?? 0;
        row.events.push({ id: attendance.id, name: nameOf(attendance.id), date: attendance.eventDate, did: did.get(attendance.id) ?? '' });
        typeRows.set(attendance.eventTypeId, row);
    }
    const order = (key: string) => {
        const index = rubric.findIndex((type) => type.id === key);
        return index >= 0 ? index : rubric.length;
    };
    const rows = [...typeRows.values()].sort((a, b) => order(a.key) - order(b.key));
    const adjustments = member.adjustments ?? [];
    if (adjustments.length) {
        rows.push({
            key: 'adjustments',
            name: 'Adjustments',
            cabinetPoints: 0,
            vePoints: adjustments.reduce((sum, adjustment) => sum + (adjustment.points || 0), 0),
            events: adjustments.map((adjustment, i) => ({
                id: `adjustment-${i}`,
                name: adjustment.note || 'Adjustment from E-Board',
                date: adjustment.date ?? '',
                did: 'Adjustment from E-Board',
            })),
        });
    }

    return {
        months,
        exempt: standing.exempt,
        core: {
            attended: tiles.filter((tile) => tile.state === 'done').length,
            past: tiles.filter((tile) => tile.state !== 'upcoming').length,
            next: tiles.filter((tile) => tile.state === 'upcoming').map(({ name, date }) => ({ name, date }))[0] ?? null,
        },
        grid,
        toMakeUp,
        openStrikes: standing.openStrikes,
        atRisk: standing.openStrikes >= AT_RISK_STRIKES,
        extras: standing.surplus.filter((surplus) => !surplus.makeupFor).map((surplus) => nameOf(surplus.attendanceId)),
        byType: {
            rows,
            total: {
                events: attendances.length,
                cabinetPoints: standing.cabinetPoints,
                cabinetGoal: CABINET_POINTS_GOAL,
                vePoints: standing.vePoints,
                veGoal: standing.veGoal,
            },
        },
    };
}

/** A Core Event's status in words, so the list needs no colour key. */
export function tileStatus({ detail }: Tile): string {
    switch (detail.kind) {
        case 'attended':
            return 'Attended';
        case 'upcoming':
            return 'Coming up';
        case 'open':
            return 'Missed, to make up';
        case 'closed':
            return 'Missed, nothing to make up';
        case 'madeup':
            return `Made up by ${detail.by} on ${shortDate(detail.byDate)}${detail.clearedStrike ? ', which cleared its Strike' : ''}`;
    }
}

/** Whether a miss carried a Strike before it was made up (a made-up miss has `strike` false). */
function hadStrike(missed: MissedEvent): boolean {
    return !missed.overridden && !missed.excused && !missed.strikeRemoved;
}

/** Each Attendance's display name; a Tabling request's hours are numbered. */
function attendanceNames(attendances: Attendance[], codes: Code[], requests: MemberRequest[]): Map<string, string> {
    const codeById = new Map(codes.map((row) => [row.id.toUpperCase(), row]));
    const requestById = new Map(requests.map((request) => [request.id, request]));
    const hours = new Map<string, Attendance[]>();
    for (const attendance of attendances) {
        if (attendance.codeId || !attendance.requestId) continue;
        hours.set(attendance.requestId, [...(hours.get(attendance.requestId) ?? []), attendance]);
    }
    const names = new Map<string, string>();
    for (const attendance of attendances) {
        const code = attendance.codeId ? codeById.get(attendance.codeId.toUpperCase()) : undefined;
        const request = attendance.requestId ? requestById.get(attendance.requestId) : undefined;
        const name = code?.event || request?.activityName || eventType(attendance.eventTypeId)?.label || 'An event';
        const siblings = !attendance.codeId && attendance.requestId ? hours.get(attendance.requestId) : undefined;
        if (siblings && siblings.length > 1) {
            const hour = [...siblings].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).indexOf(attendance) + 1;
            names.set(attendance.id, `${name} (hour ${hour})`);
        } else {
            names.set(attendance.id, name);
        }
    }
    return names;
}
