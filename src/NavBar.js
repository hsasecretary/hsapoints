
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
					<li><a href="https://calendar.google.com/calendar/embed?src=ae59c0f6702553b609b32a2d3590df6a527b45a92069bbf28f9983f89aaab437%40group.calendar.google.com&ctz=America%2FNew_York">Calendar</a></li>
					{eboard && (
						<li><a href="./eboard">E-Board</a></li>	
					)}
				</ul>
			</nav>
		</div>
	);
}

export default NavBar;



