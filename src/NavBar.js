
import './NavBar.css';

function Attendance() {
    return (
        <div className="attendanceForm">
            <h2>Attendance</h2>
            <form> <li><a href="https://ufhsa.com">UF HSA</a></li>
					<li><a href="https://calendar.google.com/calendar/embed?src=your_calendar_id&ctz=America/New_York" target="_blank" rel="noopener noreferrer">Calendar</a></li>
                <div className="center">
                    <input type="text" placeholder="Enter your name" required />
                    <input type="submit" value="Submit" />
                </div>
            </form>
        </div>
    );
}


function NavBar() {
	return (
		<div className="header">
			<nav className="nav-bar">
				<ul>
					<li><a href="https://ufhsa.com">UF HSA</a></li>
					<li><a href="#attendance">Attendance</a></li>
					<li><a href="https://calendar.google.com/calendar/embed?src=your_calendar_id&ctz=America/New_York" target="_blank" rel="noopener noreferrer">Calendar</a></li>
				</ul>
			</nav>
		</div>
	);
}
export default NavBar;



