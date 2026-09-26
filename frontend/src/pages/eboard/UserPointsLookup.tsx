import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { fetchAttendedEvents, sumVoterEligiblePoints } from '../../lib/attendedEvents';
import { db } from '../../lib/firebase';
import { isGeneralMember } from '../../lib/members';
import EventsAttendedList from '../../components/members/EventsAttendedList';
import EmailLookup from './EmailLookup';

function UserPointsLookup() {
    const [userPoints, setUserPoints] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [eventBreakdown, setEventBreakdown] = useState([]);

    // Runs for the member picked in the name search.
    const lookUp = async (searchEmail) => {
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
                approved: userData.approved || false,
                eboard: userData.eboard || false,
                generalMember: isGeneralMember(userData)
            });

            // Calculate points breakdown
            const pointsBreakdown: Record<string, any> = {
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
            const eventDetails = await fetchAttendedEvents(userData.eventCodes);
            const voterEligibleTotal = sumVoterEligiblePoints(eventDetails, userData.otherPoints);

            pointsBreakdown.voterEligiblePoints = voterEligibleTotal;
            pointsBreakdown.isVoterEligible = voterEligibleTotal >= 15;

            setUserPoints(pointsBreakdown);
            setEventBreakdown(eventDetails);

        } catch (err) {
            console.error('Error fetching user data:', err);
            setError('Error fetching user data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Cabinet-category events get their own section (like the Dashboard)
    const cabinetEvents = eventBreakdown.filter((event) => event.category === 'Cabinet');
    const generalEvents = eventBreakdown.filter((event) => event.category !== 'Cabinet');
    const isCabinetMember = !!userInfo && userInfo.cabinet && userInfo.cabinet !== 'none';

    return (
        <div className="user-points-lookup">
            <EmailLookup onSelect={lookUp} />
            {loading && <p className="lookup-cabinet-points">Loading points…</p>}
            {error && <p className="error-message">{error}</p>}

            {userInfo && userPoints && (
                <div className="user-results">
                    <div className="user-info-card">
                        <h3>User Information</h3>
                        <div className="user-info-grid">
                            <div><strong>Name:</strong> {userInfo.firstName} {userInfo.lastName}</div>
                            <div><strong>Email:</strong> {userInfo.email}</div>
                            <div><strong>Account Type:</strong> {userInfo.cabinet}</div>
                            <div><strong>Approved:</strong> {userInfo.approved ? 'Yes' : 'No'}</div>
                            {!userInfo.generalMember && <div><strong>E-Board:</strong> {userInfo.eboard ? 'Yes' : 'No'}</div>}
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
                        <h3>Events Attended ({generalEvents.length})</h3>
                        <EventsAttendedList events={generalEvents} />
                    </div>

                    {/* Cabinet events are listed separately, with the member's cabinet points */}
                    {(isCabinetMember || cabinetEvents.length > 0) && (
                        <div className="event-breakdown">
                            <h3>Cabinet Events ({cabinetEvents.length})</h3>
                            <p className="lookup-cabinet-points">
                                Cabinet points: <strong>{userPoints.cabinetPoints}</strong>
                            </p>
                            <EventsAttendedList events={cabinetEvents} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default UserPointsLookup;