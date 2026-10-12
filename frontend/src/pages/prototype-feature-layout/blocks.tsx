import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useViewAs } from '../../components/layout/ViewAsContext';
import {
    aroundYou, closet, closetItems, dueIfCheckedOutNow, excuses, memberCount, myCheckouts, topRanks, upcoming, witnesses, type UpcomingEvent,
} from './mock';

// PROTOTYPE (throwaway): the four features' content, drawn once and placed
// differently by each layout. Read-only; buttons go nowhere real.

export function useCabinetView() {
    return useViewAs().view === 'cabinet';
}

export function Section({ title, more, children }: { title: string; more?: { to: string; label: string }; children: ReactNode }) {
    return (
        <section className="pfl-section">
            <div className="pfl-section__head">
                <h2>{title}</h2>
                {more && <Link to={more.to} className="pfl-more">{more.label} →</Link>}
            </div>
            {children}
        </section>
    );
}

export function BackLink({ to = '/dashboard', label = 'Dashboard' }: { to?: string; label?: string }) {
    return <Link to={to} className="pfl-back">← {label}</Link>;
}

export function Segments<K extends string>({ options, value, onChange }: { options: [K, string][]; value: K; onChange: (k: K) => void }) {
    return (
        <div className="pfl-seg" role="tablist">
            {options.map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={value === k} className={value === k ? 'is-on' : ''} onClick={() => onChange(k)}>
                    {label}
                </button>
            ))}
        </div>
    );
}

/* ---- Upcoming events ---------------------------------------------------- */

export function EventsList({ limit, excuseInline = true }: { limit?: number; excuseInline?: boolean }) {
    const cabinet = useCabinetView();
    const [excusing, setExcusing] = useState<UpcomingEvent | null>(null);
    const rows = upcoming.filter((e) => cabinet || !e.cabinetOnly).slice(0, limit);
    return (
        <>
            <ul className="pfl-events">
                {rows.map((e) => (
                    <li key={e.id}>
                        <div className="pfl-events__date"><small>{e.day}</small><strong>{e.date.split(' ')[1]}</strong><small>{e.date.split(' ')[0]}</small></div>
                        <div className="pfl-events__body">
                            <b>{e.title}</b>
                            <span>{e.time} · <em className="pfl-tag">{e.tag}</em>{cabinet && e.core && <em className="pfl-tag pfl-tag--core">Core</em>}</span>
                            {cabinet && e.core && !e.coded && excuseInline && <small className="pfl-events__note">Excuses open once E-Board makes its code</small>}
                        </div>
                        {cabinet && e.core && e.coded && excuseInline && (
                            <button type="button" className="pfl-link-btn" onClick={() => setExcusing(e)}>Can’t make it?</button>
                        )}
                    </li>
                ))}
            </ul>
            {excusing && <ExcuseSheet event={excusing} onClose={() => setExcusing(null)} />}
        </>
    );
}

/** One line: the nearest event (Q14). Text only; #98 shelved photo cards. */
export function NextUp({ to = '/p/events' }: { to?: string }) {
    const cabinet = useCabinetView();
    const visible = upcoming.filter((e) => cabinet || !e.cabinetOnly);
    const next = visible[0];
    const sameDay = visible.filter((e) => e.date === next.date).length - 1;
    return (
        <Link to={to} className="pfl-nextup">
            <span className="pfl-nextup__label">Next up</span>
            <b>{next.title}</b>
            <span>{next.day} {next.date} · {next.time}{sameDay > 0 && ` · +${sameDay} more that day`}</span>
        </Link>
    );
}

/* ---- Excuse Requests (#113, CONTEXT.md) ------------------------------- */

/** File one or more Excuse Requests with one reason. "Can’t make it?" opens it
 *  with that event ticked. Only coded Core Events dated today or later. */
