import React, { useEffect, useRef, useState } from 'react';

// The HSA logo in faint teal with a light band sweeping across it at a constant
// speed. Fades in after a short delay (see .loading-screen in base.css), so a
// load that finishes almost instantly never flashes it.
export default function LoadingScreen({ fullPage = false }: { fullPage?: boolean }) {
    return (
        <div className={`loading-screen${fullPage ? ' loading-screen--page' : ''}`} role="status" aria-label="Loading">
            <div className="loading-screen__logo">
                <div className="loading-screen__base" />
                <div className="loading-screen__shine" />
            </div>
        </div>
    );
}

// True while `loading` is true, then a little longer if the screen was already
// showing, so it doesn't blink away the instant it appeared. Pair with the CSS
// fade-in delay: a load shorter than `delayMs` shows nothing and holds nothing.
export function useMinLoadingTime(loading: boolean, delayMs = 150, minMs = 600) {
    const [held, setHeld] = useState(loading);
    const shownAt = useRef<number | null>(null);

    useEffect(() => {
        if (loading) {
            setHeld(true);
            const timer = setTimeout(() => { shownAt.current = Date.now(); }, delayMs);
            return () => clearTimeout(timer);
        }
        if (shownAt.current === null) {
            setHeld(false);
            return;
        }
        const left = shownAt.current + minMs - Date.now();
        shownAt.current = null;
        if (left <= 0) {
            setHeld(false);
            return;
        }
        const timer = setTimeout(() => setHeld(false), left);
        return () => clearTimeout(timer);
    }, [loading, delayMs, minMs]);

    return loading || held;
}
