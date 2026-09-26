import { Link, Navigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { AT_RISK_STRIKES as AT_RISK } from '../../lib/computeStanding';
import { missedEventName } from '../../lib/pointRequests';
import SectionTitle from '../../components/ui/SectionTitle';
import { shortDate } from '../../lib/semester';
import { pendingMakeups, useMemberStanding } from '../dashboard/useMemberStanding';

// /strikes (#47 variant C): a Cabinet Member's open Strikes and the Missed
// Events still to make up. Members never see whether a miss was excused:
// the Strike tag is only on misses that carry one.
function Strikes() {
    const { loading, codes, pending, standing } = useMemberStanding(auth.currentUser?.email?.toLowerCase());

    if (loading) return <div className="strikes-page" aria-busy="true"><SectionTitle size="page">Strikes</SectionTitle></div>;
    // Hidden for General Members and E-Board, who have no Strikes.
    if (!standing.heldToCabinetRules) return <Navigate to="/dashboard" replace />;

    const count = standing.openStrikes;
    const atRisk = count >= AT_RISK;
    // The bar is marked at 3 and keeps growing past it.
    const slots = Math.max(AT_RISK + 1, count);
    const owed = standing.missedEvents.filter((missed) => missed.owed);
    const pendingPicks = pendingMakeups(pending);

    return (
        <div className="strikes-page">
            <SectionTitle size="page">Strikes</SectionTitle>

            <section className={`strikes-card${atRisk ? ' is-at-risk' : ''}`} aria-labelledby="strike-count">
                <p id="strike-count" className="strikes-card__count">
                    <span>{count}</span> open {count === 1 ? 'Strike' : 'Strikes'}
                </p>
                <div className="strike-bar" role="img" aria-label={`${count} of ${AT_RISK} Strikes before probation risk`}>
                    {Array.from({ length: slots }, (_, i) => (
                        <span key={i} className={`strike-bar__slot${i < count ? ' is-filled' : ''}${i === AT_RISK - 1 ? ' is-mark' : ''}`} />
                    ))}
                </div>
                {atRisk && (
                    <p className="strikes-card__warning" role="alert">
                        At risk of probation: you must meet with the Chief of Staff.
                    </p>
                )}
                <p className="strikes-card__help">
                    An unexcused Missed Event adds a Strike. Making it up at another event clears it.
                </p>
            </section>

            <section className="strikes-list">
                <SectionTitle as="h3" align="left">To make up</SectionTitle>
                {owed.length === 0 ? (
                    <p>Nothing to make up. Nice work.</p>
                ) : (
                    <ul>
                        {owed.map((missed) => (
                            <li key={missed.codeId}>
                                <span className="strikes-list__event">
                                    {missedEventName(codes, missed)}
                                    <span className="strikes-list__date">{shortDate(missed.eventDate)}</span>
                                    {missed.strike && <span className="tag tag--strike">Strike</span>}
                                </span>
                                {pendingPicks.has(missed.codeId) ? (
                                    <span className="tag">Make-up pending review</span>
                                ) : (
                                    <Link to="/dashboard" state={{ makeup: missed.codeId }}>Make it up</Link>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

export default Strikes;
