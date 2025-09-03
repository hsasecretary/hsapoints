import './Dashboard.css';
import Points from './Points'
import Attendance from './Attendance';
import Logout from './Logout';
import EventsAttended from './EventsAttended';

function Dashboard({cabinet, email}) {
	
	return (
		
		<div className="formDash" >
			
			<Logout/>
			<div id="dash"><h2>Dashboard</h2></div>
			<Points />
			<br/>
			<Attendance />
			<br/>
			<EventsAttended cabinet = {cabinet} email= {email}/>
			<br/>
		</div>
	);
}

export default Dashboard;