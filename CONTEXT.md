# HSA Points

The internal member portal and points-tracking system for UF HSA: members earn points by attending events and submitting point requests; E-Board reviews requests and manages event codes, cabinet approval, and absences.

## Language

**Member**:
A person with a `users/{email}` document — general member, cabinet member, or e-board.
_Avoid_: User (that's the Firestore collection name, not the domain concept)

**General Member**:
A Member with no cabinet role and no e-board role (`isGeneralMember()`).

**Total Points**:
A Member's running point balance: `fallPoints + springPoints`. Never resets between semesters or years — it accumulates for the Member's entire tenure.
_Avoid_: Points (ambiguous with Voter-Eligible Points)

**Voter-Eligible Points**:
The subset of a Member's points that count toward the 15-point threshold to vote and run in E-Board elections — only points from voter-eligible event codes, plus `otherPoints`. Distinct from Total Points: a Member can have high Total Points but low Voter-Eligible Points if most of their events weren't voter-eligible.
_Avoid_: Points, eligible points

**Rank**:
A Member's numeric position on the Leaderboard, computed by sorting all Members by Total Points and using competition ranking: Members with equal Total Points share a Rank, and the next distinct Rank skips ahead by the size of that Tie Cluster (1, 1, 3, 4…).

**Tie Cluster**:
The set of Members who share the same Total Points value, and therefore the same Rank.

**Leaderboard**:
The anonymized, per-Member view of standing among all Members: shows Top Ranks by name, then Your Standing surrounded by its Neighboring Ranks, with Neighboring Ranks shown as position and score only, and every other Member's identity hidden.

**Top Ranks**:
Members whose Rank is 1 through 5. May include more than five Members when a Tie Cluster spans the Rank-5 boundary.
_Avoid_: Top 5 (imprecise once ties are involved)

**Your Standing**:
The viewing Member's own Rank and Tie Cluster size on the Leaderboard, always shown regardless of whether they're also in Top Ranks.

**Neighboring Ranks**:
The Ranks immediately above and below Your Standing on the Leaderboard — up to three in each direction, one per Rank. Their Rank numbers and Total Points are shown; the Members holding them are never named or counted.
_Avoid_: Filler rows, nearby members
