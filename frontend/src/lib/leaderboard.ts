// Pure ranking logic for the Leaderboard (CONTEXT.md → Leaderboard,
// docs/adr/0004). E-Board's refresh turns every Member's Total Points into a
// snapshot keyed by random tokens, with names for Top Ranks only; the
// viewer's browser swaps its own entry for their live Total Points and ranks
// from that. No Firestore, no React: lib/leaderboardRefresh.ts reads and
// writes, scripts/leaderboard-snapshot.ts runs the same code for the admin
// script.
import { computeStanding, type Attendance, type Member } from './computeStanding';
import { rubric } from './rubric';
import { academicYear } from './semester';

/** Ranks 1 through this, with at least 1 point, are Top Ranks. */
export const TOP_RANK_CUTOFF = 10;

/** How many Neighboring Ranks to expose on each side of Your Standing. */
const NEIGHBOR_RANGE = 3;

/** An E-Board page refreshes the snapshot once it is older than this. */
export const REFRESH_AFTER_MS = 60 * 60 * 1000;

/** One ranked Member in the snapshot: their token and Total Points. */
export type LeaderboardScore = { t: string; p: number };

/** leaderboard/current, less refreshedAt/refreshedBy (the writer adds those). */
export type LeaderboardSnapshot = {
    /** How many Members are ranked. */
    members: number;
    /** Every ranked Member, highest first. */
    scores: LeaderboardScore[];
    /** "First Last" by token, for Top Ranks only. */
    names: Record<string, string>;
};

/** A Member as the refresh sees them, before ranking. */
export type SnapshotMember = {
    token: string;
    firstName?: string;
    lastName?: string;
    eboard?: boolean;
    totalPoints: number;
};

/** One Member on the board. `name` is null for anyone the snapshot didn't name. */
export type LeaderboardEntry = {
    token: string;
    name: string | null;
    totalPoints: number;
    /** The signed-in Member, with their live Total Points. */
    isViewer?: boolean;
};

export type RankGroup = {
    rank: number;
    totalPoints: number;
    members: LeaderboardEntry[];
};

/**
 * A Rank adjacent to Your Standing, reduced to position and score. Deliberately
 * carries no `members` array: identity never crosses into the neighbour path at
 * all, so the Leaderboard's anonymity is a property of this type rather than a
 * rendering choice a later edit could undo. See docs/adr/0003.
 */
export type NeighborRank = {
    rank: number;
    totalPoints: number;
};

export type YourStanding = {
    rank: number;
    totalPoints: number;
    members: LeaderboardEntry[];
    isInTopRanks: boolean;
    /** Points needed to reach the next better Rank; null if already Rank 1. */
    pointsToNextRank: number | null;
    /** Neighboring Ranks better than the viewer's, in board order (furthest first). */
    neighborsAbove: NeighborRank[];
    /** Neighboring Ranks worse than the viewer's, in board order (nearest first). */
    neighborsBelow: NeighborRank[];
};

export type LeaderboardResult = {
    totalMembers: number;
    topRanks: RankGroup[];
    /** null when no entry is the viewer (E-Board). */
    yourStanding: YourStanding | null;
};

export type RefreshInput = {
    /** Local date as 'YYYY-MM-DD'. */
    today: string;
    members: { token: string; member: Member & { firstName?: string; lastName?: string }; attendances: Attendance[] }[];
};

/**
 * Total Points: this school year's VE Points with Adjustments, the number the
 * Member's Overview shows. Codes only matter for Core Events, never for points.
 */
export function memberTotal(member: Member, attendances: Attendance[], today: string): number {
    const { start, end } = academicYear(today);
    const thisYear = attendances.filter((attendance) => attendance.eventDate >= start && attendance.eventDate <= end);
    return computeStanding(member, thisYear, rubric, [], { today }).vePoints;
}

function isTopRank(group: RankGroup): boolean {
    return group.rank <= TOP_RANK_CUTOFF && group.totalPoints >= 1;
}

/** Strips everything but position and score — the anonymity seam. */
function toNeighborRank(group: RankGroup): NeighborRank {
    return { rank: group.rank, totalPoints: group.totalPoints };
}

// Competition ranking: walk the sorted list, starting a new Tie Cluster
// whenever Total Points changes. A cluster's Rank is 1 + how many Members are
// strictly ahead of it. Ties sort by token, never by name: the snapshot's
// order is visible to every Member, and a name order would tell them who
// they tie with.
function rankGroups(entries: LeaderboardEntry[]): RankGroup[] {
    const sorted = [...entries].sort((a, b) => b.totalPoints - a.totalPoints || a.token.localeCompare(b.token));
    const groups: RankGroup[] = [];
    let membersAhead = 0;
    for (const entry of sorted) {
        const currentGroup = groups[groups.length - 1];
        if (currentGroup && currentGroup.totalPoints === entry.totalPoints) {
            currentGroup.members.push(entry);
        } else {
            groups.push({ rank: membersAhead + 1, totalPoints: entry.totalPoints, members: [entry] });
        }
        membersAhead += 1;
    }
    return groups;
}

function fullName(member: SnapshotMember): string {
    return [member.firstName, member.lastName].map((part) => (part ?? '').trim()).filter(Boolean).join(' ');
}

