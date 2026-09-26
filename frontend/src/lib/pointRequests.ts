// Submit Point Request (variant C, #47 / #71): which bubbles a Member picks
// from, what a request would earn and make up if E-Board approves it, and the
// pointRequests/{id} doc it saves. Pure, so it's tested without Firestore;
// points and Make-ups come only from computeStanding.
import { computeStanding, type Attendance, type Code, type Member } from './computeStanding';
import { eventType, rubric, tierLabels, tiers } from './rubric';
import { fromIsoDate } from './semester';

/** The "Not listed" bubble: E-Board picks the Event Type on review, or denies it or records an Adjustment. */
export const NOT_LISTED = 'not-listed';

/** One bubble: an Event Type, or (for General Members) a few shown as one. */
export type TypeChoice = { id: string; label: string; eventTypeIds: string[] };

export type TypeChoiceGroup = { label: string; choices: TypeChoice[] };

// General Members see no tiers: OPA's two Event Types are one bubble, and
// E-Board confirms which on review (#47).
const generalGroups: { label: string; choices: (string | TypeChoice)[] }[] = [
    {
        label: 'HSA events',
        choices: [
            'gbm',
            { id: 'opa', label: 'OPA', eventTypeIds: ['opa-general', 'opa-solidarity-session'] },
            'hsa-programming', 'hsa-operations', 'hsa-fundraising', 'hsa-service', 'tabling',
        ],
    },
    { label: 'Affiliates', choices: ['affiliate-org', 'hlhm', 'hlsa', 'crash'] },
    { label: 'Socials and MLP', choices: ['external-social', 'mlp-open'] },
];

/** The bubble for one Event Type. */
export function typeChoiceFor(eventTypeId: string): TypeChoice {
    const type = rubric.find((row) => row.id === eventTypeId);
    return { id: type.id, label: type.label, eventTypeIds: [type.id] };
}

/**
 * The "Something else" search's bubbles. Members held to the Cabinet rules
 * get every Event Type by tier; General Members get friendlier groups
 * without the Cabinet-only ones.
 */
export function pickerGroups(heldToCabinetRules: boolean): TypeChoiceGroup[] {
    if (heldToCabinetRules) {
        return tiers.map((tier) => ({
            label: `${tierLabels[tier]}s`,
            choices: rubric.filter((type) => type.tier === tier).map((type) => typeChoiceFor(type.id)),
        }));
    }
    return generalGroups.map((group) => ({
        label: group.label,
        choices: group.choices.map((choice) => (typeof choice === 'string' ? typeChoiceFor(choice) : choice)),
    }));
}

/** A school year runs June to May, since June and July count toward the coming Fall. */
export function academicYear(today: string): { start: string; end: string } {
    const date = fromIsoDate(today);
    const fallYear = date.getMonth() + 1 >= 6 ? date.getFullYear() : date.getFullYear() - 1;
    return { start: `${fallYear}-06-01`, end: `${fallYear + 1}-05-31` };
}

export type EventChoiceContext = {
    codes: Code[];
    attendances: Attendance[];
    /** Codes the Member already has a pending Point Request for. */
    pendingCodeIds: string[];
    /** Local date as 'YYYY-MM-DD'. */
    today: string;
};

export type EventChoices = {
    /** Past events of the picked Event Types, newest first. */
    codes: Code[];
    /** Offers an Other bubble for an event E-Board never made a code for. */
    other: boolean;
    /** Tabling and CRASH never get codes: the Member names the event instead. */
    codeless: boolean;
};

/** The event bubbles for a picked Event Type bubble. */
export function eventChoices(choice: TypeChoice, { codes, attendances, pendingCodeIds, today }: EventChoiceContext): EventChoices {
    const types = choice.eventTypeIds.map(eventType);
    if (types.every((type) => !type.codeable)) return { codes: [], other: false, codeless: true };
    const { start } = academicYear(today);
    const taken = new Set([
        ...attendances.filter((attendance) => attendance.codeId).map((attendance) => attendance.codeId.toUpperCase()),
        ...pendingCodeIds.map((id) => id.toUpperCase()),
    ]);
    return {
        codes: codes
            .filter((code) => choice.eventTypeIds.includes(code.eventTypeId)
                && code.eventDate >= start && code.eventDate <= today
                && !taken.has(code.id.toUpperCase()))
            .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || a.id.localeCompare(b.id)),
        // Every Core Event gets a code, so one without a code isn't owed.
        other: types.every((type) => type.tier !== 'core'),
        codeless: false,
    };
}

