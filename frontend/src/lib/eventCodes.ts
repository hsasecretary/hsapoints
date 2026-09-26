// Event codes as E-Board manages them on /eboard/event-codes (#70). A code
// stores its Event Type; its points come only from lib/rubric.ts and its
// Semester only from its date (docs/adr/0002-attendance-ledger-calculated-on-read.md).
// The Firestore functions take the instance so tests can run them against
// the emulator.
import {
    collection, deleteField, doc, getDocs, limit, query, runTransaction, where, writeBatch, type Firestore,
} from 'firebase/firestore';
import { eventType, type Tier } from './rubric';
import { currentSemester, fromIsoDate, toIsoDate } from './semester';

export type CodeForm = {
    event: string;
    /** As typed; stored uppercase as the doc ID. */
    code: string;
    eventDate: string;
    eventTypeId: string;
    /** Optional, for reference only: it has no effect on VE Points. */
    graphicDate: string;
};

export type CodeDoc = {
    event: string;
    eventDate: string;
    eventTypeId: string;
    attendeeCount: number;
    graphicDate?: string;
};

export type Prepared =
    | { ok: true; id: string; data: CodeDoc }
    | { ok: false; error: string };

export function prepareNewCode(form: CodeForm): Prepared {
    const id = form.code.trim().toUpperCase();
    if (!id) return { ok: false, error: 'Give it a code.' };
    // The code is the doc ID, and members type it on their phones.
    if (!/^[A-Z0-9]+$/.test(id)) return { ok: false, error: 'Codes can only use letters and numbers.' };
    const error = checkDetails(form);
    if (error) return { ok: false, error };
    return { ok: true, id, data: { ...codeDetails(form), attendeeCount: 0 } };
}

export type CodeEdit = Pick<CodeForm, 'event' | 'eventDate' | 'eventTypeId' | 'graphicDate'>;

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Adds a code, unless its code is taken. */
export async function createCode(db: Firestore, form: CodeForm): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    const prepared = prepareNewCode(form);
    if (!prepared.ok) return prepared;
    const { id, data } = prepared;
    const ref = doc(db, 'codes', id);
    return runTransaction(db, async (tx) => {
        if ((await tx.get(ref)).exists()) return { ok: false, error: `${id} is already a code.` } as const;
        tx.set(ref, data);
        return { ok: true, id } as const;
    });
}

/**
 * Saves a code's details. Each Attendance copies its code's Event Type and
 * date (ADR-0002), so the code's Attendance moves with it. The old
 * category/points fields on codes made before Event Types are left for the
 * migration.
 */
export async function updateCode(db: Firestore, codeId: string, edit: CodeEdit): Promise<SaveResult> {
    const error = checkDetails(edit);
    if (error) return { ok: false, error };
    const attendance = await getDocs(query(collection(db, 'attendances'), where('codeId', '==', codeId)));
    const batch = writeBatch(db);
    batch.update(doc(db, 'codes', codeId), {
        ...codeDetails(edit),
        graphicDate: edit.graphicDate || deleteField(),
    });
    for (const snap of attendance.docs) {
        batch.update(snap.ref, { eventTypeId: edit.eventTypeId, eventDate: edit.eventDate });
    }
    await batch.commit();
    return { ok: true };
}

/** Deletes a code, but only one nobody has checked in to: Attendance points at its code. */
export async function deleteCode(db: Firestore, codeId: string): Promise<SaveResult> {
    const ref = doc(db, 'codes', codeId);
    const attendance = await getDocs(query(collection(db, 'attendances'), where('codeId', '==', codeId), limit(1)));
    return runTransaction(db, async (tx) => {
        const count: number = (await tx.get(ref)).data()?.attendeeCount ?? 0;
        if (count > 0 || !attendance.empty) {
            const checkedIn = Math.max(count, 1);
            const who = checkedIn === 1 ? '1 person has' : `${checkedIn} people have`;
            return { ok: false, error: `${who} checked in to ${codeId}, so it can't be deleted.` } as const;
        }
        tx.delete(ref);
        return { ok: true } as const;
    });
}

// What both adding and editing a code check.
function checkDetails(form: CodeEdit): string | null {
    if (!form.event.trim()) return 'Give the event a name.';
    if (!form.eventDate) return 'Pick the event date.';
    // Tabling and CRASH never get codes; they arrive only by Point Request.
    if (!eventType(form.eventTypeId)?.codeable) return 'Pick an Event Type.';
    if (form.graphicDate && form.graphicDate > form.eventDate) return "The graphic can't be posted after the event.";
    return null;
}

function codeDetails(form: CodeEdit): Omit<CodeDoc, 'attendeeCount'> {
    return {
        event: form.event.trim(),
        eventDate: form.eventDate,
        eventTypeId: form.eventTypeId,
        ...(form.graphicDate ? { graphicDate: form.graphicDate } : {}),
    };
}

const NO_DATE = 'No date';

