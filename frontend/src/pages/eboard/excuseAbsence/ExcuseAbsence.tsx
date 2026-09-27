// Excuse Absence (#73, variant A of the #48 prototype): the At-risk list for
// the Chief of Staff, then a name search, then the Member's whole year of
// Core Events as one timeline. Each Missed Event has its actions inline, each
// shows its effect before saving, and the history sits beside the timeline.
import { useMemo, useState } from 'react';
import MemberSearch from '../../../components/members/MemberSearch';
import { auth, db } from '../../../lib/firebase';
import type { CoreEvent, MissedEvent } from '../../../lib/computeStanding';
import { actionsFor, ACTION_LABEL, atRiskMembers, factFor, saveAbsenceAction, type AbsenceAction, type AbsenceActionKind } from '../../../lib/excuseAbsence';
import { roleLine } from '../../../lib/members';
import { shortDate } from '../../../lib/semester';
import {
    attendanceLabel, codeLabel, codeName, ConfirmAction, displayName, History, RiskNote, StrikeTally,
} from './parts';
import { useRoster, type Roster, type RosterRow } from './useRoster';

type MissState = 'strike' | 'open' | 'madeup' | 'closed';

const STATE_TEXT: Record<MissState, string> = {
    strike: 'Missed, Strike',
    open: 'Missed, needs a Make-up',
    madeup: 'Made up',
    closed: 'Closed by E-Board',
};

function missState(missed: MissedEvent): MissState {
    if (missed.overridden) return 'closed';
    if (missed.madeUpBy) return 'madeup';
    return missed.strike ? 'strike' : 'open';
}

function strikesText(count: number) {
    return `${count} Strike${count === 1 ? '' : 's'}`;
}

