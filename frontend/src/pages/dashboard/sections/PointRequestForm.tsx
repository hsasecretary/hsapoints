import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import SectionTitle from '../../../components/ui/SectionTitle';
import type { Code, MissedEvent } from '../../../lib/computeStanding';
import {
    attendanceCount, buildPointRequest, eventChoices, makeupTypeChoices, NOT_LISTED, pickerGroups, previewRequest, typeChoiceFor,
    type RequestDraft, type TypeChoice,
} from '../../../lib/pointRequests';
import { eventType } from '../../../lib/rubric';
import { currentSemester, fromIsoDate, shortDate } from '../../../lib/semester';
import { pendingMakeups, useMemberStanding } from '../useMemberStanding';
import PhotoField from './PhotoField';

// Where the Member starts (variant C, "Start from what you owe"). General
// Members only ever get the search.
type Start =
    | { kind: 'missed'; codeId: string; mode: 'attended' | 'makeup' | null }
    | { kind: 'requirement'; eventTypeId: string }
    | { kind: 'search' };

type EventPick = { kind: 'code'; code: Code } | { kind: 'other' } | null;

const emptyFields = { eventName: '', eventDate: '', note: '', hours: 1 };

function Bubble({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" className={`bubble${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onClick}>
            {children}
        </button>
    );
}

