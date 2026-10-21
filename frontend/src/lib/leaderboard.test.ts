import { describe, expect, it } from 'vitest';
import type { Attendance, Member } from './computeStanding';
import {
    REFRESH_AFTER_MS, TOP_RANK_CUTOFF, asOfLabel, boardFor, buildLeaderboard, buildSnapshot, entryName, isRanked, isStale,
    memberTotal, snapshotEntries, snapshotFor, withViewer, type SnapshotMember,
} from './leaderboard';

const TODAY = '2026-09-26';

function member(token: string, totalPoints: number, overrides: Partial<SnapshotMember> = {}): SnapshotMember {
    return { token, firstName: token.toUpperCase(), lastName: 'Member', eboard: false, totalPoints, ...overrides };
}

function gbm(id: string, eventDate = '2026-09-10'): Attendance {
    return { id, eventTypeId: 'gbm', eventDate, source: 'code', codeId: id };
}

describe('buildSnapshot', () => {
    it('lists every ranked Member highest first and names the Top Ranks', () => {
        const snapshot = buildSnapshot([member('b', 3), member('a', 7), member('c', 5)]);
        expect(snapshot.scores).toEqual([{ t: 'a', p: 7 }, { t: 'c', p: 5 }, { t: 'b', p: 3 }]);
        expect(snapshot.members).toBe(3);
        expect(snapshot.names).toEqual({ a: 'A Member', b: 'B Member', c: 'C Member' });
    });

    it('leaves E-Board out entirely', () => {
        const snapshot = buildSnapshot([member('a', 4), member('eva', 9, { eboard: true })]);
        expect(snapshot.scores).toEqual([{ t: 'a', p: 4 }]);
        expect(snapshot.members).toBe(1);
        expect(snapshot.names).not.toHaveProperty('eva');
    });

    it('ranks a Web-team dev even when they are on E-Board', () => {
        const snapshot = buildSnapshot([member('a', 4), member('dev', 6, { eboard: true, webTeam: true })]);
        expect(snapshot.scores).toEqual([{ t: 'dev', p: 6 }, { t: 'a', p: 4 }]);
        expect(snapshot.names).toHaveProperty('dev');
    });

    it('counts Members with no points but never names them', () => {
        const snapshot = buildSnapshot([member('a', 2), member('zero', 0)]);
        expect(snapshot.members).toBe(2);
        expect(snapshot.scores).toContainEqual({ t: 'zero', p: 0 });
        expect(snapshot.names).toEqual({ a: 'A Member' });
    });

    it('names a whole Tie Cluster that spans the last Top Rank, and nobody past it', () => {
        // Ranks 1–9 are distinct; four Members tie at Rank 10; one more is Rank 14.
        const ahead = Array.from({ length: 9 }, (_, i) => member(`m${i}`, 100 - i));
        const tied = ['t1', 't2', 't3', 't4'].map((token) => member(token, 50));
        const snapshot = buildSnapshot([...ahead, ...tied, member('last', 40)]);
        expect(TOP_RANK_CUTOFF).toBe(10);
        expect(Object.keys(snapshot.names)).toHaveLength(13);
        expect(snapshot.names).toHaveProperty('t4');
        expect(snapshot.names).not.toHaveProperty('last');
    });

    it("orders a Tie Cluster by token, so the snapshot leaks nothing of its Members' names", () => {
        const snapshot = buildSnapshot([
            member('tok-b', 0, { firstName: 'Abel' }),
            member('tok-a', 0, { firstName: 'Zoe' }),
        ]);
        expect(snapshot.scores.map((score) => score.t)).toEqual(['tok-a', 'tok-b']);
    });

    it('names nobody when nobody has scored yet', () => {
        const snapshot = buildSnapshot([member('a', 0), member('b', 0)]);
        expect(snapshot.names).toEqual({});
        expect(snapshot.members).toBe(2);
    });
});

