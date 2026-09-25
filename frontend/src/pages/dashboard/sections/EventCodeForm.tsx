import React, { useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import SectionTitle from '../../../components/ui/SectionTitle';
import { redeemCode, type RedeemResult } from '../../../lib/redeemCode';

const refusalMessages: Record<Extract<RedeemResult, { ok: false }>['reason'], string> = {
    'not-found': '*Error: Code is Invalid',
    'already-redeemed': '*Error: Already Submitted This Code',
    'not-active': '*Error: Code is not active',
    'cabinet-only': '*Error: This code is for Cabinet Members only',
};

/** Today as 'YYYY-MM-DD' in local time, the format codes' eventDate uses. */
function localIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function EventCodeForm({ onPointsUpdate }) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleCodeChange = (e) => {
        setCode(e.target.value);
        // Clear any existing messages when user starts typing
        if (message.text) {
            setMessage({ text: '', type: '' });
        }
    };

    async function checkCode(event) {
        event.preventDefault();
        
        if (loading) return;
        
        setLoading(true);
        setMessage({ text: '', type: '' });

        if (!code.trim()) {
            setMessage({ text: '*Required: Type in a Code to Submit', type: 'error' });
            setLoading(false);
            return;
        } 
        
        if (code.length > 45) {
            setMessage({ text: '*Error: Code is Too Long', type: 'error' });
            setLoading(false);
            return;
        }

        try {
            const result = await redeemCode(db, auth.currentUser.email, code, { today: localIsoDate(new Date()) });
            // `=== false`: with strict off, TS won't narrow on `!result.ok`.
            if (result.ok === false) {
                setMessage({ text: refusalMessages[result.reason], type: 'error' });
                return;
            }
            setCode('');
            setMessage({ text: 'Success! Code submitted and points added to your account!', type: 'success' });

            // Call the callback to refresh points instead of reloading the page
            setTimeout(() => {
                if (onPointsUpdate) {
                    onPointsUpdate();
                }
            }, 1500);
        } catch (error) {
            console.error('Error submitting code:', error);
            setMessage({ text: 'An error occurred. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="attendanceForm">
            <SectionTitle>Have an Event Code?</SectionTitle>
            <p className="attendance-intro">
                Enter the code from the event to check in and earn your points.
            </p>

            {message.text && (
                /* role=status: screen readers announce the result without
                   the user having to hunt for it after submitting. */
                <div className={`message ${message.type} attendance-message`} role="status" aria-live="polite">
                    {message.text}
                </div>
            )}

            <form onSubmit={checkCode} className="attendance-code-form">
                <div className="form-group">
                    <input
                        type="text"
                        id="code"
                        aria-label="Event code"
                        aria-describedby="code-hint"
                        className="attendance-code-input"
                        value={code}
                        onChange={handleCodeChange}
                        placeholder="Enter Event Code"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        enterKeyHint="go"
                        disabled={loading}
                    />
                    <p id="code-hint" className="attendance-hint">
                        Codes are case-insensitive and only valid on the event date
                    </p>
                </div>

                <div className="center">
                    {/* is-loading keeps the disabled pulse for the submit wait only —
                        an empty box shouldn't throb at you (see dashboard.css). */}
                    <input
                        type="submit"
                        className={`submit-button attendance-submit${loading ? ' is-loading' : ''}`}
                        value={loading ? 'Submitting...' : 'Submit Code'}
                        disabled={loading || !code.trim()}
                    />
                </div>
            </form>
        </div>
    );
}

export default EventCodeForm;