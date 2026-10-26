import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { LEADERBOARD_DOC, refreshLeaderboard } from '../../lib/leaderboardRefresh';
import { EBOARD_TOOLS } from './eboardTools';

// /eboard: the E-Board tools as a list (the same list as the Account menu's),
// and the Leaderboard snapshot's last refresh with a button to run one now.
function EboardHome() {
    return (
        <div className="eboard-home">
            <h1 className="eboard-home__title">E-Board tools</h1>
            <ul className="eboard-home__list">
                {EBOARD_TOOLS.map((tool) => (
                    <li key={tool.path}>
                        <Link to={tool.path} className="eboard-home__link">
                            {tool.label}
                            <span aria-hidden="true">›</span>
                        </Link>
                    </li>
                ))}
            </ul>
            <LeaderboardRefresh />
        </div>
    );
}

function LeaderboardRefresh() {
    // undefined while loading, null when there is no snapshot yet.
    const [refreshedAt, setRefreshedAt] = useState<Date | null | undefined>(undefined);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => onSnapshot(doc(db, LEADERBOARD_DOC),
        // 'estimate' so "Refresh now" shows its time before the server's lands.
        (snap) => setRefreshedAt(snap.data({ serverTimestamps: 'estimate' })?.refreshedAt?.toDate?.() ?? null),
        (err) => {
            console.error('Error loading the Leaderboard snapshot:', err);
            setRefreshedAt(null);
        }), []);

    async function refreshNow() {
        setBusy(true);
        setError('');
        try {
            await refreshLeaderboard(db, auth.currentUser?.email?.toLowerCase() ?? 'E-Board');
        } catch (err) {
            console.error('Error refreshing the Leaderboard:', err);
            setError("Couldn't refresh the Leaderboard. Try again.");
        } finally {
            setBusy(false);
        }
    }

    const status = refreshedAt === undefined ? 'Loading…'
        : refreshedAt === null ? 'Never refreshed'
            : `Last refreshed ${refreshedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;

    return (
        <section className="eboard-home__leaderboard" aria-label="Leaderboard">
            <div>
                <h2 className="eboard-home__subtitle">Leaderboard</h2>
                <p className="eboard-home__status" aria-live="polite">{busy ? 'Refreshing…' : status}</p>
                {error && <p className="eboard-home__error" role="alert">{error}</p>}
            </div>
            <button type="button" onClick={refreshNow} disabled={busy}>Refresh now</button>
        </section>
    );
}

export default EboardHome;
