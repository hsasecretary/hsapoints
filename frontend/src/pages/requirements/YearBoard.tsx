import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RequirementsBoard, Tile } from '../../lib/requirementsBoard';
import { shortDate } from '../../lib/semester';

const strikeWord = (n: number) => `${n} Strike${n === 1 ? '' : 's'}`;

function MakeUpButton({ codeId }: { codeId: string }) {
    return <Link className="rq-makeup" to={`/requests?makeup=${encodeURIComponent(codeId)}`}>Make up event</Link>;
}

/** The line under the board for the tapped tile. */
function Detail({ tile, pending }: { tile: Tile; pending: boolean }) {
    const { detail } = tile;
    const when = shortDate(tile.date);
    switch (detail.kind) {
        case 'attended':
            return <p><strong>{tile.name}</strong>, {when}. You were there.</p>;
        case 'upcoming':
            return <p><strong>{tile.name}</strong> is on {when}.</p>;
        case 'hlhm-open':
            return <p>Go to any one HLHM event by {shortDate(detail.by)}.</p>;
        case 'hlhm-done':
            return <p>You went to <strong>{detail.name}</strong> on {shortDate(detail.date)}. That covers HLHM for the year.</p>;
        case 'madeup':
            return (
                <p>
                    <strong>{tile.name}</strong>, {when}. Missed, then made up by {detail.by} on {shortDate(detail.byDate)}
                    {detail.clearedStrike ? ', which also cleared its Strike' : ''}.
                </p>
            );
        case 'closed':
            return <p><strong>{tile.name}</strong>, {when}. Missed. Nothing to make up.</p>;
        default:
            return (
                <div className="rq-detail__row">
                    <p><strong>{tile.name}</strong>, {when}. Missed{detail.strike ? ', with a Strike' : ''}. Any Additional Event makes it up.</p>
                    {pending ? <span className="rq-pending">Make-up pending review</span> : <MakeUpButton codeId={tile.key} />}
                </div>
            );
    }
}

// Requirements (#58 variant D): how many Missed Events are left and the
// Strike slots, then Tier 1 as tiles by month. Tapping a tile opens its
// detail line; the first open miss starts selected.
function YearBoard({ board }: { board: RequirementsBoard }) {
    const [picked, setPicked] = useState<string | null>(board.firstOpen);
    const tiles = board.months.flatMap((month) => month.tiles);
    const selected = tiles.find((tile) => tile.key === picked);
    const pendingPicks = new Set(board.toMakeUp.filter((missed) => missed.pending).map((missed) => missed.codeId));
    const strikes = board.openStrikes;
    const owed = board.toMakeUp.length;

    return (
        <>
            <div className="rq-status">
                <div>
                    <span className="rq-status__big">{owed}</span>
                    <span>to make up</span>
                </div>
                <div className={board.atRisk ? 'is-over' : ''}>
                    <span className="rq-slots" role="img" aria-label={strikes ? strikeWord(strikes) : 'No Strikes'}>
                        {Array.from({ length: Math.max(3, strikes) }, (_, i) => <span key={i} className={i < strikes ? 'is-on' : ''} />)}
                    </span>
                    <span>{strikes ? strikeWord(strikes) : 'No Strikes'}</span>
                </div>
            </div>
            {board.atRisk && <p className="rq-over">You’ll meet with E-Board to make a make-up plan.</p>}

            <h2 className="rq-h2">Tier 1: Core Events</h2>
            {tiles.length === 0 ? <p className="rq-empty">No Core Events yet this year.</p> : (
                <>
                    <div className="rq-board">
                        {board.months.map((month) => (
                            <div key={month.label} className="rq-month">
                                <span className="rq-month__label">{month.label}</span>
                                <div className="rq-tiles">
                                    {month.tiles.map((tile) => (
                                        <button key={tile.key} type="button" aria-pressed={picked === tile.key}
                                            className={`rq-tile is-${tile.state}${tile.strike ? ' has-strike' : ''}`}
                                            aria-label={tile.strike ? `${tile.name}, Strike` : undefined}
                                            onClick={() => setPicked(picked === tile.key ? null : tile.key)}>
                                            <span>{tile.name}</span>
                                            <small>{tile.detail.kind === 'hlhm-open' ? `by ${shortDate(tile.date)}` : shortDate(tile.date)}</small>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <ul className="rq-legend" aria-label="Key">
                        <li className="is-done">Attended</li>
                        <li className="is-madeup">Made up</li>
                        <li className="is-open">To make up</li>
                        <li className="is-open has-strike">Strike</li>
                        <li className="is-upcoming">Coming up</li>
                    </ul>
                    {selected && (
                        <div className="rq-detail" aria-live="polite">
                            <Detail tile={selected} pending={pendingPicks.has(selected.key)} />
                        </div>
                    )}
                </>
            )}
        </>
    );
}

export { MakeUpButton };
export default YearBoard;
