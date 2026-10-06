import { describe, expect, it } from 'vitest';
import { closetDueDate, isClosetOpen, isOverdue } from './closet';

// Mon 2026-10-05 .. Sun 2026-10-11, a plain week with nothing closed.
const MON = '2026-10-05';
const TUE = '2026-10-06';
const WED = '2026-10-07';
const THU = '2026-10-08';
const FRI = '2026-10-09';
const SAT = '2026-10-10';
const SUN = '2026-10-11';

function at(isoDate: string, hour: number, minute = 0): Date {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day, hour, minute);
}

describe('isClosetOpen', () => {
    it('is open right at opening, Mon-Thu 8 AM', () => {
        expect(isClosetOpen(at(MON, 8, 0))).toBe(true);
    });

    it('is closed just before opening', () => {
        expect(isClosetOpen(at(MON, 7, 59))).toBe(false);
    });

    it('is open just before closing, Mon-Thu 8 PM', () => {
        expect(isClosetOpen(at(THU, 19, 59))).toBe(true);
    });

    it('is closed right at closing', () => {
        expect(isClosetOpen(at(THU, 20, 0))).toBe(false);
    });

    it('is open just before Friday\'s early close at 5 PM', () => {
        expect(isClosetOpen(at(FRI, 16, 59))).toBe(true);
    });

    it('is closed right at Friday\'s 5 PM close', () => {
        expect(isClosetOpen(at(FRI, 17, 0))).toBe(false);
    });

    it('is closed all day Saturday', () => {
        expect(isClosetOpen(at(SAT, 12, 0))).toBe(false);
    });

    it('is closed just before Sunday opens at noon', () => {
        expect(isClosetOpen(at(SUN, 11, 59))).toBe(false);
    });

    it('is open right at Sunday\'s noon opening', () => {
        expect(isClosetOpen(at(SUN, 12, 0))).toBe(true);
    });

    it('is open just before Sunday closes at 5 PM', () => {
        expect(isClosetOpen(at(SUN, 16, 59))).toBe(true);
    });

    it('is closed right at Sunday\'s 5 PM close', () => {
        expect(isClosetOpen(at(SUN, 17, 0))).toBe(false);
    });

    it('is closed on a closure date, even mid-week during normal hours', () => {
        expect(isClosetOpen(at(MON, 12, 0), [MON])).toBe(false);
    });

    it('is unaffected by a closure date that isn\'t today', () => {
        expect(isClosetOpen(at(MON, 12, 0), [TUE])).toBe(true);
    });
});

describe('closetDueDate', () => {
    it('Mon Checkout is due Wed 8 PM', () => {
        expect(closetDueDate(MON)).toEqual(at(WED, 20, 0));
    });

    it('Tue Checkout is due Thu 8 PM', () => {
        expect(closetDueDate(TUE)).toEqual(at(THU, 20, 0));
    });

    it('Wed Checkout is due Fri 5 PM', () => {
        expect(closetDueDate(WED)).toEqual(at(FRI, 17, 0));
    });

    it('Thu Checkout is due Mon 8 PM', () => {
        expect(closetDueDate(THU)).toEqual(at('2026-10-12', 20, 0));
    });

    it('Fri Checkout is due Tue 8 PM', () => {
        expect(closetDueDate(FRI)).toEqual(at('2026-10-13', 20, 0));
    });

    it('Sun Checkout is due Tue 8 PM; Sunday itself never counts as a business day', () => {
        expect(closetDueDate(SUN)).toEqual(at('2026-10-13', 20, 0));
    });

    it('rolls the Due Date forward past a closure that lands on it', () => {
        // Mon Checkout would normally be due Wed; close the Closet that Wednesday.
        expect(closetDueDate(MON, [WED])).toEqual(at(THU, 20, 0));
    });
});

describe('isOverdue', () => {
    it('is false just before the Closet closes on the Due Date', () => {
        const checkout = { checkoutDate: MON, returnedAt: null };
        expect(isOverdue(checkout, [], at(WED, 19, 59))).toBe(false);
    });

    it('is true just after the Closet closes on the Due Date', () => {
        const checkout = { checkoutDate: MON, returnedAt: null };
        expect(isOverdue(checkout, [], at(WED, 20, 1))).toBe(true);
    });

    it('is never true for a returned Checkout, however late', () => {
        const checkout = { checkoutDate: MON, returnedAt: '2026-10-06' };
        expect(isOverdue(checkout, [], at('2026-12-01', 0, 0))).toBe(false);
    });
});
