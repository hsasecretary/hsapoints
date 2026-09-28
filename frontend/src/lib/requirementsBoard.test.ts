import { describe, expect, it } from 'vitest';
import { computeStanding, type Attendance, type Code, type Member } from './computeStanding';
import type { MemberRequest } from './pointsOverview';
import { requirementsBoard, tileStatus, type Tile } from './requirementsBoard';
import { rubric } from './rubric';

const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

function code(id: string, eventTypeId: string, eventDate: string, event?: string): Code {
    return { id, eventTypeId, eventDate, event: event ?? id };
}

function attended(c: Code, extra: Partial<Attendance> = {}): Attendance {
    return { id: `m__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source: 'code', codeId: c.id, ...extra };
}

function requested(id: string, eventTypeId: string, eventDate: string, extra: Partial<Attendance> = {}): Attendance {
    return { id: `m__req-${id}`, eventTypeId, eventDate, source: 'request', requestId: id, ...extra };
}

function board({ member = cabinetMember, attendances = [], codes = [], requests = [], today }: {
    member?: Member;
    attendances?: Attendance[];
    codes?: Code[];
    requests?: MemberRequest[];
    today: string;
}) {
    const standing = computeStanding(member, attendances, rubric, codes, { today });
    return requirementsBoard({ member, standing, attendances, codes, requests, today });
}

describe('requirementsBoard', () => {
    it('shows a fall miss still open in spring on the board and in "To make up"', () => {
        const thursday = code('CT2', 'cabinet-thursday', '2026-09-04', 'Cabinet Thursday Wk 2');
        const gbm = code('GBM1', 'gbm', '2026-09-10', 'GBM 1');
        const b = board({ attendances: [attended(gbm)], codes: [thursday, gbm], today: '2027-02-10' });

        const sep = b.months.find((month) => month.label === 'Sep');
        const tile = sep.tiles.find((t) => t.key === 'CT2');
        expect(tile).toMatchObject({ name: 'Cabinet Thursday Wk 2', state: 'open', strike: true });
        expect(b.toMakeUp).toEqual([{ codeId: 'CT2', name: 'Cabinet Thursday Wk 2', date: '2026-09-04', strike: true, pending: false }]);
        expect(b.openStrikes).toBe(1);
    });

    it('groups tiles by month in date order: attended, made up, and coming up', () => {
        const orientation = code('ORI', 'cabinet-orientation', '2026-07-30', 'Cabinet Orientation');
        const thursday = code('CT1', 'cabinet-thursday', '2026-08-28', 'Cabinet Thursday Wk 1');
        const gbm = code('GBM4', 'gbm', '2026-10-08', 'GBM 4');
        const social = code('MIX', 'external-social', '2026-09-21', 'Mixer with HSO');
        const b = board({
            attendances: [attended(orientation), attended(social)],
            codes: [orientation, thursday, gbm, social],
            today: '2026-09-25',
        });

        expect(b.months.map((month) => month.label)).toEqual(['Jul', 'Aug', 'Oct']);
        expect(b.months[0].tiles[0]).toMatchObject({ key: 'ORI', state: 'done', detail: { kind: 'attended' } });
        expect(b.months[1].tiles[0]).toMatchObject({
            key: 'CT1',
            state: 'madeup',
            strike: false,
            detail: { kind: 'madeup', by: 'Mixer with HSO', byDate: '2026-09-21', clearedStrike: true },
        });
        expect(b.months[2].tiles[0]).toMatchObject({ key: 'GBM4', state: 'upcoming' });
        expect(b.toMakeUp).toEqual([]);
    });

    it('never says "excused": an excused miss is just owed, without a Strike', () => {
        const thursday = code('CT3', 'cabinet-thursday', '2026-09-11');
        const b = board({
            member: { ...cabinetMember, excusals: [{ codeId: 'CT3' }] },
            codes: [thursday],
            today: '2026-09-25',
        });

        expect(b.months[0].tiles[0]).toMatchObject({ state: 'open', strike: false, detail: { kind: 'open', strike: false } });
        expect(JSON.stringify(b)).not.toMatch(/excus/i);
    });

    it('shows a miss E-Board closed as nothing to make up', () => {
        const thursday = code('CT3', 'cabinet-thursday', '2026-09-11');
        const b = board({
            member: { ...cabinetMember, missedEventOverrides: [{ codeId: 'CT3' }] },
            codes: [thursday],
            today: '2026-09-25',
        });

        expect(b.months[0].tiles[0]).toMatchObject({ state: 'madeup', detail: { kind: 'closed' } });
        expect(b.toMakeUp).toEqual([]);
    });

    it('shows HLHM as one tile: any one before the last HLHM event, then the one attended', () => {
        const paint = code('HL1', 'hlhm', '2026-09-20', 'HLHM Paint Night');
        const film = code('HL2', 'hlhm', '2026-10-10', 'HLHM Film Night');

        const before = board({ codes: [paint, film], today: '2026-09-25' });
        const hlhmTiles = before.months.flatMap((month) => month.tiles).filter((t) => t.hlhm);
        expect(hlhmTiles).toEqual([
            expect.objectContaining({ key: 'hlhm', name: 'HLHM', date: '2026-10-10', state: 'upcoming', detail: { kind: 'hlhm-open', by: '2026-10-10' } }),
        ]);

        const went = board({ attendances: [attended(paint)], codes: [paint, film], today: '2026-09-25' });
        expect(went.months.flatMap((month) => month.tiles).filter((t) => t.hlhm)).toEqual([
            expect.objectContaining({ key: 'hlhm', date: '2026-09-20', state: 'done', detail: { kind: 'hlhm-done', name: 'HLHM Paint Night', date: '2026-09-20' } }),
        ]);

        const allPassed = board({ codes: [paint, film], today: '2026-10-20' });
        expect(allPassed.months.flatMap((month) => month.tiles).filter((t) => t.hlhm)).toEqual([]);
        expect(allPassed.toMakeUp).toEqual([]);
        expect(allPassed.openStrikes).toBe(0);
        expect(allPassed.core.hlhmBy).toBeNull();
    });

    it('fills the Fall | Spring grid with the event that met each requirement, and a pending request as waiting', () => {
        const fundraiser = code('EMP', 'hsa-fundraising', '2026-09-08', 'Empanada Sale');
        const requests: MemberRequest[] = [
            { id: 'r2', activityName: 'Latinx Film Night', date: '2026-09-22', status: 'pending', eventTypeId: 'affiliate-org' },
        ];
        const b = board({ attendances: [attended(fundraiser)], codes: [fundraiser], requests, today: '2026-09-25' });

        const row = (id: string) => b.grid.rows.find((r) => r.eventTypeId === id);
        expect(row('hsa-fundraising')).toMatchObject({ name: 'HSA Fundraising', fall: { kind: 'done', by: 'Empanada Sale' }, spring: { kind: 'open' } });
        expect(row('affiliate-org').fall).toEqual({ kind: 'pending' });
        expect(row('tabling').fall).toEqual({ kind: 'open' });
        expect(b.grid.fall).toMatchObject({ label: 'Fall 2026', done: 1, needed: 9, started: true });
        expect(b.grid.spring).toMatchObject({ label: 'Spring 2027', done: 0, needed: 9, started: false });
    });

    it('drops Affiliate Org out of the count for MLP directors', () => {
        const b = board({ member: { ...cabinetMember, cabinet: 'mlpFall' }, today: '2026-09-25' });

        expect(b.grid.rows.find((r) => r.eventTypeId === 'affiliate-org').fall).toEqual({ kind: 'waived' });
        expect(b.grid.fall).toMatchObject({ done: 0, needed: 8 });
    });

    it('lists leftover Surplus as covering the next miss', () => {
        const social = code('MIX', 'external-social', '2026-09-21', 'Mixer with HSO');
        const b = board({ attendances: [attended(social)], codes: [social], today: '2026-09-25' });

        expect(b.extras).toEqual(['Mixer with HSO']);
    });

    it('marks a miss a pending request already names, and flags 3 or more Strikes', () => {
        const codes = ['CT1', 'CT2', 'CT3'].map((id, i) => code(id, 'cabinet-thursday', `2026-09-0${i + 1}`));
        const requests: MemberRequest[] = [{ id: 'r1', status: 'pending', makeupFor: ['CT2'] }];
        const b = board({ codes, requests, today: '2026-09-25' });

        expect(b.toMakeUp.map((m) => [m.codeId, m.pending])).toEqual([['CT1', false], ['CT2', true], ['CT3', false]]);
        expect(b.openStrikes).toBe(3);
        expect(b.atRisk).toBe(true);
    });

    it('builds the by-category table of Event Types, each event saying what it did', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-08-28', 'Cabinet Thursday Wk 1');
        const gbm = code('GBM1', 'gbm', '2026-08-27', 'GBM 1');
        const tabling = [1, 2].map((n) => requested('tab', 'tabling', '2026-09-15', { id: `m__req-tab-h${n}` }));
        const requests: MemberRequest[] = [{ id: 'tab', activityName: 'Tabling at Turlington', status: 'approved' }];
        const b = board({
            member: { ...cabinetMember, adjustments: [{ points: 2, note: 'Helped at orientation' }] },
            attendances: [attended(gbm), ...tabling],
            codes: [thursday, gbm],
            requests,
            today: '2026-09-25',
        });

        expect(b.byType.rows.map((row) => [row.name, row.events.length, row.cabinetPoints, row.vePoints])).toEqual([
            ['GBM', 1, 1, 2],
            ['Tabling', 2, 2, 2],
            ['Adjustments', 1, 0, 2],
        ]);
        expect(b.byType.rows[0].events[0]).toMatchObject({ name: 'GBM 1', date: '2026-08-27', did: 'Core Event' });
        expect(b.byType.rows[1].events.map((e) => [e.name, e.did])).toEqual([
            ['Tabling at Turlington (hour 1)', 'Fall requirement: Tabling'],
            ['Tabling at Turlington (hour 2)', 'Made up Cabinet Thursday Wk 1 and its Strike'],
        ]);
        expect(b.byType.rows[2].events[0]).toMatchObject({ name: 'Helped at orientation', did: 'Adjustment from E-Board' });
        expect(b.byType.total).toEqual({ events: 3, cabinetPoints: 3, cabinetGoal: 20, vePoints: 6, veGoal: 15 });
    });

    it('calls a spare Surplus Attendance an extra that makes up the next miss', () => {
        const social = code('MIX', 'external-social', '2026-09-21', 'Mixer with HSO');
        const b = board({ attendances: [attended(social)], codes: [social], today: '2026-09-25' });

        expect(b.byType.rows[0].events[0].did).toBe('Extra. It will make up your next miss');
    });

    it('sums up Tier 1: attended out of past Core Events, the next one, and the HLHM deadline', () => {
        const orientation = code('ORI', 'cabinet-orientation', '2026-07-30', 'Cabinet Orientation');
        const thursday = code('CT1', 'cabinet-thursday', '2026-08-28', 'Cabinet Thursday Wk 1');
        const gbm = code('GBM4', 'gbm', '2026-10-08', 'GBM 4');
        const gbm5 = code('GBM5', 'gbm', '2026-11-05', 'GBM 5');
        const paint = code('HL1', 'hlhm', '2026-10-10', 'HLHM Paint Night');
        const social = code('MIX', 'external-social', '2026-09-21', 'Mixer with HSO');
        const b = board({
            attendances: [attended(orientation), attended(social)],
            codes: [orientation, thursday, gbm, gbm5, paint, social],
            today: '2026-09-25',
        });

        // The made-up Thursday counts as past but not attended; HLHM isn't due yet.
        expect(b.core).toEqual({ attended: 1, past: 2, next: { name: 'GBM 4', date: '2026-10-08' }, hlhmBy: '2026-10-10' });
    });

    it("says each Core Event's status in words, so no colour key is needed", () => {
        const tile = (detail: Tile['detail']): Tile => ({ key: 'K', name: 'GBM 1', date: '2026-09-10', state: 'done', strike: false, hlhm: false, detail });

        expect(tileStatus(tile({ kind: 'attended' }))).toBe('Attended');
        expect(tileStatus(tile({ kind: 'upcoming' }))).toBe('Coming up');
        expect(tileStatus(tile({ kind: 'open', strike: true }))).toBe('Missed, to make up');
        expect(tileStatus(tile({ kind: 'closed' }))).toBe('Missed, nothing to make up');
        expect(tileStatus(tile({ kind: 'madeup', by: 'Mixer', byDate: '2026-09-21', clearedStrike: true })))
            .toBe('Made up by Mixer on Sep 21, which cleared its Strike');
        expect(tileStatus(tile({ kind: 'madeup', by: 'Mixer', byDate: '2026-09-21', clearedStrike: false }))).toBe('Made up by Mixer on Sep 21');
        expect(tileStatus(tile({ kind: 'hlhm-open', by: '2026-10-10' }))).toBe('Go to any one by Oct 10');
        expect(tileStatus(tile({ kind: 'hlhm-done', name: 'HLHM Paint Night', date: '2026-09-20' }))).toBe('Attended HLHM Paint Night');
    });
});
