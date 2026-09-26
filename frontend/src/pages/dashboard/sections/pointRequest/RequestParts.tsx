// The Submit Point Request form's fields (#47 variant C): which event, the
// Make-up picker, the proof, and the "If E-Board approves it" preview. The
// flow that shows them is PointRequestForm.
import type { Code, MissedEvent } from '../../../../lib/computeStanding';
import {
    MAX_HOURS, NOT_LISTED, type EventChoices, type RequestPreview, type TypeChoice,
} from '../../../../lib/pointRequests';
import { eventType } from '../../../../lib/rubric';
import { shortDate } from '../../../../lib/semester';
import PhotoField from '../PhotoField';

/** What the Member has typed or picked on top of where they started. */
export type Fields = {
    codeId: string | null;
    /** A coded Event Type, but E-Board never made a code for this event. */
    unlisted: boolean;
    name: string;
    date: string;
    hours: number;
    note: string;
    /** One Make-up pick per Attendance; null is "Pick for me". */
    picks: (string | null)[];
    photo: string;
};

export const emptyFields = (): Fields => ({
    codeId: null, unlisted: false, name: '', date: '', hours: 1, note: '', picks: [], photo: '',
});

export type SetFields = (patch: Partial<Fields>) => void;

/** A Missed Event as the Member sees it: never whether it was excused. */
export type OwedEvent = Pick<MissedEvent, 'codeId' | 'eventDate' | 'strike'> & { name: string };

/** "Pick for me" order: oldest miss with a Strike first, then the oldest other one (#42). */
export function autoOrder<T extends OwedEvent>(owed: T[]): T[] {
    return [...owed].sort((a, b) =>
        a.strike === b.strike ? a.eventDate.localeCompare(b.eventDate) : a.strike ? -1 : 1);
}

export const pts = (n: number, what: string) => `${n} ${what} Point${n === 1 ? '' : 's'}`;

