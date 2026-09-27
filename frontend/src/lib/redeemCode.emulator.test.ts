// Redeeming an event code, and E-Board removing a check-in, end to end through the real firestore.rules (#69).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { EBOARD, MEMBER, memberDoc, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';
import { redeemCode, removeCheckIn } from './redeemCode';

const TODAY = '2026-09-25';

let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await startEmulator();
});

afterAll(async () => {
    await env.cleanup();
});

beforeEach(async () => {
    await env.clearFirestore();
    await seed(env, {
        [`users/${MEMBER}`]: memberDoc(MEMBER),
        'codes/GBM1': {
            event: 'GBM 1', eventTypeId: 'gbm', eventDate: TODAY, attendeeCount: 0,
            // The old per-event fields, still on codes made before Event Types.
            category: 'GBM', points: 2, semester: 'fallPoints', voterEligible: true,
        },
    });
});

describe('redeeming an event code', () => {
    it("records today's code as the Member's Attendance", async () => {
        const result = await redeemCode(signedInAs(env, MEMBER), MEMBER, 'gbm1', { today: TODAY });

        expect(result).toEqual({ ok: true });
        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toEqual({
            email: MEMBER,
            eventTypeId: 'gbm',
            eventDate: TODAY,
            source: 'code',
            codeId: 'GBM1',
        });
    });

    it('files the Attendance under the lowercase email the Member doc is keyed by', async () => {
        const mixedCase = 'Ana@UFL.edu';

        expect(await redeemCode(signedInAs(env, mixedCase), mixedCase, 'GBM1', { today: TODAY })).toEqual({ ok: true });
        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toMatchObject({ email: MEMBER });
    });

    it('says a code already redeemed is already redeemed', async () => {
        const db = signedInAs(env, MEMBER);
        await redeemCode(db, MEMBER, 'GBM1', { today: TODAY });

        expect(await redeemCode(db, MEMBER, ' gbm1 ', { today: TODAY })).toEqual({ ok: false, reason: 'already-redeemed' });
    });

    it("bumps the code's check-in count and the old point counters once, however often it's redeemed", async () => {
        const db = signedInAs(env, MEMBER);
        await redeemCode(db, MEMBER, 'GBM1', { today: TODAY });
        await redeemCode(db, MEMBER, 'GBM1', { today: TODAY });

        expect((await readPastRules(env, 'codes/GBM1'))?.attendeeCount).toBe(1);
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({
            eventCodes: ['GBM1'],
            fallPoints: 2,
            gbmPointsVE: 2,
            gbmPointsNVE: 0,
        });
    });

    it('says a code redeemed before the Attendance ledger existed is already redeemed', async () => {
        await seed(env, { [`users/${MEMBER}`]: memberDoc(MEMBER, { eventCodes: ['GBM1'], fallPoints: 2, gbmPointsVE: 2 }) });

        const result = await redeemCode(signedInAs(env, MEMBER), MEMBER, 'GBM1', { today: TODAY });

        expect(result).toEqual({ ok: false, reason: 'already-redeemed' });
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({ fallPoints: 2, gbmPointsVE: 2 });
    });

    it('still redeems a code made before Event Types, leaving its Attendance to the migration', async () => {
        await seed(env, {
            'codes/OLD1': { event: 'Old GBM', eventDate: TODAY, category: 'GBM', points: 2, semester: 'fallPoints', voterEligible: false },
        });
        const db = signedInAs(env, MEMBER);

        expect(await redeemCode(db, MEMBER, 'OLD1', { today: TODAY })).toEqual({ ok: true });
        expect(await readPastRules(env, `attendances/${MEMBER}__OLD1`)).toBeUndefined();
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({ eventCodes: ['OLD1'], fallPoints: 2, gbmPointsNVE: 2 });
        expect(await redeemCode(db, MEMBER, 'OLD1', { today: TODAY })).toEqual({ ok: false, reason: 'already-redeemed' });
    });

    it("turns away a code that doesn't exist", async () => {
        expect(await redeemCode(signedInAs(env, MEMBER), MEMBER, 'NOPE', { today: TODAY }))
            .toEqual({ ok: false, reason: 'not-found' });
    });

    it("turns away a code on any day but its event's", async () => {
        const db = signedInAs(env, MEMBER);

        expect(await redeemCode(db, MEMBER, 'GBM1', { today: '2026-09-26' })).toEqual({ ok: false, reason: 'not-active' });
        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toBeUndefined();
        expect((await readPastRules(env, 'codes/GBM1'))?.attendeeCount).toBe(0);
    });

    describe('a Cabinet-only code', () => {
        beforeEach(async () => {
            await seed(env, { 'codes/CT1': { event: 'Cabinet Thursday', eventTypeId: 'cabinet-thursday', eventDate: TODAY, attendeeCount: 0 } });
        });

        it('turns away a General Member', async () => {
            const result = await redeemCode(signedInAs(env, MEMBER), MEMBER, 'CT1', { today: TODAY });

            expect(result).toEqual({ ok: false, reason: 'cabinet-only' });
            expect(await readPastRules(env, `attendances/${MEMBER}__CT1`)).toBeUndefined();
        });

        it.each([
            ['an approved Cabinet Member, before the migration marks them', { cabinet: 'operations', approved: true }],
            ['a Member held to cabinet rules', { heldToCabinetRules: true }],
            ['a Web-team Tester', { webTeam: true, heldToCabinetRules: true }],
            ['a Web-team Tester, before the migration marks them', { webTeam: true }],
        ])('lets in %s', async (_who, facts) => {
            await seed(env, { [`users/${MEMBER}`]: memberDoc(MEMBER, facts) });

            expect(await redeemCode(signedInAs(env, MEMBER), MEMBER, 'CT1', { today: TODAY })).toEqual({ ok: true });
        });

        it.each([
            ['a Cabinet Member the migration marked as not held to cabinet rules', { cabinet: 'operations', approved: true, heldToCabinetRules: false }],
            ['a Cabinet Member still awaiting approval', { cabinet: 'operations', approved: false }],
            ['E-Board in their own view', { eboard: true, cabinet: 'president', approved: true }],
        ])('turns away %s', async (_who, facts) => {
            await seed(env, { [`users/${MEMBER}`]: memberDoc(MEMBER, facts) });

            expect(await redeemCode(signedInAs(env, MEMBER), MEMBER, 'CT1', { today: TODAY }))
                .toEqual({ ok: false, reason: 'cabinet-only' });
        });

        it('lets in E-Board viewing as Cabinet Member', async () => {
            await seed(env, { [`users/${MEMBER}`]: memberDoc(MEMBER, { eboard: true }) });

            expect(await redeemCode(signedInAs(env, MEMBER), MEMBER, 'CT1', { today: TODAY, viewingAsCabinet: true }))
                .toEqual({ ok: true });
        });
    });
});

