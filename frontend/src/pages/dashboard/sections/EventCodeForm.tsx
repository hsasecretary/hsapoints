import React, { useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import { checkInChoice, checkInOutcome, type CheckInChoice } from '../../../lib/checkIn';
import type { Attendance, Code, Member } from '../../../lib/computeStanding';
import { requirementWaitsNotice } from '../../../lib/pointRequests';
import { lookupCode, redeemCode, type RedeemResult } from '../../../lib/redeemCode';
import { eventType } from '../../../lib/rubric';
import { shortDate, toIsoDate } from '../../../lib/semester';

const refusalMessages: Record<Extract<RedeemResult, { ok: false }>['reason'], string> = {
    'not-found': 'No event has that code. Check the spelling with whoever is running the event.',
    'already-redeemed': 'You already checked in with this code.',
    'removed': 'E-Board removed your check-in for this code. See Points & events for why.',
    'not-active': 'This code only works on the day of its event.',
    'cabinet-only': 'This code is for Cabinet Members only.',
};

type EventCodeFormProps = {
    /** Null while the Member's standing loads: checking in is then one step. */
    member: Member | null;
    attendances: Attendance[];
    /** This school year's codes. */
    codes: Code[];
    /** Missed Events a pending Point Request already names: not offered as a pick. */
    pendingPicks: Set<string>;
};

// The large, filled code box at the top of Overview (#57): it was easy to
// miss when it was smaller. Points show up on their own once the Attendance
// is written, since the dashboard listens to it. When the Member owes a
// Missed Event and the code isn't a Core Event, checking in takes a second
// step: what it makes up (#121).
function EventCodeForm({ member, attendances, codes, pendingPicks }: EventCodeFormProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: React.ReactNode; ok: boolean } | null>(null);
    const [step, setStep] = useState<{ code: Code; choice: CheckInChoice } | null>(null);
    const [pick, setPick] = useState<string | null>(null);

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCode(e.target.value);
        setMessage(null);
        setStep(null);
    };

    async function checkIn(found: Code | null, makeupFor: string | null, today: string) {
        const email = auth.currentUser.email;
        // Worked out before it's written: afterwards the dashboard's listener already has it.
        const outcome = found && member ? checkInOutcome(member, attendances, codes, found, makeupFor, { email, today }) : null;
        const result = await redeemCode(db, email, found?.id ?? code, { today, makeupFor });
        // `=== false`: with strict off, TS won't narrow on `!result.ok`.
        if (result.ok === false) {
            setMessage({ text: refusalMessages[result.reason], ok: false });
            return;
        }
        setCode('');
        setStep(null);
        const name = found && (found.event || eventType(found.eventTypeId)?.label);
        let text: React.ReactNode = name ? `Checked in to ${name}.` : 'Checked in. Your points are added.';
        if (outcome?.madeUp) {
            text = (
                <>Checked in to {outcome.event}. This made up <strong>{outcome.madeUp.name}</strong> ({shortDate(outcome.madeUp.eventDate)})
                    {outcome.madeUp.strike ? ' and cleared a Strike' : ''}.</>
            );
        } else if (outcome?.filled) {
            text = `Checked in to ${outcome.event}. This filled your ${outcome.filled} requirement.`;
        }
        setMessage({ text, ok: true });
    }

    async function checkCode(event: React.FormEvent) {
        event.preventDefault();
        if (loading || !code.trim()) return;
        if (code.length > 45) {
            setMessage({ text: 'That code is too long.', ok: false });
            return;
        }

        setLoading(true);
        setMessage(null);
        const today = toIsoDate(new Date());
        try {
            if (step) {
                await checkIn(step.code, pick, today);
                return;
            }
            const email = auth.currentUser.email;
            const found = await lookupCode(db, email, code, { today });
            if (found.ok === false) {
                setMessage({ text: refusalMessages[found.reason], ok: false });
                return;
            }
            const choice = member ? checkInChoice(member, attendances, codes, found.code, pendingPicks, { email, today }) : null;
            if (choice) {
                setStep({ code: found.code, choice });
                setPick(choice.initial);
            } else {
                await checkIn(found.code, null, today);
            }
        } catch (error) {
            console.error('Error submitting code:', error);
            setMessage({ text: 'Something went wrong. Please try again.', ok: false });
        } finally {
            setLoading(false);
        }
    }

    const picked = step?.choice.options.find((row) => row.codeId === pick);
    const fills = step?.choice.fills;

    return (
        <form className="ov-code" onSubmit={checkCode}>
            <label className="ov-code__label" htmlFor="event-code">Event code</label>
            <div className="ov-code__row">
                <input
                    id="event-code"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="Enter the code"
                    aria-describedby="event-code-hint"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    enterKeyHint="go"
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !code.trim()}>{loading ? 'Checking…' : 'Check in'}</button>
            </div>
            {step && (
                <div className="ov-code__pick">
                    <label htmlFor="event-code-makeup">This will make up:</label>
                    <select id="event-code-makeup" value={pick ?? ''} disabled={loading} onChange={(e) => setPick(e.target.value || null)}>
                        {fills && (
                            <option value="">Don't use it as a make-up: count it toward my {eventType(fills)?.label} requirement</option>
                        )}
                        {step.choice.options.map((row) => (
                            <option key={row.codeId} value={row.codeId}>
                                {row.name} · {shortDate(row.eventDate)}{row.strike ? ' · Strike' : ''}
                            </option>
                        ))}
                    </select>
                    {fills && picked && (
                        <p className="ov-code__notice" role="status">This makes up {picked.name}. {requirementWaitsNotice(fills)}</p>
                    )}
                </div>
            )}
            <p id="event-code-hint" className="ov-code__hint">Codes work only on the day of the event.</p>
            {/* role=status, always present: screen readers announce the result without the user hunting for it. */}
            <p className={`ov-code__msg${message?.ok ? ' is-ok' : ''}`} role="status">{message?.text}</p>
        </form>
    );
}

export default EventCodeForm;
