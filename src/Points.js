import './Dashboard.css';
import './Points.css';
import React, { useEffect, useState } from "react";
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Points() {
	const [fallPoints, setFallPoints] = useState(null);
	const [springPoints, setSpringPoints] = useState(null);
	const [totalPoints, setTotalPoints] = useState(null);
	const [voterEligible, setVoterEligible] = useState(0);
	const [isEligible, setIsEligible] = useState(null);

	const navigate = useNavigate();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				try {
					const email = user.email;
					const userDocRef = doc(db, "users", email);
					const userDocSnap = await getDoc(userDocRef);
					
					// Fetch event code data
					const codesCollectionRef = collection(db, "codes");
					const codesDocSnap = await getDocs(codesCollectionRef);
					
					if (userDocSnap.exists()) {
						const data = userDocSnap.data();
						const attended = data.eventCodes || [];
						const isCabinetMember = data.isCabinetMember || false;
						let totalPointsCalc = 0;

						for (const docSnap of codesDocSnap.docs) {
							const docData = docSnap.data();
							if (docData.voterEligible && attended.includes(docSnap.id)) {
								switch (docData.category) {
									case "GBM":
										// Cabinet members get 1 point, regular members get 2 points
										totalPointsCalc += isCabinetMember ? 1 : 2;
										break;
									case "Programming":
									case "OPA":
									case "MLP Fall":
									case "MLP Spring":
									case "Tabling":
									case "Affiliate Org GBM":
									case "Affiliate Org Event":
										totalPointsCalc += 1;
										break;
									default:
										break;
								}
							}
						}

						setVoterEligible(totalPointsCalc);
						setIsEligible(totalPointsCalc >= 15);
						setFallPoints(data.fallPoints || 0);
						setSpringPoints(data.springPoints || 0);
						setTotalPoints((data.fallPoints || 0) + (data.springPoints || 0));
					}
				} catch (error) {
					console.error("Error fetching user data:", error);
				}
			} else {
				await signOut(auth);
				console.log("Dashboard: no one home");
				navigate("/login");
			}
		});

		// Return the unsubscribe function to clean up the listener
		return unsubscribe;
	}, [navigate]);

	return (
		<div id="pointsForm">
			<div className="pointsSubForm">
				<h2>Fall Points</h2>
				<h3 id="fallPoints">{fallPoints}</h3>
			</div>
			<div className="pointsSubForm">
				<h2>Spring Points</h2>
				<h3 id="springPoints">{springPoints}</h3>
			</div>
			<div className="pointsSubForm">
				<h2>Total Points</h2>
				<h3 id="totalSemesterPoints">{totalPoints}</h3>
			</div>
			<br />
			<div className="pointsSubForm">
				<h2>Voter Eligible Points</h2>
				<p style={{ textAlign: "center" }}>
					As we approach the election date for the next executive board (March 27th, 2025),
					this feature helps you track your voter eligibility status.
				</p>
				
				{isEligible && (
					<p id="eligibleText" style={{ textAlign: "center", color: "green" }}>
						Congratulations! You have {voterEligible} points, making you voter eligible.
						This means you are able to vote and run in the upcoming Executive Board elections!
					</p>
				)}

				<h3 id="voterEligible">{voterEligible}</h3>
				
				{isEligible === false && (
					<div id="ineligibleText">
						<p style={{ textAlign: "center", color: "red" }}>
							Unfortunately, you are NOT voter eligible. You need {15 - voterEligible} more points 
							to vote or run in the upcoming Executive Board elections.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}