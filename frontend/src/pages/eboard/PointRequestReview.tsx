import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import MemberSearch from '../../components/members/MemberSearch';
import type { Code } from '../../lib/computeStanding';
import { canRevoke } from '../../lib/memberLookup';
import { displayName, type NamedMember } from '../../lib/nameSearch';
import { NOT_LISTED } from '../../lib/pointRequests';
import type { Revoked } from '../../lib/pointsOverview';
import type { ReviewRequest } from '../../lib/requestReview';
import { eventType } from '../../lib/rubric';
import ReviewPanel from './pointRequests/ReviewPanel';
import RevokeForm from './pointRequests/RevokeForm';

type StoredRequest = ReviewRequest & {
    userName: string;
    activityName?: string;
    description?: string;
    pointsRequested?: number;
    status: 'pending' | 'approved' | 'denied';
    submittedAt: Date;
    reviewedAt?: { toDate(): Date } | null;
    reviewedBy?: string | null;
    reviewNotes?: string;
    adjustment?: { points: number; note: string };
    attendanceIds?: string[];
    /** Set when E-Board took back its approval. */
    revoked?: Revoked;
    [image: string]: unknown;
};

// What the Member picked, in words: an Event Type, a group such as OPA
// (E-Board confirms which), or "Not listed".
function memberPick(request: StoredRequest): string {
    if (request.eventTypeId) return eventType(request.eventTypeId)?.label ?? request.eventTypeId;
    if (request.typeChoiceId === NOT_LISTED) return 'Not listed (you pick)';
    if (request.typeChoiceId === 'opa') return 'OPA (you pick which)';
    return 'None (sent before Event Types)';
}

function PointRequestReview() {
    const [requests, setRequests] = useState<StoredRequest[]>([]);
    const [codes, setCodes] = useState<Code[]>([]);
    const [members, setMembers] = useState<NamedMember[]>([]);
    const [membersError, setMembersError] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedImage, setSelectedImage] = useState(null);
    const [reviewing, setReviewing] = useState<string | null>(null);
    const [notice, setNotice] = useState('');
    // ?request={id} (from User Lookup) opens that request, whatever its status.
    // ?member={email} (issue #20) shows only that Member's requests.
    const [params, setParams] = useSearchParams();
    const linkedId = params.get('request');
    const memberFilter = params.get('member')?.toLowerCase() ?? null;
    const setMemberFilter = (email: string | null) => {
        const next = new URLSearchParams(params);
        if (email) next.set('member', email);
        else next.delete('member');
        setParams(next);
    };
    const linkedCard = useRef<HTMLDivElement>(null);
    const [linkedShown, setLinkedShown] = useState(false);

    useEffect(() => {
        fetchRequests();
        getDocs(collection(db, 'users'))
            .then((snapshot) => setMembers(snapshot.docs.map((d) => {
                const data = d.data();
                return { email: d.id, firstName: data.firstName || '', lastName: data.lastName || '' };
            })))
            .catch((error) => {
                console.error('Error loading members:', error);
                setMembersError('Could not load members. Refresh to try again.');
            });
    }, []);

    useEffect(() => {
        if (!linkedId || linkedShown) return;
        const linked = requests.find((request) => request.id === linkedId);
        if (!linked) return;
        setLinkedShown(true);
        setFilter(linked.status);
        if (linked.status === 'pending') setReviewing(linked.id);
        // A stale ?member= for someone else would hide the request this link named.
        if (memberFilter && String(linked.userEmail).toLowerCase() !== memberFilter) {
            const next = new URLSearchParams(params);
            next.delete('member');
            setParams(next);
        }
    }, [linkedId, linkedShown, requests]);

    useEffect(() => {
        if (linkedShown) linkedCard.current?.scrollIntoView({ block: 'start' });
    }, [linkedShown]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const [requestsSnapshot, codesSnapshot] = await Promise.all([
                getDocs(collection(db, 'pointRequests')),
                getDocs(collection(db, 'codes')),
            ]);
            setCodes(codesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Code));

            // One read per Member, not per request.
            const emails = [...new Set(requestsSnapshot.docs.map((d) => String(d.data().userEmail)))];
            const names = new Map(await Promise.all(emails.map(async (email) => {
                try {
                    const userData = (await getDoc(doc(db, 'users', email.toLowerCase()))).data();
                    return [email, userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : 'Unknown User'] as const;
                } catch (error) {
                    console.error('Error fetching user data for', email, error);
                    return [email, 'Unknown User'] as const;
                }
            })));

            const requestsData = requestsSnapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    userName: names.get(String(data.userEmail)),
                    submittedAt: data.submittedAt?.toDate() || new Date(),
                } as StoredRequest;
            });

            // Sort by submission date (newest first)
            requestsData.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

            setRequests(requestsData);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    // Scoped to the picked Member (if any) before the status filter, so the
    // status dropdown's counts reflect that Member too (issue #20).
    const memberRequests = memberFilter
        ? requests.filter(request => String(request.userEmail).toLowerCase() === memberFilter)
        : requests;
    const filteredRequests = memberRequests.filter(request =>
        filter === 'all' || request.status === filter
    );
    const pickedMember = memberFilter ? members.find(m => m.email === memberFilter) ?? null : null;

    const handleReviewed = async (message: string) => {
        setReviewing(null);
        setNotice(message);
        await fetchRequests();
    };

    const getImageSource = (request) => {
    return request.imageData ||
           request.imageUrl ||
           request.photoUrl ||
           request.photoURL ||
           request.imageURL ||
           request.image ||
           null;
};

