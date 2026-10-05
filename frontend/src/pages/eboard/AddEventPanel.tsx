// "Add an event" on the User Lookup: E-Board credits a Member with an event
// they attended but didn't redeem, with no Point Request (an Entered
// Attendance, see CONTEXT.md). Pick a code or give an event with no code,
// read what it will change, confirm.
import { useMemo, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import type { Member } from '../../lib/computeStanding';
import { enterAttendance, planEntry, type EntryInput } from '../../lib/enterAttendance';
import { entryEffect, type EntryEffect, type StandingFacts } from '../../lib/memberLookup';
import { isHeldToCabinetRules } from '../../lib/members';
import { eventType, rubric } from '../../lib/rubric';
import { academicYear, shortDate } from '../../lib/semester';

const NO_CODE = '';

function plural(n: number, word: string) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** What E-Board reads before confirming: the points, and any Missed Event, Make-up or Strike it changes. */
function effectText(effect: EntryEffect, cabinet: boolean): string {
    const lines = [`Adds ${plural(effect.vePoints, 'VE Point')}${cabinet ? ` and ${plural(effect.cabinetPoints, 'Cabinet Point')}` : ''}.`];
    if (effect.cleared.length) lines.push(`${effect.cleared.join(', ')} is no longer a Missed Event.`);
    if (effect.madeUp.length) lines.push(`It makes up ${effect.madeUp.join(', ')}.`);
    if (effect.strikesCleared > 0) lines.push(`Clears ${plural(effect.strikesCleared, 'open Strike')}.`);
    return lines.join(' ');
}

function AddEventPanel({ email, standingFacts, cabinet }: { email: string; standingFacts: StandingFacts; cabinet: boolean }) {
    const { member, attendances, codes, today } = standingFacts;
    const [codeId, setCodeId] = useState(NO_CODE);
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [typeId, setTypeId] = useState('');
    const [hours, setHours] = useState('1');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const held = isHeldToCabinetRules(member as Member);
    const has = useMemo(() => new Set(attendances.map((attendance) => attendance.codeId?.toUpperCase()).filter(Boolean)), [attendances]);
    // Codes for events that have happened and the Member doesn't have yet (a removed one can be entered again).
    const pickable = useMemo(() => codes
        .filter((code) => code.eventTypeId && code.eventDate <= today && !has.has(code.id.toUpperCase()) && (held || !eventType(code.eventTypeId)?.cabinetOnly))
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || a.id.localeCompare(b.id)), [codes, today, has, held]);
    const types = useMemo(() => rubric.filter((type) => held || !type.cabinetOnly), [held]);
    const { start } = academicYear(today);
    const removed = (id: string) => Boolean((member as Member).removedCheckIns?.[id.toUpperCase()]);

    const chosen = typeId ? eventType(typeId) : undefined;
    const input: EntryInput | null = codeId !== NO_CODE
        ? { codeId, note }
        : { name, date, eventTypeId: typeId, hours: Number(hours), note };
    const plan = useMemo(() => {
        const code = codeId !== NO_CODE ? codes.find((row) => row.id === codeId) ?? null : null;
        return planEntry(email, member as Member, input, code, { by: 'preview', today, entryId: 'preview' });
    }, [email, member, codes, codeId, name, date, typeId, hours, today]);
    const effect = useMemo(() => (plan.ok ? entryEffect(standingFacts, plan.attendances) : null), [plan, standingFacts]);

    const save = async () => {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const result = await enterAttendance(db, email, input, { by: auth.currentUser?.email?.toLowerCase() ?? 'E-Board', today });
            if ('error' in result) {
                setError(result.error);
            } else {
                setMessage(`Added ${codeId !== NO_CODE ? codeId : name.trim()}. It counts like a code check-in, and the Member sees it as entered by E-Board.`);
                setCodeId(NO_CODE);
                setName('');
                setDate('');
                setTypeId('');
                setHours('1');
                setNote('');
            }
        } catch (err) {
            console.error('Error entering attendance:', err);
            setError("Couldn't save it. Try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <details className="ulk-panel">
            <summary>
                <h4>Add an event</h4>
                <span className="ulk-muted">For an event they attended but didn&apos;t redeem</span>
            </summary>
            <div className="ulk-add">
                <label htmlFor="add-event-pick">Event</label>
                <select id="add-event-pick" value={codeId} onChange={(e) => { setCodeId(e.target.value); setError(''); setMessage(''); }}>
                    <option value={NO_CODE}>An event with no code</option>
                    {pickable.map((code) => (
                        <option key={code.id} value={code.id}>
                            {code.event || code.id} · {shortDate(code.eventDate)} · {eventType(code.eventTypeId!)?.label}{removed(code.id) ? ' (check-in removed)' : ''}
                        </option>
                    ))}
                </select>

                {codeId === NO_CODE && (
                    <>
                        <label htmlFor="add-event-name">Event name</label>
                        <input id="add-event-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
                        <label htmlFor="add-event-date">Date</label>
                        <input id="add-event-date" type="date" value={date} min={start} max={today} onChange={(e) => setDate(e.target.value)} />
                        <label htmlFor="add-event-type">Event Type</label>
                        <select id="add-event-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                            <option value="">Pick one</option>
                            {types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                        </select>
                        {chosen?.perHour && (
                            <>
                                <label htmlFor="add-event-hours">Hours tabled</label>
                                <input id="add-event-hours" type="number" min={1} step={1} value={hours} onChange={(e) => setHours(e.target.value)} />
                            </>
                        )}
                    </>
                )}

                <label htmlFor="add-event-note">Note (optional, the Member sees this)</label>
                <textarea id="add-event-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

                {plan.ok && effect && <p className="ulk-add__effect">{effectText(effect, cabinet)}</p>}
                {error && <p className="ulk-add__error" role="alert">{error}</p>}
                {message && <p className="ulk-muted" role="status">{message}</p>}
                <div>
                    <button type="button" className="ulk-add__confirm" disabled={saving || !plan.ok} onClick={save}>
                        {saving ? 'Adding…' : 'Add event'}
                    </button>
                </div>
            </div>
        </details>
    );
}

export default AddEventPanel;
