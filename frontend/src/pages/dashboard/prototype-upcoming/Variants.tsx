import { useMemo, useState } from 'react';
import CategoryIcon from './CategoryIcon';
import { Category, CalEvent, categories, daysAway, parts, photoFor, today, upcoming, when } from './events';

// PROTOTYPE (throwaway). Three structurally different takes on "Upcoming events".
// A = chronological agenda, B = spotlight + poster strip, C = month calendar + detail.

export function Tag({ cat }: { cat: Category }) {
    const c = categories[cat];
    return <span className="up-tag" style={{ '--c': c.color } as React.CSSProperties}><CategoryIcon cat={cat} size={13} />{c.label}</span>;
}

/** Photo when we have one for the category; otherwise a coloured poster tile (new events). */
function Visual({ ev, className = '' }: { ev: CalEvent; className?: string }) {
    const src = photoFor(ev);
    const c = categories[ev.category];
    if (src) return <div className={`up-vis ${className}`} style={{ backgroundImage: `url(${src})` }} role="img" aria-label={`Photo from a past ${c.label}`} />;
    return (
        <div className={`up-vis up-vis--poster ${className}`} style={{ background: c.color }} aria-hidden="true">
            <CategoryIcon cat={ev.category} size={30} />
        </div>
    );
}

const timeText = (ev: CalEvent) => [parts(ev.date).dow, ev.time].filter(Boolean).join(' · ');

// ---------------------------------------------------------------- A: agenda
export function VariantA({ showCabinet }: { showCabinet: boolean }) {
    const all = useMemo(() => upcoming(showCabinet), [showCabinet]);
    const [filter, setFilter] = useState<Category | 'all'>('all');
    const present = Array.from(new Set(all.map((ev) => ev.category)));
    const list = all.filter((ev) => filter === 'all' || ev.category === filter);
    return (
        <section className="up up-a" aria-label="Upcoming events">
            <h2 className="up-h">Upcoming events</h2>
            <div className="up-chips">
                <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>All</button>
                {present.map((cat) => (
                    <button key={cat} type="button" className={filter === cat ? 'is-on' : ''} onClick={() => setFilter(cat)}>
                        <CategoryIcon cat={cat} size={14} />{categories[cat].label}
                    </button>
                ))}
            </div>
            <ul className="up-a__list">
                {list.slice(0, 8).map((ev) => {
                    const p = parts(ev.date);
                    return (
                        <li key={ev.id} className="up-a__row">
                            <div className="up-a__date" style={{ borderColor: categories[ev.category].color }}>
                                <small>{p.mon}</small><strong>{p.day}</strong>
                            </div>
                            <div className="up-a__body">
                                <b>{ev.title}</b>
                                <span>{timeText(ev)} · {when(ev.date)}</span>
                                <Tag cat={ev.category} />
                            </div>
                            <Visual ev={ev} className="up-a__thumb" />
                        </li>
                    );
                })}
            </ul>
            {list.length > 8 && <p className="up-more">+ {list.length - 8} more this month</p>}
        </section>
    );
}

// ------------------------------------------------------------ B: spotlight
export function VariantB({ showCabinet }: { showCabinet: boolean }) {
    const all = useMemo(() => upcoming(showCabinet).filter((ev) => ev.category !== 'cabinet' && ev.category !== 'tabling'), [showCabinet]);
    const [hero, ...rest] = all;
    if (!hero) return null;
    const p = parts(hero.date);
    return (
        <section className="up up-b" aria-label="Upcoming events">
            <h2 className="up-h">Coming up</h2>
            <article className="up-b__hero">
                <Visual ev={hero} className="up-b__heroimg" />
                <div className="up-b__scrim" />
                <div className="up-b__herotext">
                    <Tag cat={hero.category} />
                    <h3>{hero.title}</h3>
                    <p>{p.dow}, {p.mon} {p.day}{hero.time ? ` · ${hero.time}` : ''} — <b>{when(hero.date)}</b></p>
                </div>
            </article>
            <div className="up-b__strip" role="list">
                {rest.slice(0, 8).map((ev) => {
                    const q = parts(ev.date);
                    return (
                        <article key={ev.id} role="listitem" className="up-b__card">
                            <Visual ev={ev} className="up-b__cardimg" />
                            <div className="up-b__badge">{q.mon} {q.day}</div>
                            <div className="up-b__cardtext">
                                <b>{ev.title}</b>
                                <Tag cat={ev.category} />
                            </div>
                        </article>
                    );
                })}
            </div>
            <p className="up-note">Tabling and Cabinet meetings are hidden here, shown in the calendar view instead.</p>
        </section>
    );
}

// --------------------------------------------------------- C: month grid
export function VariantC({ showCabinet }: { showCabinet: boolean }) {
    const all = useMemo(() => upcoming(showCabinet), [showCabinet]);
    const t = today();
    const [y, m] = t.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    const iso = (d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const byDay = (d: number) => all.filter((ev) => ev.date === iso(d));
    const [sel, setSel] = useState<string>(all[0]?.date ?? t);
    const chosen = all.filter((ev) => ev.date === sel);
    const sp = parts(sel);
    return (
        <section className="up up-c" aria-label="Upcoming events">
            <h2 className="up-h">{first.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div className="up-c__grid" role="grid">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="up-c__dow">{d}</div>)}
                {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const evs = byDay(d);
                    const past = iso(d) < t;
                    return (
                        <button key={i} type="button" disabled={!evs.length}
                            className={`up-c__day${iso(d) === sel ? ' is-sel' : ''}${iso(d) === t ? ' is-today' : ''}${past ? ' is-past' : ''}`}
                            onClick={() => setSel(iso(d))}>
                            <span>{d}</span>
                            <i>{evs.slice(0, 3).map((ev) => <u key={ev.id} style={{ background: categories[ev.category].color }} />)}</i>
                        </button>
                    );
                })}
            </div>
            <div className="up-c__legend">
                {Array.from(new Set(all.map((ev) => ev.category))).map((cat) => (
                    <span key={cat}><u style={{ background: categories[cat].color }} />{categories[cat].label}</span>
                ))}
            </div>
            <div className="up-c__detail">
                <h3>{sp.dow}, {sp.mon} {sp.day} <small>{daysAway(sel) >= 0 ? when(sel) : ''}</small></h3>
                {chosen.length === 0 && <p className="up-note">Pick a highlighted day.</p>}
                {chosen.map((ev) => (
                    <div key={ev.id} className="up-c__ev">
                        <Visual ev={ev} className="up-c__img" />
                        <div><b>{ev.title}</b><span>{ev.time ?? 'All day'}</span><Tag cat={ev.category} /></div>
                    </div>
                ))}
            </div>
        </section>
    );
}
