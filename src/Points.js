import './Dashboard.css';
import React, { useEffect, useState } from "react";
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function Points() {
	const [fallPoints, setFallPoints] = useState(null);
	const [springPoints, setSpringPoints] = useState(null);
	const [totalPoints, setTotalPoints] = useState(null);

	useEffect(() => {
		const getPoints =  onAuthStateChanged(auth, async (user) => {
			
				var user = auth.currentUser;
				var email = user.email;
				console.log("Points: " + email);
				var userDocRef = doc(db, "users", email);
				var userDocSnap = await getDoc(userDocRef);
				if(userDocSnap.exists())
				{
					const data = userDocSnap.data();
					const fallPoints = data.fallPoints;
					const springPoints = data.springPoints;
					const totalPoints = fallPoints + springPoints;

					setFallPoints(fallPoints);
					setSpringPoints(springPoints);
					setTotalPoints(totalPoints);
				}
			
		}) 
		return () => {
            getPoints();
        }
	}, []);
	return (
		<div id="pointsForm">
			<div className="subForm" >
				<h2>Fall Points</h2>
				<h3 id="fallPoints"> {fallPoints}</h3>
			</div>
			<div className="subForm" >
				<h2>Spring Points</h2>
				<h3 id="springPoints">{springPoints}</h3>
			</div>
			<div className="subForm" >
				<h2>Total Points</h2>
				<h3 id="totalSemesterPoints">{totalPoints}</h3>
			</div>
		</div>
	);
}

export default Points;