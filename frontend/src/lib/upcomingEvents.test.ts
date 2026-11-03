import { describe, expect, it } from 'vitest';
import type { Code } from './computeStanding';
import { addDays } from './semester';
import { dayName, upcomingEvents, UPCOMING_LIMIT } from './upcomingEvents';

// A Tuesday.
const TODAY = '2026-11-03';

const code = (id: string, eventDate: string, event: string, eventTypeId?: string): Code =>
    ({ id, eventDate, event, ...(eventTypeId ? { eventTypeId } : {}) });

const CODES: Code[] = [
    code('GBMQ5', '2026-11-05', 'GBM 9', 'gbm'),
    code('OPAZ3', '2026-11-03', 'OPA General Body', 'opa-general'),
    code('HLKX4', '2026-11-04', 'HLHM Kickoff', 'hlhm'),
    code('LATEW1', '2026-11-11', 'GBM 10', 'gbm'),
    code('EDGEV8', '2026-11-10', 'Food drive', 'hsa-service'),
    code('PASTJ2', '2026-11-02', 'GBM 8', 'gbm'),
    code('CTHUR9', '2026-11-05', 'Cabinet Thursday 9', 'cabinet-thursday'),
    code('OLDCAT', '2026-11-04', 'Before Event Types'),
];

const titles = (cabinetView: boolean, codes = CODES) => upcomingEvents(codes, { today: TODAY, cabinetView }).map((e) => e.title);

describe('upcomingEvents', () => {
    it('lists today through the same day next week, soonest first', () => {
        expect(titles(false)).toEqual(['OPA General Body', 'HLHM Kickoff', 'GBM 9', 'Food drive']);
    });

    it('leaves out past events and anything more than a week out', () => {
        expect(titles(false)).not.toContain('GBM 8');
        expect(titles(false)).not.toContain('GBM 10');
    });

    it('shows Cabinet-only events only in the Cabinet view', () => {
        expect(titles(false)).not.toContain('Cabinet Thursday 9');
        expect(titles(true)).toEqual(['OPA General Body', 'HLHM Kickoff', 'Cabinet Thursday 9', 'GBM 9', 'Food drive']);
    });

    it('stops at five, keeping the soonest', () => {
        const busy = ['04', '05', '06', '07', '08', '09', '10'].map((day, i) => code(`BUSY${i}`, `2026-11-${day}`, `Event ${day}`, 'gbm'));
        expect(titles(false, busy)).toEqual(['Event 04', 'Event 05', 'Event 06', 'Event 07', 'Event 08']);
        expect(titles(false, busy)).toHaveLength(UPCOMING_LIMIT);
    });

    it('skips codes from before Event Types', () => {
        expect(titles(true)).not.toContain('Before Event Types');
    });

    it('falls back to the Event Type when a code has no title', () => {
        expect(titles(false, [code('NOTITL', '2026-11-06', '  ', 'hlhm')])).toEqual(['HLHM']);
    });

    it('labels each event with its day and Event Type', () => {
        const [today, tomorrow, thursday] = upcomingEvents(CODES, { today: TODAY, cabinetView: false });
        expect([today.dayName, tomorrow.dayName, thursday.dayName]).toEqual(['Today', 'Tomorrow', 'Thursday']);
        expect(thursday.typeLabel).toBe('GBM');
    });

    it('never carries the code, which is what Members check in with', () => {
        const shown = JSON.stringify(upcomingEvents(CODES, { today: TODAY, cabinetView: true }));
        for (const { id } of CODES) expect(shown).not.toContain(id);
    });

    it('is empty when nothing is scheduled in the next week', () => {
        expect(titles(false, [code('PASTJ2', '2026-11-02', 'GBM 8', 'gbm')])).toEqual([]);
    });
});

describe('dayName', () => {
    it('says Today and Tomorrow, then the weekday', () => {
        expect(dayName('2026-11-03', TODAY)).toBe('Today');
        expect(dayName('2026-11-04', TODAY)).toBe('Tomorrow');
        expect(dayName('2026-11-07', TODAY)).toBe('Saturday');
    });
});

describe('addDays', () => {
    it('crosses months, years and daylight-saving changes without skipping a day', () => {
        expect(addDays('2026-10-31', 7)).toBe('2026-11-07'); // clocks go back Nov 1
        expect(addDays('2026-03-07', 1)).toBe('2026-03-08'); // clocks go forward Mar 8
        expect(addDays('2026-12-29', 5)).toBe('2027-01-03');
    });
});
