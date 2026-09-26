// Submit Point Request, variant C "Start from what you owe" (#47, #71).
// Cabinet Members start from a Missed Event or a Semester Requirement they
// still need, and the tier is never asked: it's implied by where they
// started. "Something else" is a search over every Event Type, and it's all
// General Members get. A Strikes button next to the title opens the Strikes
// view (?view=strikes) in place of the form.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { AT_RISK_STRIKES } from '../../../lib/computeStanding';
import {
    attendanceCount, buildPointRequest, eventChoices, makeupTypeChoices, missedEventName, NOT_LISTED, pickerGroups,
    previewRequest, typeChoiceFor, type RequestDraft, type TypeChoice,
} from '../../../lib/pointRequests';
import { eventType, tierLabels } from '../../../lib/rubric';
import { semesterOf, shortDate } from '../../../lib/semester';
import { pendingMakeups, useMemberStanding } from '../useMemberStanding';
import {
    autoOrder, emptyFields, EventDetails, MakeupPicker, PreviewPanel, ProofFields, type Fields, type OwedEvent,
} from './pointRequest/RequestParts';
import StrikesView from './pointRequest/StrikesView';

type Start =
    | { kind: 'missed'; codeId: string; path: 'attended' | 'makeup' | null }
    | { kind: 'requirement'; eventTypeId: string }
    | { kind: 'search' }
    | null;

const NOT_LISTED_CHOICE: TypeChoice = { id: NOT_LISTED, label: 'Not listed', eventTypeIds: [] };

