// Saving Excuse Absence changes, through the real firestore.rules (#73).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { assertFails } from '@firebase/rules-unit-testing';
import { EBOARD, MEMBER, memberDoc, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';
import { saveAbsenceAction } from './excuseAbsence';

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
        [`users/${MEMBER}`]: memberDoc(MEMBER, { cabinet: 'programming', approved: true, heldToCabinetRules: true }),
    });
});

describe('saving an Excuse Absence change', () => {
    it('writes the excusal and appends to the absenceLog, and an undo keeps the history', async () => {
        const db = signedInAs(env, EBOARD);

        expect(await saveAbsenceAction(db, MEMBER, { kind: 'excuse', codeId: 'CT1', note: 'Excuse Form' }, EBOARD)).toMatchObject({ ok: true });
        expect(await saveAbsenceAction(db, MEMBER, { kind: 'unexcuse', codeId: 'CT1', note: '' }, EBOARD)).toMatchObject({ ok: true });

        const user = await readPastRules(env, `users/${MEMBER}`);
        expect(user.excusals).toEqual([]);
        expect(user.absenceLog).toEqual([
            { kind: 'excused', codeId: 'CT1', note: 'Excuse Form', by: EBOARD, at: expect.any(String) },
            { kind: 'unexcused', codeId: 'CT1', note: '', by: EBOARD, at: expect.any(String) },
        ]);
    });

    it('closes a Missed Event with its reason', async () => {
        const db = signedInAs(env, EBOARD);

        await saveAbsenceAction(db, MEMBER, { kind: 'close', codeId: 'CT1', note: 'On the sign-in sheet' }, EBOARD);

        expect((await readPastRules(env, `users/${MEMBER}`)).missedEventOverrides).toEqual([
            { codeId: 'CT1', reason: 'On the sign-in sheet', by: EBOARD, at: expect.any(String) },
        ]);
    });

    it('saves nothing when a Strike is removed without a reason', async () => {
        const result = await saveAbsenceAction(signedInAs(env, EBOARD), MEMBER, { kind: 'remove-strike', codeId: 'CT1', note: '' }, EBOARD);

        expect(result.ok).toBe(false);
        expect((await readPastRules(env, `users/${MEMBER}`)).strikeRemovals).toBeUndefined();
    });

    it("won't let a Member excuse their own miss", async () => {
        await assertFails(saveAbsenceAction(signedInAs(env, MEMBER), MEMBER, { kind: 'excuse', codeId: 'CT1', note: '' }, MEMBER));
    });
});
