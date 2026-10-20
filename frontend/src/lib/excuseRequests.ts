// Excuse Requests: a Cabinet Member or Web-team Tester files a request before
// a Core Event they can't make; E-Board reviews pending requests on Excuse
// Absence. Pure helpers here cover what Core Events are offered, the request
// docs a filing builds, and the E-Board inbox ordering and badge count.
import type { Attendance, Code, Member } from './computeStanding';
import { isHeldToCabinetRules } from './members';
import { eventType } from './rubric';
import { academicYear } from './semester';

export type ExcuseRequestStatus = 'pending' | 'approved' | 'denied';

/** An excuseRequests/{email}__{CODE} document. */
export type ExcuseRequestDoc = {
    email: string;
    codeId: string;
    eventName: string;
    eventTypeId: string;
    /** 'YYYY-MM-DD'. */
    eventDate: string;
    reason: string;
    /** ISO timestamp of when the Member filed the request. */
    filedAt: string;
    status: ExcuseRequestStatus;
    reviewedBy: string | null;
    reviewedAt: string | null;
    /** Denial reason from E-Board (empty on pending or approved requests). */
    reviewNotes: string;
};

export type ExcuseRequest = ExcuseRequestDoc & { id: string };

/** One upcoming Core Event offered in the "Excuse an absence" bubble (never the check-in code). */
export type ExcusableEvent = {
    codeId: string;
    name: string;
    eventTypeId: string;
    /** 'YYYY-MM-DD'. */
    eventDate: string;
};

export type ExcusableContext = {
    member: Member;
    codes: Code[];
    attendances: Attendance[];
    /** Existing Excuse Requests of the Member's (any already filed are left out). */
    requests?: Pick<ExcuseRequestDoc, 'codeId'>[];
    /** Local date as 'YYYY-MM-DD'. */
    today: string;
};

/** The display name for a Core Event: its event title, else its Event Type label — never its check-in code. */
export function coreEventName(code: Pick<Code, 'event' | 'eventTypeId'>): string {
    return code.event?.trim() || eventType(code.eventTypeId ?? '')?.label || 'Core Event';
}

/** Whether a Member may file Excuse Requests: held to Cabinet rules and not E-Board exempt. */
export function canFileExcuseRequests(member: Member): boolean {
    if (!isHeldToCabinetRules(member) || member.exemptView === true) return false;
    if (member.eboard === true && !member.webTeam) return false;
    return true;
}

/** Deterministic document ID `{email}__{CODE}` so a Member can have at most one request per Core Event. */
export function excuseRequestId(email: string, codeId: string): string {
    return `${email.toLowerCase()}__${codeId.toUpperCase()}`;
}

/**
 * Upcoming Core Events the Member can file an Excuse Request for:
 * Core Event tier only, coded only, today or later in this school year,
 * leaving out any already attended or already filed. E-Board-exempt gets none.
 */
export function excusableEvents({
    member,
    codes,
    attendances,
    requests = [],
    today,
}: ExcusableContext): ExcusableEvent[] {
    if (!canFileExcuseRequests(member)) return [];
    const { end } = academicYear(today);
    const taken = new Set([
        ...attendances.filter((a) => a.codeId).map((a) => a.codeId.toUpperCase()),
        ...requests.map((r) => r.codeId.toUpperCase()),
    ]);

    return codes
        .filter((code) => {
            const id = code.id?.trim();
            if (!id || !code.eventTypeId || !code.eventDate) return false;            if (eventType(code.eventTypeId)?.tier !== 'core') return false;
            if (code.eventDate < today || code.eventDate > end) return false;
            return !taken.has(id.toUpperCase());
        })
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.id.localeCompare(b.id))
        .map((code) => ({
            codeId: code.id.toUpperCase(),
            name: coreEventName(code),
            eventTypeId: code.eventTypeId,
            eventDate: code.eventDate,
        }));
}

export type ExcuseFilingDraft = {
    codeIds: string[];
    reason: string;
};

export type BuildExcuseContext = ExcusableContext & {
    email: string;
    /** ISO timestamp passed in so filing time is stored and testable without Firestore. */
    filedAt: string;
};

export type NewExcuseRequest = { id: string; data: Omit<ExcuseRequestDoc, 'filedAt'> & { filedAt: unknown } };

export type BuiltExcuseRequests =
    | { ok: true; requests: NewExcuseRequest[] }
    | { ok: false; error: string };

export const EXCUSE_EVENT_REQUIRED = 'Pick at least one upcoming Core Event.';
export const EXCUSE_REASON_REQUIRED = 'Write a reason for missing the event.';

/**
 * Validates a Member's filing and builds one `excuseRequests/{email}__{CODE}`
 * document per selected Core Event, sharing the trimmed reason and filing timestamp.
 */
export function buildExcuseRequests(
    draft: ExcuseFilingDraft,
    context: BuildExcuseContext,
): BuiltExcuseRequests {
    const email = context.email.trim().toLowerCase();
    if (!email) return { ok: false, error: 'Sign in to file an Excuse Request.' };
    if (!canFileExcuseRequests(context.member)) {
        return { ok: false, error: 'Only Cabinet Members need to file Excuse Requests.' };
    }

    const pickedKeys = [...new Set(draft.codeIds.map((id) => id.trim().toUpperCase()).filter(Boolean))];
    if (pickedKeys.length === 0) return { ok: false, error: EXCUSE_EVENT_REQUIRED };

    const reason = draft.reason.trim();
    if (!reason) return { ok: false, error: EXCUSE_REASON_REQUIRED };

    const offered = new Map(excusableEvents(context).map((event) => [event.codeId.toUpperCase(), event]));
    for (const key of pickedKeys) {
        if (!offered.has(key)) {
            return { ok: false, error: 'One of the selected events can no longer be requested.' };
        }
    }

    const requests: NewExcuseRequest[] = pickedKeys
        .map((key) => offered.get(key))
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.codeId.localeCompare(b.codeId))
        .map((event) => ({
            id: excuseRequestId(email, event.codeId),
            data: {
                email,
                codeId: event.codeId,
                eventName: event.name,
                eventTypeId: event.eventTypeId,
                eventDate: event.eventDate,
                reason,
                filedAt: context.filedAt,
                status: 'pending',
                reviewedBy: null,
                reviewedAt: null,
                reviewNotes: '',
            },
        }));

    return { ok: true, requests };
}

/** How many Excuse Requests are still waiting on E-Board, for the E-Board menu badge. */
export function pendingExcuseCount(requests: readonly Pick<ExcuseRequestDoc, 'status'>[]): number {
    return requests.filter((request) => request.status === 'pending').length;
}

/**
 * E-Board's pending Excuse Request inbox: only pending requests, ordered by
 * soonest Core Event date first, then earliest filing timestamp, then ID.
 */
export function excuseInbox<T extends Pick<ExcuseRequest, 'id' | 'status' | 'eventDate' | 'filedAt'>>(
    requests: readonly T[],
): T[] {
    return requests
        .filter((request) => request.status === 'pending')
        .sort(
            (a, b) =>
                a.eventDate.localeCompare(b.eventDate)
                || a.filedAt.localeCompare(b.filedAt)
                || a.id.localeCompare(b.id),
        );
}