// Which event (coded types), or a name and date (code-less types, Other and
// Not listed), plus hours for Tabling.
export function EventDetails({ choice, choices, fields, set, owed, today }: {
    choice: TypeChoice;
    choices: EventChoices;
    fields: Fields;
    set: SetFields;
    owed: OwedEvent[];
    today: string;
}) {
    if (choice.id === NOT_LISTED) return <NameAndDate fields={fields} set={set} today={today} label="What was it?" />;
    const perHour = choice.eventTypeIds.length === 1 && eventType(choice.eventTypeIds[0])?.perHour;

    if (choices.codeless) {
        return (
            <>
                <NameAndDate fields={fields} set={set} today={today}
                    placeholder={perHour ? 'e.g. Turlington, fundraiser table' : undefined} />
                {perHour && (
                    <div className="req-field">
                        <span className="req-label" id="hours-label">Hours tabled</span>
                        <div className="req-stepper" role="group" aria-labelledby="hours-label">
                            <button type="button" aria-label="Fewer hours" disabled={fields.hours <= 1}
                                onClick={() => set({ hours: Math.max(1, fields.hours - 1) })}>−</button>
                            <output aria-live="polite">{fields.hours} hour{fields.hours === 1 ? '' : 's'}</output>
                            <button type="button" aria-label="More hours" disabled={fields.hours >= MAX_HOURS}
                                onClick={() => set({ hours: Math.min(MAX_HOURS, fields.hours + 1) })}>+</button>
                        </div>
                        <p className="req-hint">Each hour counts as its own event.</p>
                    </div>
                )}
            </>
        );
    }

    return (
        <>
            <div className="req-field">
                <span className="req-label" id="which-event">Which {choice.label}?</span>
                {choices.codes.length === 0 && !choices.other && (
                    <p className="req-hint">No past {choice.label} events you haven't already been credited for.</p>
                )}
                {(choices.codes.length > 0 || choices.other) && (
                    <div className="req-events" role="radiogroup" aria-labelledby="which-event">
                        {choices.codes.map((code) => {
                            const missed = owed.find((row) => row.codeId === code.id);
                            return (
                                <label key={code.id} className={`req-event${fields.codeId === code.id ? ' is-on' : ''}`}>
                                    <input type="radio" name="event" checked={fields.codeId === code.id}
                                        onChange={() => set({ codeId: code.id, unlisted: false, name: '', date: '', note: '', picks: [] })} />
                                    <span className="req-event__name">{code.event || code.id}</span>
                                    <span className="req-event__date">{shortDate(code.eventDate)}</span>
                                    {missed && <span className="req-tag req-tag--miss">Missed{missed.strike ? ' · Strike' : ''}</span>}
                                </label>
                            );
                        })}
                        {choices.other && (
                            <label className={`req-event req-event--other${fields.unlisted ? ' is-on' : ''}`}>
                                <input type="radio" name="event" checked={fields.unlisted}
                                    onChange={() => set({ codeId: null, unlisted: true, picks: [] })} />
                                <span className="req-event__name">Other</span>
                                <span className="req-event__date">Not in this list</span>
                            </label>
                        )}
                    </div>
                )}
                {!choices.other && <p className="req-hint">Every {choice.label} gets a code. If yours isn't here, ask E-Board.</p>}
            </div>
            {fields.unlisted && <NameAndDate fields={fields} set={set} today={today} />}
        </>
    );
}

function NameAndDate({ fields, set, today, label = 'Event name', placeholder = 'e.g. SALSA Noche de Baile' }: {
    fields: Fields; set: SetFields; today: string; label?: string; placeholder?: string;
}) {
    return (
        <div className="req-row">
            <label className="req-field">
                <span className="req-label">{label}</span>
                <input value={fields.name} onChange={(e) => set({ name: e.target.value })} placeholder={placeholder} />
            </label>
            <label className="req-field">
                <span className="req-label">Date</span>
                <input type="date" value={fields.date} max={today} onChange={(e) => set({ date: e.target.value })} />
            </label>
        </div>
    );
}

// "Make up which Missed Event?" for one Surplus Attendance (one per hour for Tabling).
export function MakeupPicker({ legend, name, value, options, auto, onChange }: {
    legend: string;
    /** The radio group's name, unique per hour. */
    name: string;
    value: string | null;
    options: OwedEvent[];
    /** What "Pick for me" would make up, from the preview. */
    auto: OwedEvent | undefined;
    onChange: (codeId: string | null) => void;
}) {
    if (options.length === 0) return null;
    return (
        <fieldset className="req-makeup">
            <legend className="req-label">{legend}</legend>
            <label className={`req-choice${value === null ? ' is-on' : ''}`}>
                <input type="radio" name={name} checked={value === null} onChange={() => onChange(null)} />
                <span>
                    <strong>Pick for me</strong>
                    {auto && <span className="req-hint"> — {auto.name}, {shortDate(auto.eventDate)}{auto.strike ? ', and its Strike' : ''}</span>}
                </span>
            </label>
            {autoOrder(options).map((row) => (
                <label key={row.codeId} className={`req-choice${value === row.codeId ? ' is-on' : ''}`}>
                    <input type="radio" name={name} checked={value === row.codeId} onChange={() => onChange(row.codeId)} />
                    <span>{row.name}, {shortDate(row.eventDate)}</span>
                    {row.strike && <span className="req-tag req-tag--miss">Strike</span>}
                </label>
            ))}
        </fieldset>
    );
}

export function ProofFields({ fields, set, asksNote }: { fields: Fields; set: SetFields; asksNote: boolean }) {
    return (
        <>
            {asksNote && (
                <label className="req-field">
                    <span className="req-label">What did you do?</span>
                    <textarea rows={3} value={fields.note} onChange={(e) => set({ note: e.target.value })}
                        placeholder="Where it was, what you did, who can vouch for you" />
                </label>
            )}
            <PhotoField value={fields.photo} onChange={(photo) => set({ photo })} />
        </>
    );
}

// "If E-Board approves it"
export function PreviewPanel({ held, preview, typeId, count, code, owed }: {
    held: boolean;
    /** Null until the date is in. */
    preview: RequestPreview | null;
    /** Null when E-Board picks the Event Type. */
    typeId: string | null;
    count: number;
    code: Code | undefined;
    owed: OwedEvent[];
}) {
    const type = eventType(typeId ?? '');
    const lines: React.ReactNode[] = [];
    const name = (codeId: string) => owed.find((row) => row.codeId === codeId)?.name ?? codeId;

    if (!type) {
        lines.push('E-Board picks the Event Type when they review it, so the points depend on what they choose.');
    } else {
        const ve = preview?.vePoints ?? type.vePoints * count;
        const cabinet = preview?.cabinetPoints ?? type.cabinetPoints * count;
        lines.push(<>You earn <strong>{held ? `${pts(ve, 'VE')} and ${pts(cabinet, 'Cabinet')}` : pts(ve, 'VE')}</strong>{count > 1 ? ` (${count} hours)` : ''}.</>);
        if (held && preview) {
            const byCode = code && preview.covers.find((row) => row.codeId === code.id);
            if (byCode) {
                lines.push(<>It counts as attending <strong>{name(byCode.codeId)}</strong>, so that Missed Event{byCode.strike ? ' and its Strike clear' : ' clears'}.</>);
            } else if (type.tier === 'semester' && !preview.attendances[0].surplus) {
                lines.push(<>It counts as your {type.label} for this Semester.</>);
            }
            const madeUp = preview.covers.filter((row) => row !== byCode);
            madeUp.forEach((row) => lines.push(
                <>It makes up <strong>{name(row.codeId)}</strong> ({shortDate(row.eventDate)}){row.strike ? ' and clears its Strike' : ''}.</>,
            ));
            const spare = preview.attendances.filter((attendance) => attendance.surplus && !attendance.makeupFor).length;
            if (spare > 0 && madeUp.length > 0) {
                lines.push(`${spare} extra hour${spare === 1 ? '' : 's'} with nothing left to make up.`);
            }
        } else if (held) {
            lines.push('Add the date to see what it makes up.');
        }
    }

    return (
        <aside className="req-preview" aria-live="polite">
            <p className="req-preview__title">If E-Board approves it</p>
            <ul>{lines.map((line, i) => <li key={i}>{line}</li>)}</ul>
        </aside>
    );
}
