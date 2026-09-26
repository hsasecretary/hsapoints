// A Member's standing, worked out from their Attendance: the one place points,
// Missed Events, Strikes and Make-ups are calculated (see CONTEXT.md and
// docs/adr/0002-attendance-ledger-calculated-on-read.md). Pure and free of
// Firestore imports, so the migration can run it in Node too.
//
// Pass one academic year: Semester is only fall or spring, so the codes and
// Attendance of two years would share Semester Requirements.
import { isHeldToCabinetRules } from './members';
import type { EventType } from './rubric';
import { semesterOf } from './semester';

/** The users/{email} fields a standing depends on. */
export type Member = {
    involvement?: string;
    cabinet?: string;
    eboard?: boolean;
    approved?: boolean;
    heldToCabinetRules?: boolean;
    webTeam?: boolean;
    mlpCohort?: 'fall' | 'spring';
    excusals?: { codeId: string }[];
    strikeRemovals?: { codeId: string }[];
    missedEventOverrides?: { codeId: string }[];
    adjustments?: { points: number; note?: string; date?: string }[];
};

/** An attendances/{id} doc, with its doc ID as `id`. */
export type Attendance = {
    id: string;
    eventTypeId: string;
    /** 'YYYY-MM-DD'. */
    eventDate: string;
    source: 'code' | 'request' | 'eboard';
    /** Set on every Attendance for a coded event, however it arrived: it is
     *  how a Core Event counts as attended. */
    codeId?: string;
    requestId?: string;
    /** The Missed Event (a codeId) the Member picked for this to make up. */
    makeupFor?: string;
};

/** A codes/{CODE} doc, with its doc ID as `id`. */
export type Code = {
    id: string;
    eventTypeId?: string;
    /** 'YYYY-MM-DD'. */
    eventDate: string;
    event?: string;
};

export type Semester = 'fall' | 'spring';

export type CoreEvent = {
    codeId: string;
    eventTypeId: string;
    eventDate: string;
    semester: Semester;
    /** `optional`: an HLHM event the Member can skip, since any one HLHM event a year fills the Core Event. */
    status: 'attended' | 'missed' | 'upcoming' | 'optional';
};

export type MissedEvent = {
    codeId: string;
    eventTypeId: string;
    eventDate: string;
    semester: Semester;
    /** E-Board-only: Members are never shown whether a miss was excused. */
    excused: boolean;
    strikeRemoved: boolean;
    /** Closed by E-Board without a Make-up. */
    overridden: boolean;
    /** The Attendance that made it up. */
    madeUpBy: string | null;
    /** Still needs a Make-up. */
    owed: boolean;
    /** Carries an open Strike. */
    strike: boolean;
};

export type SemesterRequirement = {
    eventTypeId: string;
    /** Affiliate Org, for Cabinet Members on the MLP Fall / MLP Spring cabinets. */
    waived: boolean;
    met: boolean;
    /** The first Attendance of that Event Type that Semester, by event date. */
    filledBy: string | null;
};

export type SurplusAttendance = {
    attendanceId: string;
    eventTypeId: string;
    eventDate: string;
    /** The Missed Event it made up, or null while it covers nothing. */
    makeupFor: string | null;
};

export type Standing = {
    /** Held to Core Events, Semester Requirements and Strikes. */
    heldToCabinetRules: boolean;
    cabinetPoints: number;
    vePoints: number;
    /** VE Points needed to be voter eligible: 15, or 8 for MLP Spring. */
    veGoal: number;
    /** Every Core Event of the year, oldest first (empty unless held to Cabinet rules). */
    coreEvents: CoreEvent[];
    /** Every Core Event that happened without the Member, oldest first, made up or not. */
    missedEvents: MissedEvent[];
    openStrikes: number;
    /** One row per Semester Requirement, in rubric order, for each Semester. */
    semesterRequirements: Record<Semester, SemesterRequirement[]>;
    /** Surplus Attendance, oldest first. */
    surplus: SurplusAttendance[];
};

export type StandingOptions = {
    /** Local date as 'YYYY-MM-DD'. A Core Event is missed once its day is over. */
    today: string;
    /** E-Board or a Web-team Tester previewing the Cabinet Member view. */
    viewingAsCabinet?: boolean;
};

