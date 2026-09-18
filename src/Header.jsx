import './Master.css';
import { Link } from 'react-router-dom';

function Header() {
    return (
        <header className="header">
            <h1>Hispanic-Latine Student Association</h1>
            <nav className="nav-links">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/">Attendance</Link>
            </nav>
        </header>
    );
}

export default Header;