// What E-Board sees on User Lookup (#37): one Member's standing for the
// school year, every point behind it and where it came from, and their Point
// Requests with who reviewed them. Pure, so it's tested without Firestore;
// every number comes from computeStanding and the rubric, never from a
// stored counter, so it always matches the Member's own dashboard.
import { AT_RISK_STRIKES, CABINET_POINTS_GOAL, type Attendance, type Code, type Member, type MissedEvent, type Semester, type Standing } from './computeStanding';
import type { MemberRequest, Revoked } from './pointsOverview';
import { eventType } from './rubric';
import { academicYear } from './semester';

/** Codes by upper-cased ID: a few older rows were stored in mixed case. */
function codesById(codes: Code[]): Map<string, Code> {
    return new Map(codes.map((row) => [row.id.toUpperCase(), row]));
}

/** Newest first; a row with no date goes last. */
function byDateNewestFirst(a: { date: string }, b: { date: string }): number {
    return (b.date || '0000').localeCompare(a.date || '0000');
}

export type PointSource = Attendance['source'] | 'adjustment';

export const SOURCE_LABEL: Record<PointSource, string> = {
    code: 'Code check-in',
    request: 'Point Request',
    eboard: 'Entered by E-Board',
    adjustment: 'Adjustment',
};

/** One row of the points list: an event (a Tabling request's hours are one row) or an Adjustment. */
export type LookupRow = {
    id: string;
    name: string;
    /** 'YYYY-MM-DD', or '' for an Adjustment with no date. */
    date: string;
    /** The Event Type's label, or 'Adjustment'. */
    eventType: string;
    source: PointSource;
    vePoints: number;
    cabinetPoints: number;
    /** Tabling hours, when more than one Attendance makes up the row. */
    hours?: number;
    /** The code checked in with, whether by the Member, a Point Request or E-Board. */
    codeId: string | null;
    requestId: string | null;
    approvedBy: string | null;
    approvedOn: string | null;
};

export type LookupLedger = {
    /** Newest first; an Adjustment with no date goes last. */
    rows: LookupRow[];
    /** Equal to the standing's VE Points (Total Points). */
    vePoints: number;
    /** Equal to the standing's Cabinet Points. */
    cabinetPoints: number;
    /** How many rows are Adjustments. */
    adjustments: number;
    /** Codes counted this year, and how many of those a Point Request added. */
    codes: { redeemed: number; byRequest: number };
};

export function lookupLedger({ member, attendances, codes, requests }: {
    member: Member;
    attendances: Attendance[];
    codes: Code[];
    requests: MemberRequest[];
}): LookupLedger {
    const codeById = codesById(codes);
    const requestById = new Map(requests.map((request) => [request.id, request]));
    const reviewOf = (requestId: string | undefined) => {
        const request = requestId ? requestById.get(requestId) : undefined;
        return { approvedBy: request?.reviewedBy ?? null, approvedOn: request?.reviewedOn ?? null };
    };

    const rows = new Map<string, LookupRow>();
    for (const attendance of attendances) {
        const type = eventType(attendance.eventTypeId);
        const key = attendance.codeId ? `code:${attendance.codeId.toUpperCase()}`
            : attendance.requestId ? `req:${attendance.requestId}` : attendance.id;
        const existing = rows.get(key);
        if (existing) {
            existing.vePoints += type?.vePoints ?? 0;
            existing.cabinetPoints += type?.cabinetPoints ?? 0;
            existing.hours = (existing.hours ?? 1) + 1;
            continue;
        }
        const code = attendance.codeId ? codeById.get(attendance.codeId.toUpperCase()) : undefined;
        const request = attendance.requestId ? requestById.get(attendance.requestId) : undefined;
        rows.set(key, {
            id: attendance.id,
            name: code?.event || request?.activityName || type?.label || 'Event',
            date: attendance.eventDate,
            eventType: type?.label ?? 'Unknown Event Type',
            source: attendance.source,
            vePoints: type?.vePoints ?? 0,
            cabinetPoints: type?.cabinetPoints ?? 0,
            codeId: attendance.codeId ? code?.id ?? attendance.codeId.toUpperCase() : null,
            requestId: attendance.requestId ?? null,
            ...reviewOf(attendance.requestId),
        });
    }
    (member.adjustments ?? []).forEach((adjustment, i) => {
        rows.set(`adjustment:${i}`, {
            id: `adjustment-${i}`,
            name: adjustment.note || 'Adjustment from E-Board',
            date: adjustment.date ?? '',
            eventType: 'Adjustment',
            source: 'adjustment',
            vePoints: adjustment.points || 0,
            cabinetPoints: 0,
            codeId: null,
            requestId: adjustment.requestId ?? null,
            ...(adjustment.by ? { approvedBy: adjustment.by, approvedOn: adjustment.date ?? null } : reviewOf(adjustment.requestId)),
        });
    });

    const sorted = [...rows.values()].sort((a, b) => byDateNewestFirst(a, b) || b.id.localeCompare(a.id));
    return {
        rows: sorted,
        vePoints: sorted.reduce((sum, row) => sum + row.vePoints, 0),
        cabinetPoints: sorted.reduce((sum, row) => sum + row.cabinetPoints, 0),
        adjustments: sorted.filter((row) => row.source === 'adjustment').length,
        codes: {
            redeemed: sorted.filter((row) => row.codeId).length,
            byRequest: sorted.filter((row) => row.codeId && row.source === 'request').length,
        },
    };
}

