import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// PROTOTYPE (throwaway): floating variant bar; the arrow keys also cycle.
export function useVariant(keys: string[]) {
    const [params, setParams] = useSearchParams();
    const current = keys.includes(params.get('variant') ?? '') ? params.get('variant')! : keys[0];
    const go = (key: string) => {
        const next = new URLSearchParams(params);
        next.set('variant', key);
        setParams(next, { replace: true });
    };
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            if ((ev.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
            const i = keys.indexOf(current);
            if (ev.key === 'ArrowLeft') go(keys[(i - 1 + keys.length) % keys.length]);
            if (ev.key === 'ArrowRight') go(keys[(i + 1) % keys.length]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    return { current, go };
}

export default function PrototypeSwitcher({ names, current, go }: { names: Record<string, string>; current: string; go: (k: string) => void }) {
    if (import.meta.env.PROD) return null;
    const keys = Object.keys(names);
    const i = keys.indexOf(current);
    return (
        <div className="proto-bar" role="group" aria-label="Prototype variants">
            <button type="button" aria-label="Previous variant" onClick={() => go(keys[(i - 1 + keys.length) % keys.length])}>←</button>
            <span><b>{current}</b> ({names[current]})</span>
            <button type="button" aria-label="Next variant" onClick={() => go(keys[(i + 1) % keys.length])}>→</button>
        </div>
    );
}
