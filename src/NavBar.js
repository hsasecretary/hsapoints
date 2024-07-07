
import './NavBar.css';

function NavBar({eboard}) {

	return (
		<div className="header">
			<nav className="nav-bar">
				<ul>
					<li><a href="https://ufhsa.com">UF HSA</a></li>
					<li><a href="./dashboard">Attendance</a></li>
					<li><a href="https://calendar.google.com/calendar/u/0/embed?src=35d16e33191e0ceb51859f2be92d07766293164ab7257c6c044c9de96c04f545@group.calendar.google.com&ctz=America/New_York" target="_blank" rel="noopener noreferrer">Calendar</a></li>
					{eboard && (
						<li><a href="./eboard">E-Board</a></li>	
					)}
				</ul>
			</nav>
		</div>
	);
}

export default NavBar;



