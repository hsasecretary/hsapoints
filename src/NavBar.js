
import './NavBar.css';

function NavBar() {
	return (
		<div className="header">
			<nav className="nav-bar">
				<ul>
					<li><a href="https://ufhsa.com">UF HSA</a></li>
					<li><a href="./dashboard">Attendance</a></li>
					<li><a href="https://calendar.google.com/calendar/embed?src=your_calendar_id&ctz=America/New_York" target="_blank" rel="noopener noreferrer">Calendar</a></li>
				</ul>
			</nav>
		</div>
	);
}

export default NavBar;



