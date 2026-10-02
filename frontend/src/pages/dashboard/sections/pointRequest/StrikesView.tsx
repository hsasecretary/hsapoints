import { AT_RISK_STRIKES } from '../../../../lib/computeStanding';
import { shortDate } from '../../../../lib/semester';
import type { OwedEvent } from './RequestParts';

// The Strikes page behind Submit Point Request's Strikes button (#47): how
// many open Strikes, a meter against the line of 3 that keeps growing past
// it, and which events they came from. Never says "excused".
function StrikesView({ strikes, pending, onBack, onMakeUp }: {
    /** The Missed Events carrying an open Strike, oldest first. */
    strikes: OwedEvent[];
    /** Missed Events a pending request already names. */
    pending: Set<string>;
    onBack: () => void;
    onMakeUp: (codeId: string) => void;
}) {
    const count = strikes.length;
    const atRisk = count >= AT_RISK_STRIKES;
    const slots = Math.max(AT_RISK_STRIKES, count);

    return (
        <div className="point-request req req-sp">
            <button type="button" className="req-sp__back" onClick={onBack}>Back to Submit Point Request</button>
            <h2 className="req-title">Your Strikes</h2>

            <section className={`req-strikes${atRisk ? ' is-over' : ''}`} aria-label="Strike count">
                <p className="req-strikes__count">
                    <strong>{count}</strong> open Strike{count === 1 ? '' : 's'}
                    {!atRisk && (
                        <span className="req-strikes__away">
                            {count === 0 ? 'Nothing to make up' : `${AT_RISK_STRIKES - count} away from ${AT_RISK_STRIKES}`}
                        </span>
                    )}
                </p>
                <div className="req-strikes__track" role="meter" aria-valuemin={0} aria-valuemax={slots} aria-valuenow={count}
                    aria-label={`${count} of ${AT_RISK_STRIKES} Strikes`}>
                    {Array.from({ length: slots }, (_, i) => (
                        <span key={i} className={`req-strikes__slot${i < count ? ' is-full' : ''}${i === AT_RISK_STRIKES - 1 ? ' is-line' : ''}`} />
                    ))}
                </div>
                {atRisk && <p className="req-strikes__warn">At risk of probation, you must meet with the Chief of Staff.</p>}
            </section>

            {count > 0 ? (
                <div className="req-field">
                    <span className="req-label">Where they came from</span>
                    <ul className="req-sp__list">
                        {strikes.map((missed) => (
                            <li key={missed.codeId}>
                                <span className="req-sp__event">{missed.name}</span>
                                <span className="req-sp__date">{shortDate(missed.eventDate)}</span>
                                {pending.has(missed.codeId)
                                    ? <span className="req-tag req-tag--pending">Make-up pending review</span>
                                    : <button type="button" className="req-sp__fix" onClick={() => onMakeUp(missed.codeId)}>Make it up</button>}
                            </li>
                        ))}
                    </ul>
                    <p className="req-hint">A Strike clears when you make up its Missed Event, either by showing you were there or by going to another event.</p>
                </div>
            ) : (
                <p className="req-hint">You have no open Strikes.</p>
            )}
        </div>
    );
}

export default StrikesView;
