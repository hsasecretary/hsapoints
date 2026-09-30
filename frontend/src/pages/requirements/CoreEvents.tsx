import type { RequirementsBoard } from '../../lib/requirementsBoard';
import { tileStatus } from '../../lib/requirementsBoard';
import { shortDate } from '../../lib/semester';
import MakeUpButton from './MakeUpButton';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function lead({ toMakeUp, openStrikes, core }: RequirementsBoard): string {
    if (toMakeUp.length) {
        return [plural(toMakeUp.length, 'Missed Event') + ' to make up', openStrikes ? plural(openStrikes, 'Strike') : ''].filter(Boolean).join(' · ');
    }
    return `All caught up · ${core.attended} of ${core.past} attended so far`;
}

// Tier 1 (docs/research/cabinet-core-events-missed-ux.md): only the Missed
// Events still to make up are shown, each with its Make up button; the next
// Core Event and HLHM get a line each, and the whole year folds away below,
// every row saying its status in words. E-Board is exempt: "Exempt" stands in for the summary and the year stays. The tile board this replaced is on
// the archive/cabinet-tier1-tiles branch.
function CoreEvents({ board }: { board: RequirementsBoard }) {
    const { toMakeUp, extras, core, months, exempt } = board;
    return (
        <section className="rq-core" aria-labelledby="rq-core-title">
            <h2 id="rq-core-title" className="rq-h2">Tier 1: Core Events</h2>
            {months.length === 0 ? <p className="rq-empty">No Core Events yet this year.</p> : (
                <>
                    {exempt
                        ? <p className="rq-exempt">Exempt</p>
                        : <p className={`rq-lead${toMakeUp.length ? ' is-owed' : ''}`}>{lead(board)}</p>}
                    {board.atRisk && <p className="rq-over">You’ll meet with E-Board to make a make-up plan.</p>}

                    {toMakeUp.length > 0 && (
                        <>
                            <ul className="rq-cards">
                                {toMakeUp.map((missed) => (
                                    <li key={missed.codeId}>
                                        <span className="rq-cards__what">
                                            {missed.name}
                                            {missed.strike && <span className="rq-chip">Strike</span>}
                                            <small>Missed {shortDate(missed.date)}</small>
                                        </span>
                                        {missed.pending
                                            ? <span className="rq-pending">Make-up pending review</span>
                                            : <MakeUpButton codeId={missed.codeId} name={missed.name} />}
                                    </li>
                                ))}
                            </ul>
                            <p className="rq-hint">Any Additional Event makes up the oldest one with a Strike first.</p>
                        </>
                    )}
                    {extras.length > 0 && (
                        <p className="rq-bank">
                            {extras.join(' and ')}
                            {extras.length === 1 ? ' is an extra event. It' : ' are extra events. They'} will make up your next miss automatically.
                        </p>
                    )}

                    {core.next && !exempt && (
                        <ul className="rq-next">
                            <li>Next: <strong>{core.next.name}</strong> on {shortDate(core.next.date)}</li>
                        </ul>
                    )}

                    <details className="rq-all">
                        <summary>
                            All Core Events this year
                            <small>{core.attended} of {core.past} attended</small>
                        </summary>
                        {months.map((month) => (
                            <div key={month.label} className="rq-all__month">
                                <h3>{month.label}</h3>
                                <ul>
                                    {month.tiles.map((tile) => (
                                        <li key={tile.key} className={`is-${tile.state}`}>
                                            <span>{tile.name} <small>{shortDate(tile.date)}</small></span>
                                            <span className="rq-all__status">
                                                {tileStatus(tile)}
                                                {tile.strike && <span className="rq-chip">Strike</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </details>
                </>
            )}
        </section>
    );
}

export default CoreEvents;
