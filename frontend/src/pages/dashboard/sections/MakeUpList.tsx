import { Link } from 'react-router-dom';
import type { Code, Standing } from '../../../lib/computeStanding';
import { missedEventName } from '../../../lib/pointRequests';
import { shortDate } from '../../../lib/semester';

// Overview, Cabinet view (#57): every Missed Event still owed a Make-up, each
// with a "Make up event" button that opens Requests already set to make it
// up. Members see Strikes, never whether a miss was excused.
function MakeUpList({ standing, codes, pendingPicks }: {
    standing: Standing;
    codes: Code[];
    /** Missed Events a pending request already names. */
    pendingPicks: Set<string>;
}) {
    const owed = standing.missedEvents.filter((missed) => missed.owed);

    return (
        <section className="ov-makeups" aria-labelledby="ov-makeups-title">
            <h2 id="ov-makeups-title" className="ov-h2">To make up</h2>
            {owed.length === 0 ? <p className="ov-makeups__sub">Nothing to make up. You’re all caught up.</p> : (
                <>
                    <p className="ov-makeups__sub">Make up a missed event or clear a Strike.</p>
                    <ul>
                        {owed.map((missed) => (
                            <li key={missed.codeId}>
                                <span className="ov-makeups__name">
                                    {missedEventName(codes, missed)}
                                    <small>{shortDate(missed.eventDate)}{missed.strike ? ', Strike' : ''}</small>
                                </span>
                                {pendingPicks.has(missed.codeId)
                                    ? <span className="ov-makeups__pending">Make-up pending review</span>
                                    : (
                                        <Link className="ov-makeups__btn" to={`/requests?makeup=${encodeURIComponent(missed.codeId)}`}>
                                            Make up event
                                        </Link>
                                    )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}

export default MakeUpList;
