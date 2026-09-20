import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { EBOARD_TOOLS } from '../../pages/eboard/eboardTools';

// White HSA logo. Served from our own /public rather than from the Wix CDN
// that ufhsa.com uses: the header logo is on every page of the site, so a
// third-party host we don't control was in the critical path of every load.
// The file is the 150x124 Wix export, drawn at 52x43 (2x for retina).
const HSA_LOGO_URL = '/hsa-logo-white.png';
const UFHSA_URL = 'https://www.ufhsa.com';
const CALENDAR_URL =
    'https://calendar.google.com/calendar/embed?src=ae59c0f6702553b609b32a2d3590df6a527b45a92069bbf28f9983f89aaab437%40group.calendar.google.com&ctz=America%2FNew_York';

type NavItem = { label: string; to?: string; href?: string };

type SiteHeaderProps = {
    signedIn: boolean;
    eboard: boolean;
    /** Cabinet members get the temporary Cabinet Points link. */
    cabinet?: boolean;
};

// Top bar on every page: logo + title (links to /dashboard), the nav links
// and Logout. Below 900px the links and Logout collapse into a menu button.
function SiteHeader({ signedIn, eboard, cabinet = false }: SiteHeaderProps) {
    const [open, setOpen] = useState(false);
    const [eboardMenuOpen, setEboardMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Close the menus when the page changes or on a click outside the header.
    useEffect(() => {
        setOpen(false);
        setEboardMenuOpen(false);
    }, [location.pathname]);
    useEffect(() => {
        if (!open && !eboardMenuOpen) return;
        const onClick = (e: MouseEvent) => {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setEboardMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open, eboardMenuOpen]);

    const onEboardPage = location.pathname.startsWith('/eboard');

    const nav: NavItem[] = [
        { label: 'UF HSA', href: UFHSA_URL },
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Calendar', href: CALENDAR_URL },
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
            {/* Signed out there are no links, so the logo and title sit centred */}
            <div className={`site-header__bar${signedIn ? '' : ' site-header__bar--centered'}`}>
                <Link to="/dashboard" className="site-header__brand" aria-label="Hispanic-Latine Student Association — go to Dashboard">
                    <img src={HSA_LOGO_URL} alt="" width="52" height="43" decoding="async" />
                    <span className="site-header__title">
                        Hispanic-Latine<br />Student Association
                    </span>
                </Link>

                {signedIn && (
                    <>
                        <nav className="site-header__nav" aria-label="Main">
                            {nav.map((item) => renderLink(item, 'site-header__link'))}

                            {eboard && (
                                <div className="site-header__dropdown">
                                    <button
                                        type="button"
                                        className={`site-header__link site-header__dropdown-toggle${onEboardPage ? ' is-active' : ''}`}
                                        onClick={() => setEboardMenuOpen((v) => !v)}
                                        aria-expanded={eboardMenuOpen}
                                        aria-controls="eboard-menu"
                                    >
                                        E-Board <span className="site-header__caret" aria-hidden="true">▾</span>
                                    </button>
                                    {eboardMenuOpen && (
                                        <div id="eboard-menu" className="site-header__dropdown-menu">
                                            {EBOARD_TOOLS.map((tool) => (
                                                <NavLink
                                                    key={tool.path}
                                                    to={`/eboard/${tool.path}`}
                                                    className={({ isActive }) => `site-header__dropdown-link${isActive ? ' is-active' : ''}`}
                                                >
                                                    {tool.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </nav>

                        {/* TEMP: cabinet points until it gets a proper home */}
                        {cabinet && (
                            <NavLink
                                to="/cabinet"
                                className={({ isActive }) => `site-header__link site-header__temp${isActive ? ' is-active' : ''}`}
                            >
                                Temp-Cabinet Points
                            </NavLink>
                        )}

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
                    {eboard && (
                        <>
                            <p className="site-header__menu-heading">E-Board</p>
                            {EBOARD_TOOLS.map((tool) => (
                                <NavLink
                                    key={tool.path}
                                    to={`/eboard/${tool.path}`}
                                    className={({ isActive }) => `site-header__menu-link site-header__menu-link--sub${isActive ? ' is-active' : ''}`}
                                >
                                    {tool.label}
                                </NavLink>
                            ))}
                        </>
                    )}
                    {cabinet && (
                        <NavLink
                            to="/cabinet"
                            className={({ isActive }) => `site-header__menu-link${isActive ? ' is-active' : ''}`}
                        >
                            Temp-Cabinet Points
                        </NavLink>
                    )}
                    <button type="button" className="site-header__logout site-header__logout--menu" onClick={logout}>
                        Logout
                    </button>
                </nav>
            )}
        </header>
    );
}

export default SiteHeader;
