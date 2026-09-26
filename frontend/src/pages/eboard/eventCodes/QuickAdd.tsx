import { useState } from 'react';
import { db } from '../../../lib/firebase';
import { createCode, suggestCode } from '../../../lib/eventCodes';
import { eventType } from '../../../lib/rubric';
import { toIsoDate } from '../../../lib/semester';
import EventTypeSelect from './EventTypeSelect';
import DatePicker from './DatePicker';
import TypeFacts from './TypeFacts';

const blank = { event: '', code: '', eventDate: '', eventTypeId: '', graphicDate: '' };

// The sticky row that adds a code: name (the code fills itself in), date,
// Event Type, Enter. The graphic date waits under "More".
function QuickAdd() {
    const [row, setRow] = useState({ ...blank, eventDate: toIsoDate(new Date()) });
    // Once E-Board types a code, the name stops overwriting it.
    const [codeTyped, setCodeTyped] = useState(false);
    const [more, setMore] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);

    const set = (field: keyof typeof blank, value: string) => {
        setRow((current) => ({ ...current, [field]: value }));
        setStatus(null);
    };

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const result = await createCode(db, row);
            if ('error' in result) {
                setStatus({ text: result.error, error: true });
                return;
            }
            const type = eventType(row.eventTypeId);
            setStatus({ text: `Added ${result.id}: ${type.label}, ${type.cabinetPoints} Cabinet / ${type.vePoints} VE.`, error: false });
            // Keep the date: codes often come in batches for the same day.
            setRow({ ...blank, eventDate: row.eventDate });
            setCodeTyped(false);
        } catch (error) {
            console.error('Error adding code:', error);
            setStatus({ text: "Couldn't add the code. Try again.", error: true });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="quick-add" onSubmit={add} aria-label="Add a code">
            <input aria-label="Event name" placeholder="New event name" className="quick-add__name" value={row.event}
                onChange={(e) => {
                    const event = e.target.value;
                    setRow((current) => ({ ...current, event, code: codeTyped ? current.code : suggestCode(event) }));
                    setStatus(null);
                }} />
            <input aria-label="Code" placeholder="CODE" className="quick-add__code" value={row.code}
                onChange={(e) => { set('code', e.target.value.toUpperCase()); setCodeTyped(true); }} />
            <DatePicker label="Event date" hideLabel className="quick-add__date" value={row.eventDate}
                onChange={(iso) => set('eventDate', iso)} />
            <EventTypeSelect value={row.eventTypeId} onChange={(id) => set('eventTypeId', id)} />
            <button type="submit" className="quick-add__submit" disabled={saving}>{saving ? 'Adding…' : 'Add code'}</button>
            <button type="button" className="link-button quick-add__more-toggle" onClick={() => setMore((open) => !open)}
                aria-expanded={more} aria-controls="quick-add-more">
                {more ? 'Less' : 'More'}
            </button>
            {more && (
                <div id="quick-add-more" className="quick-add__more">
                    <DatePicker label="Graphic posted" optional value={row.graphicDate} onChange={(iso) => set('graphicDate', iso)} />
                </div>
            )}
            <div className="quick-add__status" role="status">
                {status?.error ? <span className="quick-add__error">{status.text}</span>
                    : row.eventTypeId ? <TypeFacts eventTypeId={row.eventTypeId} eventDate={row.eventDate} />
                    : status?.text ?? 'Press Enter to add. The code fills in from the name.'}
            </div>
        </form>
    );
}

export default QuickAdd;
