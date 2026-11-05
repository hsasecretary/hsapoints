// Submitting a Point Request with a photo, against the emulator and the
// repo's real firestore.rules: the request saves without the photo, the photo
// saves beside it, and E-Board reads it back when they open it
// (lib/requestEvidence.ts).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { buildPointRequest } from './pointRequests';
import { loadPhoto, savePhoto } from './requestEvidence';
import { EBOARD, MEMBER, OTHER_MEMBER, memberDoc, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';

const PHOTO = 'data:image/jpeg;base64,x';
const CODES = [{ id: 'GBM1', eventTypeId: 'gbm', eventDate: '2026-09-25', event: 'GBM 1' }];

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
        [`users/${OTHER_MEMBER}`]: memberDoc(OTHER_MEMBER),
        [`users/${EBOARD}`]: memberDoc(EBOARD, { eboard: true }),
        'codes/GBM1': { event: 'GBM 1', eventTypeId: 'gbm', eventDate: '2026-09-25', attendeeCount: 0 },
    });
});

/** Submit Point Request's save: the request, then its photo under it. A
 *  request with no photo needs the note that stands in for one. */
async function submit(email: string, photo: string, note = photo ? '' : 'Ana can vouch') {
    const built = buildPointRequest(
        { typeChoiceId: 'gbm', codeId: 'GBM1', eventTypeId: 'gbm', eventDate: '2026-09-25', eventName: '', note, hours: 1, makeupFor: [], photo },
        { email, codes: CODES, today: '2026-10-01' },
    );
    if (built.ok === false) throw new Error(built.error);
    const db = signedInAs(env, email);
    const saved = await addDoc(collection(db, 'pointRequests'), { ...built.data, submittedAt: serverTimestamp() });
    if (built.photo) await savePhoto(db, saved.id, email, built.photo);
    return saved.id;
}

describe('a submitted photo', () => {
    it('is saved beside the request, never on it', async () => {
        const id = await submit(MEMBER, PHOTO);

        const request = await readPastRules(env, `pointRequests/${id}`);
        expect(request?.hasPhoto).toBe(true);
        expect(request?.imageData).toBeUndefined();
        expect(await readPastRules(env, `pointRequests/${id}/evidence/photo`))
            .toMatchObject({ imageData: PHOTO, userEmail: MEMBER });
    });

    it('is not written at all when the Member sent a note instead', async () => {
        const id = await submit(MEMBER, '');

        expect((await readPastRules(env, `pointRequests/${id}`))?.hasPhoto).toBe(false);
        expect(await readPastRules(env, `pointRequests/${id}/evidence/photo`)).toBeUndefined();
    });

    it('comes back when E-Board opens it', async () => {
        const id = await submit(MEMBER, PHOTO);
        expect(await loadPhoto(signedInAs(env, EBOARD), id)).toBe(PHOTO);
    });

    it('comes back to the Member who sent it, but not to anyone else', async () => {
        const id = await submit(MEMBER, PHOTO);
        expect(await loadPhoto(signedInAs(env, MEMBER), id)).toBe(PHOTO);
        await assertFails(loadPhoto(signedInAs(env, OTHER_MEMBER), id));
    });

    it('is null for a request that never had one', async () => {
        const id = await submit(MEMBER, '');
        expect(await loadPhoto(signedInAs(env, EBOARD), id)).toBeNull();
    });
});

describe('reading requests', () => {
    it('moves no photo: a Member listing their own requests gets none of it', async () => {
        await submit(MEMBER, PHOTO);
        const db = signedInAs(env, MEMBER);
        const snapshot = await getDocs(query(collection(db, 'pointRequests'), where('userEmail', '==', MEMBER)));

        expect(snapshot.docs).toHaveLength(1);
        const data = snapshot.docs[0].data();
        expect(data.hasPhoto).toBe(true);
        expect(JSON.stringify(data)).not.toContain(PHOTO);
    });

    it('moves no photo for E-Board either, until they open one', async () => {
        await submit(MEMBER, PHOTO);
        await submit(OTHER_MEMBER, PHOTO);
        const db = signedInAs(env, EBOARD);
        const snapshot = await getDocs(collection(db, 'pointRequests'));

        expect(snapshot.docs).toHaveLength(2);
        expect(JSON.stringify(snapshot.docs.map((row) => row.data()))).not.toContain(PHOTO);
    });
});
