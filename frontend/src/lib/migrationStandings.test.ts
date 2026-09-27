import { describe, expect, it } from 'vitest';
import type { Attendance, Code } from './computeStanding';
import { migrationStandings } from './migrationStandings';

const TODAY = '2026-09-27';

const codes: Code[] = [
    { id: 'GOLAZO', eventTypeId: 'gbm', eventDate: '2026-09-03' },
    { id: 'PINTURA', eventTypeId: 'cabinet-thursday', eventDate: '2026-09-10' },
    { id: 'TIGRE', eventTypeId: 'cabinet-thursday', eventDate: '2026-09-17' },
];

function attended(email: string, code: Code): Attendance {
    return { id: `${email}__${code.id}`, eventTypeId: code.eventTypeId, eventDate: code.eventDate, source: 'code', codeId: code.id };
}

describe('migrationStandings', () => {
    it('scores each Member with computeStanding and says what their Attendance was', () => {
        const [golazo, pintura] = codes;
        const result = migrationStandings({
            today: TODAY,
            codes,
            members: [
                {
                    email: 'cab@ufl.edu',
                    member: { cabinet: 'programming', approved: true, eboard: false },
                    attendances: [attended('cab@ufl.edu', golazo), attended('cab@ufl.edu', pintura)],
                },
                { email: 'gen@ufl.edu', member: { cabinet: 'none' }, attendances: [attended('gen@ufl.edu', golazo)] },
            ],
        });

        expect(result['cab@ufl.edu']).toEqual({
            vePoints: 2,
            cabinetPoints: 1,
            missedEvents: ['TIGRE'],
            openStrikes: 1,
            attendance: { gbm: 1, 'cabinet-thursday': 1 },
        });
        expect(result['gen@ufl.edu']).toEqual({
            vePoints: 2,
            cabinetPoints: 1,
            missedEvents: [],
            openStrikes: 0,
            attendance: { gbm: 1 },
        });
    });

    it('closes a Missed Event with a missedEventOverride, so it carries no Strike', () => {
        const result = migrationStandings({
            today: TODAY,
            codes,
            members: [{
                email: 'cab@ufl.edu',
                member: {
                    cabinet: 'programming', approved: true, eboard: false,
                    missedEventOverrides: [{ codeId: 'golazo' }, { codeId: 'PINTURA' }, { codeId: 'TIGRE' }],
                },
                attendances: [],
            }],
        });

        expect(result['cab@ufl.edu'].missedEvents).toEqual(['GOLAZO', 'PINTURA', 'TIGRE']);
        expect(result['cab@ufl.edu'].openStrikes).toBe(0);
    });
});
