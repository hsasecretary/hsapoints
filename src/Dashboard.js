import './Dashboard.css';
import Points from './Points'
import Attendance from './Attendance';
import Logout from './Logout';

function Dashboard({eboard}) {
	
	return (
		
		<div className="formDash" >
			
			<Logout/>
			<div id="dash"><h2>Dashboard</h2></div>
			<Points />
			<br/>
			<Attendance />
			<br/>

		</div>
	);
}

export default Dashboard;