function ExcuseAbsence() {
    const roster = useRoster();
    const [email, setEmail] = useState<string | null>(null);
    const [pending, setPending] = useState<{ kind: AbsenceActionKind; codeId: string } | null>(null);
    const [saved, setSaved] = useState('');

    const members = useMemo(() => roster.rows.map((r) => r.member), [roster.rows]);
    const rowOf = (member: RosterRow['member']) => roster.rows.find((r) => r.member.email === member.email);
    const atRisk = atRiskMembers(roster.rows.filter((row) => row.standing?.heldToCabinetRules));
    const row = roster.rows.find((r) => r.member.email === email);

    const pick = (next: RosterRow) => {
        setEmail(next.member.email);
        setPending(null);
        setSaved('');
    };

    const save = async (action: AbsenceAction): Promise<string | null> => {
        const by = auth.currentUser?.email ?? 'E-Board';
        try {
            const result = await saveAbsenceAction(db, row.member.email, action, by);
            if (result.ok === false) return result.error;
            setPending(null);
            setSaved(`${ACTION_LABEL[action.kind]}: ${codeLabel(action.codeId, roster.codes)}. Saved.`);
            return null;
        } catch (err) {
            console.error('Error saving Excuse Absence change:', err);
            return 'Could not save. Please try again.';
        }
    };

    return (
        <div className="eap">
            <h2 className="eap-title">Excuse Absence</h2>
            {roster.error && <p className="eap-error" role="alert">{roster.error}</p>}
            {roster.loading && <p className="eap-empty">Loading members…</p>}

            {!roster.loading && !roster.error && (
                <section className="eap-risk-list" aria-labelledby="eap-risk-heading">
                    <h3 id="eap-risk-heading">At risk (3+ Strikes)</h3>
                    {atRisk.length === 0 ? (
                        <p className="eap-empty">No Cabinet Member has 3 or more open Strikes.</p>
                    ) : (
                        <ul>
                            {atRisk.map((r) => (
                                <li key={r.member.email}>
                                    <button type="button" onClick={() => pick(r)} aria-label={`Open ${displayName(r.member)}, ${strikesText(r.standing.openStrikes)}`}>
                                        <span>
                                            <strong>{displayName(r.member)}</strong>{' '}
                                            <span className="eap-muted">{roleLine(r.member)}</span>
                                        </span>
                                        <StrikeTally count={r.standing.openStrikes} size="sm" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            <MemberSearch
                members={members}
                disabled={roster.loading}
                onPick={(member) => pick(rowOf(member))}
                detail={(member) => {
                    const standing = rowOf(member)?.standing;
                    return `${roleLine(member)}${standing?.heldToCabinetRules ? `, ${strikesText(standing.openStrikes)}` : ''}`;
                }}
            />

            {!row && !roster.loading && <p className="eap-empty">Find a member by name to see their Missed Events and Strikes.</p>}
            {row && (
                <MemberYear
                    row={row}
                    roster={roster}
                    pending={pending}
                    saved={saved}
                    onPick={(kind, codeId) => { setPending({ kind, codeId }); setSaved(''); }}
                    onCancel={() => setPending(null)}
                    onSave={save}
                />
            )}
        </div>
    );
}

function MemberYear({ row, roster, pending, saved, onPick, onCancel, onSave }: {
    row: RosterRow;
    roster: Roster;
    pending: { kind: AbsenceActionKind; codeId: string } | null;
    saved: string;
    onPick: (kind: AbsenceActionKind, codeId: string) => void;
    onCancel: () => void;
    onSave: (action: AbsenceAction) => Promise<string | null>;
}) {
    const { member, standing } = row;
    const { codes, today } = roster;
    const attendances = roster.attendancesOf(member.email);
    const held = standing.heldToCabinetRules;
    const owed = standing.missedEvents.filter((missed) => missed.owed).length;
    const unused = standing.surplus.filter((surplus) => !surplus.makeupFor);

    const attendedRow = (event: CoreEvent) => {
        const state = event.status === 'attended' ? 'Attended'
            : event.status === 'optional' ? 'Not needed (HLHM already filled)'
            : event.eventDate === today ? 'Tonight' : 'Upcoming';
        return (
            <li key={event.codeId} className={`eap-row ${event.status === 'upcoming' ? 'is-future' : 'is-attended'}`}>
                <span className="eap-row__date">{shortDate(event.eventDate)}</span>
                <span className="eap-row__name">{codeName(event.codeId, codes)}</span>
                <span className="eap-row__state">{state}</span>
            </li>
        );
    };

    return (
        <div className="eap-body">
            <header className="eap-who">
                <div>
                    <h3>{displayName(member)}</h3>
                    <p className="eap-muted">{member.email}, {roleLine(member)}</p>
                </div>
                {held && (
                    <dl className="eap-counts">
                        <div><dt>Open Strikes</dt><dd><StrikeTally count={standing.openStrikes} size="lg" /></dd></div>
                        <div><dt>Missed Events owed</dt><dd className="eap-num">{owed}</dd></div>
                    </dl>
                )}
            </header>

            {!held ? (
                <p className="eap-empty">
                    {member.eboard
                        ? 'E-Board is exempt from Core Events and Strikes, so there is nothing to excuse here.'
                        : 'General Members have no Core Events or Strikes, so there is nothing to excuse here.'}
                </p>
            ) : (
                <>
                    <RiskNote strikes={standing.openStrikes} />
                    {saved && <p className="eap-done" role="status">{saved}</p>}
                    <div className="eap-cols">
                        <section>
                            <h4>Core Events this year</h4>
                            {standing.coreEvents.length === 0 && <p className="eap-empty">No Core Event codes this year yet.</p>}
                            <ol className="eap-timeline">
                                {standing.coreEvents.map((event) => {
                                    const missed = standing.missedEvents.find((m) => m.codeId === event.codeId);
                                    if (!missed) return attendedRow(event);
                                    const state = missState(missed);
                                    const fact = factFor(member, missed);
                                    const madeUpBy = missed.madeUpBy && attendances.find((a) => a.id === missed.madeUpBy);
                                    return (
                                        <li key={event.codeId} className={`eap-row is-${state}`}>
                                            <span className="eap-row__date">{shortDate(event.eventDate)}</span>
                                            <span className="eap-row__name">
                                                {codeName(event.codeId, codes)}
                                                {missed.excused && <span className="eap-tag eap-tag--excused">Excused</span>}
                                                {missed.strikeRemoved && <span className="eap-tag">Strike removed</span>}
                                            </span>
                                            <span className="eap-row__state">{STATE_TEXT[state]}</span>
                                            {madeUpBy && (
                                                <span className="eap-row__detail">Covered by {attendanceLabel(madeUpBy, codes)}</span>
                                            )}
                                            {fact && (
                                                <span className="eap-row__detail eap-muted">“{fact.note || 'No note'}”</span>
                                            )}
                                            <span className="eap-row__actions">
                                                {actionsFor(missed).map((kind) => {
                                                    const on = pending?.kind === kind && pending.codeId === event.codeId;
                                                    return (
                                                        <button key={kind} type="button" aria-pressed={on}
                                                            className={`eap-btn eap-btn--sm${on ? ' is-on' : ''}`}
                                                            onClick={() => onPick(kind, event.codeId)}>
                                                            {ACTION_LABEL[kind]}
                                                        </button>
                                                    );
                                                })}
                                            </span>
                                            {pending?.codeId === event.codeId && (
                                                <div className="eap-row__confirm">
                                                    <ConfirmAction
                                                        key={pending.kind}
                                                        member={member}
                                                        attendances={attendances}
                                                        codes={codes}
                                                        today={today}
                                                        kind={pending.kind}
                                                        codeId={event.codeId}
                                                        onCancel={onCancel}
                                                        onSave={onSave}
                                                    />
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                            {unused.length > 0 && (
                                <p className="eap-muted">
                                    Not used as a Make-up yet: {unused
                                        .map((surplus) => attendanceLabel(attendances.find((a) => a.id === surplus.attendanceId) ?? surplus, codes))
                                        .join('; ')}
                                </p>
                            )}
                        </section>
                        <aside>
                            <h4>History</h4>
                            <History log={member.absenceLog ?? []} codes={codes} />
                        </aside>
                    </div>
                </>
            )}
        </div>
    );
}

export default ExcuseAbsence;
