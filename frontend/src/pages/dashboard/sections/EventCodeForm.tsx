import React, { useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import { redeemCode, type RedeemResult } from '../../../lib/redeemCode';
import { toIsoDate } from '../../../lib/semester';

const refusalMessages: Record<Extract<RedeemResult, { ok: false }>['reason'], string> = {
    'not-found': 'No event has that code. Check the spelling with whoever is running the event.',
    'already-redeemed': 'You already checked in with this code.',
    'removed': 'E-Board removed your check-in for this code. See Points & events for why.',
    'not-active': 'This code only works on the day of its event.',
    'cabinet-only': 'This code is for Cabinet Members only.',
};

// The large, filled code box at the top of Overview (#57): it was easy to
// miss when it was smaller. Points show up on their own once the Attendance
// is written, since the dashboard listens to it.
function EventCodeForm() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCode(e.target.value);
        setMessage(null);
    };

    async function checkCode(event: React.FormEvent) {
        event.preventDefault();
        if (loading || !code.trim()) return;
        if (code.length > 45) {
            setMessage({ text: 'That code is too long.', ok: false });
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const result = await redeemCode(db, auth.currentUser.email, code, { today: toIsoDate(new Date()) });
            // `=== false`: with strict off, TS won't narrow on `!result.ok`.
            if (result.ok === false) {
                setMessage({ text: refusalMessages[result.reason], ok: false });
                return;
            }
            setCode('');
            setMessage({ text: 'Checked in. Your points are added.', ok: true });
        } catch (error) {
            console.error('Error submitting code:', error);
            setMessage({ text: 'Something went wrong. Please try again.', ok: false });
        } finally {
            setLoading(false);
        }
    }

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
            <p id="event-code-hint" className="ov-code__hint">Codes work only on the day of the event.</p>
            {/* role=status, always present: screen readers announce the result without the user hunting for it. */}
            <p className={`ov-code__msg${message?.ok ? ' is-ok' : ''}`} role="status">{message?.text}</p>
        </form>
    );
}

export default EventCodeForm;
