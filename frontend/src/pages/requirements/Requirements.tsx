import { Navigate } from 'react-router-dom';
import { requirementsBoard } from '../../lib/requirementsBoard';
import { useMemberStanding } from '../dashboard/useMemberStanding';
import SemesterGrid from './SemesterGrid';
import ToMakeUp from './ToMakeUp';
import YearBoard from './YearBoard';

// /requirements, the Cabinet Member view (#58 variant D, #75), top to bottom:
//   YearBoard    — status boxes (to make up, Strike slots) and Tier 1 Core Events by month
//   SemesterGrid — Tier 2 Semester Requirements, Fall | Spring
//   ToMakeUp     — one card per open Missed Event, and leftover Surplus
// Only for Members held to the Cabinet rules; everyone else goes to /dashboard.
function Requirements({ email }: { email: string }) {
    const { loading, member, attendances, codes, requests, standing, today } = useMemberStanding(email);

    if (!loading && !standing.heldToCabinetRules) return <Navigate to="/dashboard" replace />;
    const board = standing && requirementsBoard({ member, standing, attendances, codes, requests, today });

    return (
        <div className="requirements-page">
            <h1 className="requirements-page__title">Requirements</h1>
            {loading ? <p className="requirements-page__loading" role="status">Loading your requirements…</p> : (
                <>
                    <YearBoard board={board} />
                    <h2 className="rq-h2">Tier 2: Semester Requirements</h2>
                    <SemesterGrid grid={board.grid} />
                    <ToMakeUp board={board} />
                </>
            )}
        </div>
    );
}

export default Requirements;
