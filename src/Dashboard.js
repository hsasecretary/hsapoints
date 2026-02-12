import './Dashboard.css';
import Points from './Points'
import Attendance from './Attendance';
import PointRequest from './PointRequest';
import Logout from './Logout';
import React, { useState } from 'react';

function Dashboard({cabinet, email}) {
	const [pointsRefreshKey, setPointsRefreshKey] = useState(0);

	// Function to refresh points when attendance is submitted
	const handlePointsUpdate = () => {
		setPointsRefreshKey(prev => prev + 1);
	};

	return (
		<div className="formDash" >
			<Logout/>
			<div id="dash"><h2>Dashboard</h2></div>
			<Points key={pointsRefreshKey} />
			<br/>
			<Attendance onPointsUpdate={handlePointsUpdate} />
			<br/>
			<PointRequest />
			<br/>
		</div>
	);
}

export default Dashboard;