/** Open Strikes at which a Cabinet Member is at risk of probation and must meet with the Chief of Staff. */
export const AT_RISK_STRIKES = 3;

/** One HLHM event a year fills its Core Event; any beyond it is surplus. */
const HLHM = 'hlhm';

/** The cabinets that run MLP, whose members have Affiliate Org waived. */
const MLP_CABINETS = ['mlpFall', 'mlpSpring'];

export function computeStanding(
    member: Member,
    attendances: Attendance[],
    rubric: readonly EventType[],
    codes: Code[],
    { today, viewingAsCabinet = false }: StandingOptions,
): Standing {
    const types = new Map(rubric.map((type) => [type.id, type]));
    const heldToCabinetRules = viewingAsCabinet || isHeldToCabinetRules(member);
    // Replay in date order. On the same date an Attendance with a Make-up
    // pick goes last, so it's the one left surplus to honour its pick (a
    // Tabling request's hours share a date); then the ID breaks ties, so the
    // result never depends on the order Firestore returned the docs in.
    const replay = [...attendances].sort((a, b) =>
        a.eventDate.localeCompare(b.eventDate)
        || Number(Boolean(a.makeupFor)) - Number(Boolean(b.makeupFor))
        || a.id.localeCompare(b.id));

    let cabinetPoints = 0;
    let vePoints = 0;
    for (const attendance of replay) {
        const type = types.get(attendance.eventTypeId);
        cabinetPoints += type?.cabinetPoints ?? 0;
        vePoints += type?.vePoints ?? 0;
    }
    // Adjustments stand in for the old uncategorized otherPoints, which
    // always counted toward the Total (= VE) Points.
    for (const adjustment of member.adjustments ?? []) vePoints += adjustment.points || 0;

    const affiliateWaived = MLP_CABINETS.includes(member.cabinet);
    const semesterRequirements = {
        fall: listSemesterRequirements(rubric, affiliateWaived),
        spring: listSemesterRequirements(rubric, affiliateWaived),
    };
    const surplus: SurplusAttendance[] = [];
    let hlhmFilled = false;
    for (const attendance of replay) {
        const tier = types.get(attendance.eventTypeId)?.tier;
        let isSurplus = tier === 'additional';
        if (attendance.eventTypeId === HLHM) {
            isSurplus = hlhmFilled;
            hlhmFilled = true;
        } else if (tier === 'semester') {
            const requirement = semesterRequirements[semesterOf(attendance.eventDate)]
                .find((req) => req.eventTypeId === attendance.eventTypeId);
            if (requirement.met) {
                // Already filled that Semester, or waived.
                isSurplus = true;
            } else {
                requirement.met = true;
                requirement.filledBy = attendance.id;
            }
        }
        if (isSurplus) {
            surplus.push({
                attendanceId: attendance.id,
                eventTypeId: attendance.eventTypeId,
                eventDate: attendance.eventDate,
                makeupFor: null,
            });
        }
    }

    const coreEvents = heldToCabinetRules ? listCoreEvents(codes, types, replay, today) : [];
    const excused = codeIdSet(member.excusals);
    const strikeRemoved = codeIdSet(member.strikeRemovals);
    const overridden = codeIdSet(member.missedEventOverrides);
    const missedEvents: MissedEvent[] = coreEvents
        .filter((event) => event.status === 'missed')
        .map((event) => {
            const id = codeKey(event.codeId);
            const isOverridden = overridden.has(id);
            const isExcused = excused.has(id);
            const isStrikeRemoved = strikeRemoved.has(id);
            return {
                codeId: event.codeId,
                eventTypeId: event.eventTypeId,
                eventDate: event.eventDate,
                semester: event.semester,
                excused: isExcused,
                strikeRemoved: isStrikeRemoved,
                overridden: isOverridden,
                madeUpBy: null,
                owed: !isOverridden,
                strike: !isOverridden && !isExcused && !isStrikeRemoved,
            };
        });

    const makeupPicks = new Map(replay.map((attendance) => [attendance.id, attendance.makeupFor && codeKey(attendance.makeupFor)]));
    assignMakeups(surplus, missedEvents, makeupPicks);

    return {
        heldToCabinetRules,
        cabinetPoints,
        vePoints,
        veGoal: member.mlpCohort === 'spring' ? 8 : 15,
        coreEvents,
        missedEvents,
        openStrikes: missedEvents.filter((missed) => missed.strike).length,
        semesterRequirements,
        surplus,
    };
}

