import './Dashboard.css';
import './Points.css';
import React, { useEffect, useState } from "react";
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
				if(userDocSnap.exists())
				{
					const data = userDocSnap.data();
					const fallPoints = data.fallPoints;
					const springPoints = data.springPoints;
					const totalPoints = fallPoints + springPoints;
					var gbm = data.gbmPointsVE/8*100;
					var programming = (data.programmingPointsVE + data.opaPointsVE)/12*100;
					var mlpFall = (data.mlpFallPointsVE)/2*50;
					var mlpSpring = (data.mlpSpringPointsVE)/2*50;
					var total = gbm+programming+mlpFall+mlpSpring;
					total = Math.round(total);
					total = 59;
					if(total < 60)
					{
						document.getElementById("ineligibleText").className = "";
						document.getElementById("ineligibleList").className = "";
						document.getElementById("eligibleText").className = "hide";

					} else {
						document.getElementById("ineligibleText").className = "hide";
						document.getElementById("ineligibleList").className = "hide";
						document.getElementById("eligibleText").className = "";
					}
					setFallPoints(fallPoints);
					setSpringPoints(springPoints);
					setTotalPoints(totalPoints);
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
					<br/>Make sure to attend GBM 2 or GBM 3 to be nominated if interested for running for an Executive Board position.
				</p>
			
				<h3 id="voterEligible">{voterEligible}</h3>
				<div id="ineligibleText"  className = "hide">
				<p style={{ textAlign: "center" }}>Unfortunatly, you are NOT voter eligible.</p>
				<p style={{ textAlign: "center" }}>Here are some events and their point value if you are interested in becoming voter eligible:</p>
				</div>
				
				<ul id="ineligibleList" className = "hide">
					<li>
					25 Points:
						<ul>
							<li>MLP Spring Food and Dance Festival - March 4th </li>
							<li>MLP Spring Meet the Candidates - March 24th</li>
						</ul>
					</li>
					<li>
					12.5 Points:
						<ul>
							<li>GBM #2 - February 13th, 6.30pm, Senate Chambers </li>
							<li>GBM #3 - March 13th, 6.30pm, NPB1001</li>
						</ul>
					</li>
					<li>
					8 Points:
						<ul>
							<li>CRASH Extravaganza - 2/26, 11am, Reitz North Lawn</li>
							<li>Solidarity Session #2 - 2/26, 6.30pm, La Casita</li>
							<li>Solidarity Session #3 - 3/26, 6.30pm, La Casita </li>
							<li>HSA Chalk Social - Date TBD</li>
						</ul>
					</li>
				</ul>
				
			</div>
		</div>
	);
}

export default Points;