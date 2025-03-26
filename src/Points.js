import './Dashboard.css';
import './Points.css';
import React, { useEffect, useState } from "react";
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, collection} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function Points() {
	const [fallPoints, setFallPoints] = useState(null);
	const [springPoints, setSpringPoints] = useState(null);
	const [totalPoints, setTotalPoints] = useState(null);
	const [voterEligible, setVoterEligible] = useState(0);

	const navigate = useNavigate();

	useEffect(() => {
		const getPoints =  onAuthStateChanged(auth, async (user) => {
			if(user)
			{
				user = auth.currentUser;
				var email = user.email;
				var userDocRef = doc(db, "users", email);
				var userDocSnap = await getDoc(userDocRef);
				//Fetch event code data
				const codesCollectionRef = collection(db, "codes");
				const codesDocSnap = await getDocs(codesCollectionRef);
				if(userDocSnap.exists())
				{
					const data = userDocSnap.data();
					var attended = data.eventCodes;
					var gbm = 0;
					var programming = 0;
					var mlpFall = 0;
					var mlpSpring = 0;
					
					codesDocSnap.forEach((doc) => {
						attended.forEach(code => {
							if(doc.data().voterEligible && code === doc.id)
							{
								const docData = doc.data();
								if(docData.category === "GBM")
								{
									gbm++;
								} else if(docData.category === "Programming" || docData.category === "OPA") {
									programming++;
								} else if(docData.category === "MLP Fall") {
									mlpFall++;
								} else if(docData.category === "MLP Spring") {
									mlpSpring++;
								} 
								return;
							}
						})
					})
					gbm = gbm/8*100;
					programming = programming/12*100;
					mlpFall = mlpFall/2*50;
					mlpSpring = mlpSpring/2*50;
					var total = gbm+programming+mlpFall+mlpSpring;
					total = Math.round(total);
					
					if(total < 60)
					{
						document.getElementById("ineligibleText").className = "";
						document.getElementById("eligibleText").className = "hide";

					} else {
						document.getElementById("ineligibleText").className = "hide";
						document.getElementById("eligibleText").className = "";
					}
					setFallPoints(data.fallPoints);
					setSpringPoints(data.springPoints);
					setTotalPoints(data.fallPoints + data.springPoints);
					setVoterEligible(total);
				}
			} else {
				signOut(auth);
                console.log("Dashboad: no one home");
                navigate("/login");
			}
		}) 
		return () => {
            getPoints();
        }
	}, [navigate]);
	return (
		<div id="pointsForm">
			<div className="pointsSubForm" >
				<h2>Fall Points</h2>
				<h3 id="fallPoints"> {fallPoints}</h3>
			</div>
			<div className="pointsSubForm" >
				<h2>Spring Points</h2>
				<h3 id="springPoints">{springPoints}</h3>
			</div>
			<div className="pointsSubForm" >
				<h2>Total Points</h2>
				<h3 id="totalSemesterPoints">{totalPoints}</h3>
			</div>
			<br/>
			<div className="pointsSubForm" >
				<h2>Voter Eligible Points</h2>
				<p style={{ textAlign: "center" }}>As we approach the election date for the next executive board (March 27th, 2025), 
				this feature is help you track your voter eligiblity status.</p>
				<p id="eligibleText" style={{ textAlign: "center" }} className = "hide">Congratulations! You have amassed over 60 points, making you voter eligible.
				This means you are able to vote and run in the upcoming Executive Board elections! 
				</p>
			
				<h3 id="voterEligible">{voterEligible}</h3>
				<div id="ineligibleText"  className = "hide">
				<p style={{ textAlign: "center" }}>Unfortunately, you are NOT voter eligible. You currently cannot vote or run in the upcoming Executive Board elections.</p>
				</div>
				
				
				
			</div>
		</div>
	);
}

export default Points;