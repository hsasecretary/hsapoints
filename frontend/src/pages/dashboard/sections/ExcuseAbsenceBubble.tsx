// "Excuse an absence", the third Overview bubble: a Cabinet Member picks the
// upcoming Core Events they can't make and writes one reason; each event
// becomes its own Excuse Request for E-Board to approve or deny. Below the
// form, the Member's own requests with their status, and Withdraw while one is
// still pending. Check-in codes are never shown: events appear by name and date.
import { useState, type FormEvent } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Attendance, Code, Member } from '../../../lib/computeStanding';
import { buildExcuseRequests, excusableEvents, type ExcuseRequest } from '../../../lib/excuseRequests';
import { fileExcuseRequests, withdrawExcuseRequest } from '../../../lib/excuseRequestsDb';
import { shortDate } from '../../../lib/semester';

const STATUS_TEXT: Record<ExcuseRequest['status'], string> = { pending: 'Pending', approved: 'Approved', denied: 'Denied' };

type Props = {
    email: string;
    member: Member;
    codes: Code[];
    attendances: Attendance[];
    /** This Member's Excuse Requests, newest first. */
    requests: ExcuseRequest[];
    /** Local date as 'YYYY-MM-DD'. */
    today: string;
};

function ExcuseAbsenceBubble({ email, member, codes, attendances, requests, today }: Props) {
    const [picked, setPicked] = useState<string[]>([]);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const events = excusableEvents({ member, codes, attendances, requests, today });

    const toggle = (codeId: string) => {
        setPicked((current) => (current.includes(codeId) ? current.filter((id) => id !== codeId) : [...current, codeId]));
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setNotice('');
        setError('');
        const built = buildExcuseRequests(
            { codeIds: picked, reason },
            { email, member, codes, attendances, requests, today, filedAt: serverTimestamp() },
        );
        if (built.ok === false) {
            setError(built.error);
            return;
        }
        setBusy(true);
        try {
            await fileExcuseRequests(db, built.requests);
            const count = built.requests.length;
            setPicked([]);
            setReason('');
            setNotice(`Sent to E-Board: ${count} request${count === 1 ? '' : 's'}. You can see ${count === 1 ? 'its' : 'their'} status below.`);
        } catch (err) {
            console.error('Error filing excuse requests:', err);
            setError('Could not send. Check your connection and try again. If you already asked for one of these events, refresh the page first.');
        } finally {
            setBusy(false);
        }
    };

    const withdraw = async (request: ExcuseRequest) => {
        if (busy) return;
        setNotice('');
        setError('');
        setBusy(true);
        try {
            await withdrawExcuseRequest(db, request.id);
            setNotice(`Withdrawn: ${request.eventName}. You can file it again if you need to.`);
        } catch (err) {
            console.error('Error withdrawing excuse request:', err);
            setError('Could not withdraw. E-Board may have just decided it. Refresh to see.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="ov-excuse">
            <p className="ov-excuse__lead">
                Can't make a Core Event? Ask before it happens. E-Board reviews each event on its own, and a late excuse goes to E-Board directly.
            </p>
            {notice && <p className="ov-excuse__notice" role="status">{notice}</p>}
            {error && <p className="ov-excuse__error" role="alert">{error}</p>}

            {events.length === 0 ? (
                <p className="ov-excuse__lead">
                    No upcoming Core Events to excuse yet. Excuses open once E-Board makes an event's code.
                </p>
            ) : (
                <form className="ov-excuse__form" onSubmit={submit}>
                    <fieldset className="ov-excuse__events">
                        <legend>Which events can't you make?</legend>
                        <ul>
                            {events.map((event) => (
                                <li key={event.codeId}>
                                    <label className={picked.includes(event.codeId) ? 'is-on' : ''}>
                                        <input
                                            type="checkbox"
                                            checked={picked.includes(event.codeId)}
                                            onChange={() => toggle(event.codeId)}
                                            disabled={busy}
                                        />
                                        <span className="ov-excuse__event-name">{event.name}</span>
                                        <span className="ov-excuse__event-date">{shortDate(event.eventDate)}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </fieldset>
                    <label className="ov-excuse__reason">
                        Reason (one reason covers every event you picked)
                        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} />
                    </label>
                    <button type="submit" className="ov-excuse__submit" disabled={busy || picked.length === 0 || !reason.trim()}>
                        {busy ? 'Sending…' : 'Send to E-Board'}
                    </button>
                </form>
            )}

            {requests.length > 0 && (
                <section className="ov-excuse__list" aria-label="My excuse requests">
                    <h3 className="ov-excuse__subheading">My requests</h3>
                    <ul>
                        {requests.map((request) => (
                            <li key={request.id} className="ov-excuse__item">
                                <div className="ov-excuse__item-top">
                                    <span className="ov-excuse__item-title">
                                        {request.eventName} <small>{shortDate(request.eventDate)}</small>
                                    </span>
                                    <span className={`ov-excuse__badge is-${request.status}`}>{STATUS_TEXT[request.status]}</span>
                                </div>
                                <p className="ov-excuse__item-reason">{request.reason}</p>
                                {request.status === 'denied' && request.reviewNotes && (
                                    <p className="ov-excuse__item-denial">E-Board's reason: {request.reviewNotes}</p>
                                )}
                                {request.status === 'approved' && request.reviewNotes && (
                                    <p className="ov-excuse__item-denial">Note from E-Board: {request.reviewNotes}</p>
                                )}
                                {request.status === 'pending' && (
                                    <div className="ov-excuse__item-actions">
                                        <button type="button" className="ov-excuse__withdraw" disabled={busy} onClick={() => withdraw(request)}>
                                            Withdraw
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

export default ExcuseAbsenceBubble;
