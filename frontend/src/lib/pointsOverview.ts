// What the dashboard Overview shows a Member (#59 variant A, #74): Total
// Points against the voter-eligibility goal, the events behind them by date
// and by group, and the Point Requests still waiting on E-Board. Pure, so it's
// tested without Firestore; every number comes from computeStanding and the
// rubric, never from a stored counter.
import { adjustmentsThisYear, type Attendance, type Code, type Member, type RemovedCheckIn, type Standing } from './computeStanding';
import { eventType, rubric } from './rubric';
import { academicYear } from './semester';

/** What a revoked request had earned, and who had approved it. */
export type Revoked = { approvedBy: string | null; points: number };

/** A pointRequests/{id} doc of the Member's, as the dashboard reads it. */
export type MemberRequest = {
    id: string;
    activityName?: string;
    /** 'YYYY-MM-DD'. */
    date?: string;
    status?: string;
    pointsRequested?: number;
    codeId?: string | null;
    /** The Event Type the Member picked, or null for "Not listed". */
    eventTypeId?: string | null;
    makeupFor?: (string | null)[];
    /** Set once E-Board reviews it. */
    reviewedBy?: string | null;
    /** 'YYYY-MM-DD', from reviewedAt. */
    reviewedOn?: string | null;
    /** The deny reason, or an Adjustment's note. */
    reviewNotes?: string;
    /** Approved as an Adjustment instead of an Attendance. */
    adjustment?: { points: number; note: string };
    /** The Attendances approving it wrote; missing if approved on the old review page. */
    attendanceIds?: string[];
    /** Set when E-Board took back an approval: it is denied now. */
    revoked?: Revoked;
};

export type Group = { key: string; name: string };

/** One row of the Member's points: an event attended, or an E-Board Adjustment. */
export type LedgerEntry = {
    id: string;
    name: string;
    /** 'YYYY-MM-DD', or '' for an Adjustment with no date. */
    date: string;
    kind: 'event' | 'adjustment';
    group: Group;
    points: number;
    fromRequest: boolean;
    /** This entry took the Member from below the goal to it. */
    crossed: boolean;
};

export type PointsGroup = Group & { points: number; entries: LedgerEntry[] };

export type PendingPoints = { id: string; name: string; date: string; points: number };

/** A Removed Check-in as the Member sees it: what it had earned and why it went. */
export type RemovedEntry = { id: string; name: string; date: string; points: number; reason: string };

export type PointsOverview = {
    /** Total Points: the Member's VE Points. */
    total: number;
    /** 15, or 8 for MLP Spring. */
    goal: number;
    left: number;
    reached: boolean;
    eventsAttended: number;
    /** Oldest first. */
    ledger: LedgerEntry[];
    newestFirst: LedgerEntry[];
    /** Only groups the Member has something in, in display order. */
    groups: PointsGroup[];
    pending: PendingPoints[];
    pendingPoints: number;
    /** Newest first. */
    removed: RemovedEntry[];
};

/**
 * The Member's Removed Check-ins from this school year's events, newest
 * first, leaving out any E-Board has since credited again.
 */
export function removedThisYear(member: Member, attendances: Attendance[], today: string): (RemovedCheckIn & { codeId: string })[] {
    const { start, end } = academicYear(today);
    const credited = new Set(attendances.map((attendance) => attendance.codeId?.toUpperCase()).filter(Boolean));
    return Object.entries(member.removedCheckIns ?? {})
        .map(([codeId, removed]) => ({ ...removed, codeId: codeId.toUpperCase() }))
        .filter((removed) => removed.eventDate >= start && removed.eventDate <= end && !credited.has(removed.codeId))
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || a.codeId.localeCompare(b.codeId));
}

// The General Member groups (#59): OPA is one group; Affiliates also holds
// HLHM, HLSA and CRASH; no Cabinet-only groups. Display only: every
// Attendance keeps its own Event Type.
const GENERAL_GROUPS: (Group & { types: string[] })[] = [
    { key: 'gbm', name: 'GBMs', types: ['gbm'] },
    { key: 'fundraising', name: 'Fundraising', types: ['hsa-fundraising'] },
    { key: 'programming', name: 'Programming', types: ['hsa-programming'] },
    { key: 'service', name: 'Service', types: ['hsa-service'] },
    { key: 'operations', name: 'Operations', types: ['hsa-operations'] },
    { key: 'opa', name: 'OPA', types: ['opa-general', 'opa-solidarity-session'] },
    { key: 'affiliates', name: 'Affiliates', types: ['affiliate-org', 'hlhm', 'hlsa', 'crash'] },
    { key: 'mlp', name: 'MLP', types: ['mlp-open'] },
    { key: 'tabling', name: 'Tabling', types: ['tabling'] },
    { key: 'socials', name: 'Socials', types: ['external-social'] },
];

