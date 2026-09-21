import { useEffect, useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import { getTotalPoints } from '../../../lib/points';
import SectionTitle from '../../../components/ui/SectionTitle';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import {
	buildLeaderboard,
	type LeaderboardMember,
	type LeaderboardResult,
	type RankGroup,
	type YourStanding,
} from '../../../lib/leaderboard';

type LeaderboardSectionProps = {
	/** Bump to re-fetch (e.g. after an attendance code is accepted). Same convention as PointsOverview. */
	refreshKey?: number;
};

// Tie Clusters bigger than this collapse into a count, per the design
// decision that a large tie is more overwhelming than useful to read. Only
// applies to Top Ranks — Your Standing never names other tied members,
// regardless of tie size (CONTEXT.md: "every other Member's identity hidden").
const TIE_COLLAPSE_THRESHOLD = 10;

// Uniform, content-free rows above/below Your Standing. Fixed counts so
// filler never encodes how large the real gap between ranks is.
const FILLER_ROWS_ABOVE = 3;
const FILLER_ROWS_BELOW = 3;

export default function LeaderboardSection({ refreshKey = 0 }: LeaderboardSectionProps) {
	const [leaderboard, setLeaderboard] = useState<LeaderboardResult | null>(null);
	const [viewerEmail, setViewerEmail] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set());

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				setLeaderboard(null);
				setViewerEmail(null);
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const usersSnapshot = await getDocs(collection(db, 'users'));
				const members: LeaderboardMember[] = usersSnapshot.docs.map((docSnap) => {
					const data = docSnap.data();
					return {
						email: docSnap.id,
						firstName: data.firstName || 'N/A',
						lastName: data.lastName || 'N/A',
						totalPoints: getTotalPoints(data),
					};
				});

				setViewerEmail(user.email);
				setLeaderboard(buildLeaderboard(members, user.email));
			} catch (error) {
				console.error('Error fetching leaderboard:', error);
				setLeaderboard(null);
			} finally {
				setLoading(false);
			}
		});

		return unsubscribe;
	}, [refreshKey]);

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

	if (loading && !leaderboard) {
		return (
			<div className="leaderboard-section">
				<SectionTitle>Leaderboard</SectionTitle>
				<div className="loading-message">Loading leaderboard...</div>
			</div>
		);
	}

	if (!leaderboard) {
		return (
			<div className="leaderboard-section">
				<SectionTitle>Leaderboard</SectionTitle>
				<div className="loading-message">Unable to load the leaderboard.</div>
			</div>
		);
	}

	const { topRanks, yourStanding, totalMembers } = leaderboard;

	return (
		<div className="leaderboard-section">
			<SectionTitle>Leaderboard</SectionTitle>

			<ol className="leaderboard-list">
				{topRanks.map((group) => (
					<RankRow
						key={group.rank}
						group={group}
						viewerEmail={viewerEmail}
						expanded={expandedRanks.has(group.rank)}
						onToggle={() => toggleExpanded(group.rank)}
					/>
				))}

				{yourStanding && !yourStanding.isInTopRanks && (
					<>
						<FillerRows count={FILLER_ROWS_ABOVE} keyPrefix="above" />
						<YourStandingRow standing={yourStanding} viewerEmail={viewerEmail} />
						<FillerRows count={FILLER_ROWS_BELOW} keyPrefix="below" />
					</>
				)}
			</ol>

			{yourStanding && (
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
		</div>
	);
}

// Top Ranks: named winners. A cluster bigger than TIE_COLLAPSE_THRESHOLD
// collapses into a count with a toggle, so an unusually large tie doesn't
// dump dozens of names on the page at once.
type RankRowProps = {
	group: RankGroup;
	viewerEmail: string | null;
	expanded: boolean;
	onToggle: () => void;
};

function RankRow({ group, viewerEmail, expanded, onToggle }: RankRowProps) {
	const tieSize = group.members.length;
	const collapsible = tieSize > TIE_COLLAPSE_THRESHOLD;
	const membersVisible = !collapsible || expanded;
	const containsViewer = viewerEmail != null && group.members.some((member) => member.email === viewerEmail);

	return (
		<li className={`leaderboard-row${containsViewer ? ' leaderboard-row--you' : ''}${membersVisible ? ' is-open' : ''}`}>
			<div className="leaderboard-row__header">
				<span className="leaderboard-row__rank">#{group.rank}</span>
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
					{group.members.map((member) => (
						<li key={member.email} className={member.email === viewerEmail ? 'is-you' : undefined}>
							{member.firstName} {member.lastName}
							{member.email === viewerEmail && <span className="leaderboard-row__you-tag"> (You)</span>}
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
function YourStandingRow({ standing, viewerEmail }: { standing: YourStanding; viewerEmail: string | null }) {
	const viewer = standing.members.find((member) => member.email === viewerEmail);
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
					{viewer ? `${viewer.firstName} ${viewer.lastName}` : 'You'}
					<span className="leaderboard-row__you-tag"> (You)</span>
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

function FillerRows({ count, keyPrefix }: { count: number; keyPrefix: string }) {
	return (
		<>
			{Array.from({ length: count }, (_, i) => (
				<li key={`${keyPrefix}-${i}`} className="leaderboard-row leaderboard-row--filler" aria-hidden="true">
					<div className="leaderboard-row__header">
						<span className="leaderboard-row__rank-placeholder" />
						<span className="leaderboard-row__points-placeholder" />
					</div>
				</li>
			))}
		</>
	);
}
