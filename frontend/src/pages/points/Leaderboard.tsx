import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
    asOfLabel,
    boardFor,
    entryName,
    type LeaderboardSnapshot,
    type NeighborRank,
    type RankGroup,
    type YourStanding,
} from '../../lib/leaderboard';
import { useViewOverride } from '../../components/layout/ViewAsContext';
import { useMemberStanding } from '../dashboard/useMemberStanding';

// Tie Clusters bigger than this collapse into a count, per the design
// decision that a large tie is more overwhelming than useful to read. Only
// applies to Top Ranks — Your Standing never names other tied members,
// regardless of tie size (CONTEXT.md: "every other Member's identity hidden").
const TIE_COLLAPSE_THRESHOLD = 10;

// Ranks at or above this get a medal badge.
const MEDAL_CUTOFF = 3;

type Snapshot = LeaderboardSnapshot & { refreshedAt: Date | null };

/**
 * One get of leaderboard/current (docs/adr/0004): undefined while loading,
 * null when E-Board hasn't refreshed it yet, 'error' when the read failed.
 * Never lists users.
 */
function useSnapshot(): Snapshot | null | undefined | 'error' {
    const [snapshot, setSnapshot] = useState<Snapshot | null | undefined | 'error'>(undefined);
    useEffect(() => {
        let live = true;
        getDoc(doc(db, 'leaderboard', 'current'))
            .then((snap) => {
                if (!live) return;
                // A doc holding only an E-Board refresh's `attemptedAt` isn't a snapshot yet.
                const data = snap.data();
                setSnapshot(data?.refreshedAt ? {
                    members: data.members ?? 0,
                    scores: data.scores ?? [],
                    names: data.names ?? {},
                    refreshedAt: data.refreshedAt?.toDate?.() ?? null,
                } : null);
            })
            .catch((error) => {
                console.error('Error loading the Leaderboard:', error);
                if (live) setSnapshot('error');
            });
        return () => {
            live = false;
        };
    }, []);
    return snapshot;
}

// /points/leaderboard. Everyone else is as of E-Board's last refresh; the
// viewer is ranked with their live Total Points, so redeeming a code moves
// them at once. E-Board (but Web-team devs) aren't ranked: they see the
// snapshot as it is.
export default function Leaderboard({ email, ranked }: { email: string; ranked: boolean }) {
    const snapshot = useSnapshot();
    // Unranked E-Board get no Your Standing, so they skip loading their own.
    const { member, standing } = useMemberStanding(ranked ? email : null, useViewOverride());
    const token = (member as { leaderboardToken?: string } | null)?.leaderboardToken ?? null;
    const liveTotal = standing?.vePoints ?? null;

    const leaderboard = useMemo(() => {
        if (!snapshot || snapshot === 'error') return null;
        if (ranked && liveTotal === null) return null;
        return boardFor({ snapshot, token, liveTotal: liveTotal ?? 0, ranked });
    }, [snapshot, token, liveTotal, ranked]);

    const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set());

    // Collapsed by default whenever the underlying data changes, so a
    // previously-expanded rank doesn't stay open with stale members.
    useEffect(() => {
        setExpandedRanks(new Set());
    }, [leaderboard]);

    const toggleExpanded = (rank: number) => {
        setExpandedRanks((prev) => {
            const next = new Set(prev);
            if (next.has(rank)) {
                next.delete(rank);
            } else {
                next.add(rank);
            }
            return next;
        });
    };

    if (snapshot === 'error') {
        return <Shell><p className="leaderboard-message">Unable to load the Leaderboard.</p></Shell>;
    }
    if (snapshot === null) {
        return <Shell><p className="leaderboard-message">The Leaderboard isn't ready yet</p></Shell>;
    }
    if (!leaderboard) {
        return <Shell><div className="loading-message">Loading leaderboard...</div></Shell>;
    }

    const { topRanks, yourStanding, totalMembers } = leaderboard;

    return (
        <Shell>
            {snapshot.refreshedAt && (
                <p className="leaderboard-asof">
                    {ranked ? 'Others as of' : 'As of'} {asOfLabel(snapshot.refreshedAt, new Date())}
                </p>
            )}

            {/* Parked, not dropped: the Top Ranks podium — a warm raised frame
                with a "Top Ranks" label, meant as the counterweight to the
                sunken Your Standing board below. To bring it back, wrap the
                <ol> in:

                    <div className="leaderboard-top">
                        <p className="leaderboard-top__label">Top Ranks</p>
                        <ol className="leaderboard-list leaderboard-list--top">
                        ...
                    </div>

                and uncomment the matching block in dashboard.css. The medals
                are independent of it and stay either way. */}
            {topRanks.length === 0 ? (
                <p className="leaderboard-message">No one has points yet this year</p>
            ) : (
                <ol className="leaderboard-list">
                    {topRanks.map((group) => (
                        <RankRow
                            key={group.rank}
                            group={group}
                            expanded={expandedRanks.has(group.rank)}
                            onToggle={() => toggleExpanded(group.rank)}
                        />
                    ))}
                </ol>
            )}

            {yourStanding && !yourStanding.isInTopRanks && <StandingBoard standing={yourStanding} />}

            {!ranked ? (
                <div className="leaderboard-summary">
                    <div className="leaderboard-counter">
                        {totalMembers} Member{totalMembers === 1 ? '' : 's'} ranked
                    </div>
                    <div className="leaderboard-nudge">E-Board aren't ranked</div>
                </div>
            ) : yourStanding && (
                <div className="leaderboard-summary">
                    <div className="leaderboard-counter">
                        Rank #{yourStanding.rank} of {totalMembers}
                    </div>
                    {yourStanding.pointsToNextRank !== null && (
                        <div className="leaderboard-nudge">
                            {yourStanding.pointsToNextRank} point{yourStanding.pointsToNextRank === 1 ? '' : 's'} to reach the next rank
                        </div>
                    )}
                </div>
            )}
        </Shell>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return <section className="leaderboard-section hsa-reveal" aria-label="Leaderboard">{children}</section>;
}

