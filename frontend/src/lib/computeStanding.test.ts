import { describe, expect, it } from 'vitest';
import { computeStanding, type Attendance, type Code, type Member } from './computeStanding';
import { rubric } from './rubric';

// Fall 2026 / Spring 2027. "Today" is late in the spring unless a test says
// otherwise, so every code below has already happened.
const TODAY = '2027-04-20';

const generalMember: Member = { cabinet: 'none', eboard: false, involvement: 'general' };
const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

function code(id: string, eventTypeId: string, eventDate: string): Code {
    return { id, eventTypeId, eventDate };
}

/** An Attendance for a coded event, with the ID a redemption would give it. */
function attended(c: Code, extra: Partial<Attendance> = {}): Attendance {
    return { id: `m__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source: 'code', codeId: c.id, ...extra };
}

/** An Attendance from a Point Request with no code (Tabling, CRASH). */
function requested(id: string, eventTypeId: string, eventDate: string, extra: Partial<Attendance> = {}): Attendance {
    return { id: `m__req-${id}`, eventTypeId, eventDate, source: 'request', requestId: id, ...extra };
}

describe('computeStanding', () => {
    it('adds up a plain General Member\'s VE and Cabinet Points toward the goal of 15, with nothing owed', () => {
        const gbm = code('GBM1', 'gbm', '2026-09-03');
        const fundraiser = code('FUND1', 'hsa-fundraising', '2026-10-10');
        const standing = computeStanding(
            generalMember,
            [attended(gbm), attended(fundraiser)],
            rubric,
            [gbm, fundraiser],
            { today: TODAY },
        );

        expect(standing.vePoints).toBe(4);
        expect(standing.cabinetPoints).toBe(2);
        expect(standing.veGoal).toBe(15);
        expect(standing.heldToCabinetRules).toBe(false);
        expect(standing.missedEvents).toEqual([]);
        expect(standing.openStrikes).toBe(0);
    });

    it('sets an MLP Spring member\'s goal at 8 VE Points, and counts Adjustments toward VE Points', () => {
        const mlpSpring: Member = { ...generalMember, involvement: 'mlp', mlpCohort: 'spring' };
        const standing = computeStanding(
            { ...mlpSpring, adjustments: [{ points: 3, note: 'Volunteered at orientation' }] },
            [],
            rubric,
            [],
            { today: TODAY },
        );

        expect(standing.veGoal).toBe(8);
        expect(standing.vePoints).toBe(3);
        expect(standing.cabinetPoints).toBe(0);
    });

    it('gives a Cabinet Member a Missed Event and a Strike for an unexcused miss, until a later Additional Event makes it up', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const gbm = code('GBM1', 'gbm', '2026-09-10');
        const mlpOpen = code('MLP1', 'mlp-open', '2026-09-20');

        const before = computeStanding(cabinetMember, [attended(gbm)], rubric, [thursday, gbm, mlpOpen], { today: TODAY });
        expect(before.heldToCabinetRules).toBe(true);
        expect(before.missedEvents).toEqual([
            { codeId: 'CT1', eventTypeId: 'cabinet-thursday', eventDate: '2026-09-03', semester: 'fall',
                excused: false, strikeRemoved: false, overridden: false, madeUpBy: null, owed: true, strike: true },
        ]);
        expect(before.openStrikes).toBe(1);

        const after = computeStanding(
            cabinetMember, [attended(gbm), attended(mlpOpen)], rubric, [thursday, gbm, mlpOpen], { today: TODAY },
        );
        expect(after.missedEvents).toEqual([
            { codeId: 'CT1', eventTypeId: 'cabinet-thursday', eventDate: '2026-09-03', semester: 'fall',
                excused: false, strikeRemoved: false, overridden: false, madeUpBy: 'm__MLP1', owed: false, strike: false },
        ]);
        expect(after.openStrikes).toBe(0);
        expect(after.surplus).toEqual([
            { attendanceId: 'm__MLP1', eventTypeId: 'mlp-open', eventDate: '2026-09-20', makeupFor: 'CT1' },
        ]);
        // A Make-up still earns its points: GBM 1+2, MLP Open 1+1.
        expect(after.cabinetPoints).toBe(2);
        expect(after.vePoints).toBe(3);
    });

    it('lets a Make-up that came before the miss cover it', () => {
        const crash = requested('r1', 'crash', '2026-08-25');
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const standing = computeStanding(cabinetMember, [crash], rubric, [thursday], { today: TODAY });

        expect(standing.missedEvents[0]).toMatchObject({ codeId: 'CT1', madeUpBy: 'm__req-r1', owed: false, strike: false });
        expect(standing.openStrikes).toBe(0);
    });

    it('gives an excused miss no Strike but still owes a Make-up, and covers Strikes first', () => {
        const excusedThursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const missedGbm = code('GBM1', 'gbm', '2026-09-10');
        const codes = [excusedThursday, missedGbm];
        const member: Member = { ...cabinetMember, excusals: [{ codeId: 'CT1' }] };

        const owed = computeStanding(member, [], rubric, codes, { today: TODAY });
        expect(owed.missedEvents[0]).toMatchObject({ codeId: 'CT1', excused: true, owed: true, strike: false });
        expect(owed.openStrikes).toBe(1);

        // One Make-up goes to the newer miss, because it still carries a Strike.
        const oneMakeup = computeStanding(member, [requested('r1', 'crash', '2026-10-01')], rubric, codes, { today: TODAY });
        expect(oneMakeup.missedEvents.map((missed) => [missed.codeId, missed.madeUpBy])).toEqual([
            ['CT1', null],
            ['GBM1', 'm__req-r1'],
        ]);
        expect(oneMakeup.openStrikes).toBe(0);

        const twoMakeups = computeStanding(
            member,
            [requested('r1', 'crash', '2026-10-01'), requested('r2', 'crash', '2026-10-08')],
            rubric, codes, { today: TODAY },
        );
        expect(twoMakeups.missedEvents.every((missed) => !missed.owed)).toBe(true);
    });

    it('keeps a miss owed after E-Board removes its Strike', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const member: Member = { ...cabinetMember, strikeRemovals: [{ codeId: 'CT1' }] };
        const standing = computeStanding(member, [], rubric, [thursday], { today: TODAY });

        expect(standing.missedEvents[0]).toMatchObject({ strikeRemoved: true, owed: true, strike: false });
        expect(standing.openStrikes).toBe(0);
    });

    it('closes an overridden miss: nothing owed, no Strike, and no Make-up spent on it', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const member: Member = { ...cabinetMember, missedEventOverrides: [{ codeId: 'CT1' }] };
        const standing = computeStanding(member, [requested('r1', 'crash', '2026-10-01')], rubric, [thursday], { today: TODAY });

        expect(standing.missedEvents[0]).toMatchObject({ overridden: true, owed: false, strike: false, madeUpBy: null });
        expect(standing.openStrikes).toBe(0);
        expect(standing.surplus[0].makeupFor).toBeNull();
    });

    it('carries a fall miss and its Strike into the spring, where a spring event makes it up', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-11-05');
        const inFall = computeStanding(cabinetMember, [], rubric, [thursday], { today: '2027-02-01' });
        expect(inFall.missedEvents[0]).toMatchObject({ semester: 'fall', owed: true, strike: true });
        expect(inFall.openStrikes).toBe(1);

        const mlpOpen = code('MLP1', 'mlp-open', '2027-02-10');
        const madeUp = computeStanding(cabinetMember, [attended(mlpOpen)], rubric, [thursday, mlpOpen], { today: TODAY });
        expect(madeUp.missedEvents[0]).toMatchObject({ semester: 'fall', madeUpBy: 'm__MLP1', owed: false });
        expect(madeUp.openStrikes).toBe(0);
    });

    it('fills a Semester Requirement with its first event that Semester and makes the next one surplus', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const firstHour = requested('t1-h1', 'tabling', '2026-09-15');
        const secondHour = requested('t1-h2', 'tabling', '2026-09-15');
        const springHour = requested('t2-h1', 'tabling', '2027-02-02');
        const standing = computeStanding(
            cabinetMember, [springHour, secondHour, firstHour], rubric, [thursday], { today: TODAY },
        );

        const tabling = (semester: 'fall' | 'spring') =>
            standing.semesterRequirements[semester].find((req) => req.eventTypeId === 'tabling');
        expect(tabling('fall')).toEqual({ eventTypeId: 'tabling', waived: false, met: true, filledBy: 'm__req-t1-h1' });
        // A new Semester starts a new requirement, so the spring hour fills it.
        expect(tabling('spring')).toEqual({ eventTypeId: 'tabling', waived: false, met: true, filledBy: 'm__req-t2-h1' });
        expect(standing.semesterRequirements.fall.find((req) => req.eventTypeId === 'hsa-service'))
            .toEqual({ eventTypeId: 'hsa-service', waived: false, met: false, filledBy: null });

        expect(standing.surplus).toEqual([
            { attendanceId: 'm__req-t1-h2', eventTypeId: 'tabling', eventDate: '2026-09-15', makeupFor: 'CT1' },
        ]);
        // Every hour still earns its points.
        expect(standing.vePoints).toBe(3);
    });

    it('waives Affiliate Org for the MLP cabinets, so every Affiliate Org event is surplus', () => {
        const mlpCabinet: Member = { ...cabinetMember, cabinet: 'mlpSpring' };
        const first = code('AFF1', 'affiliate-org', '2026-09-12');
        const second = code('AFF2', 'affiliate-org', '2026-10-12');
        const standing = computeStanding(mlpCabinet, [attended(first), attended(second)], rubric, [first, second], { today: TODAY });

        for (const semester of ['fall', 'spring'] as const) {
            expect(standing.semesterRequirements[semester].find((req) => req.eventTypeId === 'affiliate-org'))
                .toEqual({ eventTypeId: 'affiliate-org', waived: true, met: true, filledBy: null });
        }
        expect(standing.surplus.map((extra) => extra.attendanceId)).toEqual(['m__AFF1', 'm__AFF2']);
    });

    it('fills the HLHM Core Event with the first HLHM event of the year and makes the second one surplus', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const first = code('HLHM1', 'hlhm', '2026-09-20');
        const second = code('HLHM2', 'hlhm', '2026-10-01');
        const skipped = code('HLHM3', 'hlhm', '2026-10-10');
        const standing = computeStanding(
            cabinetMember, [attended(second), attended(first)], rubric, [thursday, first, second, skipped], { today: TODAY },
        );

        expect(standing.coreEvents.filter((event) => event.eventTypeId === 'hlhm').map((event) => [event.codeId, event.status]))
            .toEqual([['HLHM1', 'attended'], ['HLHM2', 'attended'], ['HLHM3', 'not-required']]);
        expect(standing.surplus).toEqual([
            { attendanceId: 'm__HLHM2', eventTypeId: 'hlhm', eventDate: '2026-10-01', makeupFor: 'CT1' },
        ]);
        expect(standing.missedEvents.map((missed) => missed.codeId)).toEqual(['CT1']);
    });

    it('misses the HLHM Core Event only once the last HLHM event has passed unattended', () => {
        const first = code('HLHM1', 'hlhm', '2026-09-20');
        const last = code('HLHM2', 'hlhm', '2026-10-10');

        const midMonth = computeStanding(cabinetMember, [], rubric, [first, last], { today: '2026-10-01' });
        expect(midMonth.coreEvents.map((event) => [event.codeId, event.status]))
            .toEqual([['HLHM1', 'not-required'], ['HLHM2', 'upcoming']]);
        expect(midMonth.missedEvents).toEqual([]);

        const afterwards = computeStanding(cabinetMember, [], rubric, [first, last], { today: TODAY });
        expect(afterwards.coreEvents.map((event) => [event.codeId, event.status]))
            .toEqual([['HLHM1', 'not-required'], ['HLHM2', 'missed']]);
        expect(afterwards.missedEvents.map((missed) => missed.codeId)).toEqual(['HLHM2']);
        expect(afterwards.openStrikes).toBe(1);
    });

    it('honours a Point Request\'s named pick first, then runs the rest oldest-first', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const gbm = code('GBM1', 'gbm', '2026-09-10');
        const unpicked = requested('r1', 'crash', '2026-09-20');
        const picked = requested('r2', 'crash', '2026-10-01', { makeupFor: 'CT1' });
        const standing = computeStanding(cabinetMember, [unpicked, picked], rubric, [thursday, gbm], { today: TODAY });

        expect(standing.missedEvents.map((missed) => [missed.codeId, missed.madeUpBy])).toEqual([
            ['CT1', 'm__req-r2'],
            ['GBM1', 'm__req-r1'],
        ]);
        expect(standing.openStrikes).toBe(0);
    });

    it('falls back to the automatic order when a pick names nothing still owed', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const gbm = code('GBM1', 'gbm', '2026-09-10');
        const pickedAttended = requested('r1', 'crash', '2026-09-20', { makeupFor: 'GBM1' });
        const standing = computeStanding(cabinetMember, [attended(gbm), pickedAttended], rubric, [thursday, gbm], { today: TODAY });

        expect(standing.surplus[0].makeupFor).toBe('CT1');
    });

    it('lists every Core Event of the year as attended, missed or upcoming', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const gbm = code('GBM1', 'gbm', '2026-09-10');
        const hlsa = code('HLSA1', 'hlsa', '2027-04-20');
        const standing = computeStanding(cabinetMember, [attended(gbm)], rubric, [hlsa, gbm, thursday], { today: TODAY });

        expect(standing.coreEvents).toEqual([
            { codeId: 'CT1', eventTypeId: 'cabinet-thursday', eventDate: '2026-09-03', semester: 'fall', status: 'missed' },
            { codeId: 'GBM1', eventTypeId: 'gbm', eventDate: '2026-09-10', semester: 'fall', status: 'attended' },
            // Tonight's code still works, so it isn't a Missed Event yet.
            { codeId: 'HLSA1', eventTypeId: 'hlsa', eventDate: '2027-04-20', semester: 'spring', status: 'upcoming' },
        ]);
    });

    it('gives E-Board and General Members no Core Events, Missed Events or Strikes', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const eboard: Member = { cabinet: 'president', eboard: true, approved: true };
        for (const member of [eboard, generalMember]) {
            const standing = computeStanding(member, [], rubric, [thursday], { today: TODAY });
            expect(standing.coreEvents).toEqual([]);
            expect(standing.missedEvents).toEqual([]);
            expect(standing.openStrikes).toBe(0);
        }
    });

    it('holds E-Board previewing the Cabinet Member view to the Cabinet rules', () => {
        const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');
        const eboard: Member = { cabinet: 'president', eboard: true, approved: true };
        const standing = computeStanding(eboard, [], rubric, [thursday], { today: TODAY, viewingAsCabinet: true });
        expect(standing.heldToCabinetRules).toBe(true);
        expect(standing.openStrikes).toBe(1);
    });
});
