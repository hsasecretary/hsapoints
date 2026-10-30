import { describe, expect, it } from 'vitest';
import { checkInChoice, checkInOutcome } from './checkIn';
import type { Attendance, Code, Member } from './computeStanding';

// Fall 2026; tonight's code is dated today.
const TODAY = '2026-09-25';
const EMAIL = 'm@ufl.edu';
const options = { email: EMAIL, today: TODAY };

const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };
const generalMember: Member = { cabinet: 'none', eboard: false, involvement: 'general' };

function code(id: string, eventTypeId: string, eventDate: string, event = id): Code {
    return { id, eventTypeId, eventDate, event };
}

function attended(c: Code): Attendance {
    return { id: `${EMAIL}__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source: 'code', codeId: c.id };
}

const retreat = code('RET1', 'cabinet-retreat', '2026-09-12', 'Cabinet Retreat');
const thursday = code('CT1', 'cabinet-thursday', '2026-09-03', 'Cabinet Thursday');
const hlhm = code('HLHM1', 'hlhm', TODAY, 'HLHM Kickoff');
const mlpOpen = code('MLP1', 'mlp-open', TODAY, 'MLP Open Mic');
const gbm = code('GBM1', 'gbm', TODAY, 'GBM');

describe('checkInChoice', () => {
    it('asks nothing when the Member owes no Missed Event, or the code is for a Core Event', () => {
        expect(checkInChoice(cabinetMember, [attended(retreat), attended(thursday)], [retreat, thursday, hlhm], hlhm, new Set(), options)).toBeNull();
        expect(checkInChoice(generalMember, [], [retreat, hlhm], hlhm, new Set(), options)).toBeNull();
        expect(checkInChoice(cabinetMember, [], [retreat, gbm], gbm, new Set(), options)).toBeNull();
    });

    it("starts on \"don't use it as a make-up\" when the event would fill a requirement", () => {
        const choice = checkInChoice(cabinetMember, [attended(thursday)], [thursday, retreat, hlhm], hlhm, new Set(), options);

        expect(choice).toEqual({
            fills: 'hlhm',
            initial: null,
            options: [{ codeId: 'RET1', name: 'Cabinet Retreat', eventDate: '2026-09-12', strike: true }],
        });
    });

    it('lists only the owed misses, the automatic one preselected, when the event is Surplus anyway', () => {
        const choice = checkInChoice(cabinetMember, [], [thursday, retreat, mlpOpen], mlpOpen, new Set(), options);

        expect(choice).toEqual({
            fills: null,
            initial: 'CT1',
            options: [
                { codeId: 'CT1', name: 'Cabinet Thursday', eventDate: '2026-09-03', strike: true },
                { codeId: 'RET1', name: 'Cabinet Retreat', eventDate: '2026-09-12', strike: true },
            ],
        });
    });

    it('leaves out a miss a pending Point Request already names', () => {
        const choice = checkInChoice(cabinetMember, [], [thursday, retreat, mlpOpen], mlpOpen, new Set(['CT1']), options);

        expect(choice.options.map((row) => row.codeId)).toEqual(['RET1']);
        expect(choice.initial).toBe('RET1');
    });
});

describe('checkInOutcome', () => {
    it('says which miss a pick made up, and that it cleared a Strike', () => {
        const outcome = checkInOutcome(cabinetMember, [attended(thursday)], [thursday, retreat, hlhm], hlhm, 'RET1', options);

        expect(outcome).toEqual({
            event: 'HLHM Kickoff',
            madeUp: { name: 'Cabinet Retreat', eventDate: '2026-09-12', strike: true },
            filled: null,
        });
    });

    it('says when it filled a requirement instead', () => {
        const outcome = checkInOutcome(cabinetMember, [attended(thursday)], [thursday, retreat, hlhm], hlhm, null, options);

        expect(outcome).toEqual({ event: 'HLHM Kickoff', madeUp: null, filled: 'HLHM' });
    });

    it('never says a miss was excused: an excused miss is made up with no Strike', () => {
        const member = { ...cabinetMember, excusals: [{ codeId: 'RET1' }] };
        const outcome = checkInOutcome(member, [attended(thursday)], [thursday, retreat, mlpOpen], mlpOpen, 'RET1', options);

        expect(outcome.madeUp).toEqual({ name: 'Cabinet Retreat', eventDate: '2026-09-12', strike: false });
    });

    it('says only where a General Member checked in', () => {
        const outcome = checkInOutcome(generalMember, [], [hlhm], hlhm, null, options);

        expect(outcome).toEqual({ event: 'HLHM Kickoff', madeUp: null, filled: null });
    });
});
