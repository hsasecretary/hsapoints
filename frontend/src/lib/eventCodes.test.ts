import { describe, expect, it } from 'vitest';
import { filterCodes, groupByWeek, NO_EVENT_TYPE, prepareNewCode, semesterLabel, semesterOptions, suggestCode, type CodeFilters } from './eventCodes';

const form = { event: ' GBM 3 ', code: 'gbm3', eventDate: '2026-10-08', eventTypeId: 'gbm', graphicDate: '' };

describe('preparing a new event code', () => {
    it('stores the Event Type and none of the old per-event point fields', () => {
        expect(prepareNewCode(form)).toEqual({
            ok: true,
            id: 'GBM3',
            data: { event: 'GBM 3', eventDate: '2026-10-08', eventTypeId: 'gbm', attendeeCount: 0 },
        });
    });

    it('keeps a graphic date when one is given', () => {
        expect(prepareNewCode({ ...form, graphicDate: '2026-09-24' })).toMatchObject({
            ok: true,
            data: { graphicDate: '2026-09-24' },
        });
    });

    it.each([
        ['no name', { event: '  ' }, 'Give the event a name.'],
        ['no code', { code: ' ' }, 'Give it a code.'],
        ['a code with spaces or symbols', { code: 'GBM 3!' }, 'Codes can only use letters and numbers.'],
        ['no date', { eventDate: '' }, 'Pick the event date.'],
        ['no Event Type', { eventTypeId: '' }, 'Pick an Event Type.'],
        ['an Event Type that never gets codes', { eventTypeId: 'tabling' }, 'Pick an Event Type.'],
        ['an Event Type not in the rubric', { eventTypeId: 'Other' }, 'Pick an Event Type.'],
        ['a graphic posted after the event', { graphicDate: '2026-10-09' }, "The graphic can't be posted after the event."],
    ])('refuses %s', (_, change, error) => {
        expect(prepareNewCode({ ...form, ...change })).toEqual({ ok: false, error });
    });
});

describe('the code the add row suggests from the name', () => {
    it('is the name in capitals without spaces, symbols or accents', () => {
        expect(suggestCode('Lotería #2')).toBe('LOTERIA2');
    });

    it('stops at 12 characters so it stays easy to type', () => {
        expect(suggestCode('Cabinet Thursday Week Five')).toBe('CABINETTHURS');
    });
});

describe('Semesters', () => {
    it('reads the Semester off the event date', () => {
        expect(semesterLabel('2026-09-10')).toBe('Fall 2026');
        expect(semesterLabel('2027-01-21')).toBe('Spring 2027');
        expect(semesterLabel('2026-05-31')).toBe('Spring 2026');
        // Summer counts toward the coming Fall.
        expect(semesterLabel('2026-07-15')).toBe('Fall 2026');
    });

    it("offers this school year's Semesters first, then earlier ones that have codes, newest first", () => {
        const dates = ['2026-09-10', '2026-03-12', '2025-10-01', '2026-02-20', '2027-01-21'];
        expect(semesterOptions(dates, '2026-09-26')).toEqual({
            thisYear: ['Fall 2026', 'Spring 2027'],
            earlier: ['Spring 2026', 'Fall 2025'],
        });
    });

    it('counts January to May as the spring of the school year that began the fall before', () => {
        expect(semesterOptions([], '2027-02-01').thisYear).toEqual(['Fall 2026', 'Spring 2027']);
    });

    it('lists codes without a date under "No date", last', () => {
        expect(semesterOptions(['', '2025-10-01'], '2026-09-26').earlier).toEqual(['Fall 2025', 'No date']);
    });
});

describe('filtering the codes list', () => {
    const TODAY = '2026-09-26';
    const codes = [
        { id: 'GBM2', event: 'GBM 2', eventDate: '2026-09-10', eventTypeId: 'gbm' },
        { id: 'GBM3', event: 'GBM 3', eventDate: '2026-10-08', eventTypeId: 'gbm' },
        { id: 'EMPANADA', event: 'Empanada Sale', eventDate: '2026-09-26', eventTypeId: 'hsa-fundraising' },
        { id: 'MIXER', event: 'Mixer with HSO', eventDate: '2026-09-20', eventTypeId: 'external-social' },
        { id: 'OLDONE', event: 'Old social', eventDate: '2026-09-01' },
        { id: 'GBM9', event: 'GBM 9', eventDate: '2026-03-12', eventTypeId: 'gbm' },
    ];
    const all: CodeFilters = { semester: 'Fall 2026', when: 'all', tiers: [], eventTypeIds: [], search: '' };
    const ids = (filters: Partial<CodeFilters>, ignore?: keyof CodeFilters) =>
        filterCodes(codes, { ...all, ...filters }, TODAY, ignore).map((code) => code.id);

    it("shows one Semester's codes", () => {
        expect(ids({})).toEqual(['GBM2', 'GBM3', 'EMPANADA', 'MIXER', 'OLDONE']);
        expect(ids({ semester: 'Spring 2026' })).toEqual(['GBM9']);
    });

    it("splits upcoming (today on) from past", () => {
        expect(ids({ when: 'upcoming' })).toEqual(['GBM3', 'EMPANADA']);
        expect(ids({ when: 'past' })).toEqual(['GBM2', 'MIXER', 'OLDONE']);
    });

    it('filters by tier and by Event Type, including codes with no Event Type yet', () => {
        expect(ids({ tiers: ['semester', 'additional'] })).toEqual(['EMPANADA', 'MIXER']);
        expect(ids({ eventTypeIds: ['gbm', NO_EVENT_TYPE] })).toEqual(['GBM2', 'GBM3', 'OLDONE']);
    });

    it('searches the code and the event name, ignoring case', () => {
        expect(ids({ search: 'empanada' })).toEqual(['EMPANADA']);
        expect(ids({ search: ' gbm3' })).toEqual(['GBM3']);
    });

    it('can leave one facet out, so its counts show what choosing it would give', () => {
        expect(ids({ semester: 'Spring 2026', tiers: ['core'] }, 'semester')).toEqual(['GBM2', 'GBM3', 'GBM9']);
    });
});

describe('grouping the list by week', () => {
    it('puts upcoming codes soonest first and past ones latest first, each by the week (from Sunday) they fall in', () => {
        const codes = [
            { id: 'A', event: 'A', eventDate: '2026-09-10' }, // Thu
            { id: 'B', event: 'B', eventDate: '2026-10-08' },
            { id: 'C', event: 'C', eventDate: '2026-09-26' }, // today, a Saturday
            { id: 'D', event: 'D', eventDate: '2026-09-20' }, // Sun
            { id: 'E', event: 'E', eventDate: '2026-09-07' }, // Mon, same week as A
            { id: 'F', event: 'F', eventDate: '2026-09-21' },
        ];
        const shape = (groups) => groups.map(({ weekOf, codes }) => [weekOf, codes.map((code) => code.id)]);

        const { upcoming, past } = groupByWeek(codes, '2026-09-26');

        expect(shape(upcoming)).toEqual([['2026-09-20', ['C']], ['2026-10-04', ['B']]]);
        expect(shape(past)).toEqual([['2026-09-20', ['F', 'D']], ['2026-09-06', ['A', 'E']]]);
    });
});
