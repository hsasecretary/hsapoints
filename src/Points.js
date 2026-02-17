import './Dashboard.css';
import './Points.css';
import React, { useEffect, useState } from "react";
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Points() {
	const [userInfo, setUserInfo] = useState(null);
	const [userPoints, setUserPoints] = useState(null);
	const [eventBreakdown, setEventBreakdown] = useState([]);
	const [loading, setLoading] = useState(true);

	const navigate = useNavigate();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				try {
					setLoading(true);
					const email = user.email;
					const userDocRef = doc(db, "users", email);
					const userDocSnap = await getDoc(userDocRef);
					
					if (userDocSnap.exists()) {
						const userData = userDocSnap.data();
						
						// Set user info
						setUserInfo({
							firstName: userData.firstName || 'N/A',
							lastName: userData.lastName || 'N/A',
							email: email,
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

						// Calculate voter eligible points and get event details
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
											voterEligibleTotal += 2;
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
					}
				} catch (error) {
					console.error("Error fetching user data:", error);
				} finally {
					setLoading(false);
				}
			} else {
				await signOut(auth);
				navigate("/login");
			}
		});

		return unsubscribe;
	}, [navigate]);

	if (loading) {
		return (
			<div className="user-points-lookup">
				<div className="loading-message">Loading your points...</div>
			</div>
		);
	}

	if (!userInfo || !userPoints) {
		return (
			<div className="user-points-lookup">
				<div className="loading-message">Unable to load your points data</div>
			</div>
		);
	}

	return (
		<div className="user-points-lookup">
			<h2>My Points Dashboard</h2>
			
			<div className="user-results">
				<div className="user-info-card">
					<h3>My Information</h3>
					<div className="user-info-grid">
						<div><strong>Name:</strong> {userInfo.firstName} {userInfo.lastName}</div>
						<div><strong>Email:</strong> {userInfo.email}</div>
						<div><strong>Cabinet:</strong> {userInfo.cabinet === 'none' ? 'General Member' : userInfo.cabinet}</div>
						<div><strong>Position:</strong> {userInfo.position}</div>
						<div><strong>Status:</strong> {userInfo.approved ? 'Approved' : 'Pending'}</div>
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
								{userPoints.isVoterEligible ? '✓ Eligible to Vote' : `✗ Need ${15 - userPoints.voterEligiblePoints} more`}
							</div>
						</div>
					</div>
					
					{userPoints.isVoterEligible && (
						<div className="election-info">
							<p style={{textAlign: 'center', color: '#28a745', fontWeight: 'bold', marginTop: '15px'}}>
								🎉 Congratulations! You can vote and run in the upcoming Executive Board elections!
							</p>
						</div>
					)}
					
					{!userPoints.isVoterEligible && (
						<div className="election-info">
							<p style={{textAlign: 'center', color: '#dc3545', fontWeight: 'bold', marginTop: '15px'}}>
								You need {15 - userPoints.voterEligiblePoints} more voter-eligible points to participate in elections.
							</p>
							<p style={{textAlign: 'center', color: '#666', fontSize: '14px'}}>
								Attend GBMs, programming events, and other voter-eligible activities to earn points!
							</p>
						</div>
					)}
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
					<h3>My Events Attended ({eventBreakdown.length})</h3>
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
						<p style={{textAlign: 'center', color: '#666'}}>No events attended yet</p>
					)}
				</div>
			</div>
		</div>
	);
}