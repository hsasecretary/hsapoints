import type { RequirementsBoard } from '../../lib/requirementsBoard';
import { shortDate } from '../../lib/semester';
import { MakeUpButton } from './YearBoard';

// "To make up" (#58, from variant B): one card per open Missed Event, oldest
// first, then any leftover Surplus, which covers the next miss. The Strike
// count lives in the status box above the board, so it isn't repeated here.
function ToMakeUp({ board }: { board: RequirementsBoard }) {
    const { toMakeUp, extras } = board;
    return (
        <section className="rq-todo" aria-labelledby="rq-todo-title">
            <h2 id="rq-todo-title" className="rq-h2">To make up</h2>
            {toMakeUp.length ? (
                <>
                    <p className="rq-hint">Any Additional Event makes up the oldest one with a Strike first.</p>
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
                                    : <MakeUpButton codeId={missed.codeId} />}
                            </li>
                        ))}
                    </ul>
                </>
            ) : <p className="rq-caught-up">Nothing to make up. You’re all caught up.</p>}
            {extras.length > 0 && (
                <p className="rq-bank">
                    {extras.join(' and ')}
                    {extras.length === 1 ? ' is an extra event. It' : ' are extra events. They'} will make up your next miss automatically.
                </p>
            )}
        </section>
    );
}

export default ToMakeUp;
