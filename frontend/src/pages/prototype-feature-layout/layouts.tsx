import { useEffect, useState, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { formatAccountType } from '../../lib/roles';
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom';
import Requests from '../requests/Requests';
import Requirements from '../requirements/Requirements';
import EventCodeForm from '../dashboard/sections/EventCodeForm';
import {
    BackLink, Closet, ClosetCard, ClosetPage, EventsList, ExcuseList, Leaderboard, NextUp, RankLine, Section, Segments, YourRank,
    useCabinetView, useOverdue,
} from './blocks';
import { useLayout, type Layout } from './layoutStore';
import { excuses, upcoming } from './mock';

// PROTOTYPE (throwaway). Each layout decides three things:
//   1. the tab bar / desktop links (protoNav)
//   2. what the Dashboard adds or drops (DashboardExtras, hideCodeBox)
//   3. what /p/:screen shows (ProtoScreen)

/* ---- 1. Navigation ------------------------------------------------------ */

export type ProtoIcon = 'home' | 'requirements' | 'requests' | 'events' | 'points' | 'closet' | 'you' | 'explore' | 'checkin';
export type ProtoNavItem = { label: string; to: string; icon: ProtoIcon; center?: boolean; badge?: boolean; overdueDot?: boolean };

export function protoNav(layout: Layout, cabinet: boolean): ProtoNavItem[] {
    const today: ProtoNavItem[] = [
        { label: 'Dashboard', to: '/dashboard', icon: 'home' },
        ...(cabinet ? [{ label: 'Requirements', to: '/requirements', icon: 'requirements' as const }] : []),
        { label: 'Requests', to: '/requests', icon: 'requests' },
    ];
    switch (layout) {
        case 'A': return [
            { label: 'Home', to: '/dashboard', icon: 'home' },
            { label: 'Events', to: '/p/events', icon: 'events' },
            { label: 'Points', to: '/p/points', icon: 'points' },
            { label: 'Closet', to: '/p/closet', icon: 'closet' },
        ];
        // F, agreed in the grilling round: A's tabs; Closet only for Closet
        // Borrowers, following the view switcher (Q9); a dot while Overdue (Q10).
        case 'F': return [
            { label: 'Home', to: '/dashboard', icon: 'home' },
            { label: 'Events', to: '/p/events', icon: 'events' },
            { label: 'Points', to: '/p/points', icon: 'points' },
            ...(cabinet ? [{ label: 'Closet', to: '/p/closet', icon: 'closet' as const, overdueDot: true }] : []),
        ];
        case 'C': return [
            { label: 'Home', to: '/dashboard', icon: 'home' },
            { label: 'Events', to: '/p/events', icon: 'events' },
            { label: 'Check in', to: '#checkin', icon: 'checkin', center: true },
            { label: 'Closet', to: '/p/closet', icon: 'closet' },
            { label: 'You', to: '/p/you', icon: 'you' },
        ];
        case 'B': return [
            { label: 'Dashboard', to: '/dashboard', icon: 'home' },
            ...(cabinet ? [{ label: 'Requirements', to: '/requirements', icon: 'requirements' as const }] : []),
            { label: 'Events', to: '/p/events', icon: 'events' },
            { label: 'Requests', to: '/requests', icon: 'requests' },
        ];
        case 'D': return [...today, { label: 'Explore', to: '/p/explore', icon: 'explore', badge: true }];
        default: return today; // S keeps today's bar
    }
}

const ICONS: Record<ProtoIcon, ReactNode> = {
    home: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
    requirements: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="m8.5 9 1.5 1.5L13 7.5" /><path d="M8.5 15h7" /></>,
    requests: <><path d="M4 13h4l1.5 2.5h5L16 13h4" /><path d="M4 13 6.5 5h11L20 13v6H4z" /></>,
    events: <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M4 10h16" /><path d="M8.5 3.5v4M15.5 3.5v4" /></>,
    points: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3" /><path d="M12 13v3M9 20h6M10 16h4v4h-4z" /></>,
    closet: <><path d="M12 7a2 2 0 1 1 2-2" /><path d="M12 7v1.5L3.5 15a1.2 1.2 0 0 0 .8 2h15.4a1.2 1.2 0 0 0 .8-2L12 8.5" /></>,
    you: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    explore: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>,
    checkin: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2M20 14v6h-6v-2M17 17h1" /></>,
};

export function ProtoIconSvg({ name }: { name: ProtoIcon }) {
    return (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
    );
}

/** Desktop links for the prototype nav (≥600px). */
export function ProtoDesktopLinks({ items }: { items: ProtoNavItem[] }) {
    const [checkin, setCheckin] = useState(false);
    const overdue = useOverdue();
    return (
        <>
            {items.map((item) => item.center ? (
                <button key={item.to} type="button" className="site-header__link" onClick={() => setCheckin(true)}>{item.label}</button>
            ) : (
                <NavLink key={item.to} to={item.to} className="site-header__link">{item.label}{item.badge && <sup className="pfl-new">New</sup>}{item.overdueDot && overdue && <sup className="pfl-new pfl-new--bad">Overdue</sup>}</NavLink>
            ))}
            {checkin && <CheckInSheet onClose={() => setCheckin(false)} />}
        </>
    );
}

/** Phone tab bar for the prototype nav (<600px). */
export function ProtoTabBar({ items }: { items: ProtoNavItem[] }) {
    const [checkin, setCheckin] = useState(false);
    const overdue = useOverdue();
    return (
        <nav className="tab-bar" aria-label="Main">
            <ul>
                {items.map((item) => (
                    <li key={item.to}>
                        {item.center ? (
                            <button type="button" className="tab-bar__tab pfl-center" onClick={() => setCheckin(true)}>
                                <span className="pfl-center__disc"><ProtoIconSvg name={item.icon} /></span>
                                <span className="tab-bar__label">{item.label}</span>
                            </button>
                        ) : (
                            <NavLink to={item.to} className={({ isActive }) => `tab-bar__tab${isActive ? ' is-active' : ''}`}>
                                <span className="tab-bar__pill"><ProtoIconSvg name={item.icon} />{item.badge && <i className="pfl-dot" aria-label="new" />}{item.overdueDot && overdue && <i className="pfl-dot" aria-label="Overdue item" />}</span>
                                <span className="tab-bar__label">{item.label}</span>
                            </NavLink>
                        )}
                    </li>
                ))}
            </ul>
            {checkin && <CheckInSheet onClose={() => setCheckin(false)} />}
        </nav>
    );
}

function CheckInSheet({ onClose }: { onClose: () => void }) {
    return (
        <div className="pfl-sheet" role="dialog" aria-modal="true" aria-label="Check in" onClick={onClose}>
            <div className="pfl-sheet__panel pfl-sheet__panel--code" onClick={(e) => e.stopPropagation()}>
                <div className="overview pfl-sheet__code"><div className="overview__code"><EventCodeForm /></div></div>
                <button type="button" className="pfl-secondary pfl-block" onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

/* ---- 2. Dashboard ------------------------------------------------------- */

/** B and F move My information off the Dashboard (Q8); F puts it in Account ▾ (Q16). */
export function useHideInfo() {
    const layout = useLayout();
    return layout === 'B' || layout === 'F';
}

/** F: the top of Account ▾ — who you're signed in as (Q16). */
export function ProtoAccountInfo() {
    const layout = useLayout();
    const email = auth.currentUser?.email?.toLowerCase();
    const [me, setMe] = useState<{ firstName?: string; lastName?: string; cabinet?: string; eboard?: boolean; webTeam?: boolean } | null>(null);
    useEffect(() => {
        if (!email) return;
        getDoc(doc(db, 'users', email)).then((snap) => setMe(snap.data() ?? null)).catch(() => setMe(null));
    }, [email]);
    if (layout !== 'F' || !email) return null;
    const type = me?.webTeam ? 'Web-team Tester' : me?.eboard ? 'E-Board' : formatAccountType(me?.cabinet);
    return (
        <div className="pfl-me">
            <b>{[me?.firstName, me?.lastName].filter(Boolean).join(' ') || 'Signed in'}</b>
            <span>{email}</span>
            <small>{type}</small>
        </div>
    );
}

/** C moves the code box into the centre tab. */
export function useHideCodeBox() {
    return useLayout() === 'C';
}

/** Rendered on /dashboard straight after the code box. */
export function DashboardAfterCode() {
    const layout = useLayout();
    const cabinet = useCabinetView();
    if (layout === 'A' || layout === 'C') return <NextUp />;
    if (layout !== 'B') return null;
    // docs/research/feature-placement-ia.md, option A: Events gets the tab;
    // the Dashboard gets Next up (2–3 events), a one-line rank card and a
    // plain, text-led Closet card. My information moves off the Dashboard.
    return (
        <>
            <Section title="Next up" more={{ to: '/p/events', label: 'All events' }}><EventsList limit={cabinet ? 3 : 2} /></Section>
            <Link to="/p/leaderboard" className="pfl-line">
                <span className="pfl-line__big">#14</span>
                <span><b>You’re #14 of 212</b><small>1 point behind #13 · see the Leaderboard</small></span>
                <i aria-hidden="true">›</i>
            </Link>
            <Link to="/p/closet" className="pfl-line">
                <span className="pfl-line__big">👕</span>
                <span><b>Closet: 3 new items</b><small>Tee, crewneck, tote · pick up at tabling</small></span>
                <i aria-hidden="true">›</i>
            </Link>
        </>
    );
}

/** F: rendered on /dashboard just above the Make-up list (Q15, revised). */
export function DashboardBeforeMakeUps() {
    return useLayout() === 'F' ? <div className="pfl-cards"><NextUp /></div> : null;
}

/** Rendered at the end of /dashboard. */
export function DashboardEnd() {
    const layout = useLayout();
    const cabinet = useCabinetView();
    // F (Q15): Code · Total Points · bubbles · Next up · Make-up list · then these two.
    if (layout === 'F') {
        return (
            <div className="pfl-cards">
                {cabinet && <ClosetCard />}
                <RankLine />
            </div>
        );
    }
    if (layout === 'C') {
        return <Section title="Leaderboard" more={{ to: '/p/leaderboard', label: 'Full board' }}><YourRank to="/p/leaderboard" /></Section>;
    }
    if (layout !== 'S') return null;
    return (
        <>
            <Section title="Upcoming events"><EventsList limit={4} /></Section>
            <Section title="Leaderboard"><YourRank /><Leaderboard compact /></Section>
            <Section title="Closet"><Closet shelf /></Section>
            {cabinet && <Section title="Excuse requests"><ExcuseList /></Section>}
        </>
    );
}

/* ---- 3. /p/:screen ------------------------------------------------------ */

export function ProtoScreen({ email }: { email: string }) {
    const { screen } = useParams();
    const layout = useLayout();
    const cabinet = useCabinetView();
    const [params, setParams] = useSearchParams();
    // Pages reached from a card or tile (B, D, C's You) get a way back; tab pages don't.
    const isTab = protoNav(layout, cabinet).some((item) => item.to === `/p/${screen}`);
    const back = isTab ? null : layout === 'D' ? <BackLink to="/p/explore" label="Explore" /> : layout === 'C' ? <BackLink to="/p/you" label="You" /> : <BackLink />;
    const seg = params.get('seg');
    const setSeg = (k: string) => { const n = new URLSearchParams(params); n.set('seg', k); setParams(n, { replace: true }); };

    let body: ReactNode;
    switch (screen) {
        case 'events': {
            const segmented = (layout === 'A' || layout === 'F') && cabinet;
            const tab = segmented && seg === 'excuses' ? 'excuses' : 'upcoming';
            body = (
                <>
                    <h1 className="pfl-h1">Events</h1>
                    {segmented && <Segments options={[['upcoming', 'Upcoming'], ['excuses', 'My excuses']]} value={tab} onChange={setSeg} />}
                    {tab === 'upcoming' ? <EventsList /> : <ExcuseList />}
                    <a className="pfl-more pfl-cal" href="https://calendar.google.com" target="_blank" rel="noreferrer">Open the full HSA calendar ↗</a>
                </>
            );
            break;
        }
        case 'points': {
            // Q11: Requirements · Requests · Leaderboard, opening on the first.
            // The real build gives each its own address (/points/requirements …).
            const tabs: [string, string][] = [...(cabinet ? [['requirements', 'Requirements'] as [string, string]] : []), ['requests', 'Requests'], ['leaderboard', 'Leaderboard']];
            const tab = tabs.some(([k]) => k === seg) ? seg! : tabs[0][0];
            body = (
                <>
                    <h1 className="pfl-h1">Points</h1>
                    <Segments options={tabs} value={tab} onChange={setSeg} />
                    {tab === 'leaderboard' && <><YourRank /><Leaderboard /></>}
                    {tab === 'requests' && <div className="pfl-embed"><Requests /></div>}
                    {tab === 'requirements' && <div className="pfl-embed"><Requirements email={email} /></div>}
                </>
            );
            break;
        }
        case 'leaderboard':
            body = <><h1 className="pfl-h1">Leaderboard</h1><YourRank /><Leaderboard /></>;
            break;
        case 'closet':
            if (layout === 'F') {
                body = <><h1 className="pfl-h1">Closet</h1><p className="pfl-lede">Borrow equipment for your events, free. An E-Board member must be there.</p><ClosetPage /></>;
                break;
            }
            body = <><h1 className="pfl-h1">Closet</h1><p className="pfl-lede">Merch to pick up at tabling, and clothes to borrow.</p><Closet /></>;
            break;
        case 'excuse':
            body = <><h1 className="pfl-h1">Excuse requests</h1><p className="pfl-lede">Can’t make a Core Event? Ask E-Board before it happens.</p><ExcuseList /></>;
            break;
        case 'you':
            body = <YouHub cabinet={cabinet} />;
            break;
        case 'explore':
            body = <ExploreGrid cabinet={cabinet} />;
            break;
        default:
            body = <p>Unknown prototype screen.</p>;
    }
    return <div className="pfl-page">{back}{body}</div>;
}

function YouHub({ cabinet }: { cabinet: boolean }) {
    const rows: [string, string, string][] = [
        ['/p/leaderboard', 'Leaderboard', '#14 of 212'],
        ...(cabinet ? [['/requirements', 'Requirements', '2 Missed Events to make up'] as [string, string, string]] : []),
        ['/requests', 'Point requests', '1 pending'],
        ...(cabinet ? [['/p/excuse', 'Excuse requests', '1 pending'] as [string, string, string]] : []),
        ['/dashboard?open=how', 'How it works', 'Points, tiers and Strikes'],
    ];
    return (
        <>
            <h1 className="pfl-h1">You</h1>
            <YourRank to="/p/leaderboard" />
            <ul className="pfl-menu">
                {rows.map(([to, label, hint]) => (
                    <li key={to}><Link to={to}><b>{label}</b><span>{hint}</span><i aria-hidden="true">›</i></Link></li>
                ))}
            </ul>
        </>
    );
}

function ExploreGrid({ cabinet }: { cabinet: boolean }) {
    const tiles: [string, string, ProtoIcon, string, boolean?][] = [
        ['/p/events', 'Upcoming events', 'events', 'Next: Thu, GBM #5'],
        ['/p/leaderboard', 'Leaderboard', 'points', 'You’re #14'],
        ['/p/closet', 'Closet', 'closet', '3 new items', true],
        ...(cabinet ? [['/p/excuse', 'Excuse requests', 'requirements', '1 pending'] as [string, string, ProtoIcon, string]] : []),
        ['/dashboard?open=how', 'How it works', 'requests', 'Points & tiers'],
    ];
    return (
        <>
            <h1 className="pfl-h1">Explore</h1>
            <ul className="pfl-tiles">
                {tiles.map(([to, label, icon, hint, isNew]) => (
                    <li key={to}>
                        <Link to={to}>
                            <ProtoIconSvg name={icon} />
                            <b>{label}{isNew && <sup className="pfl-new">New</sup>}</b>
                            <span>{hint}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}