function listSemesterRequirements(rubric: readonly EventType[], affiliateWaived: boolean): SemesterRequirement[] {
    return rubric
        .filter((type) => type.tier === 'semester')
        .map((type) => {
            const waived = affiliateWaived && type.id === 'affiliate-org';
            return { eventTypeId: type.id, waived, met: waived, filledBy: null };
        });
}

/**
 * Credits Surplus Attendance against Missed Events. First each pick a
 * Member named on a Point Request, if that miss is still owed; then the
 * rest, oldest first, each against the oldest Missed Event still carrying a
 * Strike, else the oldest other one still owed. A surplus from before the
 * miss counts too, and so does one from the other Semester (#42, #62).
 */
function assignMakeups(
    surplus: SurplusAttendance[],
    missedEvents: MissedEvent[],
    makeupPicks: Map<string, string | undefined>,
) {
    const cover = (surplusAttendance: SurplusAttendance, missed: MissedEvent) => {
        surplusAttendance.makeupFor = missed.codeId;
        missed.madeUpBy = surplusAttendance.attendanceId;
        missed.owed = false;
        missed.strike = false;
    };
    for (const surplusAttendance of surplus) {
        const pick = makeupPicks.get(surplusAttendance.attendanceId);
        const picked = pick && missedEvents.find((missed) => missed.owed && codeKey(missed.codeId) === pick);
        if (picked) cover(surplusAttendance, picked);
    }
    for (const surplusAttendance of surplus) {
        if (surplusAttendance.makeupFor) continue;
        const target = missedEvents.find((missed) => missed.strike) ?? missedEvents.find((missed) => missed.owed);
        if (!target) return;
        cover(surplusAttendance, target);
    }
}

function listCoreEvents(
    codes: Code[],
    types: Map<string, EventType>,
    replay: Attendance[],
    today: string,
): CoreEvent[] {
    const attendedCodes = new Set(replay.filter((attendance) => attendance.codeId).map((attendance) => codeKey(attendance.codeId)));
    const coreCodes = codes
        .filter((code) => types.get(code.eventTypeId)?.tier === 'core')
        .sort(byDateThenId);
    // Any one HLHM event fills the HLHM Core Event, so it is missed only once
    // the last HLHM event has passed with none attended; that last one is
    // the Missed Event, and the rest were optional. (A later HLHM code moves
    // the miss, and any excusal keyed to the old one, onto itself.)
    const hlhmAttended = replay.some((attendance) => attendance.eventTypeId === HLHM);
    const hlhmCodes = coreCodes.filter((code) => code.eventTypeId === HLHM);
    const lastHlhm = hlhmCodes[hlhmCodes.length - 1];

    return coreCodes.map((code) => {
        let status: CoreEvent['status'];
        if (attendedCodes.has(codeKey(code.id))) status = 'attended';
        else if (code.eventTypeId === HLHM && hlhmAttended) status = 'optional';
        else if (code.eventDate >= today) status = 'upcoming';
        else if (code.eventTypeId === HLHM && code !== lastHlhm) status = 'optional';
        else status = 'missed';
        return {
            codeId: code.id,
            eventTypeId: code.eventTypeId,
            eventDate: code.eventDate,
            semester: semesterOf(code.eventDate),
            status,
        };
    });
}

/** Code IDs are uppercase doc IDs, but a few older rows were stored in mixed case. */
function codeKey(codeId: string): string {
    return codeId.toUpperCase();
}

function codeIdSet(entries: { codeId: string }[] | undefined): Set<string> {
    return new Set((entries ?? []).map((entry) => codeKey(entry.codeId)));
}

function byDateThenId(a: { eventDate: string; id: string }, b: { eventDate: string; id: string }): number {
    return a.eventDate.localeCompare(b.eventDate) || a.id.localeCompare(b.id);
}
