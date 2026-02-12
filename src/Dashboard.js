import './Dashboard.css';
import Points from './Points'
import Attendance from './Attendance';
import PointRequest from './PointRequest';
import Logout from './Logout';

function Dashboard({cabinet, email}) {
	
	return (
		
		<div className="formDash" >
			
			<Logout/>
			<div id="dash"><h2>Dashboard</h2></div>
			<Points />
			<br/>
			<Attendance />
			<br/>
			<PointRequest />
			<br/>
		</div>
	);
}

export default Dashboard;