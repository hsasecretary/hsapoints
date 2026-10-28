// The Excuse Request inbox on Excuse Absence: every pending request, with the
// date and time it was filed. Approve is one click (or with a note); Deny needs
// a reason the Member will see. Approving writes the excusal for E-Board.
import { useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import type { ExcuseRequest } from '../../../lib/excuseRequests';
import { approveExcuseRequest, denyExcuseRequest, type ReviewResult } from '../../../lib/excuseRequestsDb';
import { shortDate } from '../../../lib/semester';

type Pending = { id: string; kind: 'note' | 'deny' };

/** 'Oct 14, 6:05 PM'; '' while the server has not stamped a just-filed request yet. */
function filedText(iso: string): string {
    if (!iso) return 'just now';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function ExcuseInbox({ requests, loading, error, nameOf }: {
    requests: ExcuseRequest[];
    loading: boolean;
    error: string;
    nameOf: (email: string) => string;
}) {
    const [open, setOpen] = useState<Pending | null>(null);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

    const run = async (request: ExcuseRequest, kind: 'approve' | 'deny', words: string) => {
        const by = auth.currentUser?.email ?? 'E-Board';
        setBusy(true);
        setMessage(null);
        try {
            const result: ReviewResult = kind === 'deny'
                ? await denyExcuseRequest(db, request.id, { by, reason: words })
                : await approveExcuseRequest(db, request.id, { by, note: words });
            if (result.ok === false) {
                setMessage({ kind: 'err', text: result.error });
                return;
            }
            setOpen(null);
            setText('');
            setMessage({ kind: 'ok', text: `${kind === 'deny' ? 'Denied' : 'Approved'}: ${nameOf(request.email)}, ${request.eventName}.` });
        } catch (err) {
            console.error('Error reviewing Excuse Request:', err);
            setMessage({ kind: 'err', text: 'Could not save. Check your connection and try again.' });
        } finally {
            setBusy(false);
        }
    };

    const start = (request: ExcuseRequest, kind: Pending['kind']) => {
        setOpen({ id: request.id, kind });
        setText('');
        setMessage(null);
    };

    return (
        <section className="eap-inbox" aria-labelledby="eap-inbox-heading">
            <h3 id="eap-inbox-heading">Excuse Requests</h3>
            {error && <p className="eap-error" role="alert">{error}</p>}
            {loading && <p className="eap-empty">Loading requests…</p>}
            {!loading && !error && requests.length === 0 && <p className="eap-empty">No requests waiting.</p>}
            {message && <p className={message.kind === 'ok' ? 'eap-done' : 'eap-error'} role="status">{message.text}</p>}

            <ul className="eap-inbox__list">
                {requests.map((request) => (
                    <li key={request.id} className="eap-request">
                        <div className="eap-request__head">
                            <strong>{nameOf(request.email)}</strong>
                            <span>{request.eventName} · {shortDate(request.eventDate)}</span>
                        </div>
                        <p className="eap-request__filed">Filed {filedText(request.filedAt)}</p>
                        <p className="eap-request__reason">{request.reason}</p>

                        {open?.id === request.id ? (
                            <div className="eap-confirm">
                                <label className="eap-confirm__label">
                                    {open.kind === 'deny' ? 'Why? (required, the Member sees this)' : 'Note (optional)'}
                                    <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
                                </label>
                                <div className="eap-confirm__buttons">
                                    <button
                                        type="button"
                                        className="eap-btn eap-btn--primary"
                                        disabled={busy || (open.kind === 'deny' && !text.trim())}
                                        onClick={() => run(request, open.kind === 'deny' ? 'deny' : 'approve', text)}
                                    >
                                        {open.kind === 'deny' ? 'Deny' : 'Approve'}
                                    </button>
                                    <button type="button" className="eap-btn" disabled={busy} onClick={() => setOpen(null)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="eap-confirm__buttons">
                                <button type="button" className="eap-btn eap-btn--primary" disabled={busy} onClick={() => run(request, 'approve', '')}>Approve</button>
                                <button type="button" className="eap-btn" disabled={busy} onClick={() => start(request, 'note')}>Approve with a note</button>
                                <button type="button" className="eap-btn" disabled={busy} onClick={() => start(request, 'deny')}>Deny</button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default ExcuseInbox;
