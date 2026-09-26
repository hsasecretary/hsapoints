import { describe, expect, it } from 'vitest';
import { attendedEventFromCode, sumVoterEligiblePoints } from './attendedEvents';

describe("the old dashboard's attended events", () => {
    const oldCode = {
        event: 'GBM 1', eventDate: '2026-08-27', category: 'GBM', points: 2, semester: 'fallPoints', voterEligible: true,
    };
    // Made on the rebuilt Event Codes page (#70): no per-event point fields.
    const newCode = { event: 'Empanada Sale', eventDate: '2026-09-22', eventTypeId: 'hsa-fundraising', attendeeCount: 27 };

    it('shows an old code as it was stored', () => {
        expect(attendedEventFromCode('gbm1', oldCode)).toMatchObject({
            code: 'GBM1', category: 'GBM', points: 2, semester: 'fallPoints', voterEligible: true,
        });
    });

    it("shows a code with only an Event Type by that type's VE Points and its date's Semester", () => {
        expect(attendedEventFromCode('EMPANADA', newCode)).toMatchObject({
            code: 'EMPANADA', category: 'HSA Fundraising', points: 2, semester: 'fallPoints', voterEligible: true,
        });
    });

    it("doesn't count a typed code's points twice: redeeming it already added them to otherPoints", () => {
        const events = [attendedEventFromCode('GBM1', oldCode), attendedEventFromCode('EMPANADA', newCode)];

        expect(sumVoterEligiblePoints(events, 2)).toBe(4);
    });
});
