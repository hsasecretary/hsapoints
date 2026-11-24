// Deleting a point E-Board put there itself, on User Lookup: an Entered
// Attendance (added with "Add an event") or an Adjustment added by hand. A
// Delete button that asks once before it goes; there is no reason to give,
// since the Member never saw it as a decision. Code check-ins and Point
// Requests have their own forms (RemoveCheckInForm, RevokeForm).
import { useState } from 'react';
import { db } from '../../../lib/firebase';
import { deleteAdjustment, deleteEnteredPoint, type DeleteResult } from '../../../lib/deletePoint';
import type { LookupRow } from '../../../lib/memberLookup';

type DeletePointButtonProps = {
    email: string;
    row: LookupRow;
    /** After it's deleted. */
    onDeleted?: (message: string) => void;
};

function DeletePointButton({ email, row, onDeleted }: DeletePointButtonProps) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (!open) {
        return <button type="button" className="danger-form__open" onClick={() => setOpen(true)}>Delete</button>;
    }

    const run = async (): Promise<DeleteResult> => (row.source === 'adjustment'
        ? deleteAdjustment(db, email, { points: row.vePoints, note: row.name === 'Adjustment from E-Board' ? '' : row.name, date: row.date })
        : deleteEnteredPoint(db, row.id));

    const remove = async () => {
        setSaving(true);
        setError('');
        try {
            const result = await run();
            if (result.ok === false) setError(result.error);
            else onDeleted?.(`Deleted ${row.name}.`);
        } catch (err) {
            console.error('Error deleting point:', err);
            setError("Couldn't delete it. Try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="danger-form">
            <p className="danger-form__hint">
                Deletes {row.name} and takes back its {row.vePoints} VE Point{Math.abs(row.vePoints) === 1 ? '' : 's'}. This can&apos;t be undone.
            </p>
            {error && <p className="danger-form__error" role="alert">{error}</p>}
            <div className="danger-form__actions">
                <button type="button" className="danger-form__cancel" disabled={saving} onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
                <button type="button" className="danger-form__confirm" disabled={saving} onClick={remove}>
                    {saving ? 'Deleting…' : 'Delete'}
                </button>
            </div>
        </div>
    );
}

export default DeletePointButton;
