// Pieces of the Excuse Absence page: the Strike tally, the history, and the
// reason box that shows an action's effect before it's saved.
import { useState } from 'react';
import { AT_RISK_STRIKES, type Attendance, type Code } from '../../../lib/computeStanding';
import {
    ACTION_LABEL, LOG_TEXT, NEEDS_REASON, previewAbsenceAction, REASON_REQUIRED,
    type AbsenceAction, type AbsenceActionKind, type AbsenceEffect, type AbsenceLogEntry,
} from '../../../lib/excuseAbsence';
import { eventType } from '../../../lib/rubric';
import { shortDate } from '../../../lib/semester';
import type { RosterMember } from './useRoster';

export { displayName } from '../../../lib/nameSearch';

const findCode = (codeId: string, codes: Code[]) => codes.find((c) => c.id.toUpperCase() === codeId.toUpperCase());

/** A code's event name; its Event Type if it has none. */
export function codeName(codeId: string, codes: Code[]): string {
    const code = findCode(codeId, codes);
    return code ? code.event || eventType(code.eventTypeId)?.label || code.id : codeId;
}

/** "Cabinet Thursday, Sep 3" for a code. */
export function codeLabel(codeId: string, codes: Code[]): string {
    const code = findCode(codeId, codes);
    return code ? `${codeName(codeId, codes)}, ${shortDate(code.eventDate)}` : codeId;
}

/** A Surplus Attendance as "HSA Fundraiser, Sep 5", or "Tabling, Sep 9" for one with no code. */
export function attendanceLabel(a: { eventTypeId: string; eventDate: string; codeId?: string }, codes: Code[]): string {
    if (a.codeId) return codeLabel(a.codeId, codes);
    return `${eventType(a.eventTypeId)?.label ?? 'Event'}, ${shortDate(a.eventDate)}`;
}

/** Strikes drawn as tally strokes; the third and later go red (probation risk). */
export function StrikeTally({ count, size = 'md' }: { count: number; size?: 'sm' | 'md' | 'lg' }) {
    return (
        <span className={`eap-tally eap-tally--${size}`} role="img" aria-label={`${count} open Strike${count === 1 ? '' : 's'}`}>
            {count === 0 ? <span className="eap-tally__zero">0</span> : Array.from({ length: count }, (_, i) => (
                <span key={i} className={`eap-tally__mark${i >= AT_RISK_STRIKES - 1 ? ' is-risk' : ''}`} />
            ))}
        </span>
    );
}

export function RiskNote({ strikes }: { strikes: number }) {
    if (strikes < AT_RISK_STRIKES) return null;
    return <p className="eap-risk">At risk of probation: {strikes} open Strikes. Needs a meeting with the Chief of Staff.</p>;
}

function formatWhen(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** The absenceLog, newest first. */
export function History({ log, codes }: { log: AbsenceLogEntry[]; codes: Code[] }) {
    if (!log.length) return <p className="eap-empty">No changes yet. Excusals, Strike removals and closed Missed Events show up here.</p>;
    return (
        <ol className="eap-history">
            {[...log].reverse().map((entry, i) => (
                <li key={`${entry.at}-${i}`} className={`eap-history__item is-${entry.kind}`}>
                    <div className="eap-history__what"><strong>{LOG_TEXT[entry.kind]}</strong> {codeLabel(entry.codeId, codes)}</div>
                    {entry.note && <div className="eap-history__note">{entry.note}</div>}
                    <div className="eap-history__meta">{entry.by}, {formatWhen(entry.at)}</div>
                </li>
            ))}
        </ol>
    );
}

function effectLines(effect: AbsenceEffect, attendances: Attendance[], codes: Code[]): string[] {
    const lines: string[] = [];
    const { strikes, owed } = effect;
    if (strikes.before !== strikes.after) lines.push(`Strikes ${strikes.before} → ${strikes.after}`);
    if (owed.before !== owed.after) lines.push(`Missed Events still owed ${owed.before} → ${owed.after}`);
    for (const move of effect.moves) {
        const attendance = attendances.find((a) => a.id === move.attendanceId) ?? move;
        const name = attendanceLabel(attendance, codes);
        if (move.from && move.to) lines.push(`${name} moves from covering ${codeLabel(move.from, codes)} to ${codeLabel(move.to, codes)}`);
        else if (move.to) lines.push(`${name} now makes up ${codeLabel(move.to, codes)}`);
        else lines.push(`${name} no longer makes up ${codeLabel(move.from, codes)}, so it's free for another Missed Event`);
    }
    if (!lines.length) lines.push('No change to Strikes or Missed Events owed; only the record changes');
    return lines;
}

/**
 * Reason box + effect + confirm for one pending action. A reason is
 * required to remove a Strike or close a Missed Event; optional otherwise.
 */
export function ConfirmAction({ member, attendances, codes, today, kind, codeId, onSave, onCancel }: {
    member: RosterMember;
    attendances: Attendance[];
    codes: Code[];
    today: string;
    kind: AbsenceActionKind;
    codeId: string;
    onSave: (action: AbsenceAction) => Promise<string | null>;
    onCancel: () => void;
}) {
    const [note, setNote] = useState('');
    const [tried, setTried] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const required = NEEDS_REASON.includes(kind);
    const action: AbsenceAction = { kind, codeId, note };
    const effect = previewAbsenceAction(member, attendances, codes, action, today);
    const missing = required && !note.trim();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTried(true);
        if (missing || saving) return;
        setSaving(true);
        setError((await onSave(action)) ?? '');
        setSaving(false);
    };

    return (
        <form className="eap-confirm" onSubmit={submit}>
            <label className="eap-confirm__label">
                {required ? 'Reason (required)' : 'Note (optional)'}
                <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={kind === 'excuse' ? 'Valid Excuse Form sent Sep 8' : kind === 'close' ? 'Why this Missed Event needs no Make-up' : 'Why'}
                    autoFocus
                />
            </label>
            {tried && missing && <p className="eap-error">{REASON_REQUIRED}</p>}
            <div className="eap-effects" aria-live="polite">
                <span className="eap-effects__label">If you save this</span>
                <ul>{effectLines(effect, attendances, codes).map((line) => <li key={line}>{line}</li>)}</ul>
            </div>
            {error && <p className="eap-error" role="alert">{error}</p>}
            <div className="eap-confirm__buttons">
                <button type="submit" className="eap-btn eap-btn--primary" disabled={saving}>
                    {saving ? 'Saving…' : ACTION_LABEL[kind]}
                </button>
                <button type="button" className="eap-btn" onClick={onCancel} disabled={saving}>Cancel</button>
            </div>
        </form>
    );
}
