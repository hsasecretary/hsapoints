import { useState } from 'react';
import { db } from '../../../lib/firebase';
import { deleteCode, updateCode, type CodeRow as Code } from '../../../lib/eventCodes';
import { eventType } from '../../../lib/rubric';
import DatePicker from './DatePicker';
import EventTypeSelect from './EventTypeSelect';
import TypeFacts from './TypeFacts';

type CodeRowProps = {
    code: Code;
    today: string;
    open: boolean;
    onToggle: () => void;
};

function formatDate(isoDate: string): string {
    if (!isoDate) return 'No date';
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// One code in the list. Tapping it opens it for editing, leading with how
// many people have checked in.
function CodeRow({ code, today, open, onToggle }: CodeRowProps) {
    const type = eventType(code.eventTypeId ?? '');
    const checkedIn = code.attendeeCount ?? 0;
    const detailId = `code-${code.id}`;

    return (
        <li className={`code-row${open ? ' is-open' : ''}`}>
            <button type="button" className="code-row__main" onClick={onToggle} aria-expanded={open} aria-controls={detailId}>
                <span className="code-row__date">{formatDate(code.eventDate)}</span>
                <span className="code-row__code">{code.id}</span>
                <span className="code-row__event">{code.event}</span>
                <span className={`tier-chip${type ? ` tier-chip--${type.tier}` : ' tier-chip--none'}`}>
                    {type ? type.label : 'No Event Type'}
                </span>
                <span className="code-row__count">{checkedIn}<small> count</small></span>
            </button>
            {open && (
                <div id={detailId} className="code-row__detail">
                    <p className="code-row__checked-in">
                        <strong>{checkedIn}</strong>
                        <span>
                            {checkedIn === 1 ? 'person has' : 'people have'} checked in
                            {code.eventDate > today ? ' so far (the event is upcoming)' : ''}
                        </span>
                    </p>
                    <CodeEditForm code={code} onDone={onToggle} />
                </div>
            )}
        </li>
    );
}

function CodeEditForm({ code, onDone }: { code: Code; onDone: () => void }) {
    const [edit, setEdit] = useState({
        event: code.event ?? '',
        eventDate: code.eventDate ?? '',
        eventTypeId: code.eventTypeId ?? '',
        // Old codes store 'None' when no graphic was posted.
        graphicDate: code.graphicDate && code.graphicDate !== 'None' ? code.graphicDate : '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (field: keyof typeof edit, value: string) => {
        setEdit((current) => ({ ...current, [field]: value }));
        setError('');
    };
    const fieldId = (field: string) => `${code.id}-${field}`;

    const run = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
        setSaving(true);
        try {
            const result = await action();
            if ('error' in result) setError(result.error);
            else onDone();
        } catch (err) {
            console.error(`Error saving ${code.id}:`, err);
            setError("Couldn't save. Try again.");
        } finally {
            setSaving(false);
        }
    };

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        run(() => updateCode(db, code.id, edit));
    };

    // Delete asks "are you sure" right in the form instead of a browser dialog.
    const [confirming, setConfirming] = useState(false);
    const remove = () => {
        setConfirming(false);
        run(() => deleteCode(db, code.id));
    };

    return (
        <form className="code-edit" onSubmit={save}>
            <div className="code-edit__fields">
                <label htmlFor={fieldId('event')}>Event name
                    <input id={fieldId('event')} value={edit.event} onChange={(e) => set('event', e.target.value)} />
                </label>
                <DatePicker label="Date" value={edit.eventDate} onChange={(iso) => set('eventDate', iso)} />
                <label htmlFor={fieldId('type')}>Event Type
                    <EventTypeSelect id={fieldId('type')} value={edit.eventTypeId} onChange={(id) => set('eventTypeId', id)} />
                </label>
                <DatePicker label="Graphic posted" optional value={edit.graphicDate} onChange={(iso) => set('graphicDate', iso)} />
            </div>
            <TypeFacts eventTypeId={edit.eventTypeId} eventDate={edit.eventDate} />
            {code.category && !code.eventTypeId && (
                <p className="code-edit__note">Made before Event Types. Old category: {code.category}</p>
            )}
            {error && <p className="code-edit__error" role="alert">{error}</p>}
            {confirming ? (
                <div className="code-edit__confirm" role="alertdialog" aria-labelledby={fieldId('confirm')}>
                    <p id={fieldId('confirm')}>Delete <strong>{code.id}</strong>? This can't be undone.</p>
                    <button type="button" className="code-edit__confirm-delete" onClick={remove}>Yes, delete</button>
                    <button type="button" className="link-button" onClick={() => setConfirming(false)} autoFocus>Keep it</button>
                </div>
            ) : (
                <div className="code-edit__actions">
                    <button type="submit" className="code-edit__save" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    <button type="button" className="link-button" onClick={onDone}>Cancel</button>
                    <button type="button" className="link-button link-button--danger code-edit__delete"
                        onClick={() => { setConfirming(true); setError(''); }} disabled={saving}>
                        Delete code
                    </button>
                </div>
            )}
        </form>
    );
}

export default CodeRow;