const ADJUSTMENTS: Group = { key: 'adjustments', name: 'Adjustments' };

/** Cabinet Members see each Event Type on its own, since their tiers depend on it. */
function groupOf(eventTypeId: string, byEventType: boolean): Group {
    const general = byEventType ? undefined : GENERAL_GROUPS.find((group) => group.types.includes(eventTypeId));
    if (general) return { key: general.key, name: general.name };
    return { key: eventTypeId, name: eventType(eventTypeId)?.label ?? 'Other' };
}

function groupOrder(key: string): number {
    const general = GENERAL_GROUPS.findIndex((group) => group.key === key);
    if (general >= 0) return general;
    const type = rubric.findIndex((row) => row.id === key);
    return type >= 0 ? GENERAL_GROUPS.length + type : Number.MAX_SAFE_INTEGER;
}

export function pointsOverview({ member, standing, attendances, codes, requests, today }: {
    member: Member;
    standing: Standing;
    attendances: Attendance[];
    codes: Code[];
    requests: MemberRequest[];
    today: string;
}): PointsOverview {
    const byEventType = standing.heldToCabinetRules;
    const codeById = new Map(codes.map((row) => [row.id.toUpperCase(), row]));
    const requestById = new Map(requests.map((request) => [request.id, request]));

    // A code-less request's Tabling hours are one Attendance each but one event.
    const entries = new Map<string, LedgerEntry>();
    for (const attendance of attendances) {
        const key = attendance.codeId ? `code:${attendance.codeId.toUpperCase()}`
            : attendance.requestId ? `req:${attendance.requestId}` : attendance.id;
        const points = eventType(attendance.eventTypeId)?.vePoints ?? 0;
        const existing = entries.get(key);
        if (existing) {
            existing.points += points;
            continue;
        }
        const code = attendance.codeId ? codeById.get(attendance.codeId.toUpperCase()) : undefined;
        const request = attendance.requestId ? requestById.get(attendance.requestId) : undefined;
        entries.set(key, {
            id: attendance.id,
            name: code?.event || request?.activityName || eventType(attendance.eventTypeId)?.label || 'Event',
            date: attendance.eventDate,
            kind: 'event',
            group: groupOf(attendance.eventTypeId, byEventType),
            points,
            fromRequest: attendance.source === 'request',
            crossed: false,
        });
    }
    adjustmentsThisYear(member.adjustments, today).forEach((adjustment, i) => {
        entries.set(`adjustment:${i}`, {
            id: `adjustment-${i}`,
            name: adjustment.note || 'Adjustment from E-Board',
            date: adjustment.date ?? '',
            kind: 'adjustment',
            group: ADJUSTMENTS,
            points: adjustment.points || 0,
            fromRequest: Boolean(adjustment.requestId),
            crossed: false,
        });
    });

    // Oldest first; an Adjustment with no date goes last.
    const ledger = [...entries.values()].sort((a, b) =>
        (a.date || '9999').localeCompare(b.date || '9999') || a.id.localeCompare(b.id));
    const goal = standing.veGoal;
    let running = 0;
    for (const entry of ledger) {
        entry.crossed = running < goal && running + entry.points >= goal;
        running += entry.points;
    }

    const groups = new Map<string, PointsGroup>();
    for (const entry of ledger) {
        const group = groups.get(entry.group.key) ?? { ...entry.group, points: 0, entries: [] };
        group.points += entry.points;
        group.entries.push(entry);
        groups.set(group.key, group);
    }

    const pending = requests
        .filter((request) => request.status === 'pending')
        .map((request) => ({
            id: request.id,
            name: request.activityName || 'Point Request',
            date: request.date ?? '',
            points: request.pointsRequested ?? 0,
        }));

    const total = standing.vePoints;
    return {
        total,
        goal,
        left: Math.max(0, goal - total),
        reached: total >= goal,
        eventsAttended: ledger.filter((entry) => entry.kind === 'event').length,
        ledger,
        newestFirst: [...ledger].reverse(),
        groups: [...groups.values()].sort((a, b) => groupOrder(a.key) - groupOrder(b.key)),
        pending,
        pendingPoints: pending.reduce((sum, request) => sum + request.points, 0),
        removed: removedThisYear(member, attendances, today).map((removed) => ({
            id: removed.codeId,
            name: removed.event,
            date: removed.eventDate,
            points: eventType(removed.eventTypeId)?.vePoints ?? 0,
            reason: removed.reason,
        })),
    };
}
