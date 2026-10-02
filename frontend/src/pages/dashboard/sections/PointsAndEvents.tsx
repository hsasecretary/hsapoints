import { Fragment, useState } from 'react';
import type { LedgerEntry, PointsOverview } from '../../../lib/pointsOverview';
import type { RequirementsBoard } from '../../../lib/requirementsBoard';
import { shortDate } from '../../../lib/semester';
import EventTypeTable from './EventTypeTable';

const pointsLabel = (points: number) => (points ? `${points} ${Math.abs(points) === 1 ? 'point' : 'points'}` : 'No points');
const signed = (points: number) => `${points > 0 ? '+' : ''}${points}`;
const dateLabel = (entry: LedgerEntry) => (entry.date ? shortDate(entry.date) : '');

// What the Overview's "Points & events" bubble opens (#59 variant A): a
// switch between groups that each drop down to their events, and every
// event newest first with a line where the Member reached the goal. In the
// Cabinet view "By category" is the Event Type table instead (#58 variant D).
function PointsAndEvents({ overview, byType }: { overview: PointsOverview; byType?: RequirementsBoard['byType'] }) {
    const [byDate, setByDate] = useState(false);

    const removed = overview.removed.length > 0 && (
        <div className="ov-removed">
            <h4>Check-ins removed by E-Board</h4>
            <ul className="ov-events">
                {overview.removed.map((entry) => (
                    <li key={entry.id}>
                        <span className="ov-events__date">{entry.date ? shortDate(entry.date) : ''}</span>
                        <span className="ov-events__name">
                            {entry.name}
                            <small>Removed: {entry.reason}</small>
                        </span>
                        <span className="ov-events__pts"><s>{signed(entry.points)}</s></span>
                    </li>
                ))}
            </ul>
        </div>
    );

    if (overview.ledger.length === 0) {
        return (
            <>
                <p className="ov-empty">No events yet. Enter the code at your first event and it shows up here, with the points it earned.</p>
                {removed}
            </>
        );
    }

    return (
        <>
            <div className="ov-seg" role="group" aria-label="Show">
                <button type="button" aria-pressed={!byDate} className={byDate ? '' : 'is-on'} onClick={() => setByDate(false)}>
                    By category
                </button>
                <button type="button" aria-pressed={byDate} className={byDate ? 'is-on' : ''} onClick={() => setByDate(true)}>
                    Events attended ({overview.eventsAttended})
                </button>
            </div>
            {byDate ? (
                <ul className="ov-events">
                    {overview.newestFirst.map((entry) => (
                        <Fragment key={entry.id}>
                            {entry.crossed && <li className="ov-events__line">Reached {overview.goal}: voter eligible</li>}
                            <li>
                                <span className="ov-events__date">{dateLabel(entry)}</span>
                                <span className="ov-events__name">
                                    {entry.name}
                                    <small>{entry.group.name}{entry.fromRequest ? ', from a Point Request' : ''}</small>
                                </span>
                                <span className="ov-events__pts">{entry.points ? signed(entry.points) : 'No points'}</span>
                            </li>
                        </Fragment>
                    ))}
                </ul>
            ) : byType ? <EventTypeTable byType={byType} /> : (
                <div className="ov-cats">
                    {overview.groups.map((group) => (
                        <details key={group.key} className="ov-cat">
                            <summary>
                                <span>{group.name} <small className="ov-cat__count">{group.entries.length}</small></span>
                                <span className="ov-cat__pts">{pointsLabel(group.points)}</span>
                            </summary>
                            <ul>
                                {group.entries.map((entry) => (
                                    <li key={entry.id}>
                                        <span>{entry.name}</span>
                                        <span>{[dateLabel(entry), entry.points ? signed(entry.points) : ''].filter(Boolean).join(', ')}</span>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    ))}
                </div>
            )}
            {removed}
        </>
    );
}

export default PointsAndEvents;
