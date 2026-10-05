// E-Board entering an event for a Member, end to end through the real firestore.rules.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { EBOARD, MEMBER, memberDoc, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';
import { enterAttendance } from './enterAttendance';
import { redeemCode } from './redeemCode';

const TODAY = '2026-09-25';
const context = { by: EBOARD, today: TODAY, entryId: 'eb-1' };

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
        [`users/${EBOARD}`]: memberDoc(EBOARD, { eboard: true }),
        [`users/${MEMBER}`]: memberDoc(MEMBER),
        'codes/GBM1': { event: 'GBM 1', eventTypeId: 'gbm', eventDate: '2026-09-10', attendeeCount: 3 },
        'codes/CT1': { event: 'Cabinet Thursday', eventTypeId: 'cabinet-thursday', eventDate: '2026-09-03', attendeeCount: 0 },
    });
});

const enter = (input: Parameters<typeof enterAttendance>[2], overrides: Partial<typeof context> = {}) =>
    enterAttendance(signedInAs(env, EBOARD), MEMBER, input, { ...context, ...overrides });

describe('entering an event with a code', () => {
    it("writes the code's Attendance with the audit fields and bumps the check-in count", async () => {
        expect(await enter({ codeId: 'gbm1', note: ' Was at the door ' })).toEqual({ ok: true });

        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toEqual({
            email: MEMBER, eventTypeId: 'gbm', eventDate: '2026-09-10', source: 'eboard', codeId: 'GBM1',
            enteredBy: EBOARD, enteredOn: TODAY, note: 'Was at the door',
        });
        expect((await readPastRules(env, 'codes/GBM1'))?.attendeeCount).toBe(4);
    });

    it('leaves the note off when there is none, but always records who and when', async () => {
        await enter({ codeId: 'GBM1' });

        const written = await readPastRules(env, `attendances/${MEMBER}__GBM1`);
        expect(written).toMatchObject({ enteredBy: EBOARD, enteredOn: TODAY });
        expect(written).not.toHaveProperty('note');
    });

    it('refuses a second entry, and an event the Member redeemed themselves, without counting twice', async () => {
        expect(await enter({ codeId: 'GBM1' })).toEqual({ ok: true });
        expect(await enter({ codeId: 'GBM1' })).toEqual({ ok: false, error: 'This Member already has that event.' });
        expect((await readPastRules(env, 'codes/GBM1'))?.attendeeCount).toBe(4);

        await seed(env, { 'codes/GBM2': { event: 'GBM 2', eventTypeId: 'gbm', eventDate: TODAY, attendeeCount: 0 } });
        await redeemCode(signedInAs(env, MEMBER), MEMBER, 'GBM2', { today: TODAY });
        expect(await enter({ codeId: 'GBM2' })).toMatchObject({ ok: false });
        expect((await readPastRules(env, 'codes/GBM2'))?.attendeeCount).toBe(1);
    });

    it('refuses a code redeemed before the ledger existed', async () => {
        await seed(env, { [`users/${MEMBER}`]: memberDoc(MEMBER, { eventCodes: ['gbm1'] }) });

        expect(await enter({ codeId: 'GBM1' })).toMatchObject({ ok: false });
        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toBeUndefined();
    });

    it('refuses a code that is gone, one with no Event Type yet, and a future event', async () => {
        await seed(env, {
            'codes/OLD1': { event: 'Old', eventDate: '2026-09-01' },
            'codes/LATER': { event: 'Later', eventTypeId: 'gbm', eventDate: '2026-10-01', attendeeCount: 0 },
        });

        expect(await enter({ codeId: 'NOPE' })).toMatchObject({ ok: false });
        expect(await enter({ codeId: 'OLD1' })).toMatchObject({ ok: false });
        expect(await enter({ codeId: 'LATER' })).toEqual({ ok: false, error: "That event hasn't happened yet." });
    });

    it('lets E-Board correct a Removed Check-in, leaving the removal on record', async () => {
        const removed = { event: 'GBM 1', eventTypeId: 'gbm', eventDate: '2026-09-10', reason: 'Not there', by: EBOARD, on: '2026-09-20' };
        await seed(env, { [`users/${MEMBER}`]: memberDoc(MEMBER, { removedCheckIns: { GBM1: removed } }) });

        expect(await enter({ codeId: 'GBM1' })).toEqual({ ok: true });
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({ removedCheckIns: { GBM1: removed } });
    });

    it("refuses a Cabinet-only event for a Member who isn't Cabinet, and allows it for one who is", async () => {
        expect(await enter({ codeId: 'CT1' })).toMatchObject({ ok: false });
        expect(await readPastRules(env, `attendances/${MEMBER}__CT1`)).toBeUndefined();

        await seed(env, { [`users/${MEMBER}`]: memberDoc(MEMBER, { cabinet: 'operations', approved: true }) });
        expect(await enter({ codeId: 'CT1' })).toEqual({ ok: true });
    });
});

