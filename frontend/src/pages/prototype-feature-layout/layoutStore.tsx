import { useEffect, useSyncExternalStore } from 'react';

// PROTOTYPE (throwaway, branch prototype/feature-layout).
// Question: where do Leaderboard, Closet, Upcoming Events and Excuse Requests
// live without crowding the phone tab bar or burying them in a long Dashboard?
// Five site-wide layouts, switchable from the floating bar (or ← →). The pick
// is kept in sessionStorage so it survives moving between pages; ?layout=X in
// any URL sets it too, so a variant can be shared as a link.

export const LAYOUTS = {
    S: 'Stacked: all on Dashboard',
    A: 'Regrouped tabs',
    B: 'Events tab + cards (research pick)',
    C: 'Check-in button + You tab',
    D: 'Explore grid',
    F: 'Agreed: A + Dashboard cards',
} as const;
export type Layout = keyof typeof LAYOUTS;
const KEYS = Object.keys(LAYOUTS) as Layout[];
const STORE_KEY = 'proto-feature-layout';

const isLayout = (v: string | null): v is Layout => !!v && (KEYS as string[]).includes(v);

function initial(): Layout {
    const fromUrl = new URLSearchParams(window.location.search).get('layout');
    if (isLayout(fromUrl)) return fromUrl;
    try {
        const saved = sessionStorage.getItem(STORE_KEY);
        if (isLayout(saved)) return saved;
    } catch { /* private mode */ }
    return 'F';
}

let current: Layout = initial();
const listeners = new Set<() => void>();

export function setLayout(next: Layout) {
    current = next;
    try { sessionStorage.setItem(STORE_KEY, next); } catch { /* private mode */ }
    const url = new URL(window.location.href);
    url.searchParams.set('layout', next);
    window.history.replaceState(window.history.state, '', url);
    listeners.forEach((l) => l());
}

export function useLayout(): Layout {
    return useSyncExternalStore(
        (l) => { listeners.add(l); return () => listeners.delete(l); },
        () => current,
    );
}

export function LayoutSwitcher() {
    const layout = useLayout();
    const i = KEYS.indexOf(layout);
    const prev = () => setLayout(KEYS[(i - 1 + KEYS.length) % KEYS.length]);
    const next = () => setLayout(KEYS[(i + 1) % KEYS.length]);

    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            if ((ev.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
            if (ev.key === 'ArrowLeft') prev();
            if (ev.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (import.meta.env.PROD) return null;
    return (
        <div className="proto-bar" role="group" aria-label="Prototype layouts">
            <button type="button" aria-label="Previous layout" onClick={prev}>←</button>
            <span><b>{layout}</b> {LAYOUTS[layout]}</span>
            <button type="button" aria-label="Next layout" onClick={next}>→</button>
        </div>
    );
}