/** What the Member has filled in so far. */
export type RequestDraft = {
    /** The bubble the Member picked: an Event Type, a group such as 'opa',
     *  or NOT_LISTED. Null until they pick one. */
    typeChoiceId?: string | null;
    /** A rubric Event Type, or null when E-Board must pick it on review: a
     *  General Member's OPA bubble without a code, or "Not listed". */
    eventTypeId: string | null;
    /** The event's code, when the Member picked one; its Event Type and date win. */
    codeId: string | null;
    /** For an event without a code. */
    eventName: string;
    /** 'YYYY-MM-DD'. */
    eventDate: string;
    /** "What did you do?" */
    note: string;
    /** Tabling only: each hour is its own Attendance. */
    hours: number;
    /** One per Attendance the request would become (per hour for Tabling):
     *  the Missed Event (codeId) to make up, or null for "Pick for me". */
    makeupFor: (string | null)[];
    /** The compressed photo as a data URL. */
    photo: string;
};

export type RequestPreview = {
    cabinetPoints: number;
    vePoints: number;
    /** One per Attendance the request would become, in hour order. */
    attendances: { surplus: boolean; makeupFor: string | null }[];
    /** The Missed Events it would close, oldest first, and whether each still carried a Strike. */
    covers: { codeId: string; eventTypeId: string; eventDate: string; strike: boolean }[];
};

export type PreviewOptions = {
    email: string;
    /** Local date as 'YYYY-MM-DD'. */
    today: string;
    viewingAsCabinet?: boolean;
};

/** How many Attendances a request becomes: one per hour for Tabling, else one. */
export function attendanceCount(draft: Pick<RequestDraft, 'eventTypeId' | 'hours'>): number {
    return eventType(draft.eventTypeId ?? '')?.perHour ? Math.max(1, Math.floor(draft.hours) || 1) : 1;
}

/**
 * "If E-Board approves it": the Member's standing with and without the
 * Attendance the request would become. Null until its Event Type and date
 * are known.
 */
export function previewRequest(
    member: Member,
    attendances: Attendance[],
    codes: Code[],
    draft: RequestDraft,
    { email, today, viewingAsCabinet }: PreviewOptions,
): RequestPreview | null {
    if (!draft.eventTypeId || !draft.eventDate) return null;
    const count = attendanceCount(draft);
    const wouldBe: Attendance[] = Array.from({ length: count }, (_, i) => ({
        // The IDs approval gives them (ADR-0002), with a stand-in request ID.
        id: draft.codeId ? `${email}__${draft.codeId}` : `${email}__req-new${count > 1 ? `-h${i + 1}` : ''}`,
        eventTypeId: draft.eventTypeId,
        eventDate: draft.eventDate,
        source: 'request',
        ...(draft.codeId ? { codeId: draft.codeId } : {}),
        ...(draft.makeupFor[i] ? { makeupFor: draft.makeupFor[i] } : {}),
    }));
    const options = { today, viewingAsCabinet };
    const before = computeStanding(member, attendances, rubric, codes, options);
    const after = computeStanding(member, [...attendances, ...wouldBe], rubric, codes, options);
    const stillOwed = new Set(after.missedEvents.filter((missed) => missed.owed).map((missed) => missed.codeId));
    return {
        cabinetPoints: after.cabinetPoints - before.cabinetPoints,
        vePoints: after.vePoints - before.vePoints,
        attendances: wouldBe.map((attendance) => {
            const surplus = after.surplus.find((row) => row.attendanceId === attendance.id);
            return { surplus: Boolean(surplus), makeupFor: surplus?.makeupFor ?? null };
        }),
        // Net of any Make-up that moved: naming a missed code closes it
        // outright, and a Surplus hour may push an older Make-up along.
        covers: before.missedEvents
            .filter((missed) => missed.owed && !stillOwed.has(missed.codeId))
            .map((missed) => ({ codeId: missed.codeId, eventTypeId: missed.eventTypeId, eventDate: missed.eventDate, strike: missed.strike })),
    };
}

