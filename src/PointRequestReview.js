import { useState, useEffect } from 'react';
import './PointRequestReview.css';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

function PointRequestReview() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedImage, setSelectedImage] = useState(null);
    const [processingRequest, setProcessingRequest] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const requestsCollection = collection(db, 'pointRequests');
            const requestsSnapshot = await getDocs(requestsCollection);
            
            const requestsData = [];
            for (const docSnap of requestsSnapshot.docs) {
                const data = docSnap.data();
                
                // Get user's name from users collection
                let userName = 'Unknown User';
                try {
                    const userDocRef = doc(db, 'users', data.userEmail);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                    }
                } catch (error) {
                    console.error('Error fetching user data for', data.userEmail, error);
                }

                requestsData.push({
                    id: docSnap.id,
                    ...data,
                    userName,
                    submittedAt: data.submittedAt?.toDate() || new Date()
                });
            }
            
            // Sort by submission date (newest first)
            requestsData.sort((a, b) => b.submittedAt - a.submittedAt);
            
            setRequests(requestsData);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter(request => 
        filter === 'all' || request.status === filter
    );

    const handleApprove = async (requestId) => {
        if (processingRequest) return;
        
        const confirmed = window.confirm('Are you sure you want to approve this request? Points will be awarded to the user.');
        if (!confirmed) return;

        try {
            setProcessingRequest(requestId);
            const request = requests.find(r => r.id === requestId);
            
            // Update the request status
            await updateDoc(doc(db, 'pointRequests', requestId), {
                status: 'approved',
                reviewedAt: serverTimestamp(),
                reviewedBy: 'E-Board',
                reviewNotes: 'Request approved and points awarded'
            });

            // Award points to the user
            const userDocRef = doc(db, 'users', request.userEmail);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const currentPoints = userData.springPoints || 0; // Assuming spring semester
                const newPoints = currentPoints + request.pointsRequested;
                
                await updateDoc(userDocRef, {
                    springPoints: newPoints,
                    // Also update the "other" category
                    otherPoints: (userData.otherPoints || 0) + request.pointsRequested
                });
            }

            // Refresh the requests list
            await fetchRequests();
            
            alert(`Request approved! ${request.pointsRequested} points have been awarded to ${request.userName}.`);
        } catch (error) {
            console.error('Error approving request:', error);
            alert('Error approving request. Please try again.');
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleDeny = async (requestId) => {
        if (processingRequest) return;
        
        const reason = window.prompt('Please provide a reason for denying this request:');
        if (!reason) return;

        try {
            setProcessingRequest(requestId);
            
            await updateDoc(doc(db, 'pointRequests', requestId), {
                status: 'denied',
                reviewedAt: serverTimestamp(),
                reviewedBy: 'E-Board',
                reviewNotes: reason
            });

            await fetchRequests();
            alert('Request has been denied.');
        } catch (error) {
            console.error('Error denying request:', error);
            alert('Error denying request. Please try again.');
        } finally {
            setProcessingRequest(null);
        }
    };

    const openImageModal = (imageData) => {
        setSelectedImage(imageData);
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

    if (loading) {
        return (
            <div className="point-request-review">
                <div className="loading-message">Loading point requests...</div>
            </div>
        );
    }

    return (
        <div className="point-request-review">
            <h2>Point Request Review</h2>
            
            <div className="filter-section">
                <label>Filter by status:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="pending">Pending ({requests.filter(r => r.status === 'pending').length})</option>
                    <option value="approved">Approved ({requests.filter(r => r.status === 'approved').length})</option>
                    <option value="denied">Denied ({requests.filter(r => r.status === 'denied').length})</option>
                    <option value="all">All ({requests.length})</option>
                </select>
                <button onClick={fetchRequests} className="refresh-button">
                    Refresh
                </button>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="no-requests">
                    No {filter === 'all' ? '' : filter} requests found.
                </div>
            ) : (
                <div className="requests-grid">
                    {filteredRequests.map(request => (
                        <div key={request.id} className="request-card">
                            <div className="request-header">
                                <div className="user-info">
                                    <h3>{request.userName}</h3>
                                    <p className="email">{request.userEmail}</p>
                                </div>
                                <div 
                                    className="status-badge"
                                    style={{ backgroundColor: getStatusColor(request.status) }}
                                >
                                    {request.status.toUpperCase()}
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
                                    <strong>Points Requested:</strong> {request.pointsRequested}
                                </div>
                                <div className="detail-row">
                                    <strong>Submitted:</strong> {formatDate(request.submittedAt)}
                                </div>
                                <div className="description">
                                    <strong>Description:</strong>
                                    <p>{request.description}</p>
                                </div>
                            </div>

                            <div className="request-image">
                                <button 
                                    onClick={() => openImageModal(request.imageData)}
                                    className="view-image-button"
                                >
                                    📷 View Photo Evidence
                                </button>
                            </div>

                            {request.status === 'pending' && (
                                <div className="request-actions">
                                    <button
                                        onClick={() => handleApprove(request.id)}
                                        disabled={processingRequest === request.id}
                                        className="approve-button"
                                    >
                                        {processingRequest === request.id ? 'Processing...' : '✓ Approve'}
                                    </button>
                                    <button
                                        onClick={() => handleDeny(request.id)}
                                        disabled={processingRequest === request.id}
                                        className="deny-button"
                                    >
                                        {processingRequest === request.id ? 'Processing...' : '✗ Deny'}
                                    </button>
                                </div>
                            )}

                            {request.status !== 'pending' && (
                                <div className="review-info">
                                    <div className="detail-row">
                                        <strong>Reviewed:</strong> {request.reviewedAt ? formatDate(request.reviewedAt.toDate()) : 'N/A'}
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