export type RequestStatus = 'pending' | 'approved' | 'denied';

const STATUS_LABEL: Record<RequestStatus, string> = { pending: 'Pending', approved: 'Approved', denied: 'Denied' };

export type LookupRequest = {
    id: string;
    name: string;
    date: string;
    status: RequestStatus;
    statusLabel: string;
    /** What it asks for while pending; what it earned once reviewed (0 if denied). */
    points: number;
    pointsLabel: 'requested' | 'credited';
    /** The Event Type E-Board confirmed, or the Member's pick while pending. */
    eventType: string;
    reviewedBy: string | null;
    reviewedOn: string | null;
    /** The deny or revoke reason, or an Adjustment's note. */
    notes: string;
    /** Approved as an Attendance or an Adjustment, so E-Board can still take it back. */
    revocable: boolean;
    revoked: Revoked | null;
};

/**
 * The Member's Point Requests from this school year, plus any older one still
 * pending (it still needs a review): pending first, then newest first.
 */
export function lookupRequests(requests: MemberRequest[], today: string): LookupRequest[] {
    const { start, end } = academicYear(today);
    return requests
        .filter((request) => request.status === 'pending' || !request.date || (request.date >= start && request.date <= end))
        .map((request): LookupRequest => {
            const status: RequestStatus = request.status === 'approved' || request.status === 'denied' ? request.status : 'pending';
            const type = request.adjustment ? 'Adjustment'
                : request.eventTypeId ? eventType(request.eventTypeId)?.label ?? request.eventTypeId : 'Not listed';
            return {
                id: request.id,
                name: request.activityName || 'Point Request',
                date: request.date ?? '',
                status,
                statusLabel: request.revoked ? 'Revoked' : STATUS_LABEL[status],
                points: status === 'denied' ? 0 : request.pointsRequested ?? 0,
                pointsLabel: status === 'pending' ? 'requested' : 'credited',
                eventType: type,
                reviewedBy: request.reviewedBy ?? null,
                reviewedOn: request.reviewedOn ?? null,
                notes: request.reviewNotes ?? '',
                revocable: canRevoke(request),
                revoked: request.revoked ?? null,
            };
        })
        .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending')
            || byDateNewestFirst(a, b) || a.id.localeCompare(b.id));
}

/** Approved on the old review page, a request's points are only in the old counters: nothing to take back. */
export function canRevoke(request: Pick<MemberRequest, 'status' | 'adjustment' | 'attendanceIds'>): boolean {
    return request.status === 'approved' && Boolean(request.adjustment || request.attendanceIds);
}

