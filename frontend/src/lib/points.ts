// Total Points: a Member's running point balance. Computed the same way
// everywhere it's shown (PointsOverview, Leaderboard) so the two can't drift.
export function getTotalPoints(user: { fallPoints?: number; springPoints?: number }): number {
	return (user.fallPoints || 0) + (user.springPoints || 0);
}
