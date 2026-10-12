# Neighboring Ranks show position and score, never a name

The Leaderboard surrounds Your Standing with the Ranks either side of it, so a Member can see what the climb actually costs. That requires showing something real — a pile of content-free placeholder bars, which is what the first implementation rendered, tells the viewer nothing and reads as a loading skeleton that never resolves.

Showing real Ranks and real Total Points while withholding names is the middle option between two worse ones. Naming neighbours would turn an anonymized board into a public ranking of everyone, which is the thing Top Ranks is deliberately limited to five of. Fabricating plausible names would be worse still: indistinguishable from real data to the viewer, and a standing invitation to mistake a stranger for a real Member.

So `buildLeaderboard` returns Neighboring Ranks as `NeighborRank` — `{ rank, totalPoints }`, with no `members` array. The redaction is a property of the type rather than a rendering choice: the component that draws a neighbour card is never handed a name it could leak, so no later edit to the JSX can undo the anonymity by accident. In the name's place the card draws a smear — irregular soft-edged segments seeded off the Rank number — which encodes nothing and is not derived from any real name.

Since ADR-0004 this is also true of the data, not just the UI: the board is built from an E-Board-written snapshot that carries names only for Top Ranks, so a Neighboring Rank's Member is never sent to the browser at all. What the network tab does show is every ranked Member's Total Points under a random token, which is no more than the board itself shows.
