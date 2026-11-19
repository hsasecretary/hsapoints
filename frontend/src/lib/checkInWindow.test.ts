import { describe, expect, it } from 'vitest';
import { checkInHoursLabel, checkInState, checkInWindow, clockLabel, START_HOURS, startHourLabel } from './checkInWindow';

// Local times, like the app: new Date(year, monthIndex, day, hour, minute).
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);

describe('the start times E-Board picks from', () => {
    it('run from 6 AM to 12 AM on the hour', () => {
        expect(START_HOURS.map(startHourLabel)).toEqual([
            '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
            '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM', '12 AM',
        ]);
    });
});

it("labels a code's check-in hours for E-Board's forms", () => {
    expect(checkInHoursLabel(19)).toBe('7 PM to 10 PM');
    expect(checkInHoursLabel(21)).toBe('9 PM to 12 AM');
    expect(checkInHoursLabel(23)).toBe('11 PM to 2 AM');
    expect(checkInHoursLabel(24)).toBe('12 AM to 3 AM');
    expect(checkInHoursLabel(undefined)).toBe('All day');
});

describe('when a code takes check-ins', () => {
    const sevenPm = { eventDate: '2026-11-20', startHour: 19 };

    it('opens at its start time and closes three hours later', () => {
        expect(checkInWindow(sevenPm)).toEqual({ opens: at(20, 19), closes: at(20, 22), allDay: false });
        expect(checkInState(sevenPm, at(20, 18, 59))).toBe('not-open');
        expect(checkInState(sevenPm, at(20, 19))).toBe('open');
        expect(checkInState(sevenPm, at(20, 21, 59))).toBe('open');
        expect(checkInState(sevenPm, at(20, 22))).toBe('closed');
    });

    it('runs past midnight into the next day for a late event', () => {
        const tenPm = { eventDate: '2026-11-20', startHour: 22 };
        expect(checkInState(tenPm, at(21, 0, 30))).toBe('open');
        expect(checkInState(tenPm, at(21, 1))).toBe('closed');
    });

    it('treats 12 AM as the midnight that ends the event date', () => {
        const midnight = { eventDate: '2026-11-20', startHour: 24 };
        expect(checkInWindow(midnight)).toMatchObject({ opens: at(21, 0), closes: at(21, 3) });
        expect(checkInState(midnight, at(20, 23))).toBe('not-open');
        expect(checkInState(midnight, at(21, 2))).toBe('open');
    });

    it('is open all of the event date for a code with no start time, as every older code is', () => {
        for (const code of [{ eventDate: '2026-11-20' }, { eventDate: '2026-11-20', startHour: null }]) {
            expect(checkInWindow(code)).toEqual({ opens: at(20, 0), closes: at(21, 0), allDay: true });
            expect(checkInState(code, at(19, 23, 59))).toBe('not-open');
            expect(checkInState(code, at(20, 0))).toBe('open');
            expect(checkInState(code, at(20, 23, 59))).toBe('open');
            expect(checkInState(code, at(21, 0))).toBe('closed');
        }
    });

    it('treats a start time outside the list as all day rather than locking the code', () => {
        expect(checkInWindow({ eventDate: '2026-11-20', startHour: 3 }).allDay).toBe(true);
    });
});

it('says a closing time the way the code box shows it', () => {
    expect(clockLabel(at(20, 22))).toBe('10 PM');
    expect(clockLabel(at(21, 1))).toBe('1 AM');
});