describe('memberTotal', () => {
    it("is the Member's VE Points this school year, Adjustments included", () => {
        const someone: Member = { cabinet: 'none', eboard: false, adjustments: [{ points: 2, note: 'helped', date: '2026-09-01' }] };
        const gbmPoints = memberTotal({ cabinet: 'none' }, [gbm('GBM1')], TODAY);
        expect(gbmPoints).toBeGreaterThan(0);
        expect(memberTotal(someone, [gbm('GBM1')], TODAY)).toBe(gbmPoints + 2);
    });

    it("leaves out last school year's Attendance", () => {
        expect(memberTotal({ cabinet: 'none' }, [gbm('OLD', '2025-09-10')], TODAY)).toBe(0);
    });
});

describe('snapshotFor', () => {
    it('totals each Member from their Attendance and builds the snapshot', () => {
        const snapshot = snapshotFor({
            today: TODAY,
            members: [
                { token: 'a', member: { firstName: 'Ana', lastName: 'Diaz', cabinet: 'none' }, attendances: [gbm('GBM1'), gbm('GBM2')] },
                { token: 'b', member: { firstName: 'Beto', lastName: 'Ruiz', cabinet: 'none' }, attendances: [gbm('GBM1')] },
                { token: 'e', member: { firstName: 'Eva', lastName: 'Paz', eboard: true }, attendances: [gbm('GBM1')] },
            ],
        });
        expect(snapshot.scores.map((score) => score.t)).toEqual(['a', 'b']);
        expect(snapshot.names).toEqual({ a: 'Ana Diaz', b: 'Beto Ruiz' });
    });
});

describe('withViewer', () => {
    const snapshot = buildSnapshot([member('a', 9), member('me', 4), member('c', 6)]);

    it("swaps the viewer's snapshot entry for their live Total Points", () => {
        const entries = withViewer(snapshot, 'me', 7);
        expect(entries).toHaveLength(3);
        expect(entries.filter((entry) => entry.isViewer)).toEqual([{ token: 'me', name: 'ME Member', totalPoints: 7, isViewer: true }]);
        expect(entries.some((entry) => entry.token === 'me' && !entry.isViewer)).toBe(false);
    });

    it('adds a viewer with no token yet, counting them once more', () => {
        const entries = withViewer(snapshot, null, 1);
        expect(entries).toHaveLength(4);
        expect(buildLeaderboard(entries).totalMembers).toBe(4);
        expect(buildLeaderboard(entries).yourStanding?.rank).toBe(4);
    });

    it('gives the same Rank as a full recompute after the viewer redeems a code', () => {
        const before = Array.from({ length: 15 }, (_, i) => member(`m${i}`, i));
        const stale = buildSnapshot([...before, member('me', 3)]);
        // The viewer redeems a code worth 8 since the last refresh.
        const recomputed = buildLeaderboard(withViewer(buildSnapshot([...before, member('me', 11)]), 'me', 11));
        const live = buildLeaderboard(withViewer(stale, 'me', 11));
        expect(live.yourStanding?.rank).toBe(recomputed.yourStanding?.rank);
        expect(live.yourStanding?.rank).toBe(4);
        expect(live.totalMembers).toBe(16);
    });
});

describe('buildLeaderboard', () => {
    it('uses competition ranking for Tie Clusters', () => {
        const result = buildLeaderboard(snapshotEntries(buildSnapshot([member('a', 5), member('b', 5), member('c', 3)])));
        expect(result.topRanks.map((group) => [group.rank, group.members.length])).toEqual([[1, 2], [3, 1]]);
        expect(result.yourStanding).toBeNull();
    });

    it('lists a Top Rank Tie Cluster by name', () => {
        const snapshot = buildSnapshot([member('tok-a', 5, { firstName: 'Zoe' }), member('tok-b', 5, { firstName: 'Abel' })]);
        const [first] = buildLeaderboard(snapshotEntries(snapshot)).topRanks;
        expect(first.members.map((entry) => entry.name)).toEqual(['Abel Member', 'Zoe Member']);
    });

    it('keeps 0-point Ranks out of Top Ranks even inside the cutoff', () => {
        const result = buildLeaderboard(withViewer(buildSnapshot([member('a', 2), member('b', 0)]), 'b', 0));
        expect(result.topRanks.map((group) => group.rank)).toEqual([1]);
        expect(result.yourStanding).toMatchObject({ rank: 2, isInTopRanks: false, pointsToNextRank: 2 });
    });

    it('shows Neighboring Ranks as position and score only, never a Top Rank', () => {
        const all = Array.from({ length: 20 }, (_, i) => member(`m${i}`, 40 - i));
        const result = buildLeaderboard(withViewer(buildSnapshot(all), 'm11', 29));
        expect(result.yourStanding?.rank).toBe(12);
        expect(result.yourStanding?.neighborsAbove).toEqual([{ rank: 11, totalPoints: 30 }]);
        expect(result.yourStanding?.neighborsBelow).toEqual([
            { rank: 13, totalPoints: 28 }, { rank: 14, totalPoints: 27 }, { rank: 15, totalPoints: 26 },
        ]);
    });
});

