import type { PointsOverview } from '../../../lib/pointsOverview';

// Overview, E-Board in the Cabinet view: nothing is required of E-Board, so
// the Total Points and Cabinet Points bars give way to one line, with the
// numbers left as plain text since E-Board can still earn points.
function ExemptSummary({ overview, cabinetPoints }: { overview: PointsOverview; cabinetPoints: number }) {
    return (
        <div className="ov-exempt">
            <p className="ov-exempt__lead">Exempt due to E-Board status.</p>
            <p className="ov-exempt__nums">
                <span><strong>{overview.total}</strong> Total Points</span>
                <span><strong>{cabinetPoints}</strong> Cabinet Points</span>
                {overview.eventsAttended > 0 && <span><strong>{overview.eventsAttended}</strong> {overview.eventsAttended === 1 ? 'event' : 'events'} attended</span>}
            </p>
        </div>
    );
}

export default ExemptSummary;
