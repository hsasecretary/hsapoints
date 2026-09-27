import { useSearchParams } from 'react-router-dom';
import { useViewOverride } from '../../components/layout/ViewAsContext';
import { isGeneralMember } from '../../lib/members';
import { CABINET_POINTS_GOAL } from '../../lib/computeStanding';
import { pointsOverview } from '../../lib/pointsOverview';
import { requirementsBoard } from '../../lib/requirementsBoard';
import { formatAccountType } from '../../lib/roles';
import Explainer from '../guide/Explainer';
import CabinetGoal from './sections/CabinetGoal';
import EventCodeForm from './sections/EventCodeForm';
import MakeUpList from './sections/MakeUpList';
import PointsAndEvents from './sections/PointsAndEvents';
import PointsSummary from './sections/PointsSummary';
import { pendingMakeups, useMemberStanding } from './useMemberStanding';

const BUBBLES = ['points', 'how'] as const;
type Bubble = (typeof BUBBLES)[number];

// /dashboard, the Overview (#57 as revised, #59 variant A), top to bottom:
//   My information  — name, email, account type (as the old My Information card)
//   EventCodeForm   — the large code box
//   PointsSummary   — Total Points toward the goal, events attended, pending requests
//   CabinetGoal     — Cabinet view only: Cabinet Points toward 20
//   MakeUpList      — Cabinet view only: Missed Events to make up
//   bubbles         — "Points & events" (PointsAndEvents) and "How it works"
//                     (Explainer), each opening in place (?open=points|how); in
//                     the Cabinet view "By category" is the Event Type table
// Every number comes from computeStanding via useMemberStanding.
function Dashboard({ email }: { email: string }) {
    const { loading, member, attendances, codes, requests, pending, standing, today } = useMemberStanding(email, useViewOverride());
    const [params, setParams] = useSearchParams();
    const open = BUBBLES.find((bubble) => bubble === params.get('open')) ?? null;

    const toggle = (bubble: Bubble) => {
        const next = new URLSearchParams(params);
        if (open === bubble) next.delete('open'); else next.set('open', bubble);
        setParams(next, { replace: true });
    };

    const profile = member as { firstName?: string; lastName?: string; cabinet?: string; eboard?: boolean; involvement?: string } | null;
    const firstName = profile?.firstName;
    const overview = standing ? pointsOverview({ member, standing, attendances, codes, requests }) : null;
    const board = standing?.heldToCabinetRules ? requirementsBoard({ member, standing, attendances, codes, requests, today }) : null;

    return (
        <div className="overview">
            <h1 className="overview__title">{firstName ? `Hi, ${firstName}` : 'Dashboard'}</h1>
            {profile && (
                <dl className="overview__info" aria-label="My information">
                    <div><dt>Name</dt><dd>{[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'N/A'}</dd></div>
                    <div><dt>Email</dt><dd>{email}</dd></div>
                    <div>
                        <dt>Account Type</dt>
                        <dd>
                            {formatAccountType(profile.cabinet)}
                            {!isGeneralMember(profile) && ` (E-Board: ${profile.eboard ? 'Yes' : 'No'})`}
                        </dd>
                    </div>
                </dl>
            )}
            <div className="overview__code"><EventCodeForm /></div>

            {loading ? <p className="overview__loading" role="status">Loading your points…</p> : (
                <>
                    <PointsSummary overview={overview} />
                    {standing.heldToCabinetRules && <CabinetGoal points={standing.cabinetPoints} goal={CABINET_POINTS_GOAL} />}
                    {standing.heldToCabinetRules && (
                        <MakeUpList standing={standing} codes={codes} pendingPicks={pendingMakeups(pending)} />
                    )}

                    <div className="ov-bubbles">
                        <button type="button" className={open === 'points' ? 'is-on' : ''} aria-expanded={open === 'points'}
                            aria-controls={open === 'points' ? 'ov-panel-points' : undefined} onClick={() => toggle('points')}>
                            Points & events
                        </button>
                        <button type="button" className={open === 'how' ? 'is-on' : ''} aria-expanded={open === 'how'}
                            aria-controls={open === 'how' ? 'ov-panel-how' : undefined} onClick={() => toggle('how')}>
                            How it works
                        </button>
                    </div>
                    {open === 'points' && (
                        <section id="ov-panel-points" className="ov-panel" aria-label="Points & events">
                            <PointsAndEvents overview={overview} byType={board?.byType} />
                        </section>
                    )}
                    {open === 'how' && (
                        <section id="ov-panel-how" className="ov-panel" aria-label="How it works">
                            <Explainer member={member} />
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

export default Dashboard;
