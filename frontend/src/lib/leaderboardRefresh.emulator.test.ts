// E-Board refreshing the Leaderboard snapshot, end to end through the real firestore.rules.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp } from 'firebase/firestore';
import { EBOARD, MEMBER, OTHER_MEMBER, memberDoc, readPastRules, seed, signedInAs, startEmulator } from '../test/emulator';
import { REFRESH_AFTER_MS } from './leaderboard';
import { refreshLeaderboard, refreshLeaderboardIfStale } from './leaderboardRefresh';

const TODAY = '2026-09-25';
const NOW = new Date('2026-09-25T16:00:00Z');

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
        [`users/${EBOARD}`]: memberDoc(EBOARD, { eboard: true, firstName: 'Eva', lastName: 'Paz' }),
        [`users/${MEMBER}`]: memberDoc(MEMBER, { firstName: 'Ana', lastName: 'Diaz' }),
        [`users/${OTHER_MEMBER}`]: memberDoc(OTHER_MEMBER, { firstName: 'Beto', lastName: 'Ruiz', leaderboardToken: 'beto-token' }),
        [`attendances/${MEMBER}__GBM1`]: { email: MEMBER, eventTypeId: 'gbm', eventDate: '2026-09-10', source: 'code', codeId: 'GBM1' },
        [`attendances/${EBOARD}__GBM1`]: { email: EBOARD, eventTypeId: 'gbm', eventDate: '2026-09-10', source: 'code', codeId: 'GBM1' },
        // Last school year's: not counted.
        [`attendances/${OTHER_MEMBER}__OLD`]: { email: OTHER_MEMBER, eventTypeId: 'gbm', eventDate: '2025-09-10', source: 'code', codeId: 'OLD' },
    });
});

describe('refreshLeaderboard', () => {
    it('gives every Member a token, keeps existing ones, and writes the snapshot', async () => {
        await refreshLeaderboard(signedInAs(env, EBOARD), EBOARD, TODAY);

        const ana = await readPastRules(env, `users/${MEMBER}`);
        const beto = await readPastRules(env, `users/${OTHER_MEMBER}`);
        const eva = await readPastRules(env, `users/${EBOARD}`);
        expect(ana.leaderboardToken).toMatch(/^[0-9a-f-]{36}$/);
        expect(beto.leaderboardToken).toBe('beto-token');
        expect(eva.leaderboardToken).toBeUndefined();

        const current = await readPastRules(env, 'leaderboard/current');
        expect(current.members).toBe(2);
        expect(current.scores).toEqual([{ t: ana.leaderboardToken, p: expect.any(Number) }, { t: 'beto-token', p: 0 }]);
        expect(current.scores[0].p).toBeGreaterThan(0);
        expect(current.names).toEqual({ [ana.leaderboardToken]: 'Ana Diaz' });
        expect(current.refreshedBy).toBe(EBOARD);
        expect(current.refreshedAt).toBeInstanceOf(Timestamp);
    });

    it("is denied to a Member, who can't list users", async () => {
        await expect(refreshLeaderboard(signedInAs(env, MEMBER), MEMBER, TODAY)).rejects.toThrow();
        expect(await readPastRules(env, 'leaderboard/current')).toBeUndefined();
    });
});

describe('refreshLeaderboardIfStale', () => {
    it('refreshes when there is no snapshot yet', async () => {
        expect(await refreshLeaderboardIfStale(signedInAs(env, EBOARD), EBOARD, NOW)).toBe(true);
        expect((await readPastRules(env, 'leaderboard/current')).members).toBe(2);
    });

    it('refreshes a snapshot older than the refresh interval', async () => {
        const old = Timestamp.fromMillis(NOW.getTime() - REFRESH_AFTER_MS - 60_000);
        await seed(env, { 'leaderboard/current': { members: 0, scores: [], names: {}, refreshedAt: old, refreshedBy: 'x' } });
        expect(await refreshLeaderboardIfStale(signedInAs(env, EBOARD), EBOARD, NOW)).toBe(true);
        expect((await readPastRules(env, 'leaderboard/current')).members).toBe(2);
    });

    it('leaves a fresh snapshot alone', async () => {
        const fresh = Timestamp.fromMillis(NOW.getTime() - 60_000);
        await seed(env, { 'leaderboard/current': { members: 0, scores: [], names: {}, refreshedAt: fresh, refreshedBy: 'x' } });
        expect(await refreshLeaderboardIfStale(signedInAs(env, EBOARD), EBOARD, NOW)).toBe(false);
        expect((await readPastRules(env, 'leaderboard/current')).members).toBe(0);
        expect((await readPastRules(env, `users/${MEMBER}`)).leaderboardToken).toBeUndefined();
    });

    it("doesn't retry an old snapshot another E-Board page already started refreshing", async () => {
        // A refresh that failed or is still running: one try per interval, not
        // one per page opened (each try reads every users doc and Attendance).
        const old = Timestamp.fromMillis(NOW.getTime() - REFRESH_AFTER_MS - 60_000);
        const tried = Timestamp.fromMillis(NOW.getTime() - 60_000);
        await seed(env, { 'leaderboard/current': { members: 0, scores: [], names: {}, refreshedAt: old, refreshedBy: 'x', attemptedAt: tried } });
        expect(await refreshLeaderboardIfStale(signedInAs(env, EBOARD), EBOARD, NOW)).toBe(false);
        expect((await readPastRules(env, 'leaderboard/current')).members).toBe(0);
    });
});
