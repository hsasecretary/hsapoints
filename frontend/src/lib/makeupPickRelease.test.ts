import { describe, expect, it } from 'vitest';
import type { Attendance, Code, Member } from './computeStanding';
import { pickRuleChanges } from './makeupPickRelease';

const TODAY = '2027-04-20';
const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

function code(id: string, eventTypeId: string, eventDate: string): Code {
    return { id, eventTypeId, eventDate };
}

const retreat = code('RET1', 'cabinet-retreat', '2026-09-12');
const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');

function requested(email: string, id: string, eventTypeId: string, eventDate: string, makeupFor?: string): Attendance {
    return { id: `${email}__req-${id}`, eventTypeId, eventDate, source: 'request', requestId: id, ...(makeupFor ? { makeupFor } : {}) };
}

describe('pickRuleChanges', () => {
    it('lists only the Members an ignored pick now changes: the miss made up, the requirement reopened, the Strikes', () => {
        const changed = 'a@ufl.edu';
        const unchanged = 'b@ufl.edu';
        const changes = pickRuleChanges({
            today: TODAY,
            codes: [retreat, thursday],
            members: [
                {
                    email: changed,
                    member: cabinetMember,
                    attendances: [
                        { id: `${changed}__CT1`, eventTypeId: 'cabinet-thursday', eventDate: '2026-09-03', source: 'code', codeId: 'CT1' },
                        requested(changed, 'r1', 'hlhm', '2026-09-20', 'RET1'),
                        requested(changed, 'r2', 'hsa-service', '2026-10-01', 'RET1'),
                    ],
                },
                {
                    email: unchanged,
                    member: cabinetMember,
                    // A pick on an event that was Surplus anyway was already honoured.
                    attendances: [
                        { id: `${unchanged}__CT1`, eventTypeId: 'cabinet-thursday', eventDate: '2026-09-03', source: 'code', codeId: 'CT1' },
                        requested(unchanged, 'r1', 'crash', '2026-09-20', 'RET1'),
                    ],
                },
            ],
        });

        expect(changes).toEqual([{
            email: changed,
            madeUp: [{ codeId: 'RET1', before: null, after: `${changed}__req-r1` }],
            reopened: [{ eventTypeId: 'hlhm', semester: null }],
            openStrikes: { before: 1, after: 0 },
        }]);
    });

    it('reports a Semester Requirement the pick now leaves open, with its Semester', () => {
        const email = 'c@ufl.edu';
        const changes = pickRuleChanges({
            today: TODAY,
            codes: [retreat],
            members: [{ email, member: cabinetMember, attendances: [requested(email, 'r1', 'hsa-service', '2026-10-01', 'RET1')] }],
        });

        expect(changes[0].reopened).toEqual([{ eventTypeId: 'hsa-service', semester: 'fall' }]);
    });
});
