import './Dashboard.css';
import Points from './Points'
import Attendance from './Attendance';
import Logout from './Logout';
import CabinetPoints from './CabinetPoints';

function Dashboard({eboard}) {
	
	return (
		
		<div className="formDash" >
			
			<Logout/>
			<div id="dash"><h2>Dashboard</h2></div>
			<Points />
			<br/>
			<Attendance />
			<br/>
			<CabinetPoints/>
			<br/>

		</div>
	);
}

export default Dashboard;