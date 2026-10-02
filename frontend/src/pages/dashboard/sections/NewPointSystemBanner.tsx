import { useState } from 'react';

// Shown once per browser after the cut-over (#78): points are calculated a
// new way, and the How it works bubble explains it.
const DISMISSED_KEY = 'hsa-new-point-system-banner';

function wasDismissed() {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
}

function remember() {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* shown again next visit */ }
}

function NewPointSystemBanner({ onOpenGuide }: { onOpenGuide: () => void }) {
    const [hidden, setHidden] = useState(wasDismissed);
    if (hidden) return null;

    const dismiss = () => { remember(); setHidden(true); };

    return (
        <aside className="ov-banner" aria-label="New point system">
            <p>
                <strong>HSA points work differently now.</strong> Your points are counted from the events you attended.
            </p>
            <div className="ov-banner__actions">
                <button type="button" onClick={() => { onOpenGuide(); dismiss(); }}>See how it works</button>
                <button type="button" className="ov-banner__dismiss" onClick={dismiss}>Dismiss</button>
            </div>
        </aside>
    );
}

export default NewPointSystemBanner;
