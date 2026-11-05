// The code box's Make-up pick (#121): whether checking in with a code takes
// a second step to say what it makes up, and what to tell the Member once
// it's done. Pure, so it's tested without Firestore.
import { computeStanding, type Attendance, type Code, type Member } from './computeStanding';
import { isHeldToCabinetRules } from './members';
import { missedEventName, standingChange } from './pointRequests';
import { eventType, rubric } from './rubric';

export type OwedMiss = { codeId: string; name: string; eventDate: string; strike: boolean };

export type CheckInChoice = {
    /** The requirement (an Event Type) the code fills when nothing is picked; null when it's Surplus anyway. */
    fills: string | null;
    /** The owed Missed Events, oldest first. */
    options: OwedMiss[];
    /** What the dropdown starts on: null ("count it toward my requirement") when it fills one, else the automatic Make-up. */
    initial: string | null;
};

type Options = { email: string; today: string };

function wouldBe(code: Code, email: string, makeupFor: string | null): Attendance {
    return {
        id: `${email.toLowerCase()}__${code.id}`,
        eventTypeId: code.eventTypeId,
        eventDate: code.eventDate,
        source: 'code',
        codeId: code.id,
        ...(makeupFor ? { makeupFor } : {}),
    };
}

/**
 * The second step, or null when checking in stays one step: the Member owes
 * no Missed Event (counting out those a pending Point Request names), or
 * the code is for a Core Event, which can't be a Make-up.
 */
export function checkInChoice(
    member: Member,
    attendances: Attendance[],
    codes: Code[],
    code: Code,
    pendingPicks: Set<string>,
    { email, today }: Options,
): CheckInChoice | null {
    const type = eventType(code.eventTypeId);
    if (!type || type.tier === 'core') return null;
    const standing = computeStanding(member, attendances, rubric, codes, { today });
    const options = standing.missedEvents
        .filter((missed) => missed.owed && !pendingPicks.has(missed.codeId))
        .map((missed) => ({ codeId: missed.codeId, name: missedEventName(codes, missed), eventDate: missed.eventDate, strike: missed.strike }));
    if (!options.length) return null;
    const [unpicked] = standingChange(member, attendances, codes, [wouldBe(code, email, null)], { today }).attendances;
    if (!unpicked.surplus) return { fills: code.eventTypeId, options, initial: null };
    const auto = options.find((row) => row.codeId === unpicked.makeupFor);
    return { fills: null, options, initial: (auto ?? options[0]).codeId };
}

export type CheckInOutcome = {
    /** The code's event name. */
    event: string;
    /** The Missed Event it made up, and whether that cleared a Strike. Never whether it was excused. */
    madeUp: { name: string; eventDate: string; strike: boolean } | null;
    /** The label of the requirement it filled. */
    filled: string | null;
};

/** What checking in with `code` (and `makeupFor`) does, worked out before it's written. */
export function checkInOutcome(
    member: Member,
    attendances: Attendance[],
    codes: Code[],
    code: Code,
    makeupFor: string | null,
    { email, today }: Options,
): CheckInOutcome {
    const type = eventType(code.eventTypeId);
    const event = code.event || type?.label || code.id;
    if (!type || !isHeldToCabinetRules(member)) return { event, madeUp: null, filled: null };
    const change = standingChange(member, attendances, codes, [wouldBe(code, email, makeupFor)], { today });
    const [added] = change.attendances;
    // This Attendance's own Make-up, not just any miss the change closed.
    const covered = added.makeupFor && change.covers.find((missed) => missed.codeId === added.makeupFor);
    return {
        event,
        madeUp: covered ? { name: missedEventName(codes, covered), eventDate: covered.eventDate, strike: covered.strike } : null,
        filled: type.tier === 'semester' && !added.surplus ? type.label : null,
    };
}
