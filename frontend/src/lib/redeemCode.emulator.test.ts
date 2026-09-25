// Redeeming an event code, end to end through the real firestore.rules (#69).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { MEMBER, memberDoc, seed, signedInAs, startEmulator } from '../test/emulator';
import { redeemCode } from './redeemCode';

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
            // The old per-event fields, still set on codes until the Event Codes page is rebuilt.
            category: 'GBM', points: 2, semester: 'fallPoints', voterEligible: true,
        },
    });
});

/** Reads a doc past the rules, to see what redeeming left behind. */
async function read(path: string) {
    let data: Record<string, any> | undefined;
    await env.withSecurityRulesDisabled(async (context) => {
        const snap = await getDoc(doc(context.firestore() as unknown as Firestore, path));
        data = snap.data();
    });
    return data;
}

describe('redeeming an event code', () => {
    it("records today's code as the Member's Attendance", async () => {
        const result = await redeemCode(signedInAs(env, MEMBER), MEMBER, 'gbm1', { today: TODAY });

        expect(result).toEqual({ ok: true });
        expect(await read(`attendances/${MEMBER}__GBM1`)).toEqual({
            email: MEMBER,
            eventTypeId: 'gbm',
            eventDate: TODAY,
            source: 'code',
            codeId: 'GBM1',
        });
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

        expect((await read('codes/GBM1'))?.attendeeCount).toBe(1);
        expect(await read(`users/${MEMBER}`)).toMatchObject({
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
        expect(await read(`users/${MEMBER}`)).toMatchObject({ fallPoints: 2, gbmPointsVE: 2 });
    });

    it('still redeems a code made before Event Types, leaving its Attendance to the migration', async () => {
        await seed(env, {
            'codes/OLD1': { event: 'Old GBM', eventDate: TODAY, category: 'GBM', points: 2, semester: 'fallPoints', voterEligible: false },
        });
        const db = signedInAs(env, MEMBER);

        expect(await redeemCode(db, MEMBER, 'OLD1', { today: TODAY })).toEqual({ ok: true });
        expect(await read(`attendances/${MEMBER}__OLD1`)).toBeUndefined();
        expect(await read(`users/${MEMBER}`)).toMatchObject({ eventCodes: ['OLD1'], fallPoints: 2, gbmPointsNVE: 2 });
        expect(await redeemCode(db, MEMBER, 'OLD1', { today: TODAY })).toEqual({ ok: false, reason: 'already-redeemed' });
    });

    it("turns away a code that doesn't exist", async () => {
        expect(await redeemCode(signedInAs(env, MEMBER), MEMBER, 'NOPE', { today: TODAY }))
            .toEqual({ ok: false, reason: 'not-found' });
    });

    it("turns away a code on any day but its event's", async () => {
        const db = signedInAs(env, MEMBER);

        expect(await redeemCode(db, MEMBER, 'GBM1', { today: '2026-09-26' })).toEqual({ ok: false, reason: 'not-active' });
        expect(await read(`attendances/${MEMBER}__GBM1`)).toBeUndefined();
        expect((await read('codes/GBM1'))?.attendeeCount).toBe(0);
    });

    describe('a Cabinet-only code', () => {
        beforeEach(async () => {
            await seed(env, { 'codes/CT1': { event: 'Cabinet Thursday', eventTypeId: 'cabinet-thursday', eventDate: TODAY, attendeeCount: 0 } });
        });

        it('turns away a General Member', async () => {
            const result = await redeemCode(signedInAs(env, MEMBER), MEMBER, 'CT1', { today: TODAY });

            expect(result).toEqual({ ok: false, reason: 'cabinet-only' });
            expect(await read(`attendances/${MEMBER}__CT1`)).toBeUndefined();
        });

        it.each([
            ['an approved Cabinet Member, before the migration marks them', { cabinet: 'operations', approved: true }],
            ['a Member held to cabinet rules', { heldToCabinetRules: true }],
            ['a Web-team Tester', { webTeam: true, heldToCabinetRules: true }],
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
