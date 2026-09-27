import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { VIEW_LABELS, VIEWS } from '../../lib/viewAs';
import { EBOARD_TOOLS } from '../../pages/eboard/eboardTools';
import { navItems, type NavIcon, type NavItem } from './navItems';
import { useViewAs } from './ViewAsContext';

// White HSA logo. Served from our own /public rather than from the Wix CDN
// that ufhsa.com uses: the header logo is on every page of the site, so a
// third-party host we don't control was in the critical path of every load.
// The file is the 150x124 Wix export, drawn at 52x43 (2x for retina).
const HSA_LOGO_URL = '/hsa-logo-white.png';

type SiteHeaderProps = {
    signedIn: boolean;
    eboard: boolean;
    /** The Cabinet Member view is showing (the Member's own, or previewed). */
    cabinetView: boolean;
};

// The one navbar (#76, docs/research/dashboard-navbar.md).
//   ≥600px: logo, the page links (navItems.ts), E-Board ▾ and Account ▾.
//   <600px: logo and Account on top; the pages move to a fixed bottom tab bar
//           and the E-Board tools into Account ▾.
// Account ▾ holds "View as" (E-Board and Web-team Testers), the E-Board tools
// (E-Board, phones only) and Log out. While another view is previewed, a banner under the
// bar says so on every page.
function SiteHeader({ signedIn, eboard, cabinetView }: SiteHeaderProps) {
    const headerRef = useRef<HTMLElement>(null);
    const { pathname } = useLocation();
    const items = navItems({ cabinetView });

    // Sticky bars must not cover the focused element (WCAG 2.4.11): the
    // header's height feeds html's scroll-padding-top (layout.css). It grows
    // with the preview banner, so it's measured rather than hard-coded.
    useLayoutEffect(() => {
        const header = headerRef.current;
        if (!header) return undefined;
        const root = document.documentElement;
        const update = () => root.style.setProperty('--site-header-height', `${header.offsetHeight}px`);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => {
            observer.disconnect();
            root.style.removeProperty('--site-header-height');
        };
    }, []);

    return (
        <>
            <header ref={headerRef} className="site-header">
                {/* Signed out there are no links, so the logo and title sit centred */}
                <div className={`site-header__bar${signedIn ? '' : ' site-header__bar--centered'}`}>
                    <Link to="/dashboard" className="site-header__brand" aria-label="Hispanic-Latine Student Association, go to Dashboard">
                        <img src={HSA_LOGO_URL} alt="" width="52" height="43" decoding="async" />
                        <span className="site-header__title">
                            Hispanic-Latine<br />Student Association
                        </span>
                    </Link>

                    {signedIn && (
                        <>
                            <nav className="site-header__nav" aria-label="Main">
                                {items.map((item) => (
                                    <NavLink key={item.to} to={item.to} className="site-header__link">
                                        {item.label}
                                    </NavLink>
                                ))}
                                {eboard && <EboardMenu active={pathname === '/eboard' || pathname.startsWith('/eboard/')} />}
                            </nav>
                            <AccountMenu eboard={eboard} />
                        </>
                    )}
                </div>
                {signedIn && <PreviewBanner />}
            </header>

            {signedIn && <TabBar items={items} />}
        </>
    );
}

/** Open/close for a disclosure (WAI-ARIA APG): closes on Escape (focus goes
 *  back to the button), on a click outside, and when the page changes. */
function useDisclosure() {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { pathname } = useLocation();

    useEffect(() => setOpen(false), [pathname]);
    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
            buttonRef.current?.focus();
        }
    };

    return { open, setOpen, rootRef, buttonRef, onKeyDown };
}

/** E-Board ▾ (≥600px): the tools from eboardTools.ts. Active on /eboard/*. */
function EboardMenu({ active }: { active: boolean }) {
    const { open, setOpen, rootRef, buttonRef, onKeyDown } = useDisclosure();

    return (
        <div ref={rootRef} className="site-header__dropdown" onKeyDown={onKeyDown}>
            <button
                ref={buttonRef}
                type="button"
                className={`site-header__link${active ? ' is-active' : ''}`}
                aria-expanded={open}
                aria-controls="eboard-menu"
                onClick={() => setOpen((v) => !v)}
            >
                E-Board <Caret />
            </button>
            <div id="eboard-menu" className="site-header__panel" hidden={!open}>
                <EboardToolLinks />
            </div>
        </div>
    );
}

