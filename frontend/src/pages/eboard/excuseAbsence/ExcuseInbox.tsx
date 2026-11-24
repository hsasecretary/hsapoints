// Excuse Request Review: laid out like Point Request Review, so reviewing an
// excuse feels the same as reviewing a point request. Search a member, filter
// by status, and every request is a card (who, status, the event, when it was
// filed, the reason). A pending card opens a Review panel with Approve and
// Deny, and Approve takes an optional note while Deny needs a reason the
// Member will see. Approving writes the excusal for E-Board. It borrows
// Point Request Review's styles through the `point-request-review` class.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MemberSearch from '../../../components/members/MemberSearch';
import { auth, db } from '../../../lib/firebase';
import type { ExcuseRequest } from '../../../lib/excuseRequests';
import { approveExcuseRequest, denyExcuseRequest, type ReviewResult } from '../../../lib/excuseRequestsDb';
import { displayName, type NamedMember } from '../../../lib/nameSearch';
import { eventType } from '../../../lib/rubric';
import { shortDate } from '../../../lib/semester';

type Mode = 'approve' | 'deny';

const STATUS_COLOR: Record<string, string> = { pending: '#f39c12', approved: '#27ae60', denied: '#e74c3c' };

/** 'Oct 14, 2026, 06:05 PM', the same way Point Request Review writes a date; 'just now' before the server has stamped it. */
function formatDate(iso: string): string {
    if (!iso) return 'just now';
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function ExcuseInbox({ requests, members, loading, error, nameOf }: {
    requests: ExcuseRequest[];
    /** Everyone, for the name search; only those with a request are offered. */
    members: NamedMember[];
    loading: boolean;
    error: string;
    nameOf: (email: string) => string;
}) {
    const [filter, setFilter] = useState('pending');
    const [reviewing, setReviewing] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>('approve');
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [reviewError, setReviewError] = useState('');
    // ?member={email} shows only that Member's requests, as on Point Request Review.
    const [params, setParams] = useSearchParams();
    const memberFilter = params.get('member')?.toLowerCase() ?? null;
    const setMemberFilter = (email: string | null) => {
        const next = new URLSearchParams(params);
        if (email) next.set('member', email);
        else next.delete('member');
        setParams(next);
    };

    // Scoped to the picked Member before the status filter, so the status counts reflect them too.
    const memberRequests = memberFilter ? requests.filter((request) => request.email.toLowerCase() === memberFilter) : requests;
    const filtered = memberRequests.filter((request) => filter === 'all' || request.status === filter);
    const pickedMember = memberFilter ? members.find((member) => member.email.toLowerCase() === memberFilter) ?? null : null;
    const membersWithRequests = useMemo(() => {
        const emails = new Set(requests.map((request) => request.email.toLowerCase()));
        return members.filter((member) => emails.has(member.email.toLowerCase()));
    }, [members, requests]);

    const open = (request: ExcuseRequest) => {
        setReviewing(request.id);
        setMode('approve');
        setText('');
        setReviewError('');
        setNotice('');
    };

    const run = async (request: ExcuseRequest, kind: Mode) => {
        const by = auth.currentUser?.email ?? 'E-Board';
        setBusy(true);
        setReviewError('');
        try {
            const result: ReviewResult = kind === 'deny'
                ? await denyExcuseRequest(db, request.id, { by, reason: text })
                : await approveExcuseRequest(db, request.id, { by, note: text });
            if (result.ok === false) {
                setReviewError(result.error);
                return;
            }
            setReviewing(null);
            setText('');
            setNotice(`${kind === 'deny' ? 'Denied' : 'Approved'}: ${nameOf(request.email.toLowerCase())}, ${request.eventName}.`);
        } catch (err) {
            console.error('Error reviewing Excuse Request:', err);
            setReviewError('Could not save. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    if (loading && requests.length === 0) {
        return (
            <div className="point-request-review">
                <div className="loading-message">Loading excuse requests...</div>
            </div>
        );
    }

    return (
        <div className="point-request-review">
            <div className="member-filter-section">
                {pickedMember ? (
                    <div className="member-filter-section__picked">
                        <span><strong>{displayName(pickedMember)}</strong> <span className="member-search__muted">{pickedMember.email}</span></span>
                        <button type="button" className="member-filter-section__clear" onClick={() => setMemberFilter(null)}>
                            Show everyone
                        </button>
                    </div>
                ) : (
                    <>
                        <MemberSearch
                            members={membersWithRequests}
                            onPick={(member) => setMemberFilter(member.email.toLowerCase())}
                            detail={(member) => {
                                const count = requests.filter((r) => r.email.toLowerCase() === member.email.toLowerCase()).length;
                                return `${count} request${count === 1 ? '' : 's'}`;
                            }}
                        />
                        <p className="member-filter-section__hint">Search by name to see just one member&apos;s requests.</p>
                    </>
                )}
            </div>

            <div className="filter-section">
                <label htmlFor="excuse-status-filter">Filter by status:</label>
                <select id="excuse-status-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="pending">Pending ({memberRequests.filter((r) => r.status === 'pending').length})</option>
                    <option value="approved">Approved ({memberRequests.filter((r) => r.status === 'approved').length})</option>
                    <option value="denied">Denied ({memberRequests.filter((r) => r.status === 'denied').length})</option>
                    <option value="all">All ({memberRequests.length})</option>
                </select>
            </div>

            {error && <p className="review-error" role="alert">{error}</p>}
            {notice && <p className="review-notice" role="status">{notice}</p>}

            {filtered.length === 0 ? (
                <div className="no-requests">
                    No {filter === 'all' ? '' : filter} requests found.
                </div>
            ) : (
                <div className="requests-grid">
                    {filtered.map((request) => (
                        <div key={request.id} className="request-card">
                            <div className="request-header">
                                <div className="user-info">
                                    <h3>{nameOf(request.email.toLowerCase())}</h3>
                                    <p className="email">{request.email}</p>
                                </div>
                                <div className="status-badge" style={{ backgroundColor: STATUS_COLOR[request.status] ?? '#95a5a6' }}>
                                    {request.status.toUpperCase()}
                                </div>
                            </div>

                            <div className="request-details">
                                <div className="detail-row"><strong>Event:</strong> {request.eventName}</div>
                                <div className="detail-row"><strong>Date:</strong> {shortDate(request.eventDate)}</div>
                                <div className="detail-row"><strong>Event Type:</strong> {eventType(request.eventTypeId)?.label ?? request.eventTypeId}</div>
                                {request.codeId && <div className="detail-row"><strong>Code:</strong> {request.codeId}</div>}
                                <div className="detail-row"><strong>Submitted:</strong> {formatDate(request.filedAt)}</div>
                                {request.reason && (
                                    <div className="description">
                                        <strong>Reason:</strong>
                                        <p>{request.reason}</p>
                                    </div>
                                )}
                            </div>

                            {request.status === 'pending' && (reviewing === request.id ? (
                                <div className="review-panel">
                                    <div className="review-modes" role="group" aria-label="Decision">
                                        {(['approve', 'deny'] as Mode[]).map((option) => (
                                            <button key={option} type="button" aria-pressed={mode === option}
                                                className={`review-mode${mode === option ? ' is-active' : ''}`}
                                                onClick={() => { setMode(option); setReviewError(''); }}>
                                                {option === 'approve' ? 'Approve' : 'Deny'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="review-field">
                                        <label htmlFor={`excuse-text-${request.id}`}>
                                            {mode === 'deny' ? 'Reason (the Member sees this)' : 'Note (optional)'}
                                            {mode === 'deny' && <> <span className="review-required">required</span></>}
                                        </label>
                                        <textarea id={`excuse-text-${request.id}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
                                        {mode === 'approve' ? (
                                            <button type="button" className="approve-button" disabled={busy} onClick={() => run(request, 'approve')}>
                                                {busy ? 'Saving…' : '✓ Approve'}
                                            </button>
                                        ) : (
                                            <button type="button" className="deny-button" disabled={busy || !text.trim()} onClick={() => run(request, 'deny')}>
                                                {busy ? 'Saving…' : '✗ Deny'}
                                            </button>
                                        )}
                                    </div>

                                    {reviewError && <p className="review-error" role="alert">{reviewError}</p>}
                                </div>
                            ) : (
                                <div className="request-actions">
                                    <button type="button" className="refresh-button review-open-button" onClick={() => open(request)}>
                                        Review
                                    </button>
                                </div>
                            ))}

                            {request.status !== 'pending' && (
                                <div className="review-info">
                                    <div className="detail-row">
                                        <strong>Reviewed:</strong> {request.reviewedAt ? formatDate(request.reviewedAt) : 'N/A'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Reviewed by:</strong> {request.reviewedBy || 'N/A'}
                                    </div>
                                    {request.reviewNotes && (
                                        <div className="detail-row">
                                            <strong>Notes:</strong> {request.reviewNotes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ExcuseInbox;
