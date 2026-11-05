import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../../../lib/firebase';
import SectionTitle from '../../../components/ui/SectionTitle';
import { useViewOverride } from '../../../components/layout/ViewAsContext';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { ExcuseRequest } from '../../../lib/excuseRequests';
import { shortDate } from '../../../lib/semester';
import { useCanFileExcuse } from '../useCanFileExcuse';
import { useExcuseRequests } from '../useExcuseRequests';

type PointRequest = {
    id: string;
    activityName: string;
    date: string;
    pointsRequested: number;
    status: 'pending' | 'approved' | 'denied';
    reviewNotes?: string;
    submittedAt?: Timestamp;
};

type Status = { icon: string; label: string; className: string };

const STATUS_CONFIG: Record<PointRequest['status'], Status> = {
    pending: { icon: '🟡', label: 'Under E-Board Review', className: 'status-pending' },
    approved: { icon: '🟢', label: 'Points Added', className: 'status-approved' },
    denied: { icon: '🔴', label: 'Denied', className: 'status-denied' }
};

const EXCUSE_STATUS_CONFIG: Record<ExcuseRequest['status'], Status> = {
    pending: { icon: '🟡', label: 'Waiting for E-Board', className: 'status-pending' },
    approved: { icon: '🟢', label: 'Excused', className: 'status-approved' },
    denied: { icon: '🔴', label: 'Not excused', className: 'status-denied' },
};

type Show = 'all' | 'points' | 'excuses';

// "2026-09-14" -> "09/14/2026"
function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
}

function formatSubmittedAt(timestamp?: Timestamp) {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString();
}

function PointCard({ request }: { request: PointRequest }) {
    const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
    return (
        <div className={`request-card ${status.className}`}>
            <div className="request-card__header">
                <span className="request-card__activity">
                    {request.activityName} — {formatDate(request.date)}
                </span>
                {/* 0 when E-Board picks the Event Type on review ("Not listed"). */}
                {request.pointsRequested > 0 && (
                    <span className="request-card__points">+{request.pointsRequested} pts</span>
                )}
            </div>

            <div className="request-card__status">
                <span className="status-badge">
                    {status.icon} {status.label}
                </span>
                {request.submittedAt && (
                    <span className="request-card__submitted">
                        Submitted {formatSubmittedAt(request.submittedAt)}
                    </span>
                )}
            </div>

            {request.status === 'denied' && request.reviewNotes && (
                <div className="request-card__notes">
                    <strong>Reason:</strong> {request.reviewNotes}
                </div>
            )}
        </div>
    );
}

// An Excuse Request: the event it is for, where it stands, the Member's own
// reason, and E-Board's note (the denial reason, or an optional note on approval).
function ExcuseCard({ request }: { request: ExcuseRequest }) {
    const status = EXCUSE_STATUS_CONFIG[request.status] ?? EXCUSE_STATUS_CONFIG.pending;
    return (
        <div className={`request-card ${status.className}`}>
            <div className="request-card__header">
                <span className="request-card__activity">
                    {request.eventName} — {shortDate(request.eventDate)}
                </span>
            </div>

            <div className="request-card__status">
                <span className="status-badge">
                    {status.icon} {status.label}
                </span>
                {request.filedAt && (
                    <span className="request-card__submitted">
                        Filed {new Date(request.filedAt).toLocaleDateString()}
                    </span>
                )}
            </div>

            <p className="request-card__reason">{request.reason}</p>

            {request.reviewNotes && (
                <div className="request-card__notes">
                    <strong>{request.status === 'denied' ? 'Reason:' : 'Note from E-Board:'}</strong> {request.reviewNotes}
                </div>
            )}
        </div>
    );
}

function MyRequests() {
    const [requests, setRequests] = useState<PointRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState<Show>('all');

    // Excuse Requests live on the dashboard form; they are listed here too, with
    // a way back to it. Only a Member who can file one gets the link and the
    // (possibly empty) section; anyone else sees a Point Requests-only list
    // unless they somehow already have excuse requests.
    const email = auth.currentUser?.email;
    const canExcuse = useCanFileExcuse(email, useViewOverride());
    const excuses = useExcuseRequests(email, canExcuse);
    const showExcuses = canExcuse || excuses.length > 0;

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        // Filters by the field PointRequestForm actually writes ("userEmail"),
        // not "email" — matching the task spec's query here would silently
        // return zero results.
        const requestsQuery = query(
            collection(db, 'pointRequests'),
            where('userEmail', '==', user.email),
            orderBy('submittedAt', 'desc')
        );

        // onSnapshot (not a one-time getDocs) keeps this list live: if e-board
        // approves/denies while the member has this page open, the badge
        // updates immediately with no refresh needed.
        const unsubscribe = onSnapshot(
            requestsQuery,
            (snapshot) => {
                const items = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                })) as PointRequest[];
                setRequests(items);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching point requests:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="my-requests">
                <SectionTitle>My Requests</SectionTitle>
                <div className="my-requests__list" aria-busy="true">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="request-card request-card--skeleton" />
                    ))}
                </div>
            </div>
        );
    }

    const pointList = requests.length === 0 ? (
        <div className="my-requests__empty">
            <p>You haven't submitted any point requests yet.</p>
        </div>
    ) : (
        <div className="my-requests__list">
            {requests.map((request) => <PointCard key={request.id} request={request} />)}
        </div>
    );

    const excuseList = excuses.length === 0 ? (
        <p className="my-requests__none">No excuse requests yet.</p>
    ) : (
        <div className="my-requests__list">
            {excuses.map((request) => <ExcuseCard key={request.id} request={request} />)}
        </div>
    );

    const chips: [Show, string, number][] = [
        ['all', 'All', requests.length + excuses.length],
        ['points', 'Point requests', requests.length],
        ['excuses', 'Excuse absences', excuses.length],
    ];

    return (
        <div className="my-requests">
            <SectionTitle>My Requests</SectionTitle>

            {showExcuses && (
                <div className="my-requests__filter">
                    <div className="my-requests__chips" role="group" aria-label="Show">
                        {chips.map(([key, label, count]) => (
                            <button
                                key={key}
                                type="button"
                                className={`my-requests__chip${show === key ? ' is-on' : ''}`}
                                aria-pressed={show === key}
                                onClick={() => setShow(key)}
                            >
                                {label} <span>{count}</span>
                            </button>
                        ))}
                    </div>
                    {canExcuse && (
                        <Link to="/dashboard?open=excuse" className="my-requests__link">
                            File an excuse on the dashboard →
                        </Link>
                    )}
                </div>
            )}

            {(!showExcuses || show !== 'excuses') && pointList}

            {showExcuses && show !== 'points' && (
                <>
                    {show === 'all' && <h3 className="my-requests__subheading">Excuse absences</h3>}
                    {excuseList}
                </>
            )}
        </div>
    );
}

export default MyRequests;
