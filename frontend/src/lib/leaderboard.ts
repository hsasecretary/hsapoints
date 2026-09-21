// Pure ranking logic for the dashboard Leaderboard. No Firestore, no React —
// takes the already-fetched member list and derives Rank/Tie Cluster/Top
// Ranks/Your Standing as defined in CONTEXT.md.

export type LeaderboardMember = {
    email: string;
    firstName: string;
    lastName: string;
    totalPoints: number;
};

export type RankGroup = {
    rank: number;
    totalPoints: number;
    members: LeaderboardMember[];
};

/**
 * A Rank adjacent to Your Standing, reduced to position and score. Deliberately
 * carries no `members` array: identity never crosses into the neighbour path at
 * all, so the Leaderboard's anonymity is a property of this type rather than a
 * rendering choice a later edit could undo. See docs/adr/0002.
 */
export type NeighborRank = {
    rank: number;
    totalPoints: number;
};

export type YourStanding = {
    rank: number;
    totalPoints: number;
    members: LeaderboardMember[];
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
    /** null only if the viewer isn't present in the fetched member list. */
    yourStanding: YourStanding | null;
};

const TOP_RANK_CUTOFF = 5;

/** How many Neighboring Ranks to expose on each side of Your Standing. */
const NEIGHBOR_RANGE = 3;

/** Strips everything but position and score — the anonymity seam. */
function toNeighborRank(group: RankGroup): NeighborRank {
    return { rank: group.rank, totalPoints: group.totalPoints };
}

export function buildLeaderboard(members: LeaderboardMember[], viewerEmail: string | null): LeaderboardResult {
    const sorted = [...members].sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

    // Competition ranking: walk the sorted list, starting a new Tie Cluster
    // whenever Total Points changes. A cluster's Rank is 1 + how many
    // Members are strictly ahead of it.
    const groups: RankGroup[] = [];
    for (const member of sorted) {
        const currentGroup = groups[groups.length - 1];
        if (currentGroup && currentGroup.totalPoints === member.totalPoints) {
            currentGroup.members.push(member);
        } else {
            const membersAhead = groups.reduce((count, group) => count + group.members.length, 0);
            groups.push({ rank: membersAhead + 1, totalPoints: member.totalPoints, members: [member] });
        }
    }

    const topRanks = groups.filter((group) => group.rank <= TOP_RANK_CUTOFF);

    const viewerGroupIndex = viewerEmail
        ? groups.findIndex((group) => group.members.some((member) => member.email === viewerEmail))
        : -1;

    let yourStanding: YourStanding | null = null;
    if (viewerGroupIndex !== -1) {
        const group = groups[viewerGroupIndex];
        const nextBetterGroup = groups[viewerGroupIndex - 1];
        yourStanding = {
            rank: group.rank,
            totalPoints: group.totalPoints,
            members: group.members,
            isInTopRanks: group.rank <= TOP_RANK_CUTOFF,
            pointsToNextRank: nextBetterGroup ? nextBetterGroup.totalPoints - group.totalPoints : null,
            // Fewer than NEIGHBOR_RANGE when the board runs out on that side;
            // empty at the very top or the very bottom. The UI renders that
            // asymmetry rather than padding it out, so an empty side reads
            // honestly as "nobody below you".
            neighborsAbove: groups
                .slice(Math.max(0, viewerGroupIndex - NEIGHBOR_RANGE), viewerGroupIndex)
                .map(toNeighborRank),
            neighborsBelow: groups
                .slice(viewerGroupIndex + 1, viewerGroupIndex + 1 + NEIGHBOR_RANGE)
                .map(toNeighborRank),
        };
    }

    return {
        totalMembers: sorted.length,
        topRanks,
        yourStanding,
    };
}
