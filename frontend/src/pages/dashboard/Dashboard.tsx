import { useSearchParams } from 'react-router-dom';
import { pointsOverview } from '../../lib/pointsOverview';
import Explainer from '../guide/Explainer';
import EventCodeForm from './sections/EventCodeForm';
import MakeUpList from './sections/MakeUpList';
import PointsAndEvents from './sections/PointsAndEvents';
import PointsSummary from './sections/PointsSummary';
import { pendingMakeups, useMemberStanding } from './useMemberStanding';

type Bubble = 'points' | 'how';

// /dashboard, the Overview (#57 as revised, #59 variant A), top to bottom:
//   EventCodeForm   — the large code box
//   PointsSummary   — Total Points toward the goal, events attended, pending requests
//   MakeUpList      — Cabinet view only: Missed Events to make up
//   bubbles         — "Points & events" (PointsAndEvents) and "How it works"
//                     (Explainer), each opening in place (?open=points|how)
// Every number comes from computeStanding via useMemberStanding.
function Dashboard({ email }: { email: string }) {
    const { loading, member, attendances, codes, requests, pending, standing } = useMemberStanding(email);
    const [params, setParams] = useSearchParams();
    const open = params.get('open') as Bubble | null;

    const toggle = (bubble: Bubble) => {
        const next = new URLSearchParams(params);
        if (open === bubble) next.delete('open'); else next.set('open', bubble);
        setParams(next, { replace: true });
    };

    const firstName = (member as { firstName?: string } | null)?.firstName;
    const overview = standing ? pointsOverview({ member, standing, attendances, codes, requests }) : null;

    return (
        <div className="overview">
            <h1 className="overview__title">{firstName ? `Hi, ${firstName}` : 'Dashboard'}</h1>
            <div className="overview__code"><EventCodeForm /></div>

            {loading ? <p className="overview__loading" role="status">Loading your points…</p> : (
                <>
                    <PointsSummary overview={overview} />
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
                            <PointsAndEvents overview={overview} />
                        </section>
                    )}
                    {open === 'how' && (
                        <section id="ov-panel-how" className="ov-panel" aria-label="How it works">
                            <Explainer cabinet={standing.heldToCabinetRules || member?.eboard === true} mlpSpring={standing.veGoal === 8} />
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

export default Dashboard;
