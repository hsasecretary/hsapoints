import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

// White HSA logo, currently served from ufhsa.com (Wix).
const HSA_LOGO_URL =
    'https://static.wixstatic.com/media/fd581a_b315c49361854ea9a0f0407243bfb8f0~mv2.png/v1/crop/x_7,y_4,w_516,h_424/fill/w_150,h_124,al_c,q_85,enc_auto/newhsalogo_white_7079520717135231.png';
const UFHSA_URL = 'https://www.ufhsa.com';
const CALENDAR_URL =
    'https://calendar.google.com/calendar/embed?src=ae59c0f6702553b609b32a2d3590df6a527b45a92069bbf28f9983f89aaab437%40group.calendar.google.com&ctz=America%2FNew_York';

type NavItem = { label: string; to?: string; href?: string };

type SiteHeaderProps = {
    signedIn: boolean;
    eboard: boolean;
};

// Top bar on every page: logo + title (links to /dashboard), the nav links
// and Logout. Below 900px the links and Logout collapse into a menu button.
function SiteHeader({ signedIn, eboard }: SiteHeaderProps) {
    const [open, setOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Close the mobile menu when the page changes or on a click outside it.
    useEffect(() => setOpen(false), [location.pathname]);
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const nav: NavItem[] = [
        { label: 'UF HSA', href: UFHSA_URL },
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Calendar', href: CALENDAR_URL },
        ...(eboard ? [{ label: 'E-Board', to: '/eboard' }] : []),
    ];

    const logout = async () => {
        setOpen(false);
        await signOut(auth);
        navigate('/login');
    };

    const renderLink = (item: NavItem, className: string) =>
        item.to ? (
            <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `${className}${isActive ? ' is-active' : ''}`}
            >
                {item.label}
            </NavLink>
        ) : (
            <a key={item.label} href={item.href} className={className} target="_blank" rel="noreferrer noopener">
                {item.label}
            </a>
        );

    return (
        <header ref={headerRef} className="site-header">
            <div className="site-header__bar">
                <Link to="/dashboard" className="site-header__brand" aria-label="Hispanic-Latine Student Association — go to Dashboard">
                    <img src={HSA_LOGO_URL} alt="" width="52" height="43" />
                    <span className="site-header__title">
                        Hispanic-Latine<br />Student Association
                    </span>
                </Link>

                {signedIn && (
                    <>
                        <nav className="site-header__nav" aria-label="Main">
                            {nav.map((item) => renderLink(item, 'site-header__link'))}
                        </nav>

                        <button type="button" className="site-header__logout" onClick={logout}>
                            Logout
                        </button>

                        <button
                            type="button"
                            className="site-header__menu-toggle"
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                            aria-controls="site-header-menu"
                            aria-label="Toggle navigation"
                        >
                            <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path
                                    d={open ? 'M4 4l12 12M16 4L4 16' : 'M2 5h16M2 10h16M2 15h16'}
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    fill="none"
                                />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {signedIn && open && (
                <nav id="site-header-menu" className="site-header__menu" aria-label="Main">
                    {nav.map((item) => renderLink(item, 'site-header__menu-link'))}
                    <button type="button" className="site-header__logout site-header__logout--menu" onClick={logout}>
                        Logout
                    </button>
                </nav>
            )}
        </header>
    );
}

export default SiteHeader;
