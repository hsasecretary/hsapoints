import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// Shown after the cut-over (#78) until the Member dismisses it: points are
// calculated a new way, and the How it works bubble explains it. Dismissing
// is saved on their account (users/{email}.newPointSystemBannerDismissed), so
// it stays gone on every device and browser; the browser copy hides it
// straight away on the next visit, before the account loads.
const DISMISSED_KEY = 'hsa-new-point-system-banner';
export const DISMISSED_FIELD = 'newPointSystemBannerDismissed';

function wasDismissed() {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
}

function remember() {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* shown again next visit */ }
}

type BannerProps = {
    /** The signed-in Member's own email: where the dismissal is saved. */
    email: string;
    /** Their users/{email} doc, or null while it loads. */
    member: Record<string, unknown> | null;
    onOpenGuide: () => void;
};

function NewPointSystemBanner({ email, member, onOpenGuide }: BannerProps) {
    const [hidden, setHidden] = useState(wasDismissed);
    // Wait for the account, so a Member who dismissed it elsewhere never sees it flash.
    if (hidden || !member || member[DISMISSED_FIELD] === true) return null;

    const dismiss = () => {
        remember();
        setHidden(true);
        updateDoc(doc(db, 'users', email.toLowerCase()), { [DISMISSED_FIELD]: true })
            .catch((err) => console.error('Error saving the banner dismissal:', err));
    };

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
