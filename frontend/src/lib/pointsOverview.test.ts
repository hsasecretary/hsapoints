import { describe, expect, it } from 'vitest';
import { computeStanding, type Attendance, type Code, type Member } from './computeStanding';
import { pointsOverview, type MemberRequest } from './pointsOverview';
import { rubric } from './rubric';

const TODAY = '2026-09-26';

const generalMember: Member = { cabinet: 'none', eboard: false, involvement: 'general' };
const mlpSpringMember: Member = { cabinet: 'none', eboard: false, involvement: 'mlp', mlpCohort: 'spring' };
const eboardMember: Member = { cabinet: 'none', eboard: true, involvement: 'eboard' };
const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

function code(id: string, eventTypeId: string, eventDate: string, event = id): Code {
    return { id, eventTypeId, eventDate, event };
}

function attended(c: Code): Attendance {
    return { id: `m__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source: 'code', codeId: c.id };
}

function requested(id: string, eventTypeId: string, eventDate: string, suffix = ''): Attendance {
    return { id: `m__req-${id}${suffix}`, eventTypeId, eventDate, source: 'request', requestId: id };
}

function overviewFor(member: Member, attendances: Attendance[], codes: Code[], requests: MemberRequest[] = []) {
    const standing = computeStanding(member, attendances, rubric, codes, { today: TODAY });
    return pointsOverview({ member, standing, attendances, codes, requests });
}

const gbm1 = code('GBM1', 'gbm', '2026-08-27', 'GBM 1');
const empanadas = code('EMP1', 'hsa-fundraising', '2026-09-08', 'Empanada Sale');
const beach = code('BEACH', 'hsa-service', '2026-09-13', 'Beach Cleanup');
const solidarity = code('SOLID', 'opa-solidarity-session', '2026-09-17', 'Solidarity Session');
const opaGeneral = code('OPAG', 'opa-general', '2026-09-16', 'OPA General Meeting');
const hlhm = code('HLHM1', 'hlhm', '2026-09-20', 'HLHM Paint Night');
const mixer = code('MIX', 'external-social', '2026-09-21', 'Mixer with HSO');

describe('pointsOverview', () => {
    it('gives a General Member their Total Points, a goal of 15, what is left and the events attended', () => {
        const overview = overviewFor(generalMember, [gbm1, empanadas, beach, mixer].map(attended), [gbm1, empanadas, beach, mixer]);

        expect(overview.total).toBe(5);
        expect(overview.goal).toBe(15);
        expect(overview.left).toBe(10);
        expect(overview.reached).toBe(false);
        expect(overview.eventsAttended).toBe(4);
    });

    it('sets the goal to 8 for an MLP Spring member', () => {
        const overview = overviewFor(mlpSpringMember, [attended(gbm1)], [gbm1]);

        expect(overview.goal).toBe(8);
        expect(overview.left).toBe(6);
    });

    it('holds an E-Board member to the General goal of 15 and the General groups', () => {
        const overview = overviewFor(eboardMember, [attended(solidarity)], [solidarity]);

        expect(overview.goal).toBe(15);
        expect(overview.groups.map((group) => group.name)).toEqual(['OPA']);
    });

    it('keeps counting past the goal and marks the event that reached it', () => {
        const gbms = Array.from({ length: 8 }, (_, i) => code(`GBM${i + 1}`, 'gbm', `2026-09-0${i + 1}`, `GBM ${i + 1}`));
        const overview = overviewFor(generalMember, gbms.map(attended), gbms);

        expect(overview.total).toBe(16);
        expect(overview.left).toBe(0);
        expect(overview.reached).toBe(true);
        expect(overview.ledger.filter((entry) => entry.crossed).map((entry) => entry.name)).toEqual(['GBM 8']);
        expect(overview.newestFirst[0].name).toBe('GBM 8');
    });

    it('groups a General Member\'s events for display: OPA together, HLHM under Affiliates, Socials worth no points', () => {
        const codes = [gbm1, opaGeneral, solidarity, hlhm, mixer];
        const overview = overviewFor(generalMember, codes.map(attended), codes);

        expect(overview.groups.map((group) => [group.name, group.entries.length, group.points])).toEqual([
            ['GBMs', 1, 2],
            ['OPA', 2, 2],
            ['Affiliates', 1, 1],
            ['Socials', 1, 0],
        ]);
    });

    it('shows a Cabinet Member each Event Type on its own', () => {
        const codes = [opaGeneral, solidarity];
        const overview = overviewFor(cabinetMember, codes.map(attended), codes);

        expect(overview.groups.map((group) => group.name)).toEqual(['OPA General', 'OPA Solidarity Session']);
    });

    it('names events by their code, and a code-less request by what the Member called it, as one event for all its Tabling hours', () => {
        const requests: MemberRequest[] = [
            { id: 'r1', activityName: 'Tabling at Turlington', date: '2026-09-15', status: 'approved', pointsRequested: 2 },
        ];
        const attendances = [attended(gbm1), requested('r1', 'tabling', '2026-09-15', '-h1'), requested('r1', 'tabling', '2026-09-15', '-h2')];
        const overview = overviewFor(generalMember, attendances, [gbm1], requests);

        expect(overview.eventsAttended).toBe(2);
        expect(overview.newestFirst.map((entry) => [entry.name, entry.points, entry.fromRequest])).toEqual([
            ['Tabling at Turlington', 2, true],
            ['GBM 1', 2, false],
        ]);
        expect(overview.total).toBe(4);
    });

    it('lists an Adjustment in the points but not as an event attended', () => {
        const member: Member = { ...generalMember, adjustments: [{ points: 3, note: 'Volunteered at orientation', date: '2026-09-10' }] };
        const overview = overviewFor(member, [attended(gbm1)], [gbm1]);

        expect(overview.total).toBe(5);
        expect(overview.eventsAttended).toBe(1);
        expect(overview.ledger.map((entry) => [entry.name, entry.points])).toEqual([
            ['GBM 1', 2],
            ['Volunteered at orientation', 3],
        ]);
    });

    it('adds up pending requests separately: they count once approved', () => {
        const requests: MemberRequest[] = [
            { id: 'r2', activityName: 'GBM 2', date: '2026-09-10', status: 'pending', pointsRequested: 2 },
            { id: 'r3', activityName: 'Old one', date: '2026-09-01', status: 'denied', pointsRequested: 1 },
        ];
        const overview = overviewFor(generalMember, [attended(gbm1)], [gbm1], requests);

        expect(overview.total).toBe(2);
        expect(overview.pending.map((request) => request.name)).toEqual(['GBM 2']);
        expect(overview.pendingPoints).toBe(2);
    });

    it('shows a new Member nothing yet', () => {
        const overview = overviewFor(generalMember, [], []);

        expect(overview.total).toBe(0);
        expect(overview.eventsAttended).toBe(0);
        expect(overview.groups).toEqual([]);
    });
});
