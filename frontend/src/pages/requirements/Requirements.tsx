import { Navigate } from 'react-router-dom';
import { useViewOverride } from '../../components/layout/ViewAsContext';
import { requirementsBoard } from '../../lib/requirementsBoard';
import { useMemberStanding } from '../dashboard/useMemberStanding';
import CoreEvents from './CoreEvents';
import SemesterGrid from './SemesterGrid';

// /requirements, the Cabinet Member view (#58, #75), top to bottom:
//   CoreEvents   — Tier 1: Missed Events to make up, what's next, and the year folded away
//   SemesterGrid — Tier 2 Semester Requirements, Fall | Spring
// Only for Members held to the Cabinet rules; everyone else goes to /dashboard.
function Requirements({ email }: { email: string }) {
    const { loading, member, attendances, codes, requests, standing, today } = useMemberStanding(email, useViewOverride());

    if (!loading && !standing.heldToCabinetRules) return <Navigate to="/dashboard" replace />;
    const board = standing && requirementsBoard({ member, standing, attendances, codes, requests, today });

    return (
        <div className="requirements-page">
            <h1 className="requirements-page__title">Requirements</h1>
            {loading ? <p className="requirements-page__loading" role="status">Loading your requirements…</p> : (
                <>
                    <CoreEvents board={board} />
                    <h2 className="rq-h2">Tier 2: Semester Requirements</h2>
                    {board.exempt && <p className="rq-exempt rq-exempt--small">Exempt</p>}
                    <SemesterGrid grid={board.grid} />
                </>
            )}
        </div>
    );
}

export default Requirements;