describe('entering an event with no code', () => {
    it('writes one Attendance with the given name, date and Event Type', async () => {
        expect(await enter({ name: ' Mixer ', date: '2026-09-12', eventTypeId: 'external-social' })).toEqual({ ok: true });

        expect(await readPastRules(env, `attendances/${MEMBER}__req-eb-1`)).toEqual({
            email: MEMBER, eventTypeId: 'external-social', eventDate: '2026-09-12', source: 'eboard',
            enteredBy: EBOARD, enteredOn: TODAY, eventName: 'Mixer', entryId: 'eb-1',
        });
    });

    it('writes one Attendance per Tabling hour', async () => {
        expect(await enter({ name: 'Plaza table', date: '2026-09-12', eventTypeId: 'tabling', hours: 3 })).toEqual({ ok: true });

        for (const n of [1, 2, 3]) {
            expect(await readPastRules(env, `attendances/${MEMBER}__req-eb-1-h${n}`)).toMatchObject({ eventTypeId: 'tabling', entryId: 'eb-1' });
        }
        expect(await readPastRules(env, `attendances/${MEMBER}__req-eb-1-h4`)).toBeUndefined();
    });

    it('refuses Tabling with no hours, and a missing name or Event Type', async () => {
        expect(await enter({ name: 'Table', date: '2026-09-12', eventTypeId: 'tabling' })).toMatchObject({ ok: false });
        expect(await enter({ name: ' ', date: '2026-09-12', eventTypeId: 'crash' })).toMatchObject({ ok: false });
        expect(await enter({ name: 'Thing', date: '2026-09-12', eventTypeId: 'nonsense' })).toMatchObject({ ok: false });
    });

    it('refuses a future date and a date outside the school year', async () => {
        expect(await enter({ name: 'Mixer', date: '2026-09-26', eventTypeId: 'crash' })).toEqual({ ok: false, error: "That event hasn't happened yet." });
        expect(await enter({ name: 'Mixer', date: '2026-05-31', eventTypeId: 'crash' })).toEqual({ ok: false, error: 'That date is outside this school year.' });
        expect(await enter({ name: 'Mixer', date: '', eventTypeId: 'crash' })).toMatchObject({ ok: false });
    });

    it('refuses a Cabinet-only Event Type for a Member who is not Cabinet', async () => {
        expect(await enter({ name: 'Social', date: '2026-09-12', eventTypeId: 'internal-social' })).toMatchObject({ ok: false });
    });
});

describe('who can enter', () => {
    it('is E-Board only: a Member entering for themselves is turned away by the rules', async () => {
        await expect(enterAttendance(signedInAs(env, MEMBER), MEMBER, { codeId: 'GBM1' }, { ...context, by: MEMBER })).rejects.toThrow();
        expect(await readPastRules(env, `attendances/${MEMBER}__GBM1`)).toBeUndefined();
    });
});
