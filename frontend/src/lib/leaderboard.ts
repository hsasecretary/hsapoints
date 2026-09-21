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

export type YourStanding = {
    rank: number;
    totalPoints: number;
    members: LeaderboardMember[];
    isInTopRanks: boolean;
    /** Points needed to reach the next better Rank; null if already Rank 1. */
    pointsToNextRank: number | null;
};

export type LeaderboardResult = {
    totalMembers: number;
    topRanks: RankGroup[];
    /** null only if the viewer isn't present in the fetched member list. */
    yourStanding: YourStanding | null;
};

const TOP_RANK_CUTOFF = 5;

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
        };
    }

    return {
        totalMembers: sorted.length,
        topRanks,
        yourStanding,
    };
}
