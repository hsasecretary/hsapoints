// Filing, withdrawing and reviewing Excuse Requests, through the real firestore.rules.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { EBOARD, MEMBER, memberDoc, OTHER_MEMBER, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';
import type { Code } from './computeStanding';
import { buildExcuseRequests, excuseRequestId } from './excuseRequests';
import { approveExcuseRequest, denyExcuseRequest, fileExcuseRequests, withdrawExcuseRequest } from './excuseRequestsDb';
import { toIsoDate } from './semester';

let env: RulesTestEnvironment;

const TODAY = toIsoDate(new Date());
const codes: Code[] = [
    { id: 'CT1', eventTypeId: 'cabinet-thursday', eventDate: TODAY, event: 'Cabinet Thursday' },
    { id: 'GBM1', eventTypeId: 'gbm', eventDate: TODAY, event: 'GBM 1' },
];
const cabinetMember = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };
const REASON = 'Family wedding in Miami';

/** The requests a Member's filing builds, stamped by the server as the page does. */
function filing(codeIds: string[], email = MEMBER) {
    const built = buildExcuseRequests({ codeIds, reason: REASON }, {
        email, member: cabinetMember, codes, attendances: [], today: TODAY, filedAt: serverTimestamp(),
    });
    if (built.ok === false) throw new Error(built.error);
    return built.requests;
}

const ID = excuseRequestId(MEMBER, 'CT1');

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
        [`users/${MEMBER}`]: memberDoc(MEMBER, cabinetMember),
        [`users/${OTHER_MEMBER}`]: memberDoc(OTHER_MEMBER),
        'codes/CT1': { eventTypeId: 'cabinet-thursday', eventDate: TODAY, event: 'Cabinet Thursday' },
        'codes/GBM1': { eventTypeId: 'gbm', eventDate: TODAY, event: 'GBM 1' },
    });
});

describe('filing', () => {
    it('saves one pending request per event, all together', async () => {
        await fileExcuseRequests(signedInAs(env, MEMBER), filing(['CT1', 'GBM1']));

        expect(await readPastRules(env, `excuseRequests/${ID}`)).toMatchObject({ status: 'pending', reason: REASON, reviewedBy: null });
        expect(await readPastRules(env, `excuseRequests/${excuseRequestId(MEMBER, 'GBM1')}`)).toMatchObject({ status: 'pending' });
    });

    it('refuses a second request for the same event, and the whole batch with it', async () => {
        const db = signedInAs(env, MEMBER);
        await fileExcuseRequests(db, filing(['CT1']));

        await assertFails(fileExcuseRequests(db, filing(['CT1', 'GBM1'])));
        expect(await readPastRules(env, `excuseRequests/${excuseRequestId(MEMBER, 'GBM1')}`)).toBeUndefined();
    });

    it("won't let a Member file for another Member", async () => {
        const [request] = filing(['CT1']);
        const otherId = excuseRequestId(OTHER_MEMBER, 'CT1');

        await assertFails(setDoc(doc(signedInAs(env, MEMBER), 'excuseRequests', otherId), { ...request.data, email: OTHER_MEMBER }));
    });

    it("won't let a Member file one that is already approved", async () => {
        const [request] = filing(['CT1']);

        await assertFails(setDoc(doc(signedInAs(env, MEMBER), 'excuseRequests', ID), { ...request.data, status: 'approved' }));
    });

    it("won't take a filing time the browser made up", async () => {
        const [request] = filing(['CT1']);

        await assertFails(setDoc(doc(signedInAs(env, MEMBER), 'excuseRequests', ID), { ...request.data, filedAt: '2020-01-01T00:00:00.000Z' }));
    });

    it('refuses an empty reason and an event that has no code', async () => {
        const [request] = filing(['CT1']);
        const db = signedInAs(env, MEMBER);

        await assertFails(setDoc(doc(db, 'excuseRequests', ID), { ...request.data, reason: '   ' }));
        await assertFails(setDoc(doc(db, 'excuseRequests', excuseRequestId(MEMBER, 'NOCODE')), { ...request.data, codeId: 'NOCODE' }));
    });

    it("won't let a General Member file", async () => {
        const [request] = filing(['CT1']);
        const id = excuseRequestId(OTHER_MEMBER, 'CT1');

        await assertFails(setDoc(doc(signedInAs(env, OTHER_MEMBER), 'excuseRequests', id), { ...request.data, email: OTHER_MEMBER }));
    });
});

describe('reading', () => {
    it('lets a Member and E-Board read the request, and no one else', async () => {
        await fileExcuseRequests(signedInAs(env, MEMBER), filing(['CT1']));

        await assertSucceeds(getDoc(doc(signedInAs(env, MEMBER), 'excuseRequests', ID)));
        await assertSucceeds(getDoc(doc(signedInAs(env, EBOARD), 'excuseRequests', ID)));
        await assertFails(getDoc(doc(signedInAs(env, OTHER_MEMBER), 'excuseRequests', ID)));
    });
});

