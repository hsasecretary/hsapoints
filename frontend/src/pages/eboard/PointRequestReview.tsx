import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import {
    collection, getDocs, doc, getDoc,
    type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import MemberSearch from '../../components/members/MemberSearch';
import type { Code } from '../../lib/computeStanding';
import { canRevoke } from '../../lib/memberLookup';
import { displayName, type NamedMember } from '../../lib/nameSearch';
import { NOT_LISTED } from '../../lib/pointRequests';
import type { Revoked } from '../../lib/pointsOverview';
import { hasPhoto, legacyPhoto, loadPhoto } from '../../lib/requestEvidence';
import type { ReviewRequest } from '../../lib/requestReview';
import {
    countRequests, requestsPage, PAGE_SIZE, STATUS_FILTERS, type StatusFilter,
} from '../../lib/requestQueue';
import { eventType } from '../../lib/rubric';
import ReviewPanel from './pointRequests/ReviewPanel';
import RevokeForm from './pointRequests/RevokeForm';

type StoredRequest = ReviewRequest & {
    activityName?: string;
    description?: string;
    pointsRequested?: number;
    status: 'pending' | 'approved' | 'denied';
    /** Photo evidence was attached; the photo itself is read on demand. */
    hasPhoto?: boolean;
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

/** One status tab's loaded page, and where the next one starts. */
type Tab = {
    rows: StoredRequest[];
    last?: QueryDocumentSnapshot<DocumentData>;
    hasMore: boolean;
};

const STATUS_LABEL: Record<StatusFilter, string> = {
    pending: 'Pending', approved: 'Approved', denied: 'Denied', all: 'All',
};

function toRequest(snap: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): StoredRequest {
    const data = snap.data();
    return {
        id: snap.id,
        ...data,
        submittedAt: data?.submittedAt?.toDate() || new Date(),
    } as StoredRequest;
}

// What the Member picked, in words: an Event Type, a group such as OPA
// (E-Board confirms which), or "Not listed".
function memberPick(request: StoredRequest): string {
    if (request.eventTypeId) return eventType(request.eventTypeId)?.label ?? request.eventTypeId;
    if (request.typeChoiceId === NOT_LISTED) return 'Not listed (you pick)';
    if (request.typeChoiceId === 'opa') return 'OPA (you pick which)';
    return 'None (sent before Event Types)';
}

function PointRequestReview() {
    // One entry per status tab, filled the first time that tab is opened: the
    // collection is too big to read whole (see lib/requestQueue).
    const [tabs, setTabs] = useState<Record<string, Tab>>({});
    const [counts, setCounts] = useState<Partial<Record<StatusFilter, number>>>({});
    const [refreshKey, setRefreshKey] = useState(0);
    // Only the review panel needs the codes, so they wait for the first Review.
    const [codes, setCodes] = useState<Code[] | null>(null);
    const [members, setMembers] = useState<NamedMember[]>([]);
    const [membersError, setMembersError] = useState('');
    const [requestsError, setRequestsError] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filter, setFilter] = useState<StatusFilter>('pending');
    const [selectedImage, setSelectedImage] = useState(null);
    // The request whose photo is being fetched, and why a fetch came back empty.
    const [photoLoading, setPhotoLoading] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState('');
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
    // The linked request is read on its own: its tab may not be open, and even
    // on the right tab it can sit past the first page.
    const [linked, setLinked] = useState<StoredRequest | null>(null);
    const [linkedMissing, setLinkedMissing] = useState(false);

    useEffect(() => {
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

    // Names come from the users read above, so the page doesn't read a user
    // document per request on top of it.
    const namesByEmail = useMemo(
        () => new Map(members.map((member) => [member.email.toLowerCase(), displayName(member)])),
        [members],
    );
    const nameOf = (request: StoredRequest) =>
        namesByEmail.get(String(request.userEmail).toLowerCase()) ?? String(request.userEmail);

    // A tab is cached per Member and per refresh, so picking a Member or
    // reviewing a request re-reads rather than showing the old page.
    const cacheKey = (status: StatusFilter) => `${refreshKey}|${memberFilter ?? ''}|${status}`;
    const openTab = tabs[cacheKey(filter)];

    useEffect(() => {
        const key = cacheKey(filter);
        // Already read; switching back to a tab shouldn't cost another read.
        if (tabs[key]) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setRequestsError('');
        requestsPage(db, filter, memberFilter)
            .then((snapshot) => {
                if (cancelled) return;
                const hasMore = snapshot.docs.length > PAGE_SIZE;
                const page = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;
                setTabs((current) => ({
                    ...current,
                    [key]: { rows: page.map(toRequest), last: page[page.length - 1], hasMore },
                }));
            })
            .catch((error) => {
                console.error('Error fetching requests:', error);
                if (!cancelled) setRequestsError('Could not load point requests. Refresh to try again.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [filter, memberFilter, refreshKey, tabs]);

    useEffect(() => {
        let cancelled = false;
        Promise.all(STATUS_FILTERS.map(async (status) =>
            [status, await countRequests(db, status, memberFilter)] as const))
            .then((entries) => { if (!cancelled) setCounts(Object.fromEntries(entries)); })
            .catch((error) => console.error('Error counting requests:', error));
        return () => { cancelled = true; };
    }, [memberFilter, refreshKey]);

    useEffect(() => {
        if (!linkedId || linkedShown) return;
        let cancelled = false;
        getDoc(doc(db, 'pointRequests', linkedId))
            .then((snapshot) => {
                if (cancelled) return;
                setLinkedShown(true);
                if (!snapshot.exists()) {
                    setLinkedMissing(true);
                    return;
                }
                const request = toRequest(snapshot);
                setLinked(request);
                setFilter(request.status);
                if (request.status === 'pending') openReview(request.id);
                // A stale ?member= for someone else would hide the request this link named.
                if (memberFilter && String(request.userEmail).toLowerCase() !== memberFilter) {
                    const next = new URLSearchParams(params);
                    next.delete('member');
                    setParams(next);
                }
            })
            .catch((error) => {
                console.error('Error loading linked request:', error);
                if (!cancelled) setLinkedShown(true);
            });
        return () => { cancelled = true; };
    }, [linkedId, linkedShown]);

    useEffect(() => {
        if (linkedShown) linkedCard.current?.scrollIntoView({ block: 'start' });
    }, [linkedShown, linked]);

    const loadMore = async () => {
        const key = cacheKey(filter);
        const tab = tabs[key];
        if (!tab?.hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const snapshot = await requestsPage(db, filter, memberFilter, tab.last);
            const hasMore = snapshot.docs.length > PAGE_SIZE;
            const page = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;
            setTabs((current) => ({
                ...current,
                [key]: {
                    rows: [...(current[key]?.rows ?? []), ...page.map(toRequest)],
                    last: page[page.length - 1] ?? current[key]?.last,
                    hasMore,
                },
            }));
        } catch (error) {
            console.error('Error loading more requests:', error);
            setRequestsError('Could not load more point requests.');
        } finally {
            setLoadingMore(false);
        }
    };

    const openReview = async (id: string) => {
        setReviewing(id);
        setNotice('');
        if (codes) return;
        try {
            const snapshot = await getDocs(collection(db, 'codes'));
            setCodes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Code));
        } catch (error) {
            console.error('Error loading codes:', error);
            setCodes([]);
            setRequestsError('Could not load event codes. Refresh to try again.');
        }
    };

    const refresh = () => {
        setLinked(null);
        setLinkedMissing(false);
        setTabs({});
        setCounts({});
        setRefreshKey((key) => key + 1);
    };

    // The linked request belongs on this tab but may not be in the loaded page.
    const rows = useMemo(() => {
        const loaded = openTab?.rows ?? [];
        if (!linked) return loaded;
        const belongs = filter === 'all' || linked.status === filter;
        const sameMember = !memberFilter || String(linked.userEmail).toLowerCase() === memberFilter;
        if (!belongs || !sameMember || loaded.some((row) => row.id === linked.id)) return loaded;
        return [linked, ...loaded];
    }, [openTab, filter, linked, memberFilter]);

    const pickedMember = memberFilter ? members.find(m => m.email === memberFilter) ?? null : null;

    const handleReviewed = async (message: string) => {
        setReviewing(null);
        setNotice(message);
        refresh();
    };

    // The photo is not on the request (lib/requestEvidence.ts): it is read
    // here, when E-Board asks for it, so opening a tab transfers none. A
    // request the backfill hasn't touched still carries its own, which costs
    // nothing more to show.
    const openImageModal = async (request: StoredRequest) => {
        setPhotoError('');
        const legacy = legacyPhoto(request);
        if (legacy) {
            setSelectedImage(legacy);
            return;
        }
        setPhotoLoading(request.id);
        try {
            const photo = await loadPhoto(db, request.id);
            if (photo) setSelectedImage(photo);
            else setPhotoError('This request says it has a photo, but none was found.');
        } catch (error) {
            console.error('Error loading photo evidence:', error);
            setPhotoError('Could not load the photo. Try again.');
        } finally {
            setPhotoLoading(null);
        }
    };

    const closeImageModal = () => {
        setSelectedImage(null);
        setPhotoError('');
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

    if (loading && !openTab) {
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
                            members={members}
                            onPick={(member) => setMemberFilter(member.email)}
                        />
                        <p className="member-filter-section__hint">Search by name to see just one member&apos;s requests.</p>
                    </>
                )}
                {membersError && <p className="review-error" role="alert">{membersError}</p>}
            </div>

            <div className="filter-section">
                <label>Filter by status:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)}>
                    {STATUS_FILTERS.map((status) => (
                        <option key={status} value={status}>
                            {STATUS_LABEL[status]}{counts[status] === undefined ? '' : ` (${counts[status]})`}
                        </option>
                    ))}
                </select>
                <button onClick={refresh} className="refresh-button">
                    Refresh
                </button>
            </div>

            {notice && <p className="review-notice" role="status">{notice}</p>}
            {requestsError && <p className="review-error" role="alert">{requestsError}</p>}
            {linkedMissing && (
                <p className="review-notice" role="status">That Point Request no longer exists.</p>
            )}

            {rows.length === 0 ? (
                <div className="no-requests">
                    No {filter === 'all' ? '' : filter} requests found.
                </div>
            ) : (
                <div className="requests-grid">
                    {rows.map(request => (
                        <div key={request.id} ref={request.id === linkedId ? linkedCard : undefined}
                            className={`request-card${request.id === linkedId ? ' is-linked' : ''}`}>
                            <div className="request-header">
                                <div className="user-info">
                                    <h3>{nameOf(request)}</h3>
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
                                {hasPhoto(request) ? (
                                    <button
                                        type="button"
                                        onClick={() => openImageModal(request)}
                                        className="view-image-button"
                                        disabled={photoLoading === request.id}
                                    >
                                        {photoLoading === request.id ? 'Loading photo...' : '📷 View Photo Evidence'}
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
                                codes ? (
                                    <ReviewPanel request={request} codes={codes} onReviewed={handleReviewed} />
                                ) : (
                                    <div className="loading-message">Loading event codes...</div>
                                )
                            ) : (
                                <div className="request-actions">
                                    <button type="button" className="refresh-button review-open-button"
                                        onClick={() => openReview(request.id)}>
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

            {openTab?.hasMore && (
                <div className="requests-more">
                    <button type="button" className="refresh-button" onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? 'Loading...' : `Load ${PAGE_SIZE} more`}
                    </button>
                </div>
            )}

            {/* Image Modal */}
            {(selectedImage || photoError) && (
                <div className="image-modal" onClick={closeImageModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeImageModal}>✕</button>
                        {selectedImage
                            ? <img src={selectedImage} alt="Request evidence" />
                            : <p className="image-modal__error" role="alert">{photoError}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PointRequestReview;
