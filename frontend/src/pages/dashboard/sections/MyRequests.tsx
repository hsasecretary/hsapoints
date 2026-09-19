import { useEffect, useState } from 'react';
import { db, auth } from '../../../lib/firebase';
import SectionTitle from '../../../components/ui/SectionTitle';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

type PointRequest = {
    id: string;
    activityName: string;
    date: string;
    pointsRequested: number;
    status: 'pending' | 'approved' | 'denied';
    reviewNotes?: string;
    submittedAt?: Timestamp;
};

const STATUS_CONFIG: Record<PointRequest['status'], { icon: string; label: string; className: string }> = {
    pending: { icon: '🟡', label: 'Under E-Board Review', className: 'status-pending' },
    approved: { icon: '🟢', label: 'Points Added', className: 'status-approved' },
    denied: { icon: '🔴', label: 'Denied', className: 'status-denied' }
};

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

function MyRequests() {
    const [requests, setRequests] = useState<PointRequest[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (requests.length === 0) {
        return (
            <div className="my-requests">
                <SectionTitle>My Requests</SectionTitle>
                <div className="my-requests__empty">
                    <p>You haven't submitted any point requests yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="my-requests">
            <SectionTitle>My Requests</SectionTitle>
            <div className="my-requests__list">
                {requests.map((request) => {
                    const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
                    return (
                        <div key={request.id} className={`request-card ${status.className}`}>
                            <div className="request-card__header">
                                <span className="request-card__activity">
                                    {request.activityName} — {formatDate(request.date)}
                                </span>
                                <span className="request-card__points">+{request.pointsRequested} pts</span>
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
                })}
            </div>
        </div>
    );
}

export default MyRequests;