// Top Ranks: named winners. A cluster bigger than TIE_COLLAPSE_THRESHOLD
// collapses into a count with a toggle, so an unusually large tie doesn't
// dump dozens of names on the page at once.
//
// The first three Ranks get a medal badge. Keyed on the Rank itself, never on
// the row's position in the list: ties make Ranks skip, so a board can open
// #1, #2, #2, #2, #2 and then jump straight out of Top Ranks with no third
// place to award. The badge has to be able to simply not appear.
type RankRowProps = {
    group: RankGroup;
    expanded: boolean;
    onToggle: () => void;
};

function RankRow({ group, expanded, onToggle }: RankRowProps) {
    const tieSize = group.members.length;
    const collapsible = tieSize > TIE_COLLAPSE_THRESHOLD;
    const membersVisible = !collapsible || expanded;
    const containsViewer = group.members.some((entry) => entry.isViewer);

    return (
        <li className={`leaderboard-row${containsViewer ? ' leaderboard-row--you' : ''}${membersVisible ? ' is-open' : ''}`}>
            <div className="leaderboard-row__header">
                <span
                    className="leaderboard-row__rank"
                    data-medal={group.rank <= MEDAL_CUTOFF ? group.rank : undefined}
                >
                    #{group.rank}
                </span>
                <span className="leaderboard-row__points">
                    {group.totalPoints} pt{group.totalPoints === 1 ? '' : 's'}
                </span>
                {collapsible && (
                    <button
                        type="button"
                        className="leaderboard-row__toggle"
                        onClick={onToggle}
                        aria-expanded={expanded}
                    >
                        {tieSize} tied
                        <span className="leaderboard-row__chevron" aria-hidden="true">›</span>
                    </button>
                )}
            </div>

            {membersVisible && (
                <ul className="leaderboard-row__members">
                    {group.members.map((entry) => (
                        <li key={entry.isViewer ? 'you' : entry.token} className={entry.isViewer ? 'is-you' : undefined}>
                            {entryName(entry)}
                            {/* A viewer the snapshot didn't name already reads "You". */}
                            {entry.isViewer && entry.name && <span className="leaderboard-row__you-tag"> (You)</span>}
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
}

// Your Standing: only the viewer's own name is ever shown here. Other
// members tied with the viewer stay anonymous no matter how small the tie
// cluster is — unlike Top Ranks, there's no expand-to-reveal for this row.
function YourStandingRow({ standing }: { standing: YourStanding }) {
    const viewer = standing.members.find((entry) => entry.isViewer);
    const otherCount = standing.members.length - (viewer ? 1 : 0);

    return (
        <li className="leaderboard-row leaderboard-row--you is-open">
            <div className="leaderboard-row__header">
                <span className="leaderboard-row__rank">#{standing.rank}</span>
                <span className="leaderboard-row__points">
                    {standing.totalPoints} pt{standing.totalPoints === 1 ? '' : 's'}
                </span>
            </div>

            <ul className="leaderboard-row__members">
                <li className="is-you">
                    {viewer?.name ?? 'You'}
                    {viewer?.name && <span className="leaderboard-row__you-tag"> (You)</span>}
                </li>
                {otherCount > 0 && (
                    <li className="leaderboard-row__others">
                        and {otherCount} other member{otherCount === 1 ? '' : 's'} tied at this rank
                    </li>
                )}
            </ul>
        </li>
    );
}

// The inset panel holding the cascade. Its vertical padding is load-bearing:
// the cards translate out of the stack's own box, so the panel has to hold
// the room they overflow into. How much room depends on how deep the pile
// actually is — hence the counts on the element. A three-card pile needs
// 48px of throw; a one-card pile needs none, and reserving it anyway leaves
// a band of empty panel between Your Standing and whatever sits above it.
// dashboard.css maps each count to its padding.
function StandingBoard({ standing }: { standing: YourStanding }) {
    const { neighborsAbove, neighborsBelow } = standing;

    return (
        <div className="leaderboard-board" data-above={neighborsAbove.length} data-below={neighborsBelow.length}>
            <ol className="leaderboard-list leaderboard-list--board">
                <NeighborStack ranks={neighborsAbove} direction="above" />
                <YourStandingRow standing={standing} />
                <NeighborStack ranks={neighborsBelow} direction="below" />
            </ol>
        </div>
    );
}

// Neighboring Ranks render as one physical pile rather than a flat list: the
// card nearest Your Standing stays full size and tucks under the viewer's own
// row, and each one further out shrinks and blurs more, per the cascade spec (up to 3 cards/side,
// 28px overlap step, 10% scale step, 1.8px blur step — see the
// --offset/--scale/--blur/--opacity rules in dashboard.css).
//
// Each card shows its real Rank and real Total Points. Where a name would go
// sits a smear instead: this component is never handed one (see NeighborRank).
function NeighborStack({ ranks, direction }: { ranks: NeighborRank[]; direction: 'above' | 'below' }) {
    if (ranks.length === 0) return null;

    return (
        <li className={`leaderboard-stack leaderboard-stack--${direction}`} aria-hidden="true">
            {ranks.map((neighbor, i) => {
                const depth = direction === 'above' ? ranks.length - i : i + 1;
                return (
                    <div key={neighbor.rank} className="leaderboard-row leaderboard-row--neighbor" data-depth={depth}>
                        <span className="leaderboard-row__rank">#{neighbor.rank}</span>
                        <NameSmear seed={neighbor.rank} />
                        <span className="leaderboard-row__score">{neighbor.totalPoints}</span>
                    </div>
                );
            })}
        </li>
    );
}

// Stands in for the redacted name. Two or three soft-edged segments imitate
// word spacing; widths are seeded off the Rank so the silhouette is stable
// across renders but no two cards in a pile match — a uniform bar would read
// as a skeleton loader still waiting on data.
function NameSmear({ seed }: { seed: number }) {
    return (
        <span className="leaderboard-row__smear">
            {smearSegments(seed).map((width, i) => (
                <span key={i} className="leaderboard-row__smear-seg" style={{ width: `${width}%` }} />
            ))}
        </span>
    );
}

// Lehmer generator, seeded by Rank. Nothing here derives from a real name —
// the widths are decorative noise, not an encoding of anything.
function smearSegments(seed: number): number[] {
    let state = (Math.abs(seed) * 48271) % 2147483647 || 1;
    const next = () => {
        state = (state * 48271) % 2147483647;
        return state / 2147483647;
    };

    const count = next() < 0.45 ? 2 : 3;
    const weights = Array.from({ length: count }, () => 0.5 + next());
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    // Leave the last few percent of the slot empty so the smear stops short of
    // the score, the way a short name would.
    return weights.map((weight) => (weight / total) * (88 - count * 3));
}
