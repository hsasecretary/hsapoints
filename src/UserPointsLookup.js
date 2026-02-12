import { useState } from 'react';
import './UserPointsLookup.css';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

function UserPointsLookup() {
    const [searchEmail, setSearchEmail] = useState('');
    const [userPoints, setUserPoints] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [eventBreakdown, setEventBreakdown] = useState([]);

    const handleSearch = async (e) => {
        e.preventDefault();
        
        if (!searchEmail.trim()) {
            setError('Please enter an email address');
            return;
        }

        setLoading(true);
        setError('');
        setUserPoints(null);
        setUserInfo(null);
        setEventBreakdown([]);

        try {
            // Fetch user data
            const userDocRef = doc(db, "users", searchEmail.toLowerCase().trim());
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                setError('User not found');
                setLoading(false);
                return;
            }

            const userData = userDocSnap.data();
            
            // Set user info
            setUserInfo({
                firstName: userData.firstName || 'N/A',
                lastName: userData.lastName || 'N/A',
                email: searchEmail.toLowerCase().trim(),
                cabinet: userData.cabinet || 'none',
                position: userData.position || 'N/A',
                approved: userData.approved || false,
                eboard: userData.eboard || false
            });

            // Calculate points breakdown
            const pointsBreakdown = {
                fallPoints: userData.fallPoints || 0,
                springPoints: userData.springPoints || 0,
                totalPoints: (userData.fallPoints || 0) + (userData.springPoints || 0),
                
                // Category breakdowns
                gbmTotal: (userData.gbmPointsVE || 0) + (userData.gbmPointsNVE || 0),
                gbmVE: userData.gbmPointsVE || 0,
                gbmNVE: userData.gbmPointsNVE || 0,
                
                programmingTotal: (userData.programmingPointsVE || 0) + (userData.programmingPointsNVE || 0),
                programmingVE: userData.programmingPointsVE || 0,
                programmingNVE: userData.programmingPointsNVE || 0,
                
                opaTotal: (userData.opaPointsVE || 0) + (userData.opaPointsNVE || 0),
                opaVE: userData.opaPointsVE || 0,
                opaNVE: userData.opaPointsNVE || 0,
                
                mlpFallTotal: (userData.mlpFallPointsVE || 0) + (userData.mlpFallPointsNVE || 0),
                mlpFallVE: userData.mlpFallPointsVE || 0,
                mlpFallNVE: userData.mlpFallPointsNVE || 0,
                
                mlpSpringTotal: (userData.mlpSpringPointsVE || 0) + (userData.mlpSpringPointsNVE || 0),
                mlpSpringVE: userData.mlpSpringPointsVE || 0,
                mlpSpringNVE: userData.mlpSpringPointsNVE || 0,
                
                cabinetPoints: userData.cabinetPoints || 0,
                otherPoints: userData.otherPoints || 0,
                
                // Voter eligibility calculation
                voterEligiblePoints: 0
            };

            // Calculate voter eligible points
            const eventCodes = userData.eventCodes || [];
            const codesCollection = collection(db, "codes");
            const codesSnapshot = await getDocs(codesCollection);
            
            let voterEligibleTotal = 0;
            const eventDetails = [];

            for (const docSnap of codesSnapshot.docs) {
                const docData = docSnap.data();
                if (eventCodes.includes(docSnap.id)) {
                    eventDetails.push({
                        code: docSnap.id.toUpperCase(),
                        event: docData.event,
                        category: docData.category,
                        points: docData.points,
                        semester: docData.semester,
                        eventDate: docData.eventDate,
                        voterEligible: docData.voterEligible,
                        attended: true
                    });

                    if (docData.voterEligible) {
                        switch (docData.category) {
                            case "GBM":
                                voterEligibleTotal += userData.isCabinetMember ? 1 : 2;
                                break;
                            case "Programming":
                            case "OPA":
                            case "MLP Fall":
                            case "MLP Spring":
                            case "Tabling":
                            case "Affiliate Org GBM":
                            case "Affiliate Org Event":
                                voterEligibleTotal += 1;
                                break;
                            default:
                                break;
                        }
                    }
                }
            }

            pointsBreakdown.voterEligiblePoints = voterEligibleTotal;
            pointsBreakdown.isVoterEligible = voterEligibleTotal >= 15;

            setUserPoints(pointsBreakdown);
            setEventBreakdown(eventDetails.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate)));

        } catch (err) {
            console.error('Error fetching user data:', err);
            setError('Error fetching user data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchEmail('');
        setUserPoints(null);
        setUserInfo(null);
        setError('');
        setEventBreakdown([]);
    };

    return (
        <div className="user-points-lookup">
            <h2>User Points Lookup</h2>
            <p style={{textAlign: 'center', color: '#666', marginBottom: '20px'}}>
                Enter a user's email to view their detailed points breakdown
            </p>

            <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-group">
                    <input
                        type="email"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        placeholder="Enter UFL/SF email (e.g., user@ufl.edu)"
                        className="search-input"
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading} className="search-button">
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                    {(userPoints || error) && (
                        <button type="button" onClick={clearSearch} className="clear-button">
                            Clear
                        </button>
                    )}
                </div>
                {error && <p className="error-message">{error}</p>}
            </form>

            {userInfo && userPoints && (
                <div className="user-results">
                    <div className="user-info-card">
                        <h3>User Information</h3>
                        <div className="user-info-grid">
                            <div><strong>Name:</strong> {userInfo.firstName} {userInfo.lastName}</div>
                            <div><strong>Email:</strong> {userInfo.email}</div>
                            <div><strong>Cabinet:</strong> {userInfo.cabinet}</div>
                            <div><strong>Position:</strong> {userInfo.position}</div>
                            <div><strong>Approved:</strong> {userInfo.approved ? 'Yes' : 'No'}</div>
                            <div><strong>E-Board:</strong> {userInfo.eboard ? 'Yes' : 'No'}</div>
                        </div>
                    </div>

                    <div className="points-summary">
                        <h3>Points Summary</h3>
                        <div className="points-grid">
                            <div className="points-card total">
                                <h4>Total Points</h4>
                                <div className="points-value">{userPoints.totalPoints}</div>
                            </div>
                            <div className="points-card">
                                <h4>Fall Points</h4>
                                <div className="points-value">{userPoints.fallPoints}</div>
                            </div>
                            <div className="points-card">
                                <h4>Spring Points</h4>
                                <div className="points-value">{userPoints.springPoints}</div>
                            </div>
                            <div className={`points-card ${userPoints.isVoterEligible ? 'eligible' : 'not-eligible'}`}>
                                <h4>Voter Eligible Points</h4>
                                <div className="points-value">{userPoints.voterEligiblePoints}</div>
                                <div className="eligibility-status">
                                    {userPoints.isVoterEligible ? '✓ Eligible to Vote' : '✗ Not Eligible'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="category-breakdown">
                        <h3>Points by Category</h3>
                        <table className="category-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Total Points</th>
                                    <th>Voter Eligible</th>
                                    <th>Non-Voter Eligible</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>GBM</td>
                                    <td>{userPoints.gbmTotal}</td>
                                    <td>{userPoints.gbmVE}</td>
                                    <td>{userPoints.gbmNVE}</td>
                                </tr>
                                <tr>
                                    <td>Programming</td>
                                    <td>{userPoints.programmingTotal}</td>
                                    <td>{userPoints.programmingVE}</td>
                                    <td>{userPoints.programmingNVE}</td>
                                </tr>
                                <tr>
                                    <td>OPA</td>
                                    <td>{userPoints.opaTotal}</td>
                                    <td>{userPoints.opaVE}</td>
                                    <td>{userPoints.opaNVE}</td>
                                </tr>
                                <tr>
                                    <td>MLP Fall</td>
                                    <td>{userPoints.mlpFallTotal}</td>
                                    <td>{userPoints.mlpFallVE}</td>
                                    <td>{userPoints.mlpFallNVE}</td>
                                </tr>
                                <tr>
                                    <td>MLP Spring</td>
                                    <td>{userPoints.mlpSpringTotal}</td>
                                    <td>{userPoints.mlpSpringVE}</td>
                                    <td>{userPoints.mlpSpringNVE}</td>
                                </tr>
                                <tr>
                                    <td>Cabinet</td>
                                    <td>{userPoints.cabinetPoints}</td>
                                    <td>N/A</td>
                                    <td>N/A</td>
                                </tr>
                                <tr>
                                    <td>Other</td>
                                    <td>{userPoints.otherPoints}</td>
                                    <td>N/A</td>
                                    <td>N/A</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="event-breakdown">
                        <h3>Events Attended ({eventBreakdown.length})</h3>
                        {eventBreakdown.length > 0 ? (
                            <table className="events-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Event</th>
                                        <th>Category</th>
                                        <th>Date</th>
                                        <th>Points</th>
                                        <th>Semester</th>
                                        <th>Voter Eligible</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventBreakdown.map((event, index) => (
                                        <tr key={index}>
                                            <td>{event.code}</td>
                                            <td>{event.event}</td>
                                            <td>{event.category}</td>
                                            <td>{event.eventDate}</td>
                                            <td>{event.points}</td>
                                            <td>{event.semester === 'fallPoints' ? 'Fall' : 'Spring'}</td>
                                            <td>
                                                <span className={event.voterEligible ? 'badge-yes' : 'badge-no'}>
                                                    {event.voterEligible ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{textAlign: 'center', color: '#666'}}>No events attended</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserPointsLookup;