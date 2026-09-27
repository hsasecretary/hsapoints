// Taking back an approved Point Request, on Point Request Review and User
// Lookup: a Revoke button that opens a reason box, since the Member sees why.
import { useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import { revokeRequest } from '../../../lib/requestReview';

type RevokeFormProps = {
    requestId: string;
    /** What it earned, for the confirm button. */
    points?: number;
    /** After it's revoked. */
    onRevoked?: (message: string) => void;
};

function RevokeForm({ requestId, points, onRevoked }: RevokeFormProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (!open) {
        return (
            <button type="button" className="danger-form__open" onClick={() => setOpen(true)}>Revoke</button>
        );
    }

    const revoke = async () => {
        setSaving(true);
        setError('');
        try {
            const result = await revokeRequest(db, requestId, reason, auth.currentUser?.email ?? 'E-Board');
            if ('error' in result) setError(result.error);
            else {
                setOpen(false);
                onRevoked?.('Revoked. The Member sees it as denied, with your reason.');
            }
        } catch (err) {
            console.error('Error revoking request:', err);
            setError("Couldn't revoke it. Try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="danger-form">
            <p className="danger-form__hint">
                Takes back {points ? `the ${points} point${points === 1 ? '' : 's'} it earned` : 'what it earned'} and marks it denied. Anything it made up is owed again, so a Strike can come back.
            </p>
            <label htmlFor={`revoke-${requestId}`}>Reason (the Member sees this)</label>
            <textarea id={`revoke-${requestId}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            {error && <p className="danger-form__error" role="alert">{error}</p>}
            <div className="danger-form__actions">
                <button type="button" className="danger-form__cancel" disabled={saving} onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
                <button type="button" className="danger-form__confirm" disabled={saving} onClick={revoke}>
                    {saving ? 'Revoking…' : 'Revoke'}
                </button>
            </div>
        </div>
    );
}

export default RevokeForm;
