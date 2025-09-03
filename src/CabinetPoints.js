import './CabinetPoints.css';
import React, { useEffect, useState } from "react";
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function CabinetPoints() {
	const [programmingPoints, setProgrammingPoints] = useState(null);
	const [gbmPoints, setGBMPoints] = useState(null);
	const [mlpFallPoints, setMlpFallPoints] = useState(null);
	const [mlpSpringPoints, setMlpSpringPoints] = useState(null);
    const [opaPoints, setOpaPoints] = useState(null);
	const [cabinetPoints, setCabinetPoints] = useState(null);
	const [otherPoints, setOtherPoints] = useState(null);

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
					const programmingPoints = data.programmingPointsNVE + data.programmingPointsVE;
					const gbmPoints = data.gbmPointsNVE + data.gbmPointsVE;
                    const mlpFallPoints = data.mlpFallPointsNVE + data.mlpFallPointsVE;                    ;
                    const mlpSpringPoints = data.mlpSpringPointsNVE + data.mlpSpringPointsVE;
                    const opaPoints = data.opaPointsNVE + data.opaPointsVE;
                    const cabinetPoints = data.cabinetPoints;
                    const otherPoints = data.otherPoints;

					setProgrammingPoints(programmingPoints);
                    setGBMPoints(gbmPoints);
                    setMlpFallPoints(mlpFallPoints);
                    setMlpSpringPoints(mlpSpringPoints);
                    setOpaPoints(opaPoints);
                    setCabinetPoints(cabinetPoints);
                    setOtherPoints(otherPoints);
				}
			} else {
				signOut(auth);
                navigate("/login");
			}
		}) 
		return () => {
            getPoints();
        }
	}, [navigate]);
	return (
        <div id="cabinetPointsBreakdown">
            <h2>Point Breakdown</h2>
            <p id="cabinetPointsDescription">Below is a breakdown by category of your total points. </p>
            <div id="pointsForm">
                
                <div className="pointsSubForm">
                    <h3>Programming</h3>
                    <h4 id="programmingPoints"> {programmingPoints}</h4>
                </div>
                <div className="pointsSubForm" >
                    <h3>GBM</h3>
                    <h4 id="gbmPoints">{gbmPoints}</h4>
                </div>
                <div className="pointsSubForm" >
                    <h3>OPA</h3>
                    <h4 id="opaPoints">{opaPoints}</h4>
                </div>
                <div className="pointsSubForm" >
                    <h3>MLP Fall</h3>
                    <h4 id="mlpFallPoints"> {mlpFallPoints}</h4>
                </div>
                <div className="pointsSubForm" >
                    <h3>MLP Spring</h3>
                    <h4 id="mlpSpringPoints">{mlpSpringPoints}</h4>
                </div>
                <div className="pointsSubForm" >
                    <h3>Other</h3>
                    <h4 id="other">{otherPoints}</h4>
                </div>
                <div className="pointsSubForm" >
                    <h3>Cabinet</h3>
                    <p className='center'>Please Note: Cabinet points do NOT count towards overal semester or total points in order keep fairness with non-cabinet members in competitions</p>
                    <h4 id="cabinet">{cabinetPoints}</h4>
                </div>
            </div>
        </div>
	);
}

export default CabinetPoints;