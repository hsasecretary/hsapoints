import './Dashboard.css';
// import { db, auth } from './firebase';
// import { setDoc, doc } from "firebase/firestore";
// import { useNavigate } from 'react-router-dom';
function Points() {
	
	return (
		<div id="pointsForm">
			<div className="subForm" >
				<h2>Fall Points</h2>
				<h3>3</h3>
			</div>
			<div className="subForm" >
				<h2>Spring Points</h2>
				<h3>0</h3>
			</div>
			<div className="subForm" >
				<h2>Total Points</h2>
				<h3>3</h3>
			</div>
		</div>
	);
}

export default Points;