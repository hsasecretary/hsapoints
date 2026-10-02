// Approving, denying and adjusting Point Requests, through the real firestore.rules (#72).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore';
import { EBOARD, MEMBER, memberDoc, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';
import { adjustRequest, approveRequest, denyRequest, revokeRequest } from './requestReview';

let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await startEmulator();
});

afterAll(async () => {
    await env.cleanup();
});

function pending(extra: Record<string, unknown>) {
    return {
        userEmail: MEMBER, codeId: null, typeChoiceId: 'tabling', eventTypeId: 'tabling', activityName: 'Turlington table',
        date: '2026-10-12', description: 'Tabled', makeupFor: [null], imageData: '', pointsRequested: 1,
        status: 'pending', reviewedAt: null, reviewedBy: null, reviewNotes: '', ...extra,
    };
}

beforeEach(async () => {
    await env.clearFirestore();
    await seed(env, {
        [`users/${EBOARD}`]: memberDoc(EBOARD, { eboard: true }),
        [`users/${MEMBER}`]: memberDoc(MEMBER),
        'codes/SALSA': { event: 'Noche de Salsa', eventTypeId: 'hsa-programming', eventDate: '2026-10-20', attendeeCount: 4 },
        'pointRequests/tabling': pending({ hours: 3, makeupFor: ['CT1', null, null] }),
        'pointRequests/salsa': pending({ typeChoiceId: 'hsa-programming', eventTypeId: 'hsa-programming', activityName: 'Salsa night', date: '2026-10-20' }),
        'pointRequests/mixer': pending({ typeChoiceId: 'not-listed', eventTypeId: null, activityName: 'Mixer' }),
    });
});

async function attendanceIds(): Promise<string[]> {
    let ids: string[] = [];
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore() as unknown as Firestore;
        const snap = await getDocs(query(collection(db, 'attendances'), where('email', '==', MEMBER)));
        ids = snap.docs.map((d) => d.id).sort();
    });
    return ids;
}

const tablingDecision = { eventTypeId: 'tabling', codeId: null, makeupFor: ['CT1', null, 'GBM3'] };

describe('approving a Point Request', () => {
    it('makes a 3-hour Tabling request 3 Attendances, and re-approving it makes none', async () => {
        const db = signedInAs(env, EBOARD);

        expect(await approveRequest(db, 'tabling', tablingDecision, EBOARD)).toEqual({ ok: true });
        expect(await attendanceIds()).toEqual([`${MEMBER}__req-tabling-h1`, `${MEMBER}__req-tabling-h2`, `${MEMBER}__req-tabling-h3`]);
        expect(await readPastRules(env, `attendances/${MEMBER}__req-tabling-h1`)).toEqual({
            email: MEMBER, eventTypeId: 'tabling', eventDate: '2026-10-12', source: 'request', requestId: 'tabling', makeupFor: 'CT1',
        });
        expect(await readPastRules(env, 'pointRequests/tabling')).toMatchObject({
            status: 'approved', reviewedBy: EBOARD, makeupFor: ['CT1', null, 'GBM3'], pointsRequested: 3,
        });

        expect((await approveRequest(db, 'tabling', tablingDecision, EBOARD)).ok).toBe(false);
        expect(await attendanceIds()).toHaveLength(3);
        // The old counters are no longer credited.
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({ fallPoints: 0, springPoints: 0, otherPoints: 0 });
    });

    it('files a request attached to a code under {email}__{CODE} and counts the check-in', async () => {
        const decision = { eventTypeId: 'hsa-programming', codeId: 'SALSA', makeupFor: [null] };

        expect(await approveRequest(signedInAs(env, EBOARD), 'salsa', decision, EBOARD)).toEqual({ ok: true });
        expect(await readPastRules(env, `attendances/${MEMBER}__SALSA`)).toEqual({
            email: MEMBER, eventTypeId: 'hsa-programming', eventDate: '2026-10-20', source: 'request', requestId: 'salsa', codeId: 'SALSA',
        });
        expect(await readPastRules(env, 'codes/SALSA')).toMatchObject({ attendeeCount: 5 });
    });

    it("finds a code named in mixed case and counts it under the code's date", async () => {
        await seed(env, {
            'codes/WINTER': { event: 'Winter Mixer', eventTypeId: 'hsa-programming', eventDate: '2027-01-15', attendeeCount: 0 },
            'pointRequests/winter': pending({ codeId: 'Winter', eventTypeId: 'hsa-programming', date: '2026-12-01' }),
        });
        const decision = { eventTypeId: 'hsa-programming', codeId: 'Winter', makeupFor: [null] };

        expect(await approveRequest(signedInAs(env, EBOARD), 'winter', decision, EBOARD)).toEqual({ ok: true });
        expect(await readPastRules(env, `attendances/${MEMBER}__WINTER`)).toMatchObject({ codeId: 'WINTER', eventDate: '2027-01-15' });
    });

    it("writes nothing new when the Member already redeemed the code, so it can't double count", async () => {
        await seed(env, {
            [`attendances/${MEMBER}__SALSA`]: { email: MEMBER, eventTypeId: 'hsa-programming', eventDate: '2026-10-20', source: 'code', codeId: 'SALSA' },
        });
        const decision = { eventTypeId: 'hsa-programming', codeId: 'SALSA', makeupFor: [null] };

        expect(await approveRequest(signedInAs(env, EBOARD), 'salsa', decision, EBOARD)).toEqual({ ok: true });
        expect(await readPastRules(env, `attendances/${MEMBER}__SALSA`)).toMatchObject({ source: 'code' });
        expect(await readPastRules(env, 'codes/SALSA')).toMatchObject({ attendeeCount: 4 });
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({ otherPoints: 0 });
    });

    it('is E-Board only', async () => {
        await expect(approveRequest(signedInAs(env, MEMBER), 'tabling', tablingDecision, MEMBER)).rejects.toThrow();
        expect(await attendanceIds()).toEqual([]);
    });
});

