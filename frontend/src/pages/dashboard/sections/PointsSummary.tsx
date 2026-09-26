import type { PointsOverview } from '../../../lib/pointsOverview';
import { shortDate } from '../../../lib/semester';

// Overview's always-visible summary (#59 variant A): Total Points as a big
// number over a single-colour bar to the goal, one sentence on what's left,
// and the events-attended count. Past the goal the extra stretch of bar and
// the sentence turn gold. Pending requests show striped on the bar.
function PointsSummary({ overview }: { overview: PointsOverview }) {
    const { total, goal, left, reached, eventsAttended, pendingPoints } = overview;
    const max = Math.max(goal, total + pendingPoints);
    const percent = (points: number) => `${Math.min(100, Math.max(0, (points / max) * 100))}%`;

    let sentence: string;
    if (total === 0 && eventsAttended === 0) sentence = `Enter a code at your first event to start. ${goal} points makes you voter eligible.`;
    else if (reached) sentence = `You reached ${goal}, so you’re voter eligible.`;
    else sentence = `${left} more to be voter eligible.`;

    return (
        <div className="ov-score">
            <p className="ov-score__num">
                <strong>{total}</strong>
                <span>{reached ? '' : `of ${goal} `}Total Points</span>
            </p>
            <div className="ov-score__track" role="progressbar" aria-valuemin={0} aria-valuemax={goal}
                aria-valuenow={total} aria-label="Total Points">
                {pendingPoints > 0 && <div className="ov-score__pending" style={{ width: percent(total + pendingPoints) }} />}
                <div className="ov-score__fill" style={{ width: percent(Math.min(total, goal)) }} />
                {total > goal && <div className="ov-score__over" style={{ left: percent(goal), width: percent(total - goal) }} />}
                {max > goal && <div className="ov-score__goal" style={{ left: percent(goal) }} />}
            </div>
            <div className="ov-score__meta">
                <p className={`ov-score__left${reached ? ' is-reached' : ''}`}>{sentence}</p>
                {eventsAttended > 0 && (
                    <p className="ov-score__events">{eventsAttended} {eventsAttended === 1 ? 'event' : 'events'} attended</p>
                )}
            </div>
            {overview.pending.length > 0 && (
                <p className="ov-pending">
                    {overview.pending
                        .map((request) => {
                            // A "Not listed" request has no points until E-Board picks its Event Type.
                            const details = [request.date && shortDate(request.date), request.points > 0 && `+${request.points}`].filter(Boolean);
                            return details.length ? `${request.name} (${details.join(', ')})` : request.name;
                        })
                        .join(', ')}
                    {overview.pending.length === 1 ? ' is waiting for E-Board. It counts once approved.' : ' are waiting for E-Board. They count once approved.'}
                </p>
            )}
        </div>
    );
}

export default PointsSummary;