describe('E-Board removing a check-in', () => {
    const notThere = { reason: 'Not there', reviewer: EBOARD, today: TODAY };

    beforeEach(async () => {
        await seed(env, { [`users/${EBOARD}`]: memberDoc(EBOARD, { eboard: true }) });
        await redeemCode(signedInAs(env, MEMBER), MEMBER, 'GBM1', { today: TODAY });
    });

    it('deletes the Attendance, un-counts it and records why, who and when', async () => {
        const result = await removeCheckIn(signedInAs(env, EBOARD), `${MEMBER}__GBM1`, { reason: " Used a friend's code ", reviewer: EBOARD, today: '2026-09-27' });

        expect(result).toEqual({ ok: true });
        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toBeUndefined();
        expect((await readPastRules(env, 'codes/GBM1'))?.attendeeCount).toBe(0);
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({
            eventCodes: [],
            fallPoints: 0,
            gbmPointsVE: 0,
            removedCheckIns: {
                GBM1: { event: 'GBM 1', eventTypeId: 'gbm', eventDate: TODAY, reason: "Used a friend's code", by: EBOARD, on: '2026-09-27' },
            },
        });
    });

    it("won't let the Member check in with that code again", async () => {
        await removeCheckIn(signedInAs(env, EBOARD), `${MEMBER}__GBM1`, notThere);

        expect(await redeemCode(signedInAs(env, MEMBER), MEMBER, 'GBM1', { today: TODAY })).toEqual({ ok: false, reason: 'removed' });
        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toBeUndefined();
    });

    it("won't let the Member write that Attendance back around the app", async () => {
        await removeCheckIn(signedInAs(env, EBOARD), `${MEMBER}__GBM1`, notThere);

        await expect(setDoc(doc(signedInAs(env, MEMBER), 'attendances', `${MEMBER}__GBM1`), {
            email: MEMBER, eventTypeId: 'gbm', eventDate: TODAY, source: 'code', codeId: 'GBM1',
        })).rejects.toThrow();
    });

    it('needs a reason', async () => {
        expect((await removeCheckIn(signedInAs(env, EBOARD), `${MEMBER}__GBM1`, { ...notThere, reason: '  ' })).ok).toBe(false);
        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toBeDefined();
    });

    it('only removes a check-in the Member made with the code, not one a Point Request made', async () => {
        await seed(env, {
            'codes/SALSA': { event: 'Salsa', eventTypeId: 'hsa-programming', eventDate: TODAY, attendeeCount: 1 },
            [`attendances/${MEMBER}__SALSA`]: { email: MEMBER, eventTypeId: 'hsa-programming', eventDate: TODAY, source: 'request', codeId: 'SALSA', requestId: 'r1' },
        });
        const db = signedInAs(env, EBOARD);

        expect((await removeCheckIn(db, `${MEMBER}__SALSA`, notThere)).ok).toBe(false);
        expect((await removeCheckIn(db, `${MEMBER}__NOPE`, notThere)).ok).toBe(false);
        expect(await readPastRules(env, `attendances/${MEMBER}__SALSA`)).toBeDefined();
    });

    it('finds a code stored in mixed case, and keys the removal upper-cased', async () => {
        await seed(env, {
            'codes/Salsa2': { event: 'Salsa', eventTypeId: 'hsa-programming', eventDate: TODAY, attendeeCount: 1 },
            [`attendances/${MEMBER}__Salsa2`]: { email: MEMBER, eventTypeId: 'hsa-programming', eventDate: TODAY, source: 'code', codeId: 'Salsa2' },
        });

        expect(await removeCheckIn(signedInAs(env, EBOARD), `${MEMBER}__Salsa2`, notThere)).toEqual({ ok: true });
        expect((await readPastRules(env, 'codes/Salsa2'))?.attendeeCount).toBe(0);
        expect((await readPastRules(env, `users/${MEMBER}`))?.removedCheckIns).toHaveProperty('SALSA2');
    });

    it('is E-Board only', async () => {
        await expect(removeCheckIn(signedInAs(env, MEMBER), `${MEMBER}__GBM1`, { ...notThere, reviewer: MEMBER })).rejects.toThrow();
    });
});