function PointRequestForm() {
    const email = auth.currentUser?.email?.toLowerCase();
    const { loading, member, attendances, codes, pending, standing, today } = useMemberStanding(email);
    const [start, setStart] = useState<Start>(null);
    const [choice, setChoice] = useState<TypeChoice | null>(null);
    const [query, setQuery] = useState('');
    const [fields, setFieldsState] = useState<Fields>(emptyFields());
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [params, setParams] = useSearchParams();
    const cardRef = useRef<HTMLDivElement>(null);
    const showStrikes = params.get('view') === 'strikes';

    // The card sits below the rest of the dashboard: keep it in view when
    // switching between the form and the Strikes view.
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            if (!showStrikes) return;
        }
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [showStrikes]);

    if (loading) {
        return (
            <div className="point-request req" aria-busy="true">
                <h2 className="req-title">Submit Point Request</h2>
                <p className="req-lede">Loading your events…</p>
            </div>
        );
    }

    const cabinet = standing.heldToCabinetRules;
    const from: Start = cabinet ? start : { kind: 'search' };
    const set = (patch: Partial<Fields>) => setFieldsState((current) => ({ ...current, ...patch }));
    const reset = (next: Start, nextChoice: TypeChoice | null = null) => {
        setStart(next);
        setChoice(nextChoice);
        setFieldsState(emptyFields());
        setQuery('');
    };
    const setView = (strikes: boolean) => {
        const updated = new URLSearchParams(params);
        if (strikes) updated.set('view', 'strikes'); else updated.delete('view');
        setParams(updated);
    };

    // What the Member owes, as they see it: never whether a miss was excused.
    const owed: OwedEvent[] = standing.missedEvents
        .filter((missed) => missed.owed)
        .map((missed) => ({ codeId: missed.codeId, eventDate: missed.eventDate, strike: missed.strike, name: missedEventName(codes, missed) }));
    const pendingPicks = pendingMakeups(pending);
    const startMiss = from?.kind === 'missed' ? owed.find((row) => row.codeId === from.codeId) : undefined;
    const openRequirements = standing.semesterRequirements[semesterOf(today)].filter((requirement) => !requirement.met);
    const codeById = new Map(codes.map((code) => [code.id, code]));

    if (showStrikes && cabinet) {
        return (
            <div ref={cardRef}>
                <StrikesView strikes={autoOrder(owed.filter((row) => row.strike))} pending={pendingPicks}
                    onBack={() => setView(false)}
                    onMakeUp={(codeId) => { reset({ kind: 'missed', codeId, path: null }); setView(false); }} />
            </div>
        );
    }

    // The request as it stands.
    const choices = choice
        ? eventChoices(choice, { codes, attendances, pendingCodeIds: pending.map((request) => request.codeId).filter(Boolean), today })
        : null;
    const code = fields.codeId ? codeById.get(fields.codeId) : undefined;
    const typeId = code?.eventTypeId ?? (choice?.eventTypeIds.length === 1 ? choice.eventTypeIds[0] : null);
    const baseDraft: RequestDraft = {
        typeChoiceId: choice?.id ?? null,
        codeId: code?.id ?? null,
        eventTypeId: typeId,
        eventName: fields.name,
        eventDate: code?.eventDate ?? fields.date,
        note: fields.note,
        hours: fields.hours,
        makeupFor: [],
        photo: fields.photo,
    };
    const count = attendanceCount(baseDraft);
    // OPA's two Event Types are worth the same, so its points show before E-Board confirms which.
    const sameWorth = (choice?.eventTypeIds ?? []).map(eventType)
        .every((type, _, all) => type.vePoints === all[0].vePoints && type.cabinetPoints === all[0].cabinetPoints);
    const pointsTypeId = typeId ?? (choice?.eventTypeIds.length && sameWorth ? choice.eventTypeIds[0] : null);
    const options = { email, today };
    // Only a Surplus Attendance can be a Make-up. Starting from a Missed
    // Event, the first Surplus one makes up that miss; any others (more
    // Tabling hours) get their own pick.
    const firstPass = choice ? previewRequest(member, attendances, codes, { ...baseDraft, makeupFor: fields.picks }, options) : null;
    const fixedIndex = from?.kind === 'missed' && from.path === 'makeup'
        ? firstPass?.attendances.findIndex((attendance) => attendance.surplus) ?? -1
        : -1;
    const makeupFor = Array.from({ length: count }, (_, i) => {
        if (!firstPass?.attendances[i]?.surplus) return null;
        if (i === fixedIndex) return from.kind === 'missed' ? from.codeId : null;
        return fields.picks[i] ?? null;
    });
    const draft: RequestDraft = { ...baseDraft, makeupFor };
    const preview = choice ? previewRequest(member, attendances, codes, draft, options) : null;
    const built = choice ? buildPointRequest(draft, { email, codes, today }) : null;
    const setPick = (index: number, codeId: string | null) => {
        const picks = [...fields.picks];
        picks[index] = codeId;
        set({ picks });
    };

    const submit = async () => {
        if (!built || built.ok === false) return;
        setSending(true);
        setMessage({ text: '', type: '' });
        try {
            await addDoc(collection(db, 'pointRequests'), { ...built.data, submittedAt: serverTimestamp() });
            setMessage({ text: 'Request sent. E-Board will review it; check My Requests for the result.', type: 'success' });
            reset(null);
        } catch (error) {
            console.error('Error submitting request:', error);
            setMessage({ text: 'Your request could not be sent. Please try again.', type: 'error' });
        } finally {
            setSending(false);
        }
    };

    const chipNote = (option: TypeChoice) => {
        if (option.id === NOT_LISTED) return 'E-Board decides';
        const type = eventType(option.eventTypeIds[0]);
        const worth = cabinet ? tierLabels[type.tier].split(' ')[0] : `${type.vePoints} pt${type.vePoints === 1 ? '' : 's'}`;
        return `${worth}${type.perHour ? ' · per hr' : ''}`;
    };
    const typePicker = (groups: { label: string; choices: TypeChoice[] }[], withNotListed: boolean) => (
        <div className="req-field">
            <span className="req-label">What did you go to?</span>
            {groups.map((group) => (
                <div key={group.label} className="req-chipgroup">
                    {group.label && <span className="req-chipgroup__label">{group.label}</span>}
                    <div className="req-chips">
                        {group.choices.map((option) => (
                            <button key={option.id} type="button" className={`req-chip${choice?.id === option.id ? ' is-on' : ''}`}
                                aria-pressed={choice?.id === option.id}
                                onClick={() => { setChoice(option); setFieldsState(emptyFields()); }}>
                                {option.label}
                                <span className="req-chip__pts">{chipNote(option)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            {withNotListed && (
                <div className="req-chips">
                    <button type="button" className={`req-chip req-chip--other${choice?.id === NOT_LISTED ? ' is-on' : ''}`}
                        aria-pressed={choice?.id === NOT_LISTED}
                        onClick={() => { setChoice(NOT_LISTED_CHOICE); setFieldsState(emptyFields()); }}>
                        Not listed<span className="req-chip__pts">{chipNote(NOT_LISTED_CHOICE)}</span>
                    </button>
                </div>
            )}
        </div>
    );

    let lead: React.ReactNode = null;
    if (from?.kind === 'missed' && startMiss && from.path === null) {
        lead = (
            <div className="req-fork">
                <p className="req-c__lead">
                    You missed <strong>{startMiss.name}</strong> on {shortDate(startMiss.eventDate)}{startMiss.strike ? ' and got a Strike' : ''}.
                </p>
                <button type="button" className="req-forkbtn" onClick={() => {
                    setStart({ ...from, path: 'attended' });
                    setChoice(typeChoiceFor(codeById.get(from.codeId)?.eventTypeId));
                    setFieldsState({ ...emptyFields(), codeId: from.codeId });
                }}>
                    <strong>I was there</strong>
                    <span>I just didn't get the code in. Send proof and it counts as attending.</span>
                </button>
                <button type="button" className="req-forkbtn" onClick={() => { setStart({ ...from, path: 'makeup' }); setChoice(null); }}>
                    <strong>I made it up at another event</strong>
                    <span>An Additional Event, or an extra one of something you've already done this Semester.</span>
                </button>
            </div>
        );
    } else if (from?.kind === 'missed' && startMiss && from.path === 'makeup') {
        lead = (
            <>
                <p className="req-c__lead">Making up <strong>{startMiss.name}</strong>{startMiss.strike ? ' and its Strike' : ''}.</p>
                {typePicker([{ label: '', choices: makeupTypeChoices(member, attendances, codes, options) }], false)}
            </>
        );
    } else if (from?.kind === 'missed' && startMiss && from.path === 'attended') {
        lead = <p className="req-c__lead">Requesting credit for <strong>{startMiss.name}</strong>, {shortDate(startMiss.eventDate)}.</p>;
    } else if (from?.kind === 'requirement') {
        lead = <p className="req-c__lead">Requesting your <strong>{eventType(from.eventTypeId)?.label}</strong> for this Semester.</p>;
    } else if (from?.kind === 'search') {
        const term = query.trim().toLowerCase();
        const groups = pickerGroups(cabinet)
            .map((group) => ({ ...group, choices: group.choices.filter((option) => option.label.toLowerCase().includes(term)) }))
            .filter((group) => group.choices.length > 0);
        lead = (
            <>
                <label className="req-field">
                    <span className="req-label">Find the Event Type</span>
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="GBM, tabling, fundraiser…" />
                </label>
                {typePicker(groups, true)}
            </>
        );
    }

    const strikeCount = owed.filter((row) => row.strike).length;
    // Other hours' picks, and misses a pending request already names, aren't offered again.
    const pickOptions = (index: number) => owed.filter((row) =>
        row.codeId !== draft.codeId && !pendingPicks.has(row.codeId)
        && !makeupFor.some((pick, i) => i !== index && pick === row.codeId));

    return (
        <div ref={cardRef} className={`point-request req req-c${cabinet ? '' : ' req-c--general'}`}>
            <div className="req-c__head">
                <h2 className="req-title">Submit Point Request</h2>
                {cabinet && (
                    <button type="button" className={`req-strikebtn${strikeCount >= AT_RISK_STRIKES ? ' is-over' : ''}`} onClick={() => setView(true)}>
                        Strikes<span className="req-strikebtn__n" aria-label={`${strikeCount} open`}>{strikeCount}</span>
                    </button>
                )}
            </div>
            <p className="req-lede">
                Went to something and didn't get the code in? Pick what it was for, then send a photo.
                {cabinet && ' Making up a Missed Event clears its Strike too.'}
            </p>
            {message.text && <p className={`req-message req-message--${message.type}`} role="status">{message.text}</p>}

            <div className="req-c__grid">
                {cabinet && (
                    <nav className="req-owe" aria-label="What you still need">
                        <p className="req-owe__h">Missed Events</p>
                        {owed.length === 0 && <p className="req-hint">None. Nice.</p>}
                        {autoOrder(owed).map((row) => (
                            <button key={row.codeId} type="button"
                                className={`req-owe__row${from?.kind === 'missed' && from.codeId === row.codeId ? ' is-on' : ''}`}
                                aria-pressed={from?.kind === 'missed' && from.codeId === row.codeId}
                                onClick={() => reset({ kind: 'missed', codeId: row.codeId, path: null })}>
                                <span>{row.name}</span>
                                <span className="req-owe__meta">
                                    {shortDate(row.eventDate)}
                                    {pendingPicks.has(row.codeId)
                                        ? <span className="req-tag req-tag--pending">Pending</span>
                                        : row.strike ? <span className="req-tag req-tag--miss">Strike</span> : null}
                                </span>
                            </button>
                        ))}

                        {openRequirements.length > 0 && <p className="req-owe__h">Still needed this Semester</p>}
                        {openRequirements.map((requirement) => (
                            <button key={requirement.eventTypeId} type="button"
                                className={`req-owe__row${from?.kind === 'requirement' && from.eventTypeId === requirement.eventTypeId ? ' is-on' : ''}`}
                                aria-pressed={from?.kind === 'requirement' && from.eventTypeId === requirement.eventTypeId}
                                onClick={() => reset({ kind: 'requirement', eventTypeId: requirement.eventTypeId }, typeChoiceFor(requirement.eventTypeId))}>
                                <span>{eventType(requirement.eventTypeId)?.label}</span>
                            </button>
                        ))}

                        <button type="button" className={`req-owe__row req-owe__row--other${from?.kind === 'search' ? ' is-on' : ''}`}
                            aria-pressed={from?.kind === 'search'} onClick={() => reset({ kind: 'search' })}>
                            <span>Something else</span>
                        </button>
                    </nav>
                )}

                <div className="req-c__form">
                    {!from && <p className="req-c__empty">Start from a Missed Event or something you still need this Semester.</p>}
                    {lead}
                    {choice && (from?.kind !== 'missed' || from.path !== null) && (
                        <>
                            <EventDetails choice={choice} choices={choices} fields={fields} set={set} owed={cabinet ? owed : []} today={today} />
                            {cabinet && makeupFor.map((_, i) => firstPass?.attendances[i]?.surplus && i !== fixedIndex && (
                                <MakeupPicker key={i} name={`makeup-${i}`} value={makeupFor[i]} options={pickOptions(i)}
                                    auto={makeupFor[i] ? undefined : owed.find((row) => row.codeId === preview?.attendances[i]?.makeupFor)}
                                    legend={count > 1 ? `Hour ${i + 1}: make up which Missed Event?` : 'Make up which Missed Event?'}
                                    onChange={(codeId) => setPick(i, codeId)} />
                            ))}
                            <ProofFields fields={fields} set={set} asksNote={!code} />
                            <PreviewPanel held={cabinet} preview={preview} typeId={pointsTypeId} count={count} code={code} owed={owed} />
                            <button type="button" className="req-submit" disabled={!built?.ok || sending} onClick={submit}>
                                {sending ? 'Sending…' : 'Submit request'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PointRequestForm;
