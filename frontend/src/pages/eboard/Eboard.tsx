import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { refreshLeaderboardIfStale } from '../../lib/leaderboardRefresh';

// Frame for every /eboard/* page: e-board members only. The tool itself
// (event codes, point requests, ...) renders in <Outlet />; the pages are
// listed in eboardTools.ts. Opening any of them also refreshes the
// Leaderboard snapshot once it is over an hour old (docs/adr/0004), in the
// background so the page never waits on it.
function Eboard({ eboard }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const email = auth.currentUser?.email?.toLowerCase();
    if (eboard && email) void refreshLeaderboardIfStale(db, email);
  }, [eboard, pathname]);

  if (!eboard) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default Eboard;