/** A pointRequests/{id} doc as the Member submits it (submittedAt is added on save). */
export type PointRequestDoc = {
    userEmail: string;
    /** The event's code, when the Member named one: approving it counts as redeeming it. */
    codeId: string | null;
    typeChoiceId: string;
    /** The Member's pick, which E-Board confirms on review; null leaves it to them. */
    eventTypeId: string | null;
    activityName: string;
    date: string;
    description: string;
    /** Tabling only. */
    hours?: number;
    /** One per Attendance approval writes; null is "Pick for me". */
    makeupFor: (string | null)[];
    imageData: string;
    /** Worked out from the rubric, never chosen, for the old review page
     *  and My Requests until the review rework (#72). */
    pointsRequested: number;
    status: 'pending';
    reviewedAt: null;
    reviewedBy: null;
    reviewNotes: '';
};

export type BuildContext = { email: string; codes: Code[]; today: string };

export type Built = { ok: true; data: PointRequestDoc } | { ok: false; error: string };

const MAX_HOURS = 12;

/** Checks a draft and turns it into the doc to save. */
export function buildPointRequest(draft: RequestDraft, { email, codes, today }: BuildContext): Built {
    if (!draft.typeChoiceId) return { ok: false, error: 'Pick the event you went to.' };
    const code = draft.codeId ? codes.find((row) => row.id === draft.codeId) : undefined;
    if (draft.codeId && !code) return { ok: false, error: 'Pick the event you went to.' };
    const eventTypeId = code?.eventTypeId ?? draft.eventTypeId;
    const type = eventType(eventTypeId ?? '');
    const date = code?.eventDate ?? draft.eventDate;
    const note = draft.note.trim();
    const name = draft.eventName.trim();

    if (!code) {
        // Tabling is named by its Event Type; every other event without a code needs a name.
        if (!type?.perHour && !name) return { ok: false, error: 'Name the event.' };
        if (!date) return { ok: false, error: 'Pick the date of the event.' };
        if (date > today) return { ok: false, error: "The event can't be in the future." };
        if (!note) return { ok: false, error: 'Say what you did.' };
    }
    if (type?.perHour && !(Number.isInteger(draft.hours) && draft.hours >= 1 && draft.hours <= MAX_HOURS)) {
        return { ok: false, error: `Enter whole hours, from 1 to ${MAX_HOURS}.` };
    }
    if (!draft.photo) return { ok: false, error: 'Add a photo from the event.' };

    const count = attendanceCount({ eventTypeId, hours: draft.hours });
    return {
        ok: true,
        data: {
            userEmail: email,
            codeId: code ? code.id : null,
            typeChoiceId: draft.typeChoiceId,
            eventTypeId: eventTypeId ?? null,
            activityName: code?.event || name || type?.label || '',
            date,
            description: note,
            ...(type?.perHour ? { hours: count } : {}),
            makeupFor: Array.from({ length: count }, (_, i) => draft.makeupFor[i] ?? null),
            imageData: draft.photo,
            pointsRequested: (type?.vePoints ?? 0) * count,
            status: 'pending',
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: '',
        },
    };
}

/**
 * "I made it up at another event": the Event Types an event today would be
 * Surplus Attendance for, so it can be a Make-up. Tabling always, since
 * any hour after the first is Surplus.
 */
export function makeupTypeChoices(member: Member, attendances: Attendance[], codes: Code[], options: PreviewOptions): TypeChoice[] {
    return rubric
        .filter((type) => {
            const preview = previewRequest(member, attendances, codes, {
                typeChoiceId: type.id, eventTypeId: type.id, codeId: null, eventName: '', eventDate: options.today,
                note: '', hours: 2, makeupFor: [], photo: '',
            }, options);
            return preview.attendances.some((attendance) => attendance.surplus);
        })
        .map((type) => typeChoiceFor(type.id));
}