function PointRequestForm() {
    const email = auth.currentUser?.email?.toLowerCase();
    const { loading, member, attendances, codes, pending, standing, today } = useMemberStanding(email);
    const location = useLocation();
    // The Strikes page's "Make it up" links here with the Missed Event.
    const makeupFrom = (location.state as { makeup?: string } | null)?.makeup;
    const formRef = useRef<HTMLDivElement>(null);

    const [start, setStart] = useState<Start | null>(makeupFrom ? { kind: 'missed', codeId: makeupFrom, mode: null } : null);
    const [typeChoice, setTypeChoice] = useState<TypeChoice | null>(null);
    const [eventPick, setEventPick] = useState<EventPick>(null);
    const [search, setSearch] = useState('');
    const [fields, setFields] = useState(emptyFields);
    // One per Attendance; undefined until the Member touches it.
    const [picks, setPicks] = useState<(string | null | undefined)[]>([]);
    const [photo, setPhoto] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (makeupFrom) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [makeupFrom]);

    if (loading) {
        return (
            <div className="point-request" aria-busy="true">
                <SectionTitle>Submit Point Request</SectionTitle>
                <p className="description">Loading your events…</p>
            </div>
        );
    }

    const held = standing.heldToCabinetRules;
    const from: Start | null = held ? start : { kind: 'search' };
    const codeById = new Map(codes.map((code) => [code.id, code]));
    const owed = standing.missedEvents.filter((missed) => missed.owed);
    const pendingPicks = pendingMakeups(pending);
    const missedLabel = (missed: Pick<MissedEvent, 'codeId' | 'eventTypeId' | 'eventDate'>) =>
        `${codeById.get(missed.codeId)?.event || eventType(missed.eventTypeId)?.label} · ${shortDate(missed.eventDate)}`;
    const semester = currentSemester(fromIsoDate(today)) === 'springPoints' ? 'spring' : 'fall';
    const openRequirements = standing.semesterRequirements[semester].filter((requirement) => !requirement.met);
    const missed = from?.kind === 'missed' ? owed.find((row) => row.codeId === from.codeId) : undefined;
    const iWasThere = from?.kind === 'missed' && from.mode === 'attended' && missed;
    const choices = typeChoice
        ? eventChoices(typeChoice, { codes, attendances, pendingCodeIds: [...pendingPicks], today })
        : null;
    const notListed = typeChoice?.id === NOT_LISTED;
    const pickedCode = iWasThere ? codeById.get(missed.codeId) : eventPick?.kind === 'code' ? eventPick.code : null;
    const readyForDetails = Boolean(iWasThere || (typeChoice && (eventPick || choices.codeless || notListed)));
    const perHour = Boolean(typeChoice && typeChoice.eventTypeIds.length === 1 && eventType(typeChoice.eventTypeIds[0])?.perHour);
    const asksNote = readyForDetails && !pickedCode;

    // Changing an earlier answer clears the ones after it.
    const reset = (level: 'type' | 'event' | 'details') => {
        if (level === 'type') setTypeChoice(null);
        if (level !== 'details') setEventPick(null);
        setFields(emptyFields);
        setPicks([]);
    };
    const chooseStart = (next: Start) => {
        setStart(next);
        reset('type');
        if (next.kind === 'requirement') setTypeChoice(typeChoiceFor(next.eventTypeId));
    };
    const chooseType = (choice: TypeChoice) => {
        setTypeChoice(choice);
        reset('event');
    };

    const baseDraft: Omit<RequestDraft, 'makeupFor'> = {
        typeChoiceId: iWasThere ? missed.eventTypeId : typeChoice?.id ?? null,
        codeId: pickedCode?.id ?? null,
        eventTypeId: pickedCode?.eventTypeId
            ?? (typeChoice && typeChoice.eventTypeIds.length === 1 ? typeChoice.eventTypeIds[0] : null),
        eventName: fields.eventName,
        eventDate: pickedCode?.eventDate ?? fields.eventDate,
        note: fields.note,
        hours: fields.hours,
        photo,
    };
    const options = { email, today };
    // Starting from a Missed Event, the first Surplus hour makes it up
    // unless the Member picks otherwise.
    const firstPass = readyForDetails
        ? previewRequest(member, attendances, codes, { ...baseDraft, makeupFor: picks.map((pick) => pick ?? null) }, options)
        : null;
    const defaultIndex = firstPass?.attendances.findIndex((attendance) => attendance.surplus) ?? -1;
    const makeupFor = (firstPass?.attendances ?? [{}]).map((_, i) => {
        if (picks[i] !== undefined) return picks[i];
        return from?.kind === 'missed' && from.mode === 'makeup' && i === defaultIndex ? from.codeId : null;
    });
    const draft: RequestDraft = { ...baseDraft, makeupFor };
    const preview = readyForDetails ? previewRequest(member, attendances, codes, draft, options) : null;
    const knownType = eventType(draft.eventTypeId ?? '');

    const setPick = (index: number, value: string | null) =>
        setPicks((current) => {
            const next = [...current];
            next[index] = value;
            return next;
        });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        const built = buildPointRequest(draft, { email, codes, today });
        if (built.ok === false) {
            setMessage({ text: built.error, type: 'error' });
            return;
        }
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'pointRequests'), { ...built.data, submittedAt: serverTimestamp() });
            setMessage({ text: 'Request sent. E-Board will review it; check My Requests for the result.', type: 'success' });
            setStart(null);
            reset('type');
            setSearch('');
            setPhoto('');
        } catch (error) {
            console.error('Error submitting request:', error);
            setMessage({ text: 'Your request could not be sent. Please try again.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const term = search.trim().toLowerCase();
    const searchGroups = pickerGroups(held)
        .map((group) => ({ ...group, choices: group.choices.filter((choice) => choice.label.toLowerCase().includes(term)) }))
        .filter((group) => group.choices.length > 0);
    const typeBubbles = (list: TypeChoice[]) => list.map((choice) => (
        <Bubble key={choice.id} selected={typeChoice?.id === choice.id} onClick={() => chooseType(choice)}>{choice.label}</Bubble>
    ));

    return (
        <div className="point-request" ref={formRef}>
            <div className="point-request__head">
                <SectionTitle>Submit Point Request</SectionTitle>
                {held && (
                    <Link to="/strikes" className={`strikes-button${standing.openStrikes >= 3 ? ' is-at-risk' : ''}`}>
                        Strikes <span className="strikes-button__count">{standing.openStrikes}</span>
                    </Link>
                )}
            </div>
            <p className="description">
                Went to an event but didn't check in with its code? Send a photo and E-Board will add it.
            </p>

            {message.text && <div className={`message ${message.type}`} role="status">{message.text}</div>}

            <form onSubmit={handleSubmit} className="request-form">
                {held && (
                    <fieldset className="request-step">
                        <legend>What's this for?</legend>
                        {owed.length > 0 && (
                            <div className="request-step__group">
                                <h4>Missed Events</h4>
                                <div className="bubbles">
                                    {owed.map((row) => (
                                        <Bubble key={row.codeId} selected={from?.kind === 'missed' && from.codeId === row.codeId}
                                            onClick={() => chooseStart({ kind: 'missed', codeId: row.codeId, mode: null })}>
                                            {missedLabel(row)}
                                            {row.strike && <span className="tag tag--strike">Strike</span>}
                                            {pendingPicks.has(row.codeId) && <span className="tag">Pending review</span>}
                                        </Bubble>
                                    ))}
                                </div>
                            </div>
                        )}
                        {openRequirements.length > 0 && (
                            <div className="request-step__group">
                                <h4>Semester Requirements you still need</h4>
                                <div className="bubbles">
                                    {openRequirements.map((requirement) => (
                                        <Bubble key={requirement.eventTypeId}
                                            selected={from?.kind === 'requirement' && from.eventTypeId === requirement.eventTypeId}
                                            onClick={() => chooseStart({ kind: 'requirement', eventTypeId: requirement.eventTypeId })}>
                                            {eventType(requirement.eventTypeId)?.label}
                                        </Bubble>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="bubbles">
                            <Bubble selected={from?.kind === 'search'} onClick={() => chooseStart({ kind: 'search' })}>
                                Something else
                            </Bubble>
                        </div>
                    </fieldset>
                )}

                {from?.kind === 'missed' && missed && (
                    <fieldset className="request-step">
                        <legend>{missedLabel(missed)}</legend>
                        <div className="bubbles">
                            <Bubble selected={from.mode === 'attended'} onClick={() => { setStart({ ...from, mode: 'attended' }); reset('type'); }}>
                                I was there
                            </Bubble>
                            <Bubble selected={from.mode === 'makeup'} onClick={() => { setStart({ ...from, mode: 'makeup' }); reset('type'); }}>
                                I made it up at another event
                            </Bubble>
                        </div>
                    </fieldset>
                )}

                {from?.kind === 'missed' && from.mode === 'makeup' && (
                    <fieldset className="request-step">
                        <legend>Which kind of event?</legend>
                        <div className="bubbles">{typeBubbles(makeupTypeChoices(member, attendances, codes, options))}</div>
                    </fieldset>
                )}

                {from?.kind === 'search' && (
                    <fieldset className="request-step">
                        <legend>Which kind of event?</legend>
                        <input type="search" className="request-step__search" placeholder="Search events" aria-label="Search events"
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                        {searchGroups.map((group) => (
                            <div key={group.label} className="request-step__group">
                                <h4>{group.label}</h4>
                                <div className="bubbles">{typeBubbles(group.choices)}</div>
                            </div>
                        ))}
                        <div className="bubbles">
                            {typeBubbles([{ id: NOT_LISTED, label: 'Not listed', eventTypeIds: [] }])}
                        </div>
                    </fieldset>
                )}

                {choices && !choices.codeless && !notListed && (
                    <fieldset className="request-step">
                        <legend>Which event?</legend>
                        {choices.codes.length === 0 && !choices.other && (
                            <p className="help-text">No {typeChoice.label} events are waiting for you this year.</p>
                        )}
                        <div className="bubbles">
                            {choices.codes.map((code) => (
                                <Bubble key={code.id} selected={eventPick?.kind === 'code' && eventPick.code.id === code.id}
                                    onClick={() => { setEventPick({ kind: 'code', code }); reset('details'); }}>
                                    {code.event || code.id} · {shortDate(code.eventDate)}
                                </Bubble>
                            ))}
                            {choices.other && (
                                <Bubble selected={eventPick?.kind === 'other'} onClick={() => { setEventPick({ kind: 'other' }); reset('details'); }}>
                                    Other
                                </Bubble>
                            )}
                        </div>
                    </fieldset>
                )}

                {readyForDetails && (
                    <>
                        {asksNote && !perHour && (
                            <div className="form-group">
                                <label htmlFor="eventName">Event name</label>
                                <input id="eventName" type="text" value={fields.eventName}
                                    onChange={(e) => setFields({ ...fields, eventName: e.target.value })} />
                            </div>
                        )}
                        {asksNote && (
                            <div className={`form-row${perHour ? '' : ' form-row--single'}`}>
                                <div className="form-group">
                                    <label htmlFor="eventDate">Date</label>
                                    <input id="eventDate" type="date" max={today} value={fields.eventDate}
                                        onChange={(e) => setFields({ ...fields, eventDate: e.target.value })} />
                                </div>
                                {perHour && (
                                    <div className="form-group">
                                        <label htmlFor="hours">Hours</label>
                                        <input id="hours" type="number" min={1} max={12} step={1} value={fields.hours}
                                            onChange={(e) => setFields({ ...fields, hours: Number(e.target.value) })} />
                                    </div>
                                )}
                            </div>
                        )}
                        {asksNote && (
                            <div className="form-group">
                                <label htmlFor="note">What did you do?</label>
                                <textarea id="note" rows={3} value={fields.note}
                                    onChange={(e) => setFields({ ...fields, note: e.target.value })} />
                            </div>
                        )}

                        {held && preview?.attendances.map((attendance, i) => attendance.surplus && (
                            <div className="form-group" key={i}>
                                <label htmlFor={`makeup-${i}`}>
                                    {preview.attendances.length > 1 ? `Hour ${i + 1} makes up` : 'This makes up'}
                                </label>
                                <select id={`makeup-${i}`} value={makeupFor[i] ?? ''} onChange={(e) => setPick(i, e.target.value || null)}>
                                    <option value="">
                                        Pick for me{!makeupFor[i] && attendance.makeupFor
                                            ? ` (${missedLabel(owed.find((row) => row.codeId === attendance.makeupFor))})` : ''}
                                    </option>
                                    {owed.map((row) => (
                                        <option key={row.codeId} value={row.codeId}>
                                            {missedLabel(row)}{row.strike ? ' (Strike)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}

                        <PhotoField value={photo} onChange={setPhoto} />

                        <div className="request-preview" aria-live="polite">
                            <h4>If E-Board approves it</h4>
                            {preview ? (
                                <>
                                    <p>
                                        +{preview.vePoints} VE {preview.vePoints === 1 ? 'Point' : 'Points'}
                                        {held && ` · +${preview.cabinetPoints} Cabinet ${preview.cabinetPoints === 1 ? 'Point' : 'Points'}`}
                                    </p>
                                    {held && preview.covers.length > 0 && (
                                        <ul>
                                            {preview.covers.map((row) => (
                                                <li key={row.codeId}>
                                                    Makes up {missedLabel(row)}{row.strike ? ' and clears its Strike' : ''}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            ) : knownType ? (
                                <p>
                                    +{knownType.vePoints * attendanceCount(draft)} VE {knownType.vePoints * attendanceCount(draft) === 1 ? 'Point' : 'Points'}
                                    {held && '. Add the date to see what it makes up.'}
                                </p>
                            ) : (
                                <p>E-Board will pick the Event Type, and its points, when they review it.</p>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="submit" disabled={submitting} className="submit-button">
                                {submitting ? 'Sending…' : 'Submit Request'}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}

export default PointRequestForm;
