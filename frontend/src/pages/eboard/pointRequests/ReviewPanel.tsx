// Reviewing one pending Point Request (#72): confirm its Event Type, attach
// it to a code, pick each Attendance's Make-up, see what approving it does
// to the Member's standing, then approve, deny, or make it an Adjustment.
import { useMemo, useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import type { Code } from '../../../lib/computeStanding';
import { missedEventName } from '../../../lib/pointRequests';
import {
    adjustRequest, approveRequest, attachableCodes, attendanceCountFor, denyRequest, initialDecision, previewApproval,
    type ApprovalPreview, type ReviewDecision, type ReviewRequest,
} from '../../../lib/requestReview';
import { eventType, rubric, tierLabels, tiers } from '../../../lib/rubric';
import { shortDate } from '../../../lib/semester';
import { useMemberStanding } from '../../dashboard/useMemberStanding';

type ReviewPanelProps = {
    request: ReviewRequest;
    /** Every code, for attaching a code-less request to one. */
    codes: Code[];
    /** After a review is saved: reload the list. */
    onReviewed: (message: string) => void;
};

type Mode = 'approve' | 'deny' | 'adjust';

const pts = (n: number, what: string) => `${n > 0 ? '+' : ''}${n} ${what}`;

function ReviewPanel({ request, codes, onReviewed }: ReviewPanelProps) {
    const { loading, member, attendances, codes: yearCodes, standing, today } = useMemberStanding(request.userEmail);
    const [decision, setDecision] = useState<ReviewDecision>(() => initialDecision(request));
    const [mode, setMode] = useState<Mode>('approve');
    const [reason, setReason] = useState('');
    const [adjustPoints, setAdjustPoints] = useState('');
    const [adjustNote, setAdjustNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const code = decision.codeId ? codes.find((row) => row.id.toUpperCase() === decision.codeId.toUpperCase()) ?? null : null;
    const attachable = attachableCodes(request, decision.eventTypeId, codes);
    const preview = useMemo(
        () => (member ? previewApproval(member, attendances, yearCodes, request, code, decision, today) : null),
        [member, attendances, yearCodes, request, code, decision, today],
    );
    const owed = (standing?.missedEvents ?? []).filter((missed) => missed.owed);
    const count = code ? 1 : attendanceCountFor(request, decision.eventTypeId);

    const setType = (eventTypeId: string) => {
        const next = attendanceCountFor(request, eventTypeId);
        setDecision((current) => ({
            eventTypeId,
            // A code of another Event Type no longer fits.
            codeId: request.codeId ?? (attachableCodes(request, eventTypeId, codes).some((c) => c.id === current.codeId) ? current.codeId : null),
            makeupFor: Array.from({ length: next }, (_, i) => current.makeupFor[i] ?? null),
        }));
    };
    const setPick = (index: number, codeId: string | null) => setDecision((current) => ({
        ...current,
        makeupFor: current.makeupFor.map((pick, i) => (i === index ? codeId : pick)),
    }));

    const save = async (run: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string) => {
        setSaving(true);
        setError('');
        try {
            const result = await run();
            if ('error' in result) setError(result.error);
            else onReviewed(message);
        } catch (err) {
            console.error('Error reviewing request:', err);
            setError("Couldn't save the review. Try again.");
        } finally {
            setSaving(false);
        }
    };
    const reviewer = auth.currentUser?.email ?? 'E-Board';

    return (
        <div className="review-panel">
            <div className="review-field">
                <label htmlFor={`type-${request.id}`}>Event Type <span className="review-required">required</span></label>
                <select id={`type-${request.id}`} value={code?.eventTypeId ?? decision.eventTypeId} disabled={Boolean(request.codeId)}
                    onChange={(e) => setType(e.target.value)}>
                    <option value="">Confirm the Event Type</option>
                    {tiers.map((tier) => (
                        <optgroup key={tier} label={`${tierLabels[tier]}s`}>
                            {rubric.filter((type) => type.tier === tier).map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.label} ({type.cabinetPoints} Cab / {type.vePoints} VE{type.cabinetOnly ? ', Cabinet only' : ''})
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                {request.codeId && <p className="review-hint">Set by the code they named.</p>}
            </div>

            {!request.codeId && attachable.length > 0 && (
                <div className="review-field">
                    <label htmlFor={`code-${request.id}`}>Attach to a code</label>
                    <select id={`code-${request.id}`} value={decision.codeId ?? ''}
                        onChange={(e) => setDecision((current) => ({ ...current, codeId: e.target.value || null, makeupFor: [current.makeupFor[0] ?? null] }))}>
                        <option value="">No code</option>
                        {attachable.map((c) => (
                            <option key={c.id} value={c.id}>{c.event || c.id} · {c.id} · {shortDate(c.eventDate)}</option>
                        ))}
                    </select>
                    <p className="review-hint">Counts as checking in with that code, on its date.</p>
                </div>
            )}

            {loading && <p className="review-hint">Loading their standing…</p>}

            {standing?.heldToCabinetRules && owed.length > 0 && eventType(code?.eventTypeId ?? decision.eventTypeId) && (
                <fieldset className="review-field review-makeups">
                    <legend>Make-up {count > 1 ? 'picks' : 'pick'}</legend>
                    {Array.from({ length: count }, (_, i) => (
                        <label key={i} className="review-makeup-row">
                            {count > 1 && <span>Hour {i + 1}</span>}
                            <select value={decision.makeupFor[i] ?? ''} onChange={(e) => setPick(i, e.target.value || null)}>
                                <option value="">Pick for me</option>
                                {owed.map((missed) => (
                                    <option key={missed.codeId} value={missed.codeId}>
                                        {missedEventName(yearCodes, missed)} · {shortDate(missed.eventDate)}{missed.strike ? ' · Strike' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ))}
                    <p className="review-hint">Only counts when that Attendance is Surplus.</p>
                </fieldset>
            )}

            {preview && (
                <Effect preview={preview} codes={yearCodes} heldToCabinetRules={standing?.heldToCabinetRules}
                    eventTypeId={code?.eventTypeId ?? decision.eventTypeId} />
            )}

            <div className="review-modes" role="group" aria-label="Decision">
                {(['approve', 'deny', 'adjust'] as Mode[]).map((option) => (
                    <button key={option} type="button" aria-pressed={mode === option}
                        className={`review-mode${mode === option ? ' is-active' : ''}`} onClick={() => { setMode(option); setError(''); }}>
                        {{ approve: 'Approve', deny: 'Deny', adjust: 'Adjustment' }[option]}
                    </button>
                ))}
            </div>

            {mode === 'approve' && (
                <button type="button" className="approve-button" disabled={saving || !preview}
                    onClick={() => save(() => approveRequest(db, request.id, decision, reviewer), 'Approved.')}>
                    {saving ? 'Saving…' : preview ? `✓ Approve (${pts(preview.cabinetPoints, 'Cab')}, ${pts(preview.vePoints, 'VE')})` : '✓ Approve'}
                </button>
            )}

            {mode === 'deny' && (
                <div className="review-field">
                    <label htmlFor={`reason-${request.id}`}>Reason (the Member sees this)</label>
                    <textarea id={`reason-${request.id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                    <button type="button" className="deny-button" disabled={saving}
                        onClick={() => save(() => denyRequest(db, request.id, reason, reviewer), 'Denied.')}>
                        {saving ? 'Saving…' : '✗ Deny'}
                    </button>
                </div>
            )}

            {mode === 'adjust' && (
                <div className="review-field">
                    <p className="review-hint">For something that fits no Event Type: VE Points and a note, no Attendance.</p>
                    <label htmlFor={`points-${request.id}`}>Points</label>
                    <input id={`points-${request.id}`} type="number" step={1} inputMode="numeric" value={adjustPoints}
                        onChange={(e) => setAdjustPoints(e.target.value)} />
                    <label htmlFor={`note-${request.id}`}>Note</label>
                    <textarea id={`note-${request.id}`} rows={2} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
                    <button type="button" className="approve-button" disabled={saving}
                        onClick={() => save(() => adjustRequest(db, request.id, { points: Number(adjustPoints), note: adjustNote }, reviewer), 'Adjustment added.')}>
                        {saving ? 'Saving…' : 'Add Adjustment'}
                    </button>
                </div>
            )}

            {error && <p className="review-error" role="alert">{error}</p>}
        </div>
    );
}

// "If you approve it": what each Attendance does to their standing.
function Effect({ preview, codes, heldToCabinetRules, eventTypeId }: {
    preview: ApprovalPreview;
    codes: Code[];
    heldToCabinetRules: boolean;
    eventTypeId: string;
}) {
    const type = eventType(eventTypeId);
    // An Attendance that isn't Surplus fills its Core Event or Semester Requirement.
    const fills = type?.tier === 'core' ? `Counts as attending the ${type.label} Core Event.` : `Fills the ${type?.label} Semester Requirement.`;
    const covered = new Map(preview.covers.map((missed) => [missed.codeId, missed]));
    const many = preview.attendances.length > 1;
    return (
        <div className="review-effect" aria-live="polite">
            <p className="review-effect__title">If you approve it</p>
            <p className="review-effect__points">{pts(preview.cabinetPoints, `Cabinet Point${preview.cabinetPoints === 1 ? '' : 's'}`)} · {pts(preview.vePoints, `VE Point${preview.vePoints === 1 ? '' : 's'}`)}</p>
            {heldToCabinetRules && (
                <ul>
                    {preview.attendances.map((attendance, i) => {
                        const missed = attendance.makeupFor && codes.find((code) => code.id === attendance.makeupFor);
                        let what: string;
                        if (attendance.alreadyCounted) what = 'Already counted: they checked in with this code.';
                        else if (missed) {
                            const strike = covered.get(missed.id)?.strike;
                            what = `Makes up ${missed.event || missed.id} (${shortDate(missed.eventDate)})${strike ? ', clearing a Strike' : ''}.`;
                        } else if (attendance.makeupFor) what = `Makes up ${attendance.makeupFor}.`;
                        else if (attendance.surplus) what = 'Surplus, but nothing is left to make up.';
                        else what = fills;
                        return <li key={attendance.id}>{many && <strong>Hour {i + 1}: </strong>}{what}</li>;
                    })}
                </ul>
            )}
        </div>
    );
}

export default ReviewPanel;