/** The code the add row fills in from the event name, until E-Board types their own. */
export function suggestCode(eventName: string): string {
    return eventName
        .normalize('NFD')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 12);
}

/** 'Fall 2026' or 'Spring 2027': Semester comes from the event date, never a stored field. */
export function semesterLabel(isoDate: string): string {
    if (!isoDate) return NO_DATE;
    const year = fromIsoDate(isoDate).getFullYear();
    return currentSemester(fromIsoDate(isoDate)) === 'springPoints' ? `Spring ${year}` : `Fall ${year}`;
}

/**
 * The Semester facet: this school year's two Semesters (in September 2026,
 * Fall 2026 and the coming Spring 2027), then earlier ones that still have
 * codes, newest first.
 */
export function semesterOptions(eventDates: string[], today: string): { thisYear: string[]; earlier: string[] } {
    const fallYear = semesterLabel(today).startsWith('Spring') ? fromIsoDate(today).getFullYear() - 1 : fromIsoDate(today).getFullYear();
    const thisYear = [`Fall ${fallYear}`, `Spring ${fallYear + 1}`];
    const earlier = [...new Set(eventDates.map(semesterLabel))]
        .filter((semester) => !thisYear.includes(semester))
        .sort((a, b) => semesterOrder(b) - semesterOrder(a));
    return { thisYear, earlier };
}

// Spring 2026 < Fall 2026 < Spring 2027.
function semesterOrder(label: string): number {
    if (label === NO_DATE) return -Infinity;
    const [term, year] = label.split(' ');
    return Number(year) * 2 + (term === 'Fall' ? 1 : 0);
}

/** A code as the list shows it: codes/{CODE} plus its ID. */
export type CodeRow = {
    id: string;
    event: string;
    eventDate: string;
    /** Missing on codes made before Event Types, until the migration types them. */
    eventTypeId?: string | null;
    attendeeCount?: number;
    graphicDate?: string;
    /** The old category, kept on codes made before Event Types. */
    category?: string;
};

/** The Event Type facet's choice for codes that don't have one yet. */
export const NO_EVENT_TYPE = 'none';

export type CodeFilters = {
    semester: string;
    /** Upcoming is today and later. */
    when: 'all' | 'upcoming' | 'past';
    /** Empty means any. */
    tiers: Tier[];
    /** Empty means any; NO_EVENT_TYPE matches codes without one. */
    eventTypeIds: string[];
    search: string;
};

/**
 * The codes that pass every filter. Pass `ignore` to leave one filter out:
 * that facet's counts then show what picking each option would give.
 */
export function filterCodes<T extends CodeRow>(codes: T[], filters: CodeFilters, today: string, ignore?: keyof CodeFilters): T[] {
    const term = filters.search.trim().toLowerCase();
    return codes.filter((code) => {
        const type = eventType(code.eventTypeId ?? '');
        return (ignore === 'semester' || semesterLabel(code.eventDate) === filters.semester)
            && (ignore === 'when' || filters.when === 'all' || (filters.when === 'upcoming') === (code.eventDate >= today))
            && (ignore === 'tiers' || filters.tiers.length === 0 || (type && filters.tiers.includes(type.tier)))
            && (ignore === 'eventTypeIds' || filters.eventTypeIds.length === 0
                || filters.eventTypeIds.includes(type ? type.id : NO_EVENT_TYPE))
            && (ignore === 'search' || !term
                || code.id.toLowerCase().includes(term) || (code.event ?? '').toLowerCase().includes(term));
    });
}

export type WeekGroup<T> = {
    /** The Sunday that starts the week, as 'YYYY-MM-DD' ('' for codes with no date). */
    weekOf: string;
    codes: T[];
};

/**
 * The list's two blocks: upcoming codes (today and later) soonest first, and
 * past ones most recent first, each grouped by week.
 */
export function groupByWeek<T extends CodeRow>(codes: T[], today: string): { upcoming: WeekGroup<T>[]; past: WeekGroup<T>[] } {
    const byDate = (a: T, b: T) => a.eventDate.localeCompare(b.eventDate) || a.id.localeCompare(b.id);
    const upcoming = codes.filter((code) => code.eventDate >= today).sort(byDate);
    const past = codes.filter((code) => code.eventDate < today).sort((a, b) => byDate(b, a));
    return { upcoming: intoWeeks(upcoming), past: intoWeeks(past) };
}

function intoWeeks<T extends CodeRow>(sorted: T[]): WeekGroup<T>[] {
    const groups: WeekGroup<T>[] = [];
    for (const code of sorted) {
        const weekOf = startOfWeek(code.eventDate);
        const last = groups[groups.length - 1];
        if (last?.weekOf === weekOf) last.codes.push(code);
        else groups.push({ weekOf, codes: [code] });
    }
    return groups;
}

function startOfWeek(isoDate: string): string {
    if (!isoDate) return '';
    const date = fromIsoDate(isoDate);
    date.setDate(date.getDate() - date.getDay());
    return toIsoDate(date);
}
