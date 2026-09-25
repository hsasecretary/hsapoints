// Shared setup for *.emulator.test.ts: one RulesTestEnvironment loaded with
// the repo's real firestore.rules, plus fixtures seeded past the rules.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';

export const MEMBER = 'ana@ufl.edu';
export const OTHER_MEMBER = 'beto@ufl.edu';
export const CABINET_MEMBER = 'cami@ufl.edu';
export const EBOARD = 'eva@ufl.edu';

export function startEmulator(): Promise<RulesTestEnvironment> {
    return initializeTestEnvironment({
        projectId: 'demo-hsapoints',
        firestore: {
            // `emulators:exec` sets FIRESTORE_EMULATOR_HOST; otherwise use the
            // one `npm run emulator` starts.
            ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { host: '127.0.0.1', port: 8080 }),
            rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'),
        },
    });
}

/** A Firestore client signed in as `email`, subject to the rules. */
export function signedInAs(env: RulesTestEnvironment, email: string): Firestore {
    return env.authenticatedContext(email, { email }).firestore() as unknown as Firestore;
}

/** A user doc shaped like the one SignUp.tsx creates. */
export function memberDoc(email: string, overrides: Record<string, unknown> = {}) {
    return {
        email,
        firstName: 'Test',
        lastName: 'Member',
        cabinet: 'none',
        eboard: false,
        approved: false,
        fallPoints: 0,
        springPoints: 0,
        strikes: 0,
        eventCodes: [],
        gbmPointsVE: 0,
        gbmPointsNVE: 0,
        otherPoints: 0,
        cabinetPoints: 0,
        ...overrides,
    };
}

/** Writes `docs` (path → data) with the rules switched off. */
export async function seed(env: RulesTestEnvironment, docs: Record<string, object>) {
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore() as unknown as Firestore;
        for (const [path, data] of Object.entries(docs)) {
            await setDoc(doc(db, path), data);
        }
    });
}