export function ExcuseSheet({ event, onClose }: { event?: UpcomingEvent; onClose: () => void }) {
    const cabinet = useCabinetView();
    const eligible = upcoming.filter((e) => e.core && e.coded && (cabinet || !e.cabinetOnly));
    const [picked, setPicked] = useState<string[]>(event ? [event.id] : []);
    const [reason, setReason] = useState('');
    const [sent, setSent] = useState(0);
    const flip = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    return (
        <div className="pfl-sheet" role="dialog" aria-modal="true" aria-label="Request an excuse" onClick={onClose}>
            <div className="pfl-sheet__panel" onClick={(e) => e.stopPropagation()}>
                {sent ? (
                    <>
                        <h3>Sent to E-Board</h3>
                        <p>{sent === 1 ? 'Your request is' : `Your ${sent} requests are`} under Events → My excuses as Pending until E-Board reviews {sent === 1 ? 'it' : 'each one'}. (Prototype: nothing was saved.)</p>
                        <button type="button" className="pfl-primary" onClick={onClose}>Done</button>
                    </>
                ) : (
                    <>
                        <h3>Request an excuse</h3>
                        <fieldset className="pfl-checks">
                            <legend>Core Events you can’t attend</legend>
                            {eligible.map((e) => (
                                <label key={e.id}>
                                    <input type="checkbox" checked={picked.includes(e.id)} onChange={() => flip(e.id)} />
                                    <span>{e.title}<small>{e.day} {e.date} · {e.time}</small></span>
                                </label>
                            ))}
                        </fieldset>
                        <label>Reason<textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why can’t you attend?" /></label>
                        <p className="pfl-hint">Each event is reviewed on its own. You can withdraw a request while it’s pending.</p>
                        <div className="pfl-sheet__actions">
                            <button type="button" className="pfl-secondary" onClick={onClose}>Cancel</button>
                            <button type="button" className="pfl-primary" disabled={!picked.length || !reason.trim()} onClick={() => setSent(picked.length)}>
                                Send {picked.length > 1 ? `${picked.length} requests` : 'request'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export function ExcuseList({ withButton = true }: { withButton?: boolean }) {
    const [open, setOpen] = useState(false);
    const [withdrawn, setWithdrawn] = useState<string[]>([]);
    return (
        <>
            {withButton && <button type="button" className="pfl-primary pfl-block" onClick={() => setOpen(true)}>Request an excuse</button>}
            <ul className="pfl-excuses">
                {excuses.filter((x) => !withdrawn.includes(x.id)).map((x) => (
                    <li key={x.id}>
                        <div>
                            <b>{x.event}</b><span>{x.date} · “{x.reason}”</span><small>Filed {x.filed}</small>
                            {x.denial && <span className="pfl-excuses__denial">E-Board: {x.denial}</span>}
                        </div>
                        <div className="pfl-excuses__side">
                            <em className={`pfl-status pfl-status--${x.status}`}>{x.status}</em>
                            {x.status === 'pending' && <button type="button" className="pfl-text-btn" onClick={() => setWithdrawn((w) => [...w, x.id])}>Withdraw</button>}
                        </div>
                    </li>
                ))}
            </ul>
            {open && <ExcuseSheet onClose={() => setOpen(false)} />}
        </>
    );
}

/* ---- Leaderboard -------------------------------------------------------- */

export function YourRank({ to }: { to?: string }) {
    const you = aroundYou.find((r) => r.you)!;
    const body = (
        <>
            <span className="pfl-rank__num">#{you.rank}</span>
            <span><b>Your rank</b><small>of {memberCount} · tied with {you.tie! - 1} other · {you.points} pts</small></span>
        </>
    );
    return to ? <Link to={to} className="pfl-rank">{body}</Link> : <div className="pfl-rank">{body}</div>;
}

/** One line on the Dashboard (Q6/Q15): opens Points → Leaderboard. */
export function RankLine() {
    const you = aroundYou.find((r) => r.you)!;
    const above = aroundYou.filter((r) => r.rank < you.rank).slice(-1)[0];
    return (
        <Link to="/p/points?seg=leaderboard" className="pfl-line">
            <span className="pfl-line__big">#{you.rank}</span>
            <span><b>You’re #{you.rank} of {memberCount}</b><small>{above.points - you.points} pt behind #{above.rank} · see the Leaderboard</small></span>
            <i aria-hidden="true">›</i>
        </Link>
    );
}

export function Leaderboard({ compact = false }: { compact?: boolean }) {
    const top = compact ? topRanks.slice(0, 3) : topRanks;
    const near = compact ? aroundYou.filter((r) => Math.abs(r.rank - 14) <= 2) : aroundYou;
    return (
        <div className="pfl-lb">
            <ol className="pfl-lb__list">
                {top.map((r) => (
                    <li key={r.rank}><span className="pfl-lb__rank">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span><span>{r.name}</span><b>{r.points}</b></li>
                ))}
            </ol>
            <p className="pfl-lb__gap">⋯</p>
            <ol className="pfl-lb__list">
                {near.map((r) => (
                    <li key={r.rank} className={r.you ? 'is-you' : ''}>
                        <span className="pfl-lb__rank">{r.rank}</span><span>{r.you ? `You${r.tie ? ` (tied ×${r.tie})` : ''}` : <i>Member</i>}</span><b>{r.points}</b>
                    </li>
                ))}
            </ol>
        </div>
    );
}

/* ---- Closet ------------------------------------------------------------- */

export function Closet({ shelf = false }: { shelf?: boolean }) {
    return (
        <ul className={shelf ? 'pfl-closet pfl-closet--shelf' : 'pfl-closet'}>
            {closet.map((item) => (
                <li key={item.id}>
                    <div className="pfl-closet__img" style={{ background: item.swatch }}><span>{item.kind === 'Borrow' ? '⟲' : '👕'}</span></div>
                    <b>{item.name}</b>
                    <small>{item.note}</small>
                    <span className="pfl-closet__foot"><em className="pfl-tag">{item.kind}</em> {item.left} left</span>
                </li>
            ))}
        </ul>
    );
}

/* ---- Closet loans (#104, #107): the agreed layout's tab ---------------- */

// Prototype-only switch so both states can be seen: with an Overdue item the
// form is blocked, the card goes red and the Closet tab gets a dot.
let overdueOn = true;
const overdueListeners = new Set<() => void>();
export function setOverdue(v: boolean) { overdueOn = v; overdueListeners.forEach((l) => l()); }
export function useOverdue() {
    return useSyncExternalStore((l) => { overdueListeners.add(l); return () => overdueListeners.delete(l); }, () => overdueOn);
}

function useMyItems() {
    const overdue = useOverdue();
    // With the switch off, the late table is pretended to be due Thursday instead.
    return myCheckouts
        .map((c) => (c.overdue && !overdue ? { ...c, overdue: false, due: 'Thu Oct 15, 8 PM', dueDay: 15 } : c))
        .sort((a, b) => a.dueDay - b.dueDay);
}

/** One line on the Dashboard (Q10); Closet Borrowers only. */
export function ClosetCard() {
    const items = useMyItems();
    const late = items.filter((c) => c.overdue).length;
    const soonest = items.find((c) => !c.overdue);
    const [big, title, hint] = late
        ? ['!', `${late} item Overdue`, 'Return it to borrow again']
        : items.length
            ? [String(items.length), `${items.length} item${items.length > 1 ? 's' : ''} out`, `Next due ${soonest!.due}`]
            : ['0', 'Nothing checked out', 'Borrow equipment for your event'];
    return (
        <Link to="/p/closet" className={`pfl-line${late ? ' pfl-line--bad' : ''}`}>
            <span className="pfl-line__big">{big}</span>
            <span><b>Closet: {title}</b><small>{hint}</small></span>
            <i aria-hidden="true">›</i>
        </Link>
    );
}

export function ClosetPage() {
    const items = useMyItems();
    const overdue = useOverdue();
    const blocked = items.some((c) => c.overdue);
    const [stickers, setStickers] = useState('');
    const [witness, setWitness] = useState('');
    const [result, setResult] = useState<{ ok: boolean; text: string; rows?: [string, string][] } | null>(null);

    const submit = () => {
        const nums = stickers.split(/[\s,]+/).filter(Boolean).map((n) => n.padStart(3, '0'));
        const taken = myCheckouts.map((c) => c.sticker);
        const bad = nums.find((n) => !closetItems[n] || taken.includes(n));
        if (!nums.length || !witness) setResult({ ok: false, text: 'Enter at least one sticker number and pick who is present.' });
        else if (bad) setResult({ ok: false, text: closetItems[bad] ? `#${bad} is already checked out. Nothing was recorded.` : `#${bad} isn’t a Closet Item. Nothing was recorded.` });
        else setResult({ ok: true, text: `Checked out. Due ${dueIfCheckedOutNow}. (Prototype: nothing was saved.)`, rows: nums.map((n) => [n, closetItems[n]]) });
    };

    return (
        <>
            <label className="pfl-proto-toggle"><input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Prototype: I have an Overdue item</label>
            <section className="pfl-section">
                <div className="pfl-section__head"><h2>Check out</h2></div>
                {blocked ? (
                    <p className="pfl-alert">You have an Overdue item. Return it (or ask E-Board) before you check out anything else.</p>
                ) : (
                    <div className="pfl-form">
                        <label>Sticker numbers<input value={stickers} onChange={(e) => setStickers(e.target.value)} placeholder="e.g. 3, 21, 57" inputMode="numeric" /></label>
                        <label>E-Board member present
                            <select value={witness} onChange={(e) => setWitness(e.target.value)}>
                                <option value="">Choose…</option>
                                {witnesses.map((w) => <option key={w}>{w}</option>)}
                            </select>
                        </label>
                        <button type="button" className="pfl-primary pfl-block" onClick={submit}>Check out</button>
                        {result && (
                            <div className={result.ok ? 'pfl-ok' : 'pfl-alert'} role="status">
                                <p>{result.text}</p>
                                {result.rows && <ul>{result.rows.map(([n, d]) => <li key={n}>#{n} {d}</li>)}</ul>}
                            </div>
                        )}
                        <p className="pfl-hint">Open Mon–Thu 8 AM–8 PM, Fri 8 AM–5 PM, Sun 12–5 PM. Only E-Board records a Return.</p>
                    </div>
                )}
            </section>
            <section className="pfl-section">
                <div className="pfl-section__head"><h2>My items</h2></div>
                <ul className="pfl-excuses">
                    {items.map((c) => (
                        <li key={c.sticker} className={c.overdue ? 'is-overdue' : ''}>
                            <div>
                                <b>#{c.sticker} {c.item}</b>
                                <span>Due {c.due}</span>
                                <small>Out since {c.out}</small>
                                {c.extended && <small>{c.extended}</small>}
                            </div>
                            {c.overdue && <em className="pfl-status pfl-status--denied">Overdue</em>}
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}