describe('isRanked', () => {
    it('ranks Members and Web-team devs, never the rest of E-Board', () => {
        expect(isRanked({ eboard: false })).toBe(true);
        expect(isRanked({})).toBe(true);
        expect(isRanked({ eboard: true })).toBe(false);
        expect(isRanked({ eboard: true, webTeam: true })).toBe(true);
    });
});

describe('isStale', () => {
    const now = new Date('2026-09-26T12:00:00Z');

    it('waits six hours between refreshes', () => {
        expect(REFRESH_AFTER_MS).toBe(6 * 60 * 60 * 1000);
    });

    it('is stale with no snapshot or one older than the interval', () => {
        expect(isStale(null, now)).toBe(true);
        expect(isStale(new Date(now.getTime() - REFRESH_AFTER_MS - 1), now)).toBe(true);
    });

    it('is fresh within the interval', () => {
        expect(isStale(new Date(now.getTime() - REFRESH_AFTER_MS + 1000), now)).toBe(false);
    });
});

describe('boardFor', () => {
    const snapshot = buildSnapshot([member('a', 9), member('me', 4), member('c', 6)]);

    it('ranks a Member with their live Total Points', () => {
        const result = boardFor({ snapshot, token: 'me', liveTotal: 7, ranked: true });
        expect(result.yourStanding).toMatchObject({ rank: 2, totalPoints: 7 });
        expect(result.totalMembers).toBe(3);
    });

    it("gives E-Board the snapshot as it is, with no Your Standing", () => {
        const result = boardFor({ snapshot, token: null, liveTotal: 50, ranked: false });
        expect(result.yourStanding).toBeNull();
        expect(result.totalMembers).toBe(3);
        expect(result.topRanks.map((group) => group.totalPoints)).toEqual([9, 6, 4]);
    });
});

describe('entryName', () => {
    it("shows a Top Rank's name", () => {
        expect(entryName({ token: 'a', name: 'Ana Ruiz', totalPoints: 3 })).toBe('Ana Ruiz');
    });

    it('shows "You" for a viewer the last refresh did not name (they climbed into Top Ranks since)', () => {
        const all = Array.from({ length: 12 }, (_, i) => member(`m${i}`, 20 - i));
        const stale = buildSnapshot([...all, member('me', 0)]);
        const { topRanks } = buildLeaderboard(withViewer(stale, 'me', 30));
        const [first] = topRanks;
        expect(first.members).toEqual([{ token: 'me', name: null, totalPoints: 30, isViewer: true }]);
        expect(entryName(first.members[0])).toBe('You');
    });

    it('never shows a token for someone else the snapshot did not name', () => {
        expect(entryName({ token: 'secret', name: null, totalPoints: 1 })).toBe('A Member');
    });
});

describe('asOfLabel', () => {
    const now = new Date(2026, 9, 14, 19, 30);

    it('gives the time alone for a refresh earlier today', () => {
        expect(asOfLabel(new Date(2026, 9, 14, 18, 5), now)).toBe('6:05 PM');
        expect(asOfLabel(new Date(2026, 9, 14, 0, 0), now)).toBe('12:00 AM');
        expect(asOfLabel(new Date(2026, 9, 14, 12, 40), now)).toBe('12:40 PM');
    });

    it('adds the date for an older refresh', () => {
        expect(asOfLabel(new Date(2026, 9, 12, 9, 7), now)).toBe('Oct 12, 9:07 AM');
    });
});