export type LookupSummary = {
    /** Which rules the Member is held to: E-Board is exempt from the Cabinet ones. */
    rules: 'general' | 'cabinet' | 'exempt';
    vePoints: number;
    veGoal: number;
    veReached: boolean;
    /** Pending Point Requests never count toward the Total Points. */
    pendingCount: number;
    pendingPoints: number;
    cabinetPoints: number;
    cabinetGoal: number;
    openStrikes: number;
    atRisk: boolean;
    /** Missed Events still needing a Make-up. */
    missedOwed: number;
    /** Every Missed Event this year, split by whether E-Board excused it. */
    missedExcused: number;
    missedUnexcused: number;
    /** Semester Requirements met out of those not waived. */
    requirements: Record<Semester, { met: number; total: number }>;
};

export function lookupSummary(member: Member, standing: Standing, requests: MemberRequest[]): LookupSummary {
    const pending = requests.filter((request) => request.status === 'pending');
    const requirementsOf = (semester: Semester) => {
        const rows = standing.semesterRequirements[semester].filter((req) => !req.waived);
        return { met: rows.filter((req) => req.met).length, total: rows.length };
    };
    return {
        rules: standing.heldToCabinetRules ? 'cabinet' : member.eboard ? 'exempt' : 'general',
        vePoints: standing.vePoints,
        veGoal: standing.veGoal,
        veReached: standing.vePoints >= standing.veGoal,
        pendingCount: pending.length,
        pendingPoints: pending.reduce((sum, request) => sum + (request.pointsRequested ?? 0), 0),
        cabinetPoints: standing.cabinetPoints,
        cabinetGoal: CABINET_POINTS_GOAL,
        openStrikes: standing.openStrikes,
        atRisk: standing.openStrikes >= AT_RISK_STRIKES,
        missedOwed: standing.missedEvents.filter((missed) => missed.owed).length,
        missedExcused: standing.missedEvents.filter((missed) => missed.excused).length,
        missedUnexcused: standing.missedEvents.filter((missed) => !missed.excused).length,
        requirements: { fall: requirementsOf('fall'), spring: requirementsOf('spring') },
    };
}

export type MissedState = 'strike' | 'open' | 'madeup' | 'closed';

/** In display order: open Strikes, other open misses, Make-ups, then closed. */
export const MISSED_STATE_LABEL: Record<MissedState, string> = {
    strike: 'Missed, Strike',
    open: 'Missed, needs a Make-up',
    madeup: 'Made up',
    closed: 'Closed by E-Board',
};

const STATE_ORDER = Object.keys(MISSED_STATE_LABEL) as MissedState[];

export type MissedEventRow = {
    codeId: string;
    name: string;
    eventDate: string;
    state: MissedState;
    excused: boolean;
    /** The event that made it up, or null. */
    madeUpBy: { name: string; date: string } | null;
};

function missedState(missed: MissedEvent): MissedState {
    if (missed.overridden) return 'closed';
    if (missed.madeUpBy) return 'madeup';
    return missed.strike ? 'strike' : 'open';
}

/** A Cabinet Member's Missed Events: open ones first (Strikes before the rest), then Make-ups, then closed; oldest first within each. */
export function missedEventRows(standing: Standing, codes: Code[], attendances: Attendance[]): MissedEventRow[] {
    const codeById = codesById(codes);
    const attendanceById = new Map(attendances.map((attendance) => [attendance.id, attendance]));
    const nameOf = (codeId: string | undefined, eventTypeId: string) =>
        (codeId && codeById.get(codeId.toUpperCase())?.event) || eventType(eventTypeId)?.label || codeId || 'Event';
    return standing.missedEvents
        .map((missed) => {
            const cover = missed.madeUpBy ? attendanceById.get(missed.madeUpBy) : undefined;
            return {
                codeId: missed.codeId,
                name: nameOf(missed.codeId, missed.eventTypeId),
                eventDate: missed.eventDate,
                state: missedState(missed),
                excused: missed.excused,
                madeUpBy: cover ? { name: nameOf(cover.codeId, cover.eventTypeId), date: cover.eventDate } : null,
            };
        })
        .sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || a.eventDate.localeCompare(b.eventDate));
}
