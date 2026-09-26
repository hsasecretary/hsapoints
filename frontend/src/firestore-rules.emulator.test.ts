// firestore.rules for the Attendance ledger and the E-Board-only member
// fields (docs/adr/0002-attendance-ledger-calculated-on-read.md, #68).
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
    addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { buildPointRequest } from './lib/pointRequests';
import { EBOARD, MEMBER, OTHER_MEMBER, memberDoc, seed, signedInAs, startEmulator } from './test/emulator';

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

/** The Attendance a Member writes when they redeem `codeId`. */
function codeAttendance(email: string, codeId = 'GBM1') {
    return { email, eventTypeId: 'gbm', eventDate: '2026-09-25', source: 'code', codeId };
}

describe('attendances', () => {
    it('lets a Member record redeeming a code as their own Attendance', async () => {
        const db = signedInAs(env, MEMBER);
        await assertSucceeds(setDoc(doc(db, `attendances/${MEMBER}__GBM1`), codeAttendance(MEMBER)));
    });

    it("won't let a Member write someone else's Attendance", async () => {
        const db = signedInAs(env, MEMBER);
        await assertFails(setDoc(doc(db, `attendances/${OTHER_MEMBER}__GBM1`), codeAttendance(OTHER_MEMBER)));
        await assertFails(setDoc(doc(db, `attendances/${OTHER_MEMBER}__GBM1`), codeAttendance(MEMBER)));
    });

    it("won't let a Member forge the Event Type or date of a code", async () => {
        const db = signedInAs(env, MEMBER);
        const ref = doc(db, `attendances/${MEMBER}__GBM1`);
        await assertFails(setDoc(ref, { ...codeAttendance(MEMBER), eventTypeId: 'hsa-fundraising' }));
        await assertFails(setDoc(ref, { ...codeAttendance(MEMBER), eventDate: '2026-09-24' }));
    });

    it("won't let a Member file an Attendance under an ID that isn't the code's", async () => {
        const db = signedInAs(env, MEMBER);
        await assertFails(setDoc(doc(db, `attendances/${MEMBER}__GBM2`), codeAttendance(MEMBER)));
    });

    it("won't let a Member redeem a code that doesn't exist", async () => {
        const db = signedInAs(env, MEMBER);
        await assertFails(setDoc(doc(db, `attendances/${MEMBER}__NOPE`), codeAttendance(MEMBER, 'NOPE')));
    });

    it('keeps request and E-Board Attendance, and extra fields, E-Board-only', async () => {
        const db = signedInAs(env, MEMBER);
        const ref = doc(db, `attendances/${MEMBER}__GBM1`);
        await assertFails(setDoc(ref, { ...codeAttendance(MEMBER), source: 'request' }));
        await assertFails(setDoc(ref, { ...codeAttendance(MEMBER), source: 'eboard' }));
        await assertFails(setDoc(ref, { ...codeAttendance(MEMBER), makeupFor: 'CT1' }));
        await assertFails(setDoc(doc(db, `attendances/${MEMBER}__req-1`), {
            email: MEMBER, eventTypeId: 'tabling', eventDate: '2026-09-20', source: 'request', requestId: '1',
        }));
    });

    it("won't let a Member change or delete an Attendance once written", async () => {
        await seed(env, { [`attendances/${MEMBER}__GBM1`]: codeAttendance(MEMBER) });
        const db = signedInAs(env, MEMBER);
        const ref = doc(db, `attendances/${MEMBER}__GBM1`);
        await assertFails(updateDoc(ref, { eventDate: '2026-09-26' }));
        await assertFails(deleteDoc(ref));
    });

    it('lets a Member read their own Attendance but not anyone else’s', async () => {
        await seed(env, {
            [`attendances/${MEMBER}__GBM1`]: codeAttendance(MEMBER),
            [`attendances/${OTHER_MEMBER}__GBM1`]: codeAttendance(OTHER_MEMBER),
        });
        const db = signedInAs(env, MEMBER);
        await assertSucceeds(getDoc(doc(db, `attendances/${MEMBER}__GBM1`)));
        await assertSucceeds(getDocs(query(collection(db, 'attendances'), where('email', '==', MEMBER))));
        await assertFails(getDoc(doc(db, `attendances/${OTHER_MEMBER}__GBM1`)));
        await assertFails(getDocs(collection(db, 'attendances')));
    });

    it('lets a Member check whether they already hold an Attendance before redeeming', async () => {
        const db = signedInAs(env, MEMBER);
        await assertSucceeds(getDoc(doc(db, `attendances/${MEMBER}__GBM1`)));
    });

    it("won't tell a Member whether someone else attended, even when they didn't", async () => {
        const db = signedInAs(env, MEMBER);
        await assertFails(getDoc(doc(db, `attendances/${OTHER_MEMBER}__GBM1`)));
    });

    it('lets E-Board read, write and delete any Attendance', async () => {
        await seed(env, { [`attendances/${MEMBER}__GBM1`]: codeAttendance(MEMBER) });
        const db = signedInAs(env, EBOARD);
        await assertSucceeds(getDocs(collection(db, 'attendances')));
        await assertSucceeds(setDoc(doc(db, `attendances/${MEMBER}__eb-abc`), {
            email: MEMBER, eventTypeId: 'crash', eventDate: '2026-09-20', source: 'eboard',
        }));
        await assertSucceeds(updateDoc(doc(db, `attendances/${MEMBER}__GBM1`), { makeupFor: 'CT1' }));
        await assertSucceeds(deleteDoc(doc(db, `attendances/${MEMBER}__GBM1`)));
    });
});