describe('withdrawing', () => {
    it('works while the request is pending, and frees the event to file again', async () => {
        const db = signedInAs(env, MEMBER);
        await fileExcuseRequests(db, filing(['CT1']));

        await withdrawExcuseRequest(db, ID);
        expect(await readPastRules(env, `excuseRequests/${ID}`)).toBeUndefined();
        await assertSucceeds(fileExcuseRequests(db, filing(['CT1'])));
    });

    it('is refused once E-Board has decided', async () => {
        const db = signedInAs(env, MEMBER);
        await fileExcuseRequests(db, filing(['CT1']));
        await denyExcuseRequest(signedInAs(env, EBOARD), ID, { by: EBOARD, reason: 'We need you there' });

        await assertFails(withdrawExcuseRequest(db, ID));
    });
});

describe('approving', () => {
    it('writes the excusal and the absenceLog entry, and marks the request approved, in one step', async () => {
        await fileExcuseRequests(signedInAs(env, MEMBER), filing(['CT1']));

        expect(await approveExcuseRequest(signedInAs(env, EBOARD), ID, { by: EBOARD, note: 'Enjoy the wedding' })).toEqual({ ok: true });

        const user = await readPastRules(env, `users/${MEMBER}`);
        expect(user.excusals).toEqual([{ codeId: 'CT1', note: REASON, by: EBOARD, at: expect.any(String) }]);
        expect(user.absenceLog).toEqual([{ kind: 'excused', codeId: 'CT1', note: REASON, by: EBOARD, at: expect.any(String) }]);
        expect(await readPastRules(env, `excuseRequests/${ID}`)).toMatchObject({ status: 'approved', reviewedBy: EBOARD, reviewNotes: 'Enjoy the wedding' });
    });

    it('still closes the request, without a second excusal, when the event was already excused', async () => {
        await seed(env, {
            [`users/${MEMBER}`]: memberDoc(MEMBER, { ...cabinetMember, excusals: [{ codeId: 'CT1', note: 'By hand', by: EBOARD, at: '2026-10-01T00:00:00.000Z' }] }),
        });
        await fileExcuseRequests(signedInAs(env, MEMBER), filing(['CT1']));

        expect(await approveExcuseRequest(signedInAs(env, EBOARD), ID, { by: EBOARD })).toEqual({ ok: true });

        const user = await readPastRules(env, `users/${MEMBER}`);
        expect(user.excusals).toHaveLength(1);
        expect(user.absenceLog).toBeUndefined();
        expect(await readPastRules(env, `excuseRequests/${ID}`)).toMatchObject({ status: 'approved' });
    });

    it('refuses a request the Member has withdrawn, and one already decided', async () => {
        const member = signedInAs(env, MEMBER);
        const eboard = signedInAs(env, EBOARD);
        await fileExcuseRequests(member, filing(['CT1', 'GBM1']));
        await withdrawExcuseRequest(member, ID);

        expect(await approveExcuseRequest(eboard, ID, { by: EBOARD })).toMatchObject({ ok: false });
        const gbmId = excuseRequestId(MEMBER, 'GBM1');
        await approveExcuseRequest(eboard, gbmId, { by: EBOARD });
        expect(await approveExcuseRequest(eboard, gbmId, { by: EBOARD })).toMatchObject({ ok: false });
    });
});

describe('denying', () => {
    it('saves nothing without a reason, and the reason with one', async () => {
        await fileExcuseRequests(signedInAs(env, MEMBER), filing(['CT1']));
        const eboard = signedInAs(env, EBOARD);

        expect(await denyExcuseRequest(eboard, ID, { by: EBOARD, reason: '  ' })).toMatchObject({ ok: false });
        expect(await readPastRules(env, `excuseRequests/${ID}`)).toMatchObject({ status: 'pending' });

        expect(await denyExcuseRequest(eboard, ID, { by: EBOARD, reason: 'We need you there' })).toEqual({ ok: true });
        expect(await readPastRules(env, `excuseRequests/${ID}`)).toMatchObject({ status: 'denied', reviewNotes: 'We need you there', reviewedBy: EBOARD });
        expect((await readPastRules(env, `users/${MEMBER}`)).excusals).toBeUndefined();
    });
});

describe("a Member's own limits", () => {
    it("can't decide their own request or write their own excusals", async () => {
        const db = signedInAs(env, MEMBER);
        await fileExcuseRequests(db, filing(['CT1']));

        await assertFails(updateDoc(doc(db, 'excuseRequests', ID), {
            status: 'approved', reviewedBy: MEMBER, reviewedAt: serverTimestamp(), reviewNotes: '',
        }));
        await assertFails(updateDoc(doc(db, 'users', MEMBER), { excusals: [{ codeId: 'CT1', note: 'me', by: MEMBER, at: 'now' }] }));
    });

    it("can't change what the request says after filing it", async () => {
        const db = signedInAs(env, MEMBER);
        await fileExcuseRequests(db, filing(['CT1']));

        await assertFails(updateDoc(doc(db, 'excuseRequests', ID), { reason: 'something else' }));
    });
});