const openImageModal = (request) => {
    const imgSrc = getImageSource(request);
    if (!imgSrc) {
        alert("No photo evidence was attached to this request.");
        return;
    }
    setSelectedImage(imgSrc);
};

    const closeImageModal = () => {
        setSelectedImage(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#f39c12';
            case 'approved': return '#27ae60';
            case 'denied': return '#e74c3c';
            default: return '#95a5a6';
        }
    };

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading && requests.length === 0) {
        return (
            <div className="point-request-review">
                <div className="loading-message">Loading point requests...</div>
            </div>
        );
    }

    return (
        <div className="point-request-review">
            <h2>Point Request Review</h2>

            <div className="member-filter-section">
                <label>Filter by member:</label>
                {pickedMember ? (
                    <div className="member-filter-section__picked">
                        <span><strong>{displayName(pickedMember)}</strong> <span className="member-search__muted">{pickedMember.email}</span></span>
                        <button type="button" className="member-filter-section__clear" onClick={() => setMemberFilter(null)}>
                            Show everyone
                        </button>
                    </div>
                ) : (
                    <MemberSearch
                        members={members}
                        onPick={(member) => setMemberFilter(member.email)}
                        detail={(member) => {
                            const count = requests.filter(r => String(r.userEmail).toLowerCase() === member.email).length;
                            return `${count} request${count === 1 ? '' : 's'}`;
                        }}
                    />
                )}
                {membersError && <p className="review-error" role="alert">{membersError}</p>}
            </div>

            <div className="filter-section">
                <label>Filter by status:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="pending">Pending ({memberRequests.filter(r => r.status === 'pending').length})</option>
                    <option value="approved">Approved ({memberRequests.filter(r => r.status === 'approved').length})</option>
                    <option value="denied">Denied ({memberRequests.filter(r => r.status === 'denied').length})</option>
                    <option value="all">All ({memberRequests.length})</option>
                </select>
                <button onClick={fetchRequests} className="refresh-button">
                    Refresh
                </button>
            </div>

            {notice && <p className="review-notice" role="status">{notice}</p>}
            {linkedId && !loading && !requests.some((request) => request.id === linkedId) && (
                <p className="review-notice" role="status">That Point Request no longer exists.</p>
            )}

            {filteredRequests.length === 0 ? (
                <div className="no-requests">
                    No {filter === 'all' ? '' : filter} requests found.
                </div>
            ) : (
                <div className="requests-grid">
                    {filteredRequests.map(request => (
                        <div key={request.id} ref={request.id === linkedId ? linkedCard : undefined}
                            className={`request-card${request.id === linkedId ? ' is-linked' : ''}`}>
                            <div className="request-header">
                                <div className="user-info">
                                    <h3>{request.userName}</h3>
                                    <p className="email">{request.userEmail}</p>
                                </div>
                                <div
                                    className="status-badge"
                                    style={{ backgroundColor: getStatusColor(request.status) }}
                                >
                                    {request.revoked ? 'REVOKED' : request.status.toUpperCase()}
                                </div>
                            </div>

                            <div className="request-details">
                                <div className="detail-row">
                                    <strong>Activity:</strong> {request.activityName}
                                </div>
                                <div className="detail-row">
                                    <strong>Date:</strong> {request.date}
                                </div>
                                <div className="detail-row">
                                    <strong>Event Type:</strong> {memberPick(request)}
                                </div>
                                {request.codeId && (
                                    <div className="detail-row">
                                        <strong>Code:</strong> {request.codeId}
                                    </div>
                                )}
                                {request.hours > 0 && (
                                    <div className="detail-row">
                                        <strong>Hours:</strong> {request.hours}
                                    </div>
                                )}
                                {request.status !== 'pending' && (
                                    <div className="detail-row">
                                        <strong>Points:</strong> {request.revoked ? `0 (had earned ${request.revoked.points})` : request.pointsRequested}
                                    </div>
                                )}
                                <div className="detail-row">
                                    <strong>Submitted:</strong> {formatDate(request.submittedAt)}
                                </div>
                                {request.description && (
                                    <div className="description">
                                        <strong>Description:</strong>
                                        <p>{request.description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="request-image">
                                {getImageSource(request) ? (
                                    <button
                                        type="button"
                                        onClick={() => openImageModal(request)}
                                        className="view-image-button"
                                    >
                                        📷 View Photo Evidence
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled
                                        className="view-image-button"
                                        style={{
                                            backgroundColor: '#e2e8f0',
                                            color: '#64748b',
                                            border: '1.5px solid #cbd5e1',
                                            cursor: 'not-allowed'
                                        }}
                                    >
                                        🚫 No Photo Attached
                                    </button>
                                )}
                            </div>

                            {request.status === 'pending' && (reviewing === request.id ? (
                                <ReviewPanel request={request} codes={codes} onReviewed={handleReviewed} />
                            ) : (
                                <div className="request-actions">
                                    <button type="button" className="refresh-button review-open-button"
                                        onClick={() => { setReviewing(request.id); setNotice(''); }}>
                                        Review
                                    </button>
                                </div>
                            ))}

                            {request.status !== 'pending' && (
                                <div className="review-info">
                                    <div className="detail-row">
                                        <strong>Reviewed:</strong> {request.reviewedAt ? formatDate(request.reviewedAt.toDate()) : 'N/A'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Reviewed by:</strong> {request.reviewedBy || 'N/A'}
                                    </div>
                                    {request.adjustment && (
                                        <div className="detail-row">
                                            <strong>Adjustment:</strong> {request.adjustment.points} points
                                        </div>
                                    )}
                                    {request.revoked && (
                                        <div className="detail-row">
                                            <strong>Approved by:</strong> {request.revoked.approvedBy || 'N/A'}, then revoked
                                        </div>
                                    )}
                                    {request.reviewNotes && (
                                        <div className="detail-row">
                                            <strong>Notes:</strong> {request.reviewNotes}
                                        </div>
                                    )}
                                    {canRevoke(request) && (
                                        <RevokeForm requestId={request.id} points={request.pointsRequested} onRevoked={handleReviewed} />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div className="image-modal" onClick={closeImageModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeImageModal}>✕</button>
                        <img src={selectedImage} alt="Request evidence" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default PointRequestReview;
