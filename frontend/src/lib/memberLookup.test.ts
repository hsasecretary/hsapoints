import { describe, expect, it } from 'vitest';
import { computeStanding, type Attendance, type Code, type Member } from './computeStanding';
import { checkInRemovalEffect, lookupLedger, lookupRequests, lookupSummary, missedEventRows } from './memberLookup';
import type { MemberRequest } from './pointsOverview';
import { rubric } from './rubric';

const TODAY = '2026-09-26';

const generalMember: Member = { cabinet: 'none', eboard: false, involvement: 'general' };
const eboardMember: Member = { cabinet: 'none', eboard: true, involvement: 'eboard' };
const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

function code(id: string, eventTypeId: string, eventDate: string, event = id): Code {
    return { id, eventTypeId, eventDate, event };
}

function attended(c: Code, source: Attendance['source'] = 'code'): Attendance {
    return { id: `m__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source, codeId: c.id };
}

function requested(id: string, eventTypeId: string, eventDate: string, suffix = ''): Attendance {
    return { id: `m__req-${id}${suffix}`, eventTypeId, eventDate, source: 'request', requestId: id };
}

const gbm1 = code('GBM1', 'gbm', '2026-08-27', 'GBM 1');
const gbm2 = code('GBM2', 'gbm', '2026-09-10', 'GBM 2');
const empanadas = code('EMP1', 'hsa-fundraising', '2026-09-08', 'Empanada Sale');
const cabThu = code('CT1', 'cabinet-thursday', '2026-09-03', 'Cabinet Thursday 1');

function standingOf(member: Member, attendances: Attendance[], codes: Code[]) {
    return computeStanding(member, attendances, rubric, codes, { today: TODAY });
}

describe('lookupLedger', () => {
    it('lists every point newest first, tagged by where it came from, with a total equal to the Total Points', () => {
        const member: Member = { ...generalMember, adjustments: [{ points: 3, note: 'Helped at the gala', date: '2026-09-15' }] };
        const attendances = [attended(gbm1), requested('r1', 'hsa-fundraising', '2026-09-08'), attended(gbm2, 'eboard')];
        const requests: MemberRequest[] = [{ id: 'r1', activityName: 'Empanada Sale', date: '2026-09-08', status: 'approved', reviewedBy: 'vp@ufl.edu', reviewedOn: '2026-09-09' }];
        const ledger = lookupLedger({ member, attendances, codes: [gbm1, gbm2], requests, today: TODAY });

        expect(ledger.rows.map((row) => [row.name, row.source, row.vePoints])).toEqual([
            ['Helped at the gala', 'adjustment', 3],
            ['GBM 2', 'eboard', 2],
            ['Empanada Sale', 'request', 2],
            ['GBM 1', 'code', 2],
        ]);
        expect(ledger.vePoints).toBe(standingOf(member, attendances, [gbm1, gbm2]).vePoints);
        expect(ledger.adjustments).toBe(1);
    });

    it('says who approved a Point Request, and when', () => {
        const attendances = [requested('r1', 'hsa-fundraising', '2026-09-08')];
        const requests: MemberRequest[] = [{ id: 'r1', activityName: 'Empanada Sale', date: '2026-09-08', status: 'approved', reviewedBy: 'vp@ufl.edu', reviewedOn: '2026-09-09' }];
        const [row] = lookupLedger({ member: generalMember, attendances, codes: [], requests, today: TODAY }).rows;

        expect(row).toMatchObject({ eventType: 'HSA Fundraising', approvedBy: 'vp@ufl.edu', approvedOn: '2026-09-09', requestId: 'r1' });
    });

    it('gives an Adjustment made from a Point Request its reviewer, and a plain one its note', () => {
        const member: Member = {
            ...generalMember,
            adjustments: [
                { points: 2, note: 'Photo booth volunteer', date: '2026-09-12', requestId: 'r2' },
                { points: -1, note: 'Duplicate check-in' },
            ],
        };
        const requests: MemberRequest[] = [{ id: 'r2', status: 'approved', reviewedBy: 'sec@ufl.edu', reviewedOn: '2026-09-13' }];
        const rows = lookupLedger({ member, attendances: [], codes: [], requests, today: TODAY }).rows;

        expect(rows.map((row) => [row.name, row.date, row.vePoints, row.approvedBy, row.requestId])).toEqual([
            ['Photo booth volunteer', '2026-09-12', 2, 'sec@ufl.edu', 'r2'],
            ['Duplicate check-in', '', -1, null, null],
        ]);
    });

    it('shows a Tabling request\'s hours as one row with every hour\'s points', () => {
        const attendances = [1, 2, 3].map((n) => requested('t1', 'tabling', '2026-09-05', `-h${n}`));
        const requests: MemberRequest[] = [{ id: 't1', activityName: 'Turlington tabling', date: '2026-09-05', status: 'approved' }];
        const ledger = lookupLedger({ member: generalMember, attendances, codes: [], requests, today: TODAY });

        expect(ledger.rows).toHaveLength(1);
        expect(ledger.rows[0]).toMatchObject({ name: 'Turlington tabling', vePoints: 3, cabinetPoints: 3, hours: 3 });
    });

    it('names the code behind each row, and counts the codes redeemed and how many came through a Point Request', () => {
        const salsa = code('SALSA', 'hsa-programming', '2026-09-12', 'Noche de Salsa');
        const attendances = [attended(gbm1), { ...attended(salsa, 'request'), requestId: 's1' }, requested('t1', 'tabling', '2026-09-05'), attended(gbm2, 'eboard')];
        const ledger = lookupLedger({ member: generalMember, attendances, codes: [gbm1, gbm2, salsa], requests: [], today: TODAY });

        expect(ledger.rows.map((row) => [row.name, row.codeId, row.source])).toEqual([
            ['Noche de Salsa', 'SALSA', 'request'],
            ['GBM 2', 'GBM2', 'eboard'],
            ['Tabling', null, 'request'],
            ['GBM 1', 'GBM1', 'code'],
        ]);
        expect(ledger.codes).toEqual({ redeemed: 3, byRequest: 1 });
    });

    it('says who took points away', () => {
        const member: Member = { ...generalMember, adjustments: [{ points: -2, note: "Used a friend's code", date: '2026-09-20', by: 'vp@ufl.edu' }] };
        const [row] = lookupLedger({ member, attendances: [], codes: [], requests: [], today: TODAY }).rows;

        expect(row).toMatchObject({ vePoints: -2, approvedBy: 'vp@ufl.edu', approvedOn: '2026-09-20', codeId: null });
    });

    it('adds up Cabinet Points to match the standing', () => {
        const attendances = [attended(gbm1), attended(empanadas), attended(cabThu)];
        const codes = [gbm1, empanadas, cabThu];
        const ledger = lookupLedger({ member: cabinetMember, attendances, codes, requests: [], today: TODAY });

        expect(ledger.cabinetPoints).toBe(standingOf(cabinetMember, attendances, codes).cabinetPoints);
        expect(ledger.rows.find((row) => row.name === 'Cabinet Thursday 1')).toMatchObject({ vePoints: 0, cabinetPoints: 0 });
    });
});

describe('Removed Check-ins on the ledger', () => {
    const removedGbm2 = { event: 'GBM 2', eventTypeId: 'gbm', eventDate: '2026-09-10', reason: "Used a friend's code", by: 'vp@ufl.edu', on: '2026-09-20' };

    it('lists one crossed out with why, who and when, and leaves it out of the total and the codes', () => {
        const member: Member = { ...generalMember, removedCheckIns: { GBM2: removedGbm2 } };
        const ledger = lookupLedger({ member, attendances: [attended(gbm1)], codes: [gbm1, gbm2], requests: [], today: TODAY });

        expect(ledger.rows.map((row) => [row.name, row.codeId, row.vePoints, row.takenBack])).toEqual([
            ['GBM 2', 'GBM2', 2, { kind: 'removed', reason: "Used a friend's code", by: 'vp@ufl.edu', on: '2026-09-20' }],
            ['GBM 1', 'GBM1', 2, null],
        ]);
        expect(ledger.vePoints).toBe(2);
        expect(ledger.codes).toEqual({ redeemed: 1, byRequest: 0 });
    });

    it('keeps one after its code is deleted', () => {
        const member: Member = { ...generalMember, removedCheckIns: { GBM2: removedGbm2 } };
        const rows = lookupLedger({ member, attendances: [], codes: [], requests: [], today: TODAY }).rows;

        expect(rows.map((row) => [row.name, row.codeId])).toEqual([['GBM 2', 'GBM2']]);
    });

    it('drops one once E-Board credits that code again, and one from another school year', () => {
        const lastYear = { ...removedGbm2, event: 'Old GBM', eventDate: '2025-09-10' };
        const member: Member = { ...generalMember, removedCheckIns: { GBM2: removedGbm2, OLD: lastYear } };
        const rows = lookupLedger({ member, attendances: [{ ...attended(gbm2, 'request'), requestId: 'r9' }], codes: [gbm2], requests: [], today: TODAY }).rows;

        expect(rows.map((row) => [row.name, row.takenBack])).toEqual([['GBM 2', null]]);
    });
});

describe('revoked Point Requests on the ledger', () => {
    const revoked: MemberRequest = {
        id: 'r5', activityName: 'Empanada Sale', date: '2026-09-14', status: 'denied', codeId: 'EMP1', eventTypeId: 'hsa-fundraising',
        reviewedBy: 'pres@ufl.edu', reviewedOn: '2026-09-21', reviewNotes: 'Approved by mistake', revoked: { approvedBy: 'vp@ufl.edu', points: 2 },
    };

    it('lists one crossed out with what it had earned, who approved and who revoked it, left out of the total', () => {
        const ledger = lookupLedger({ member: cabinetMember, attendances: [attended(gbm1)], codes: [gbm1, empanadas], requests: [revoked], today: TODAY });

        expect(ledger.rows[0]).toMatchObject({
            name: 'Empanada Sale', source: 'request', codeId: 'EMP1', requestId: 'r5', vePoints: 2, cabinetPoints: 1, approvedBy: 'vp@ufl.edu',
            takenBack: { kind: 'revoked', reason: 'Approved by mistake', by: 'pres@ufl.edu', on: '2026-09-21' },
        });
        expect(ledger.vePoints).toBe(2);
        expect(ledger.codes).toEqual({ redeemed: 1, byRequest: 0 });
    });

    it('gives a revoked Adjustment no Cabinet Points, and skips one from another school year', () => {
        const adjustment: MemberRequest = { ...revoked, id: 'r6', codeId: null, eventTypeId: null, adjustment: { points: 3, note: 'Gala' }, revoked: { approvedBy: null, points: 3 } };
        const lastYear: MemberRequest = { ...revoked, id: 'r7', date: '2025-09-14' };
        const rows = lookupLedger({ member: cabinetMember, attendances: [], codes: [], requests: [adjustment, lastYear], today: TODAY }).rows;

        expect(rows.map((row) => [row.requestId, row.source, row.vePoints, row.cabinetPoints])).toEqual([['r6', 'adjustment', 3, 0]]);
    });
});

describe('checkInRemovalEffect', () => {
    it('says a Core Event becomes a Missed Event with a Strike, and what points go', () => {
        const codes = [gbm1, cabThu];
        const attendances = [attended(gbm1), attended(cabThu)];

        expect(checkInRemovalEffect({ member: cabinetMember, attendances, codes, today: TODAY }, 'm__GBM1')).toEqual({
            vePoints: 2, cabinetPoints: 1, missed: ['GBM 1'], strikes: 1, owedAgain: [],
        });
    });

    it("says a check-in for today's Core Event becomes a Missed Event once the day is over", () => {
        const tonight = code('GBM9', 'gbm', TODAY, 'GBM 9');

        expect(checkInRemovalEffect({ member: cabinetMember, attendances: [attended(tonight)], codes: [tonight], today: TODAY }, 'm__GBM9')).toMatchObject({
            missed: ['GBM 9'], strikes: 1,
        });
    });

    it('says which Missed Event a removed Make-up leaves owed again', () => {
        const emp2 = code('EMP2', 'hsa-fundraising', '2026-09-09', 'Bake Sale');
        const codes = [gbm1, empanadas, emp2];
        // GBM 1 missed; the second fundraiser is surplus and makes it up.
        const attendances = [attended(empanadas), attended(emp2)];

        expect(checkInRemovalEffect({ member: cabinetMember, attendances, codes, today: TODAY }, 'm__EMP2')).toMatchObject({
            missed: [], strikes: 1, owedAgain: ['GBM 1'],
        });
    });

    it('only counts points for a General Member', () => {
        expect(checkInRemovalEffect({ member: generalMember, attendances: [attended(gbm1)], codes: [gbm1], today: TODAY }, 'm__GBM1')).toEqual({
            vePoints: 2, cabinetPoints: 1, missed: [], strikes: 0, owedAgain: [],
        });
    });
});

describe('lookupRequests', () => {
    const requests: MemberRequest[] = [
        { id: 'a', activityName: 'Old approved', date: '2026-09-01', status: 'approved', pointsRequested: 2, eventTypeId: 'hsa-fundraising', reviewedBy: 'vp@ufl.edu', reviewedOn: '2026-09-02' },
        { id: 'b', activityName: 'Newest pending', date: '2026-09-20', status: 'pending', pointsRequested: 1, eventTypeId: 'hsa-service' },
        { id: 'c', activityName: 'Denied', date: '2026-09-15', status: 'denied', pointsRequested: 4, reviewedBy: 'vp@ufl.edu', reviewedOn: '2026-09-16', reviewNotes: 'No photo' },
        { id: 'd', activityName: 'Older pending', date: '2026-09-10', status: 'pending', pointsRequested: 2, eventTypeId: null },
        { id: 'e', activityName: 'Last year', date: '2026-03-01', status: 'approved', pointsRequested: 1 },
        { id: 'f', activityName: 'Gala help', date: '2026-09-12', status: 'approved', pointsRequested: 2, adjustment: { points: 2, note: 'Gala help' }, reviewNotes: 'Gala help' },
    ];

    it('lists this school year\'s requests, pending first, then newest first', () => {
        expect(lookupRequests(requests, TODAY).map((row) => row.id)).toEqual(['b', 'd', 'c', 'f', 'a']);
    });

    it('keeps a pending request from an earlier year, since it still needs a review', () => {
        const old: MemberRequest = { id: 'z', date: '2026-02-01', status: 'pending', pointsRequested: 1 };
        expect(lookupRequests([old], TODAY).map((row) => row.id)).toEqual(['z']);
    });

    it('says what each request asked for or earned, its Event Type, and who reviewed it', () => {
        const rows = new Map(lookupRequests(requests, TODAY).map((row) => [row.id, row]));

        expect(rows.get('b')).toMatchObject({ status: 'pending', statusLabel: 'Pending', points: 1, pointsLabel: 'requested', eventType: 'HSA Service', reviewedBy: null });
        expect(rows.get('d')).toMatchObject({ eventType: 'Not listed' });
        expect(rows.get('a')).toMatchObject({ statusLabel: 'Approved', points: 2, pointsLabel: 'credited', eventType: 'HSA Fundraising', reviewedBy: 'vp@ufl.edu', reviewedOn: '2026-09-02' });
        expect(rows.get('c')).toMatchObject({ statusLabel: 'Denied', points: 0, pointsLabel: 'credited', notes: 'No photo' });
        expect(rows.get('f')).toMatchObject({ eventType: 'Adjustment', points: 2 });
    });

    it('calls a revoked request Revoked, with what it had earned and who approved it', () => {
        const revoked: MemberRequest = {
            id: 'r', date: '2026-09-05', status: 'denied', pointsRequested: 3, reviewedBy: 'pres@ufl.edu', reviewedOn: '2026-09-21',
            reviewNotes: 'Approved by mistake', revoked: { approvedBy: 'vp@ufl.edu', points: 3 },
        };
        expect(lookupRequests([revoked], TODAY)[0]).toMatchObject({
            status: 'denied', statusLabel: 'Revoked', points: 0, reviewedBy: 'pres@ufl.edu', notes: 'Approved by mistake', revoked: { approvedBy: 'vp@ufl.edu', points: 3 },
        });
    });

    it('lets E-Board revoke only an approved request with something to take back', () => {
        const withAttendance = requests.map((request) => (request.id === 'a' ? { ...request, attendanceIds: ['m__req-a'] } : request));
        const rows = new Map(lookupRequests(withAttendance, TODAY).map((row) => [row.id, row.revocable]));
        // e: approved on the old review page, so its points are only in the old counters.
        const old = lookupRequests([{ id: 'e', date: '2026-09-01', status: 'approved', pointsRequested: 1 }], TODAY)[0];
        expect([rows.get('a'), rows.get('f'), rows.get('b'), rows.get('c'), old.revocable]).toEqual([true, true, false, false, false]);
    });
});

describe('lookupSummary', () => {
    it('gives a General Member their Total Points against 15 and what is still pending, never counted in', () => {
        const attendances = [attended(gbm1)];
        const standing = standingOf(generalMember, attendances, [gbm1]);
        const requests: MemberRequest[] = [
            { id: 'p1', status: 'pending', pointsRequested: 2 },
            { id: 'p2', status: 'pending', pointsRequested: 1 },
            { id: 'x', status: 'approved', pointsRequested: 2 },
        ];
        const summary = lookupSummary(generalMember, standing, requests);

        expect(summary).toMatchObject({ vePoints: 2, veGoal: 15, veReached: false, pendingCount: 2, pendingPoints: 3, rules: 'general' });
    });

    it('marks E-Board exempt from the Cabinet requirements', () => {
        const summary = lookupSummary(eboardMember, standingOf(eboardMember, [], []), []);

        expect(summary.rules).toBe('exempt');
    });

    it('gives a Cabinet Member their Cabinet Points, Strikes, what is owed and the Semester Requirements met', () => {
        const codes = [gbm1, cabThu, empanadas];
        const member: Member = { ...cabinetMember, excusals: [{ codeId: 'CT1' }] };
        const standing = standingOf(member, [attended(empanadas)], codes);
        const summary = lookupSummary(member, standing, []);

        expect(summary).toMatchObject({
            rules: 'cabinet',
            cabinetPoints: 1,
            cabinetGoal: 20,
            openStrikes: 1,
            atRisk: false,
            missedOwed: 2,
            missedExcused: 1,
            missedUnexcused: 1,
            requirements: { fall: { met: 1, total: 9 }, spring: { met: 0, total: 9 } },
        });
    });
});

describe('missedEventRows', () => {
    it('lists open Missed Events first, then made up and closed, each in words', () => {
        const codes = [gbm1, cabThu, gbm2];
        const member: Member = { ...cabinetMember, excusals: [{ codeId: 'CT1' }], missedEventOverrides: [{ codeId: 'GBM2' }] };
        const emp2 = code('EMP2', 'hsa-fundraising', '2026-09-09', 'Bake Sale');
        const attendances = [attended(empanadas), attended(emp2)];
        const standing = standingOf(member, attendances, [...codes, empanadas, emp2]);
        const rows = missedEventRows(standing, [...codes, emp2], attendances);

        expect(rows.map((row) => [row.name, row.state, row.excused, row.madeUpBy?.name ?? null])).toEqual([
            ['Cabinet Thursday 1', 'open', true, null],
            ['GBM 1', 'madeup', false, 'Bake Sale'],
            ['GBM 2', 'closed', false, null],
        ]);
    });
});