describe('the E-Board-only member fields', () => {
    const logEntry = (codeId: string) => ({ kind: 'excused', codeId, note: 'sick', by: EBOARD, at: '2026-09-25' });
    const eboardOnly: Record<string, unknown> = {
        mlpCohort: 'fall',
        heldToCabinetRules: true,
        webTeam: true,
        excusals: [{ codeId: 'CT1', note: 'sick', by: EBOARD, at: '2026-09-25' }],
        strikeRemovals: [{ codeId: 'CT1', reason: 'appeal', by: EBOARD, at: '2026-09-25' }],
        missedEventOverrides: [{ codeId: 'CT1', reason: 'not held', by: EBOARD, at: '2026-09-25' }],
        adjustments: [{ points: 2, note: 'volunteered', date: '2026-09-25' }],
        absenceLog: [logEntry('CT1')],
    };

    it.each(Object.keys(eboardOnly))("won't let a Member set their own %s", async (field) => {
        const db = signedInAs(env, MEMBER);
        await assertFails(updateDoc(doc(db, `users/${MEMBER}`), { [field]: eboardOnly[field] }));
    });

    it.each(Object.keys(eboardOnly))("won't let a Member sign up with %s already set", async (field) => {
        await env.clearFirestore();
        const db = signedInAs(env, MEMBER);
        await assertFails(setDoc(doc(db, `users/${MEMBER}`), memberDoc(MEMBER, { [field]: eboardOnly[field] })));
    });

    it('still lets a Member sign up and bump the old counters until cut-over', async () => {
        await env.clearFirestore();
        const db = signedInAs(env, MEMBER);
        await assertSucceeds(setDoc(doc(db, `users/${MEMBER}`), memberDoc(MEMBER)));
        await assertSucceeds(updateDoc(doc(db, `users/${MEMBER}`), { fallPoints: 2, gbmPointsVE: 2, eventCodes: ['GBM1'] }));
    });

    it('lets E-Board set them all', async () => {
        const db = signedInAs(env, EBOARD);
        await assertSucceeds(updateDoc(doc(db, `users/${MEMBER}`), eboardOnly));
    });

    it('lets E-Board append to the absenceLog but never edit or trim it', async () => {
        await seed(env, { [`users/${MEMBER}`]: memberDoc(MEMBER, { absenceLog: [logEntry('CT1'), logEntry('CT2')] }) });
        const db = signedInAs(env, EBOARD);
        const ref = doc(db, `users/${MEMBER}`);
        await assertSucceeds(updateDoc(ref, { absenceLog: [logEntry('CT1'), logEntry('CT2'), logEntry('CT3')] }));
        await assertFails(updateDoc(ref, { absenceLog: [logEntry('CT1')] }));
        await assertFails(updateDoc(ref, { absenceLog: [logEntry('CT9'), logEntry('CT2'), logEntry('CT3')] }));
        await assertFails(updateDoc(ref, { absenceLog: deleteField() }));
        // Other fields still save around it.
        await assertSucceeds(updateDoc(ref, { strikes: 1 }));
    });
});

describe('pointRequests', () => {
    /** A request as the Submit Point Request form saves it (#71). */
    function pendingRequest(email: string) {
        const built = buildPointRequest(
            { typeChoiceId: 'gbm', codeId: 'GBM1', eventTypeId: 'gbm', eventDate: '2026-09-25', eventName: '', note: '', hours: 1, makeupFor: [], photo: 'data:image/jpeg;base64,x' },
            { email, codes: [{ id: 'GBM1', eventTypeId: 'gbm', eventDate: '2026-09-25', event: 'GBM 1' }], today: '2026-10-01' },
        );
        if (built.ok === false) throw new Error(built.error);
        return { ...built.data, submittedAt: serverTimestamp() };
    }

    it('lets a Member submit their own request for review', async () => {
        const db = signedInAs(env, MEMBER);
        await assertSucceeds(addDoc(collection(db, 'pointRequests'), pendingRequest(MEMBER)));
    });

    it("won't let a Member submit a request as someone else, or one that's already reviewed", async () => {
        const db = signedInAs(env, MEMBER);
        await assertFails(addDoc(collection(db, 'pointRequests'), pendingRequest(OTHER_MEMBER)));
        await assertFails(addDoc(collection(db, 'pointRequests'), { ...pendingRequest(MEMBER), status: 'approved' }));
        await assertFails(addDoc(collection(db, 'pointRequests'), { ...pendingRequest(MEMBER), reviewedBy: MEMBER }));
    });
});
