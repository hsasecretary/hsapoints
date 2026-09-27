import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { VIEW_LABELS, type View } from '../../lib/viewAs';
import { EBOARD_TOOLS } from '../../pages/eboard/eboardTools';
import { isNavItemActive, navItems, type NavIcon, type NavItem } from './navItems';
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
//   <600px: logo and Account on top; the pages move to a fixed bottom tab
//           bar, whose E-Board tab opens the /eboard landing page.
// Account ▾ holds "View as" (E-Board and Web-team Testers) and Log out. While
// another view is previewed, a banner under the bar says so on every page.
function SiteHeader({ signedIn, eboard, cabinetView }: SiteHeaderProps) {
    const headerRef = useRef<HTMLElement>(null);
    const { pathname } = useLocation();
    const items = navItems({ cabinetView, eboard });

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
                                {items.map((item) => item.icon === 'eboard'
                                    ? <EboardMenu key={item.to} active={isNavItemActive(item, pathname)} />
                                    : (
                                        <NavLink key={item.to} to={item.to} className="site-header__link">
                                            {item.label}
                                        </NavLink>
                                    ))}
                            </nav>
                            <AccountMenu />
                        </>
                    )}
                </div>
                {signedIn && <PreviewBanner />}
            </header>

            {signedIn && <TabBar items={items} pathname={pathname} />}
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

/** E-Board ▾ (desktop): the tools from eboardTools.ts. Active on /eboard/*. */
function EboardMenu({ active }: { active: boolean }) {
    const { open, setOpen, rootRef, buttonRef, onKeyDown } = useDisclosure();

    return (
        <div ref={rootRef} className="site-header__dropdown" onKeyDown={onKeyDown}>
            <button
                ref={buttonRef}
                type="button"
                className={`site-header__link site-header__toggle${active ? ' is-active' : ''}`}
                aria-expanded={open}
                aria-controls="eboard-menu"
                onClick={() => setOpen((v) => !v)}
            >
                E-Board <Caret />
            </button>
            <div id="eboard-menu" className="site-header__panel" hidden={!open}>
                <ul>
                    {EBOARD_TOOLS.map((tool) => (
                        <li key={tool.path}>
                            <NavLink to={`/eboard/${tool.path}`} className="site-header__panel-link">
                                {tool.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

/** Account ▾, top right: "View as" for those who can switch, and Log out. */
function AccountMenu() {
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
                        {(['general', 'cabinet'] as View[]).map((option) => (
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
function TabBar({ items, pathname }: { items: NavItem[]; pathname: string }) {
    return (
        <nav className="tab-bar" aria-label="Main">
            <ul>
                {items.map((item) => {
                    const active = isNavItemActive(item, pathname);
                    return (
                        <li key={item.to}>
                            <Link
                                to={item.to}
                                className={`tab-bar__tab${active ? ' is-active' : ''}`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <span className="tab-bar__pill"><Icon name={item.icon} /></span>
                                <span className="tab-bar__label">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
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
    guide: <><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z" /><path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5" /></>,
    eboard: <><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M4 12h16" /></>,
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
