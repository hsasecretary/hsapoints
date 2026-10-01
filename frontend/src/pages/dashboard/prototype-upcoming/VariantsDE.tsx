import { useMemo, useState } from 'react';
import CategoryIcon from './CategoryIcon';
import { Category, CalEvent, categories, daysAway, parts, upcoming, when } from './events';
import { Tag, VariantC } from './Variants';

// PROTOTYPE (throwaway). D and E come from docs/research/upcoming-events-mobile-ux.md:
// vertical only, rows >= 56px, fixed-ratio visuals, own-photo-or-tile (no random
// category photo), recurring events collapsed into one line.

function Tile({ ev, className = '' }: { ev: CalEvent; className?: string }) {
    const c = categories[ev.category];
    if (ev.photo) return <div className={`up-vis ${className}`} style={{ backgroundImage: `url(${ev.photo})` }} role="img" aria-label={`Photo from ${ev.title}`} />;
    return (
        <div className={`up-vis up-vis--poster ${className}`} style={{ background: c.color }} aria-hidden="true">
            <CategoryIcon cat={ev.category} size={28} />
        </div>
    );
}

const dateHeader = (iso: string) => { const p = parts(iso); return `${p.dow}, ${p.mon} ${p.day}`; };

function Row({ ev }: { ev: CalEvent }) {
    const [open, setOpen] = useState(false);
    return (
        <li className="up-d__row">
            <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
                <div className="up-d__main">
                    <b>{ev.title}</b>
                    <span>{ev.time ?? 'All day'}</span>
                    <Tag cat={ev.category} />
                </div>
                <Tile ev={ev} className="up-d__tile" />
            </button>
            {open && (
                <div className="up-d__more">
                    <p>{dateHeader(ev.date)} · {ev.time ?? 'All day'} · {when(ev.date)}</p>
                    <a href="#add-to-calendar" onClick={(x) => x.preventDefault()}>Add to calendar</a>
                </div>
            )}
        </li>
    );
}

function Recurring({ list }: { list: CalEvent[] }) {
    const lines = Array.from(new Set(list.filter((ev) => ev.recurring).map((ev) => ev.recurring!)));
    return lines.length ? <p className="up-d__recur">Repeats: {lines.join('; ')}</p> : null;
}

// D: Next up card + agenda grouped under date headers.
export function VariantD({ showCabinet }: { showCabinet: boolean }) {
    const all = useMemo(() => upcoming(showCabinet), [showCabinet]);
    const [shown, setShown] = useState(6);
    const [next, ...rest] = all.filter((ev) => !ev.recurring);
    if (!next) return <section className="up"><h2 className="up-h">Upcoming events</h2><p className="up-note">Nothing scheduled yet. Check back soon.</p></section>;
    const groups: [string, CalEvent[]][] = [];
    rest.slice(0, shown).forEach((ev) => {
        const g = groups[groups.length - 1];
        if (g && g[0] === ev.date) g[1].push(ev); else groups.push([ev.date, [ev]]);
    });
    return (
        <section className="up up-d" aria-label="Upcoming events">
            <h2 className="up-h">Upcoming events</h2>
            <article className="up-d__next">
                <Tile ev={next} className="up-d__nextimg" />
                <div className="up-d__scrim" />
                <div className="up-d__nexttext">
                    <small>Next up · {when(next.date)}</small>
                    <h3>{next.title}</h3>
                    <p>{dateHeader(next.date)}{next.time ? ` · ${next.time}` : ''}</p>
                </div>
            </article>
            {groups.map(([date, evs]) => (
                <div key={date}>
                    <h3 className="up-d__date">{dateHeader(date)}</h3>
                    <ul className="up-d__list">{evs.map((ev) => <Row key={ev.id} ev={ev} />)}</ul>
                </div>
            ))}
            {rest.length > shown && <button type="button" className="up-d__btn" onClick={() => setShown(shown + 6)}>Show more ({rest.length - shown})</button>}
            <Recurring list={all} />
        </section>
    );
}

// E: Today / This week / Later, filter in a bottom sheet, month grid behind a link.
export function VariantE({ showCabinet }: { showCabinet: boolean }) {
    const everything = useMemo(() => upcoming(showCabinet), [showCabinet]);
    const all = everything.filter((ev) => !ev.recurring);
    const cats = Array.from(new Set(all.map((ev) => ev.category)));
    const [off, setOff] = useState<Category[]>([]);
    const [sheet, setSheet] = useState(false);
    const [month, setMonth] = useState(false);
    const [laterOpen, setLaterOpen] = useState(false);
    if (month) {
        return (
            <div className="up">
                <button type="button" className="up-e__link" onClick={() => setMonth(false)}>← Back to list</button>
                <VariantC showCabinet={showCabinet} />
            </div>
        );
    }
    const list = all.filter((ev) => !off.includes(ev.category));
    const within = (a: number, b: number) => list.filter((ev) => daysAway(ev.date) >= a && daysAway(ev.date) <= b);
    const sections: [string, CalEvent[]][] = [['Today', within(0, 0)], ['This week', within(1, 7)]];
    const later = within(8, 999);
    return (
        <section className="up up-d up-e" aria-label="Upcoming events">
            <div className="up-e__head">
                <h2 className="up-h">Upcoming events</h2>
                <button type="button" className="up-e__filter" onClick={() => setSheet(true)}>
                    Filter{off.length ? ` (${cats.length - off.length}/${cats.length})` : ''}
                </button>
            </div>
            {sections.filter(([, evs]) => evs.length).map(([name, evs]) => (
                <div key={name}>
                    <h3 className="up-d__date">{name}</h3>
                    <ul className="up-d__list">{evs.map((ev) => <Row key={ev.id} ev={ev} />)}</ul>
                </div>
            ))}
            {later.length > 0 && (
                <div>
                    <h3 className="up-d__date">Later</h3>
                    {laterOpen
                        ? <ul className="up-d__list">{later.map((ev) => <Row key={ev.id} ev={ev} />)}</ul>
                        : <button type="button" className="up-d__btn" onClick={() => setLaterOpen(true)}>Show {later.length} more</button>}
                </div>
            )}
            <button type="button" className="up-e__link" onClick={() => setMonth(true)}>Month view →</button>
            <Recurring list={everything} />
            {sheet && (
                <div className="up-e__scrim" onClick={() => setSheet(false)}>
                    <div className="up-e__sheet" role="dialog" aria-label="Filter events" onClick={(x) => x.stopPropagation()}>
                        <h3>Show categories</h3>
                        {cats.map((cat) => (
                            <label key={cat}>
                                <input type="checkbox" checked={!off.includes(cat)}
                                    onChange={() => setOff(off.includes(cat) ? off.filter((c) => c !== cat) : [...off, cat])} />
                                <CategoryIcon cat={cat} size={18} />{categories[cat].label}
                            </label>
                        ))}
                        <button type="button" className="up-d__btn" onClick={() => setSheet(false)}>Done</button>
                    </div>
                </div>
            )}
        </section>
    );
}
