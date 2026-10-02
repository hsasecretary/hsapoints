// Adding, editing and deleting event codes, through the real firestore.rules (#70).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { EBOARD, MEMBER, OTHER_MEMBER, memberDoc, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';
import { createCode, deleteCode, updateCode } from './eventCodes';

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
        'codes/GBM2': { event: 'GBM 2', eventDate: '2026-09-10', eventTypeId: 'gbm', attendeeCount: 2 },
        [`attendances/${MEMBER}__GBM2`]: { email: MEMBER, eventTypeId: 'gbm', eventDate: '2026-09-10', source: 'code', codeId: 'GBM2' },
        [`attendances/${OTHER_MEMBER}__GBM2`]: { email: OTHER_MEMBER, eventTypeId: 'gbm', eventDate: '2026-09-10', source: 'code', codeId: 'GBM2' },
        [`attendances/${MEMBER}__OTHER`]: { email: MEMBER, eventTypeId: 'hlsa', eventDate: '2026-09-12', source: 'code', codeId: 'OTHER' },
    });
});

const form = { event: 'GBM 3', code: 'gbm3', eventDate: '2026-10-08', eventTypeId: 'gbm', graphicDate: '' };

describe('adding a code', () => {
    it('saves the Event Type and no per-event point fields', async () => {
        expect(await createCode(signedInAs(env, EBOARD), form)).toEqual({ ok: true, id: 'GBM3' });
        expect(await readPastRules(env, 'codes/GBM3')).toEqual({
            event: 'GBM 3', eventDate: '2026-10-08', eventTypeId: 'gbm', attendeeCount: 0,
        });
    });

    it('refuses a code that already exists, and leaves it alone', async () => {
        const result = await createCode(signedInAs(env, EBOARD), { ...form, code: 'gbm2', event: 'Imposter' });

        expect(result).toEqual({ ok: false, error: 'GBM2 is already a code.' });
        expect(await readPastRules(env, 'codes/GBM2')).toMatchObject({ event: 'GBM 2' });
    });
});

describe('editing a code', () => {
    const edit = { event: 'GBM 2 (moved)', eventDate: '2026-09-11', eventTypeId: 'hlsa', graphicDate: '2026-09-01' };

    it('saves the new details and keeps the check-in count', async () => {
        expect(await updateCode(signedInAs(env, EBOARD), 'GBM2', edit)).toEqual({ ok: true });
        expect(await readPastRules(env, 'codes/GBM2')).toEqual({ ...edit, attendeeCount: 2 });
    });

    it("moves the code's Attendance to its new Event Type and date, and no one else's", async () => {
        await updateCode(signedInAs(env, EBOARD), 'GBM2', edit);

        for (const email of [MEMBER, OTHER_MEMBER]) {
            expect(await readPastRules(env, `attendances/${email}__GBM2`)).toMatchObject({ eventTypeId: 'hlsa', eventDate: '2026-09-11' });
        }
        expect(await readPastRules(env, `attendances/${MEMBER}__OTHER`)).toMatchObject({ eventTypeId: 'hlsa', eventDate: '2026-09-12' });
    });

    it('clears a graphic date that was taken off', async () => {
        const db = signedInAs(env, EBOARD);
        await updateCode(db, 'GBM2', edit);
        await updateCode(db, 'GBM2', { ...edit, graphicDate: '' });

        expect(await readPastRules(env, 'codes/GBM2')).not.toHaveProperty('graphicDate');
    });

    it('refuses details a new code would be refused for', async () => {
        expect(await updateCode(signedInAs(env, EBOARD), 'GBM2', { ...edit, eventTypeId: 'crash' }))
            .toEqual({ ok: false, error: 'Pick an Event Type.' });
    });
});

describe('deleting a code', () => {
    it('deletes a code nobody has checked in to', async () => {
        await seed(env, { 'codes/TYPO': { event: 'Typo', eventDate: '2026-10-08', eventTypeId: 'gbm', attendeeCount: 0 } });

        expect(await deleteCode(signedInAs(env, EBOARD), 'TYPO')).toEqual({ ok: true });
        expect(await readPastRules(env, 'codes/TYPO')).toBeUndefined();
    });

    it('refuses once anyone has checked in, since their Attendance points at it', async () => {
        expect(await deleteCode(signedInAs(env, EBOARD), 'GBM2'))
            .toEqual({ ok: false, error: "2 people have checked in to GBM2, so it can't be deleted." });
        expect(await readPastRules(env, 'codes/GBM2')).toBeDefined();
    });
});
