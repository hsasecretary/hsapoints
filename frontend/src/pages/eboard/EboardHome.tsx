import { Link } from 'react-router-dom';
import { EBOARD_TOOLS } from './eboardTools';

// /eboard: the E-Board tools as a list. The phone tab bar's E-Board tab opens
// it, since a tab bar can't hold the desktop dropdown.
function EboardHome() {
    return (
        <div className="eboard-home">
            <h1 className="eboard-home__title">E-Board tools</h1>
            <ul className="eboard-home__list">
                {EBOARD_TOOLS.map((tool) => (
                    <li key={tool.path}>
                        <Link to={tool.path} className="eboard-home__link">
                            {tool.label}
                            <span aria-hidden="true">›</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default EboardHome;