/** The snapshot E-Board writes: every Member but E-Board, named only in Top Ranks. */
export function buildSnapshot(members: SnapshotMember[]): LeaderboardSnapshot {
    const ranked = members.filter((member) => member.eboard !== true);
    const nameByToken = new Map(ranked.map((member) => [member.token, fullName(member)]));
    const groups = rankGroups(ranked.map((member) => ({
        token: member.token, name: nameByToken.get(member.token), totalPoints: member.totalPoints,
    })));
    const names: Record<string, string> = {};
    for (const group of groups.filter(isTopRank)) {
        for (const entry of group.members) names[entry.token] = entry.name;
    }
    return {
        members: ranked.length,
        scores: groups.flatMap((group) => group.members.map((entry) => ({ t: entry.token, p: entry.totalPoints }))),
        names,
    };
}

/** Totals every Member from their Attendance and builds the snapshot. */
export function snapshotFor({ today, members }: RefreshInput): LeaderboardSnapshot {
    return buildSnapshot(members.map(({ token, member, attendances }) => ({
        token,
        firstName: member.firstName,
        lastName: member.lastName,
        eboard: member.eboard,
        totalPoints: memberTotal(member, attendances, today),
    })));
}

/** The snapshot as board entries, with nobody marked as the viewer (E-Board's view). */
export function snapshotEntries(snapshot: LeaderboardSnapshot): LeaderboardEntry[] {
    return snapshot.scores.map(({ t, p }) => ({ token: t, name: snapshot.names[t] ?? null, totalPoints: p }));
}

/**
 * The board's entries with the viewer live: their snapshot entry (if they
 * have a token) is dropped and replaced by their live Total Points, so they
 * rank exactly while everyone else is as of the last refresh. A Member with
 * no token yet (signed up since the refresh) is simply added.
 */
export function withViewer(snapshot: LeaderboardSnapshot, token: string | null, liveTotal: number): LeaderboardEntry[] {
    const others = snapshotEntries(snapshot).filter((entry) => token === null || entry.token !== token);
    const name = token !== null ? snapshot.names[token] ?? null : null;
    return [...others, { token: token ?? '', name, totalPoints: liveTotal, isViewer: true }];
}

export function buildLeaderboard(entries: LeaderboardEntry[]): LeaderboardResult {
    const groups = rankGroups(entries);
    const viewerGroupIndex = groups.findIndex((group) => group.members.some((entry) => entry.isViewer));

    let yourStanding: YourStanding | null = null;
    if (viewerGroupIndex !== -1) {
        const group = groups[viewerGroupIndex];
        const nextBetterGroup = groups[viewerGroupIndex - 1];
        yourStanding = {
            rank: group.rank,
            totalPoints: group.totalPoints,
            members: group.members,
            isInTopRanks: isTopRank(group),
            pointsToNextRank: nextBetterGroup ? nextBetterGroup.totalPoints - group.totalPoints : null,
            // Fewer than NEIGHBOR_RANGE when the board runs out on that side;
            // empty at the very top or the very bottom. The UI renders that
            // asymmetry rather than padding it out, so an empty side reads
            // honestly as "nobody below you".
            //
            // Top Ranks are filtered out of the pile above: they are already
            // on the page by name, and a blurred card standing in for a Rank
            // the viewer can read in full two inches higher is a lie about
            // what is hidden. So the pile grows in as the viewer falls away
            // from Top Ranks — nothing at the first Rank below the cutoff,
            // one card at the next, and the full depth from the third on.
            neighborsAbove: groups
                .slice(Math.max(0, viewerGroupIndex - NEIGHBOR_RANGE), viewerGroupIndex)
                .filter((neighbor) => !isTopRank(neighbor))
                .map(toNeighborRank),
            neighborsBelow: groups
                .slice(viewerGroupIndex + 1, viewerGroupIndex + 1 + NEIGHBOR_RANGE)
                .map(toNeighborRank),
        };
    }

    return {
        totalMembers: entries.length,
        // Top Ranks are shown by name, so list each Tie Cluster alphabetically.
        topRanks: groups.filter(isTopRank).map((group) => ({
            ...group,
            members: [...group.members].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
        })),
        yourStanding,
    };
}

/**
 * The board a viewer sees. A Member is ranked with their live Total Points;
 * E-Board aren't ranked, so they get the snapshot as it is and no Your
 * Standing, whatever view they preview.
 */
export function boardFor({ snapshot, token, liveTotal, eboard }: {
    snapshot: LeaderboardSnapshot;
    token: string | null;
    liveTotal: number;
    eboard: boolean;
}): LeaderboardResult {
    return buildLeaderboard(eboard ? snapshotEntries(snapshot) : withViewer(snapshot, token, liveTotal));
}

/**
 * The name a Top Rank row shows. A viewer the last refresh didn't name has
 * climbed into Top Ranks since, so they are "You"; anyone else unnamed (only
 * possible when the viewer dropped out since) stays anonymous.
 */
export function entryName(entry: LeaderboardEntry): string {
    return entry.name ?? (entry.isViewer ? 'You' : 'A Member');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** When the snapshot was taken: "6:05 PM" today, "Oct 12, 6:05 PM" before. */
export function asOfLabel(refreshedAt: Date, now: Date): string {
    const hours = refreshedAt.getHours();
    const time = `${hours % 12 || 12}:${String(refreshedAt.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
    const sameDay = refreshedAt.toDateString() === now.toDateString();
    return sameDay ? time : `${MONTHS[refreshedAt.getMonth()]} ${refreshedAt.getDate()}, ${time}`;
}

/** Whether an E-Board page should refresh the snapshot: missing, or over an hour old. */
export function isStale(refreshedAt: Date | null, now: Date): boolean {
    return !refreshedAt || now.getTime() - refreshedAt.getTime() > REFRESH_AFTER_MS;
}
