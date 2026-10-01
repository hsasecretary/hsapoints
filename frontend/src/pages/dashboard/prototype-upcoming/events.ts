// PROTOTYPE (throwaway) — sample data standing in for the Google Calendar feed.
// Real version: fetch the public UF HSA calendar, parse `title` + `start`, then
// look the tag up by event id/title in a hand-kept table (no LLM, E-Board tags it).
import gbmScreen from './photos/gbm-screen.jpg';
import gbmCrowd from './photos/gbm-crowd.jpg';

export type Category =
    | 'gbm' | 'hlhm' | 'mlp' | 'opa' | 'fundraiser' | 'service' | 'social' | 'cabinet' | 'tabling' | 'other';

export const categories: Record<Category, { label: string; color: string; glyph: string }> = {
    gbm:        { label: 'GBM',        color: '#155776', glyph: '🎤' },
    hlhm:       { label: 'HLHM',       color: '#b45309', glyph: '💃' },
    mlp:        { label: 'MLP',        color: '#6d28d9', glyph: '🌱' },
    opa:        { label: 'OPA',        color: '#166534', glyph: '🗳️' },
    fundraiser: { label: 'Fundraiser', color: '#be123c', glyph: '💸' },
    service:    { label: 'Service',    color: '#0f766e', glyph: '🤝' },
    social:     { label: 'Social',     color: '#c2410c', glyph: '🎉' },
    cabinet:    { label: 'Cabinet',    color: '#334155', glyph: '📋' },
    tabling:    { label: 'Tabling',    color: '#4d7c0f', glyph: '🪑' },
    other:      { label: 'Other',      color: '#475569', glyph: '📅' },
};

/** Past-year photos, per category. Only GBM has any yet; the rest fall back to a poster tile. */
export const photoPool: Partial<Record<Category, string[]>> = {
    gbm: [gbmScreen, gbmCrowd],
};

export interface CalEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    time?: string;
    category: Category;
    cabinetOnly?: boolean;
    /** Hand-picked photo for this one event (overrides the pool). */
    photo?: string;
    /** Calendar noise (NO SCHOOL, football): stays in the feed, never shown. */
    hidden?: boolean;
    /** Repeats weekly; collapsed into one line instead of a row per week. */
    recurring?: string;
}

const e = (id: string, date: string, title: string, category: Category, extra: Partial<CalEvent> = {}): CalEvent =>
    ({ id, date, title, category, ...extra });

// Straight from the October 2026 screenshot of the HSA Master Calendar.
export const events: CalEvent[] = [
    e('1', '2026-09-30', 'Solidarity Session #1', 'opa', { time: '5:30pm' }),
    e('2', '2026-10-01', 'Cabinet', 'cabinet', { time: '7pm', cabinetOnly: true, recurring: 'Cabinet, most Thursdays 7pm' }),
    e('3', '2026-10-02', 'Familia Fridays', 'tabling', { time: '10am', recurring: 'Every Friday, 10am' }),
    e('4', '2026-10-02', 'Mochinut x DM fundraiser', 'fundraiser', { time: '5pm' }),
    e('5', '2026-10-03', 'HLHM Color Run 5K', 'hlhm'),
    e('6', '2026-10-07', 'MLP Opus fundraiser', 'fundraiser'),
    e('7', '2026-10-07', 'Volleyball Tournament', 'social'),
    e('8', '2026-10-08', 'HLHM Pageant (tentative)', 'hlhm'),
    e('9', '2026-10-08', 'Cabinet', 'cabinet', { time: '7pm', cabinetOnly: true, recurring: 'Cabinet, most Thursdays 7pm' }),
    e('10', '2026-10-09', 'Homecoming parade', 'other', { hidden: true }),
    e('11', '2026-10-09', 'NO SCHOOL', 'other', { hidden: true }),
    e('12', '2026-10-10', 'LWL Food Drive', 'service'),
    e('13', '2026-10-10', 'UF v South Carolina', 'other', { hidden: true }),
    e('14', '2026-10-11', 'HLHM Domino Tournament', 'hlhm'),
    e('15', '2026-10-13', 'MLP Cabinet Rush', 'mlp'),
    e('16', '2026-10-15', 'HLHM Closing Ceremony', 'hlhm'),
    e('17', '2026-10-16', 'Familia Fridays', 'tabling', { time: '10am', recurring: 'Every Friday, 10am' }),
    e('18', '2026-10-18', 'MLP Mentor Reveal', 'mlp'),
    e('19', '2026-10-19', 'MLP Monday', 'mlp'),
    e('20', '2026-10-19', 'E-Board Pie Fundraiser', 'fundraiser', { time: '11am' }),
    e('21', '2026-10-20', 'MLP Flip Factor Fundraiser', 'fundraiser'),
    e('22', '2026-10-21', 'Cardmaking (MLP x HSA x DSA)', 'social'),
    e('23', '2026-10-22', 'GBM #3: Date Night', 'gbm', { photo: gbmCrowd }),
    e('24', '2026-10-22', 'Cabinet', 'cabinet', { time: '7pm', cabinetOnly: true, recurring: 'Cabinet, most Thursdays 7pm' }),
    e('25', '2026-10-23', 'Familia Fridays', 'tabling', { time: '10am', recurring: 'Every Friday, 10am' }),
    e('26', '2026-10-26', 'OPA Week', 'opa'),
    e('27', '2026-10-27', 'OPA Know Your Ballot', 'opa'),
    e('28', '2026-10-28', 'Solidarity Session x MLP IMA', 'opa'),
    e('29', '2026-10-29', 'Early Voting Party', 'opa'),
    e('30', '2026-10-29', 'Cabinet', 'cabinet', { time: '7pm', cabinetOnly: true, recurring: 'Cabinet, most Thursdays 7pm' }),
    e('31', '2026-10-30', 'Community Outreach event', 'service'),
    e('32', '2026-10-30', 'Familia Fridays', 'tabling', { time: '10am', recurring: 'Every Friday, 10am' }),
];

const pad = (n: number) => String(n).padStart(2, '0');
export const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Upcoming, visible events in date order. `showCabinet` mirrors the Cabinet view. */
export function upcoming(showCabinet: boolean): CalEvent[] {
    const t = today();
    return events
        .filter((ev) => !ev.hidden && ev.date >= t && (showCabinet || !ev.cabinetOnly))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export function photoFor(ev: CalEvent): string | undefined {
    if (ev.photo) return ev.photo;
    const pool = photoPool[ev.category];
    return pool?.length ? pool[Number(ev.id) % pool.length] : undefined;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const parts = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    return { mon: MONTHS[d.getMonth()], day: d.getDate(), dow: DAYS[d.getDay()], d };
};
export const daysAway = (iso: string) =>
    Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(`${today()}T12:00:00`).getTime()) / 86400000);
export const when = (iso: string) => {
    const n = daysAway(iso);
    return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`;
};
