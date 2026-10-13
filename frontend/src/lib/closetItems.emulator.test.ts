// Adding and retiring Closet Items, through the real firestore.rules (#105).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { EBOARD, memberDoc, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';
import { addClosetItem, retireClosetItem } from './closetItems';

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
        'closetItems/021': { description: 'Bluetooth speaker', retired: false },
    });
});

describe('adding a Closet Item', () => {
    it('saves the padded sticker number and description, unretired', async () => {
        expect(await addClosetItem(signedInAs(env, EBOARD), { stickerNumber: '31', description: 'Extension cord (25 ft)' }))
            .toEqual({ ok: true, id: '031' });
        expect(await readPastRules(env, 'closetItems/031')).toEqual({ description: 'Extension cord (25 ft)', retired: false });
    });

    it('refuses a sticker number that is already a Closet Item, and leaves it alone', async () => {
        const result = await addClosetItem(signedInAs(env, EBOARD), { stickerNumber: '21', description: 'Imposter' });

        expect(result).toEqual({ ok: false, error: '#021 is already a Closet Item.' });
        expect(await readPastRules(env, 'closetItems/021')).toEqual({ description: 'Bluetooth speaker', retired: false });
    });
});

describe('retiring a Closet Item', () => {
    it('marks it retired but keeps it', async () => {
        expect(await retireClosetItem(signedInAs(env, EBOARD), '021')).toEqual({ ok: true });
        expect(await readPastRules(env, 'closetItems/021')).toEqual({ description: 'Bluetooth speaker', retired: true });
    });

    it("refuses a sticker number that isn't a Closet Item", async () => {
        expect(await retireClosetItem(signedInAs(env, EBOARD), '099')).toEqual({ ok: false, error: "#099 isn't a Closet Item." });
    });

    it('refuses retiring one that is already retired', async () => {
        await seed(env, { 'closetItems/021': { description: 'Bluetooth speaker', retired: true } });

        expect(await retireClosetItem(signedInAs(env, EBOARD), '021')).toEqual({ ok: false, error: '#021 is already retired.' });
    });
});