function EboardToolLinks() {
    return (
        <ul>
            {EBOARD_TOOLS.map((tool) => (
                <li key={tool.path}>
                    <NavLink to={`/eboard/${tool.path}`} className="site-header__panel-link">
                        {tool.label}
                    </NavLink>
                </li>
            ))}
        </ul>
    );
}

/** Account ▾, top right: "View as" for those who can switch, the E-Board
 *  tools for E-Board on phones (E-Board ▾ has them on wider screens), and
 *  Log out. */
function AccountMenu({ eboard }: { eboard: boolean }) {
    const { open, setOpen, rootRef, buttonRef, onKeyDown } = useDisclosure();
    const { own, view, canSwitch, setView } = useViewAs();
    const navigate = useNavigate();
    const previewing = view !== own;

    const logout = async () => {
        setOpen(false);
        await signOut(auth);
        navigate('/login');
    };

    return (
        <div ref={rootRef} className="site-header__account" onKeyDown={onKeyDown}>
            <button
                ref={buttonRef}
                type="button"
                className="site-header__account-toggle"
                aria-expanded={open}
                aria-controls="account-menu"
                onClick={() => setOpen((v) => !v)}
            >
                <Icon name="account" />
                <span className="site-header__account-label">Account</span>
                {previewing && (
                    <span className="site-header__badge">
                        <span className="visually-hidden">, viewing as {VIEW_LABELS[view]}</span>
                    </span>
                )}
                <Caret />
            </button>
            <div id="account-menu" className="site-header__panel site-header__panel--end" hidden={!open}>
                {canSwitch && (
                    <fieldset className="site-header__views">
                        <legend>View as</legend>
                        {VIEWS.map((option) => (
                            <label key={option} className="site-header__view">
                                <input
                                    type="radio"
                                    name="view-as"
                                    value={option}
                                    checked={view === option}
                                    onChange={() => setView(option)}
                                />
                                <span>{VIEW_LABELS[option]}</span>
                                {option === own && <span className="site-header__yours">Yours</span>}
                            </label>
                        ))}
                    </fieldset>
                )}
                {eboard && (
                    <nav className="site-header__tools" aria-labelledby="account-eboard">
                        <h2 id="account-eboard" className="site-header__group">E-Board</h2>
                        <EboardToolLinks />
                    </nav>
                )}
                <button type="button" className="site-header__logout" onClick={logout}>
                    Log out
                </button>
            </div>
        </div>
    );
}

/** Full-width, on every page, while another view is previewed. */
function PreviewBanner() {
    const { own, view, setView } = useViewAs();
    if (view === own) return null;
    return (
        <div className="site-header__preview" role="status">
            <p>
                <strong>Viewing as {VIEW_LABELS[view]}.</strong> Not your view. Actions still happen as your real
                account.
            </p>
            <button type="button" onClick={() => setView(own)}>Back to my view</button>
        </div>
    );
}

/** Phone (<600px): the pages as a fixed bottom tab bar, icon + label. */
function TabBar({ items }: { items: NavItem[] }) {
    return (
        <nav className="tab-bar" aria-label="Main">
            <ul>
                {items.map((item) => (
                    <li key={item.to}>
                        <NavLink to={item.to} className={({ isActive }) => `tab-bar__tab${isActive ? ' is-active' : ''}`}>
                            <span className="tab-bar__pill"><Icon name={item.icon} /></span>
                            <span className="tab-bar__label">{item.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function Caret() {
    return <span className="site-header__caret" aria-hidden="true">▾</span>;
}

const ICON_PATHS: Record<NavIcon | 'account', ReactNode> = {
    dashboard: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
    requirements: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="m8.5 9 1.5 1.5L13 7.5" /><path d="M8.5 15h7" /></>,
    requests: <><path d="M4 13h4l1.5 2.5h5L16 13h4" /><path d="M4 13 6.5 5h11L20 13v6H4z" /></>,
    account: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
};

function Icon({ name }: { name: NavIcon | 'account' }) {
    return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICON_PATHS[name]}
        </svg>
    );
}

export default SiteHeader;
