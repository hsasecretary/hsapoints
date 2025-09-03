
import './NavBar.css';

function NavBar({eboard, cabinet}) {

	return (
		<div className="header">
			<nav className="nav-bar">
				<ul>
					<li><a href="https://ufhsa.com">UF HSA</a></li>
					<li><a href="./dashboard">Attendance</a></li>
					{cabinet && (
						<li><a href="./Cabinet">Cabinet</a></li>
					)}
					<li><a href="https://calendar.google.com/calendar/embed?src=ae505ce1dedb0a52bddc341d9e8d65e996a61aac295d00d89af40640bdb51762%40group.calendar.google.com&ctz=America%2FNew_York">Calendar</a></li>
					{eboard && (
						<li><a href="./eboard">E-Board</a></li>	
					)}
				</ul>
			</nav>
		</div>
	);
}

export default NavBar;



