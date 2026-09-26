// Seeds the local emulators with test accounts and a Fall 2026 of codes, so
// Submit Point Request's Missed Events, Strikes and Make-ups can be tried
// without touching the live project. Wipes the emulators first.
//
//   npm run emulator:demo   (leave running)
//   npm run seed:demo
//   npm run dev:emulator    then sign in with an account below
//
// Test-only accounts; they exist only in the local Auth emulator.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const PROJECT = 'demo-hsapoints';
const AUTH = 'http://127.0.0.1:9099';
const PASSWORD = 'hsa-demo-2026';

const CABINET = 'cabinet.demo@ufl.edu';
const GENERAL = 'general.demo@ufl.edu';

// Fall 2026. Dated around 2026-09-26: the last two Core Events are upcoming
// until October.
const codes = {
    ORIENT: ['Cabinet Orientation', 'cabinet-orientation', '2026-08-23'],
    GBM1: ['GBM 1', 'gbm', '2026-08-27'],
    CT1: ['Cabinet Thursday 1', 'cabinet-thursday', '2026-08-28'],
    GBM2: ['GBM 2', 'gbm', '2026-09-03'],
    CT2: ['Cabinet Thursday 2', 'cabinet-thursday', '2026-09-04'],
    OPA1: ['OPA General Body', 'opa-general', '2026-09-05'],
    RETREAT: ['Cabinet Retreat', 'cabinet-retreat', '2026-09-06'],
    GBM3: ['GBM 3', 'gbm', '2026-09-10'],
    CT3: ['Cabinet Thursday 3', 'cabinet-thursday', '2026-09-11'],
    PROG1: ['Noche de Salsa', 'hsa-programming', '2026-09-12'],
    EXT1: ['Welcome Back Social', 'external-social', '2026-09-13'],
    FUND1: ['Empanada Sale', 'hsa-fundraising', '2026-09-14'],
    AFF1: ['SALSA Mixer', 'affiliate-org', '2026-09-16'],
    HLSA1: ['HLSA Kickoff', 'hlsa', '2026-09-17'],
    CT4: ['Cabinet Thursday 4', 'cabinet-thursday', '2026-09-18'],
    OPA2: ['OPA Town Hall', 'opa-general', '2026-09-19'],
    SERV1: ['Park Cleanup', 'hsa-service', '2026-09-20'],
    SOLID1: ['OPA Solidarity Session', 'opa-solidarity-session', '2026-09-22'],
    GBM4: ['GBM 4', 'gbm', '2026-09-24'],
    CT5: ['Cabinet Thursday 5', 'cabinet-thursday', '2026-09-25'],
    CT6: ['Cabinet Thursday 6', 'cabinet-thursday', '2026-10-02'],
    GBM5: ['GBM 5', 'gbm', '2026-10-08'],
};

function user(email, firstName, overrides) {
    return {
        email, firstName, lastName: 'Demo', graduationYear: '2028', involvement: 'general',
        cabinet: 'none', position: '', eboard: false, approved: false,
        fallPoints: 0, springPoints: 0, strikes: 0, eventCodes: [], cabinetPoints: 0, otherPoints: 0,
        ...overrides,
    };
}

function attended(email, codeId) {
    const [, eventTypeId, eventDate] = codes[codeId];
    return [`attendances/${email}__${codeId}`, { email, eventTypeId, eventDate, source: 'code', codeId }];
}

const docs = Object.fromEntries([
    ...Object.entries(codes).map(([id, [event, eventTypeId, eventDate]]) =>
        [`codes/${id}`, { event, eventTypeId, eventDate, attendeeCount: 0 }]),

    // Cabinet Member: misses CT1, GBM2, RETREAT, GBM3, CT3 and HLSA1.
    // OPA2 is Surplus and makes up CT1 (the oldest Strike), CT3 is excused
    // (owed, no Strike), and a pending request names GBM3. That leaves 4 open
    // Strikes: at risk.
    [`users/${CABINET}`, user(CABINET, 'Cara', {
        involvement: 'cabinet', cabinet: 'programming', approved: true, excusals: [{ codeId: 'CT3' }],
    })],
    ...['ORIENT', 'GBM1', 'CT2', 'OPA1', 'CT4', 'OPA2', 'GBM4', 'CT5'].map((id) => attended(CABINET, id)),
    ['pointRequests/demo-pending-makeup', {
        userEmail: CABINET, codeId: 'FUND1', typeChoiceId: 'hsa-fundraising', eventTypeId: 'hsa-fundraising',
        activityName: 'Empanada Sale', date: '2026-09-14', description: '', makeupFor: ['GBM3'], imageData: '',
        pointsRequested: 2, status: 'pending', reviewedAt: null, reviewedBy: null, reviewNotes: '',
        submittedAt: serverTimestamp(),
    }],

    // General Member: search only, no Strikes.
    [`users/${GENERAL}`, user(GENERAL, 'Gabi', {})],
    ...['GBM1', 'OPA1', 'EXT1', 'GBM4'].map((id) => attended(GENERAL, id)),
]);

async function createAccount(email) {
    const response = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    });
    if (!response.ok) throw new Error(`Creating ${email}: ${await response.text()}`);
}

const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: '127.0.0.1', port: 8080 } });
await env.clearFirestore();
await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });

await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [path, data] of Object.entries(docs)) await setDoc(doc(db, path), data);
});
for (const email of [CABINET, GENERAL]) await createAccount(email);
await env.cleanup();

console.log(`Seeded ${Object.keys(docs).length} docs. Sign in as ${CABINET} or ${GENERAL} (password in this file).`);
