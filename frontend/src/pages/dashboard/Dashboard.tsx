import { useSearchParams } from 'react-router-dom';
import { useViewOverride } from '../../components/layout/ViewAsContext';
import { isGeneralMember } from '../../lib/members';
import { CABINET_POINTS_GOAL } from '../../lib/computeStanding';
import { pointsOverview } from '../../lib/pointsOverview';
import { requirementsBoard } from '../../lib/requirementsBoard';
import { formatAccountType } from '../../lib/roles';
import CabinetGoal from './sections/CabinetGoal';
import EventCodeForm from './sections/EventCodeForm';
import Explainer from './sections/Explainer';
import ExemptSummary from './sections/ExemptSummary';
import MakeUpList from './sections/MakeUpList';
import PointsAndEvents from './sections/PointsAndEvents';
import PointsSummary from './sections/PointsSummary';
import PrototypeSwitcher, { useVariant } from './prototype-upcoming/PrototypeSwitcher';
import { VariantA, VariantB, VariantC } from './prototype-upcoming/Variants';
import './prototype-upcoming/prototype.css';
import { pendingMakeups, useMemberStanding } from './useMemberStanding';

const BUBBLES = ['points', 'how'] as const;
type Bubble = (typeof BUBBLES)[number];

// /dashboard, the Overview (#57 as revised, #59 variant A), top to bottom:
//   My information  — name, email, account type (as the old My Information card)
//   EventCodeForm   — the large code box
//   PointsSummary   — Total Points toward the goal, events attended, pending requests
//                     (E-Board in the Cabinet view: ExemptSummary, one line in place of both bars)
//   CabinetGoal     — Cabinet view only: Cabinet Points toward 20
//   bubbles         — "Points & events" (PointsAndEvents) and "How it works"
//                     (Explainer), each opening in place (?open=points|how); in
//                     the Cabinet view "By category" is the Event Type table.
//                     Above the make-up list so they're seen.
//   MakeUpList      — Cabinet view only: Missed Events to make up
// Every number comes from computeStanding via useMemberStanding.
function Dashboard({ email }: { email: string }) {
    const { loading, member, attendances, codes, requests, pending, standing, today } = useMemberStanding(email, useViewOverride());
    const [params, setParams] = useSearchParams();
    const proto = useVariant(['A', 'B', 'C']);
    const open = BUBBLES.find((bubble) => bubble === params.get('open')) ?? null;

    const toggle = (bubble: Bubble) => {
        const next = new URLSearchParams(params);
        if (open === bubble) next.delete('open'); else next.set('open', bubble);
        setParams(next, { replace: true });
    };

    const profile = member as { firstName?: string; lastName?: string; cabinet?: string; eboard?: boolean; involvement?: string; webTeam?: boolean } | null;
    const firstName = profile?.firstName;
    const overview = standing ? pointsOverview({ member, standing, attendances, codes, requests, today }) : null;
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
                            {profile.webTeam ? 'Web-team Tester' : formatAccountType(profile.cabinet)}
                            {!isGeneralMember(profile) && ` (E-Board: ${profile.eboard ? 'Yes' : 'No'})`}
                        </dd>
                    </div>
                </dl>
            )}
            <div className="overview__code"><EventCodeForm /></div>

            {loading ? <p className="overview__loading" role="status">Loading your points…</p> : (
                <>
                    {standing.exempt
                        ? <ExemptSummary overview={overview} cabinetPoints={standing.cabinetPoints} />
                        : (
                            <>
                                <PointsSummary overview={overview} />
                                {standing.heldToCabinetRules && <CabinetGoal points={standing.cabinetPoints} goal={CABINET_POINTS_GOAL} />}
                            </>
                        )}

                    {/* PROTOTYPE: upcoming events */}
                    {proto.current === 'A' && <VariantA showCabinet={!!standing.heldToCabinetRules} />}
                    {proto.current === 'B' && <VariantB showCabinet={!!standing.heldToCabinetRules} />}
                    {proto.current === 'C' && <VariantC showCabinet={!!standing.heldToCabinetRules} />}
                    <PrototypeSwitcher names={{ A: 'Agenda list', B: 'Spotlight + poster strip', C: 'Month calendar' }} current={proto.current} go={proto.go} />

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
                    {standing.heldToCabinetRules && !standing.exempt && (
                        <MakeUpList standing={standing} codes={codes} pendingPicks={pendingMakeups(pending)} />
                    )}
                </>
            )}
        </div>
    );
}

export default Dashboard;
