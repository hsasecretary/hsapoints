import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { buildIdOf, isOutdated, mayReloadForChunk } from '../../lib/appVersion';

const CHECK_EVERY_MS = 10 * 60 * 1000;
const CHUNK_RELOAD_KEY = 'hsa:chunk-reload-at';

// Keeps an open tab on the live build (lib/appVersion.ts). Renders nothing.
//   - Every 10 minutes, and whenever the tab comes back into view, compares
//     this build with /version.json. A newer one is picked up at the next
//     change of page: that throws away what was on screen anyway, so it's the
//     one moment a reload can't cost a Member a half-filled form. A timer that
//     reloaded on its own could, and going to another app to take a photo for
//     a Point Request hides the tab, so being hidden isn't safe either.
//   - A page chunk that fails to load (an old tab asking for a file the new
//     build no longer has) reloads once instead of leaving a blank page.
function AppUpdates() {
    const { pathname } = useLocation();
    const outdated = useRef(false);

    useEffect(() => {
        // The dev server has no /version.json, and reloads itself anyway.
        if (import.meta.env.DEV) return undefined;
        let stopped = false;
        const check = async () => {
            if (document.hidden || outdated.current) return;
            try {
                const response = await fetch('/version.json', { cache: 'no-store' });
                if (!response.ok) return;
                if (!stopped && isOutdated(__BUILD_ID__, buildIdOf(await response.json()))) outdated.current = true;
            } catch {
                // Offline, or not a version file: try again next time.
            }
        };
        check();
        const timer = window.setInterval(check, CHECK_EVERY_MS);
        const onVisible = () => { if (!document.hidden) check(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            stopped = true;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    useEffect(() => {
        if (outdated.current) window.location.reload();
    }, [pathname]);

    useEffect(() => {
        const onPreloadError = (event: Event) => {
            let last: number | null;
            try {
                last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY)) || null;
            } catch {
                // Storage blocked: without it a reload can't tell it's looping, so don't.
                return;
            }
            const now = Date.now();
            if (!mayReloadForChunk(last, now)) return;
            event.preventDefault();
            try {
                sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
            } catch {
                return;
            }
            window.location.reload();
        };
        window.addEventListener('vite:preloadError', onPreloadError);
        return () => window.removeEventListener('vite:preloadError', onPreloadError);
    }, []);

    return null;
}

export default AppUpdates;