describe('denying a Point Request', () => {
    it('records the reason, and only once', async () => {
        const db = signedInAs(env, EBOARD);

        expect(await denyRequest(db, 'mixer', ' No photo of you there ', EBOARD)).toEqual({ ok: true });
        expect(await readPastRules(env, 'pointRequests/mixer')).toMatchObject({ status: 'denied', reviewNotes: 'No photo of you there' });
        expect((await approveRequest(db, 'mixer', { eventTypeId: 'crash', codeId: null, makeupFor: [null] }, EBOARD)).ok).toBe(false);
        expect(await attendanceIds()).toEqual([]);
    });
});

describe('turning a Point Request into an Adjustment', () => {
    it("adds the points and note to the Member's adjustments and writes no Attendance", async () => {
        expect(await adjustRequest(signedInAs(env, EBOARD), 'mixer', { points: 2, note: 'Helped run the mixer' }, EBOARD)).toEqual({ ok: true });

        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({
            adjustments: [{ points: 2, note: 'Helped run the mixer', date: '2026-10-12', requestId: 'mixer' }],
        });
        expect(await readPastRules(env, 'pointRequests/mixer')).toMatchObject({ status: 'approved', adjustment: { points: 2, note: 'Helped run the mixer' } });
        expect(await attendanceIds()).toEqual([]);
    });
});

describe('revoking an approved Point Request', () => {
    it('removes its Attendances and marks it denied with the reason', async () => {
        const db = signedInAs(env, EBOARD);
        await approveRequest(db, 'tabling', tablingDecision, EBOARD);

        expect(await revokeRequest(db, 'tabling', ' Approved by mistake ', EBOARD)).toEqual({ ok: true });
        expect(await attendanceIds()).toEqual([]);
        expect(await readPastRules(env, 'pointRequests/tabling')).toMatchObject({
            status: 'denied', reviewedBy: EBOARD, reviewNotes: 'Approved by mistake', revoked: { approvedBy: EBOARD, points: 3 },
        });
    });

    it("un-counts the code's check-in, but leaves a check-in the Member made themselves", async () => {
        const db = signedInAs(env, EBOARD);
        await approveRequest(db, 'salsa', { eventTypeId: 'hsa-programming', codeId: 'SALSA', makeupFor: [null] }, EBOARD);
        expect(await revokeRequest(db, 'salsa', 'Wrong person', EBOARD)).toEqual({ ok: true });
        expect(await readPastRules(env, 'codes/SALSA')).toMatchObject({ attendeeCount: 4 });
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({ eventCodes: [] });

        await seed(env, {
            [`attendances/${MEMBER}__SALSA`]: { email: MEMBER, eventTypeId: 'hsa-programming', eventDate: '2026-10-20', source: 'code', codeId: 'SALSA' },
            'pointRequests/salsa2': pending({ codeId: 'SALSA', eventTypeId: 'hsa-programming', date: '2026-10-20', status: 'approved',
                attendanceIds: [`${MEMBER}__SALSA`], pointsRequested: 0 }),
        });
        expect(await revokeRequest(db, 'salsa2', 'Duplicate', EBOARD)).toEqual({ ok: true });
        expect(await attendanceIds()).toEqual([`${MEMBER}__SALSA`]);
    });

    it("takes an Adjustment made from it off the Member's adjustments", async () => {
        const db = signedInAs(env, EBOARD);
        await adjustRequest(db, 'mixer', { points: 2, note: 'Helped run the mixer' }, EBOARD);

        expect(await revokeRequest(db, 'mixer', 'Did not help', EBOARD)).toEqual({ ok: true });
        expect(await readPastRules(env, `users/${MEMBER}`)).toMatchObject({ adjustments: [] });
        expect(await readPastRules(env, 'pointRequests/mixer')).toMatchObject({ status: 'denied', revoked: { points: 2 } });
    });

    it('refuses a request approved before Attendances, since it has nothing to take back', async () => {
        await seed(env, { 'pointRequests/old': pending({ status: 'approved', pointsRequested: 2 }) });

        expect(await revokeRequest(signedInAs(env, EBOARD), 'old', 'Mistake', EBOARD)).toMatchObject({ ok: false });
        expect(await readPastRules(env, 'pointRequests/old')).toMatchObject({ status: 'approved' });
    });

    it('needs a reason, and only revokes an approved request', async () => {
        const db = signedInAs(env, EBOARD);
        expect((await revokeRequest(db, 'mixer', 'x', EBOARD)).ok).toBe(false);
        await approveRequest(db, 'tabling', tablingDecision, EBOARD);
        expect((await revokeRequest(db, 'tabling', '  ', EBOARD)).ok).toBe(false);
        expect(await attendanceIds()).toHaveLength(3);
    });

    it('is E-Board only', async () => {
        await approveRequest(signedInAs(env, EBOARD), 'tabling', tablingDecision, EBOARD);
        await expect(revokeRequest(signedInAs(env, MEMBER), 'tabling', 'Mine', MEMBER)).rejects.toThrow();
    });
});
