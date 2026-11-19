// User Lookup (#37), two sections. Status & Points: one Member's standing for this school year, every point
// behind it and where it came from, and their Point Requests with who
// reviewed them. One scrolling page (docs/research/user-lookup-eboard-ux.md);
// numbers come from computeStanding through lib/memberLookup.ts, so they
// match the Member's own dashboard. E-Board can add an event the Member
// attended, and take one away (a code check-in, an event E-Board entered, or
// an approved request, revoked) from its row's Remove button; Strikes are changed on Excuse Absence and
// pending requests reviewed on Point Request Review, each linked from here.
// Missed Events and Strikes (StrikesLookup, moved here from Excuse Absence):
// the At-risk list and one Member's Core Events, where Strikes are excused,
// removed or closed. Each section has its own search and its own Member.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { removeEnteredAttendance } from '../../lib/enterAttendance';
import { auth, db } from '../../lib/firebase';
import type { Attendance, Code, Standing } from '../../lib/computeStanding';
import {
    canRevoke, checkInRemovalEffect, lookupLedger, lookupRequests, lookupSummary, missedEventRows, MISSED_STATE_LABEL, SOURCE_LABEL,
    type LookupLedger, type LookupRequest, type LookupRow, type LookupSummary, type RemovalEffect, type StandingFacts, type TakenBack,
} from '../../lib/memberLookup';
import { roleLine } from '../../lib/members';
import { displayName } from '../../lib/nameSearch';
import { removeCheckIn } from '../../lib/redeemCode';
import { eventType } from '../../lib/rubric';
import { shortDate } from '../../lib/semester';
import MemberSearch from '../../components/members/MemberSearch';
import { useMemberStanding } from '../dashboard/useMemberStanding';
import AddEventPanel from './AddEventPanel';
import StrikesLookup, { STRIKES_PARAM, STRIKES_SECTION_ID } from './excuseAbsence/StrikesLookup';
import RevokeForm from './pointRequests/RevokeForm';

type LookupMember = Parameters<typeof roleLine>[0] & {
    email: string;
    firstName: string;
    lastName: string;
    graduationYear?: string | number;
};

const RULES_TEXT: Record<LookupSummary['rules'], string> = {
    general: 'General Member rules',
    cabinet: 'Held to Cabinet Member rules',
    exempt: 'E-Board: exempt from Cabinet requirements',
};

function plural(n: number, word: string) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function pts(n: number) {
    return plural(n, 'point');
}

function dateText(isoDate: string) {
    return isoDate ? shortDate(isoDate) : 'No date';
}

function UserPointsLookup() {
    const [members, setMembers] = useState<LookupMember[] | null>(null);
    const [membersError, setMembersError] = useState('');
    // ?member={email}, so a refresh or a shared link keeps the Member open.
    const [params, setParams] = useSearchParams();
    const email = params.get('member')?.toLowerCase() ?? null;

    // Every account, read once, so the name search can suggest as you type.
    useEffect(() => {
        getDocs(collection(db, 'users'))
            .then((snapshot) => setMembers(snapshot.docs.map((d) => {
                const data = d.data();
                return { ...data, email: d.id, firstName: data.firstName || '', lastName: data.lastName || '' };
            })))
            .catch((err) => {
                console.error('Error loading members:', err);
                setMembersError('Could not load members. Refresh to try again.');
            });
    }, []);

    const picked = members?.find((member) => member.email === email) ?? null;
    // Picking here keeps the Member open below in Missed Events and Strikes.
    const pick = (member: LookupMember) => setParams((current) => {
        const updated = new URLSearchParams(current);
        updated.set('member', member.email);
        return updated;
    });

    // A link to #missed-strikes (from Status & Points, or an old Excuse Absence link) lands on that section.
    const { hash } = useLocation();
    useEffect(() => {
        if (hash === `#${STRIKES_SECTION_ID}`) document.getElementById(STRIKES_SECTION_ID)?.scrollIntoView();
    }, [hash, params]);

    return (
        <div className="ulk">
            <h2 className="ulk-title">User Lookup</h2>

            <section className="ulk-section" aria-labelledby="ulk-points-heading">
                <h3 id="ulk-points-heading" className="ulk-section__title">Status &amp; Points</h3>
                {membersError && <p className="ulk-error" role="alert">{membersError}</p>}
                {!members && !membersError && <p className="ulk-muted">Loading members…</p>}
                <MemberSearch<LookupMember> members={members ?? []} disabled={!members} detail={roleLine} onPick={pick} />

                {!email && members && <p className="ulk-muted">Find a member by name to see their points and Point Requests.</p>}
                {email && members && !picked && <p className="ulk-error" role="alert">No account found for {email}.</p>}
                {picked && <MemberDetail key={picked.email} member={picked} />}
            </section>

            <section id={STRIKES_SECTION_ID} className="ulk-section" aria-labelledby="ulk-strikes-heading">
                <h3 id="ulk-strikes-heading" className="ulk-section__title">Missed Events and Strikes</h3>
                <StrikesLookup />
            </section>
        </div>
    );
}

function MemberDetail({ member: profile }: { member: LookupMember }) {
    // Someone else's standing: never pass the signed-in viewer's view override.
    const { loading, member, attendances, codes, requests, standing, today } = useMemberStanding(profile.email);
    const summary = useMemo(() => standing && lookupSummary(member, standing, requests), [member, standing, requests]);
    const ledger = useMemo(() => member && lookupLedger({ member, attendances, codes, requests, today }), [member, attendances, codes, requests, today]);
    const standingFacts = useMemo(() => ({ member, attendances, codes, today }), [member, attendances, codes, today]);
    const requestRows = useMemo(() => lookupRequests(requests, today), [requests, today]);
    const revocable = useMemo(() => new Set(requests.filter(canRevoke).map((request) => request.id)), [requests]);

    return (
        <article className="ulk-body" aria-live="polite">
            <header className="ulk-who">
                <h3>{displayName(profile)}</h3>
                <dl className="ulk-facts">
                    <div className="ulk-facts__wide"><dt>Email</dt><dd>{profile.email}</dd></div>
                    <div><dt>Role</dt><dd>{roleLine(profile)}</dd></div>
                    <div><dt>Graduation year</dt><dd>{profile.graduationYear || 'Not given'}</dd></div>
                    {summary && <div><dt>Rules</dt><dd>{RULES_TEXT[summary.rules]}</dd></div>}
                </dl>
            </header>

            {loading || !summary ? <p className="ulk-muted">Loading points…</p> : (
                <>
                    <StandingStrip summary={summary} />
                    {summary.rules === 'cabinet' && (
                        <CabinetDetail email={profile.email} standing={standing} codes={codes} attendances={attendances} summary={summary} />
                    )}
                    <AddEventPanel email={profile.email} standingFacts={standingFacts} cabinet={summary.rules === 'cabinet'} />
                    <Points ledger={ledger} cabinet={summary.rules === 'cabinet'} revocable={revocable}
                        standingFacts={standingFacts} />
                    <Requests rows={requestRows} />
                </>
            )}
        </article>
    );
}

function StandingStrip({ summary }: { summary: LookupSummary }) {
    const left = summary.veGoal - summary.vePoints;
    return (
        <section className="ulk-strip" aria-label="Standing this school year">
            <div className={`ulk-stat ${summary.veReached ? 'is-met' : ''}`}>
                <span className="ulk-stat__label">Total Points <small>(Voter Eligible)</small></span>
                <span className="ulk-stat__value">{summary.vePoints} <small>/ {summary.veGoal}</small></span>
                <span className="ulk-stat__note">{summary.veReached ? 'Voter eligible' : `${pts(left)} to go`}</span>
                {summary.pendingCount > 0 && (
                    <a className="ulk-stat__pending" href="#ulk-requests" title="Pending Point Requests are not counted until approved">
                        +{summary.pendingPoints} pending ({plural(summary.pendingCount, 'request')})
                    </a>
                )}
            </div>
            {summary.rules === 'cabinet' && (
                <>
                    <div className={`ulk-stat ${summary.cabinetPoints >= summary.cabinetGoal ? 'is-met' : ''}`}>
                        <span className="ulk-stat__label">Cabinet Points</span>
                        <span className="ulk-stat__value">{summary.cabinetPoints} <small>/ {summary.cabinetGoal}</small></span>
                        <span className="ulk-stat__note">
                            {summary.cabinetPoints >= summary.cabinetGoal ? 'Graduating Cabinet Member' : `${pts(summary.cabinetGoal - summary.cabinetPoints)} to go`}
                        </span>
                    </div>
                    <div className={`ulk-stat ${summary.atRisk ? 'is-risk' : ''}`}>
                        <span className="ulk-stat__label">Open Strikes</span>
                        <span className="ulk-stat__value">{summary.openStrikes}</span>
                        {summary.atRisk && <span className="ulk-stat__note ulk-stat__note--risk">At risk of probation</span>}
                        <span className="ulk-stat__note">{plural(summary.missedOwed, 'Missed Event')} to make up</span>
                    </div>
                    <div className="ulk-stat">
                        <span className="ulk-stat__label">Semester Requirements</span>
                        <span className="ulk-stat__value ulk-stat__value--pair">
                            <span>Fall {summary.requirements.fall.met}<small>/{summary.requirements.fall.total}</small></span>
                            <span>Spring {summary.requirements.spring.met}<small>/{summary.requirements.spring.total}</small></span>
                        </span>
                        <span className="ulk-stat__note">met</span>
                    </div>
                </>
            )}
            {summary.rules === 'exempt' && (
                <div className="ulk-stat">
                    <span className="ulk-stat__label">Cabinet requirements</span>
                    <span className="ulk-stat__value">Exempt</span>
                    <span className="ulk-stat__note">E-Board is not held to Core Events, Semester Requirements or Strikes</span>
                </div>
            )}
        </section>
    );
}

function CabinetDetail({ email, standing, codes, attendances, summary }: {
    email: string;
    standing: Standing;
    codes: Code[];
    attendances: Attendance[];
    summary: LookupSummary;
}) {
    const missed = missedEventRows(standing, codes, attendances);
    // Opens this Member in Missed Events and Strikes below and jumps to it.
    const [, setParams] = useSearchParams();
    const openInStrikes = (event: React.MouseEvent) => {
        event.preventDefault();
        setParams((current) => {
            const updated = new URLSearchParams(current);
            updated.set(STRIKES_PARAM, email);
            return updated;
        });
        document.getElementById(STRIKES_SECTION_ID)?.scrollIntoView({ behavior: 'smooth' });
    };
    const unmet = (['fall', 'spring'] as const).map((semester) => ({
        semester,
        rows: standing.semesterRequirements[semester].filter((req) => !req.met),
    }));
    return (
        <details className="ulk-panel" open={summary.missedOwed > 0}>
            <summary>
                <h4>Missed Events and Semester Requirements</h4>
                <span className="ulk-muted">
                    {summary.missedOwed} to make up of {missed.length}: {summary.missedExcused} excused, {summary.missedUnexcused} unexcused
                </span>
            </summary>
            <p className="ulk-panel__link">
                <a href={`#${STRIKES_SECTION_ID}`} onClick={openInStrikes}>Open in Missed Events and Strikes</a> to excuse, remove a Strike or close a Missed Event.
            </p>
            {missed.length === 0 ? <p className="ulk-muted">No Missed Events this year.</p> : (
                <ul className="ulk-list">
                    {missed.map((row) => (
                        <li key={row.codeId} className={`ulk-row is-${row.state}`}>
                            <span className="ulk-row__date">{shortDate(row.eventDate)}</span>
                            <span className="ulk-row__name">
                                {row.name}
                                {row.excused && <span className="ulk-tag ulk-tag--excused">Excused</span>}
                                {row.madeUpBy && <span className="ulk-row__detail">Made up by {row.madeUpBy.name}, {shortDate(row.madeUpBy.date)}</span>}
                            </span>
                            <span className="ulk-row__end">{MISSED_STATE_LABEL[row.state]}</span>
                        </li>
                    ))}
                </ul>
            )}
            {unmet.map(({ semester, rows }) => (
                <p key={semester} className="ulk-unmet">
                    <strong>{semester === 'fall' ? 'Fall' : 'Spring'} still to meet:</strong>{' '}
                    {rows.length === 0 ? 'none' : rows.map((req) => eventType(req.eventTypeId)?.label ?? req.eventTypeId).join(', ')}
                </p>
            ))}
        </details>
    );
}

const TAKEN_BACK_LABEL: Record<TakenBack['kind'], string> = { removed: 'Removed Check-in', revoked: 'Revoked Point Request' };

function takenBackLabel(takenBack: TakenBack): string {
    return takenBack.superseded ? 'Removed Check-in, replaced' : TAKEN_BACK_LABEL[takenBack.kind];
}

type PointsFilter = 'all' | 'codes' | 'requests' | 'entered' | 'adjustments';

const FILTERS: { value: PointsFilter; label: string; keep: (row: LookupRow) => boolean }[] = [
    { value: 'all', label: 'All', keep: () => true },
    { value: 'codes', label: 'Codes', keep: (row) => Boolean(row.codeId) },
    { value: 'requests', label: 'Point Requests', keep: (row) => row.source === 'request' || Boolean(row.requestId) },
    { value: 'entered', label: 'Entered by E-Board', keep: (row) => row.source === 'eboard' },
    // Every change E-Board made by hand: Adjustments, Removed Check-ins and revoked requests.
    { value: 'adjustments', label: 'Adjustments', keep: (row) => row.source === 'adjustment' || Boolean(row.takenBack) },
];

/** How a row's points are taken away, or null when its row has no Remove button. */
type Removal = 'check-in' | 'entry' | 'revoke';

function removalOf(row: LookupRow, revocable: Set<string>): Removal | null {
    if (row.takenBack) return null;
    // A Point Request's points go back with the request, including an Adjustment it made.
    if (row.requestId) return revocable.has(row.requestId) ? 'revoke' : null;
    if (row.source === 'code') return 'check-in';
    if (row.source === 'eboard' && row.attendanceIds.length) return 'entry';
    return null;
}

function Points({ ledger, cabinet, revocable, standingFacts }: {
    ledger: LookupLedger;
    cabinet: boolean;
    /** Approved Point Requests that can be revoked (canRevoke). */
    revocable: Set<string>;
    standingFacts: StandingFacts;
}) {
    const [filter, setFilter] = useState<PointsFilter>('all');
    // The row whose Remove is open: one at a time, and nothing is taken away until it's confirmed there.
    const [openRow, setOpenRow] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const rows = ledger.rows.filter(FILTERS.find((option) => option.value === filter).keep);
    const done = (text: string) => {
        setOpenRow(null);
        setMessage(text);
    };
    return (
        <details className="ulk-panel" open>
            <summary>
                <h4>Points ({ledger.counted})</h4>
                <span className="ulk-muted">
                    {plural(ledger.codes.redeemed, 'code')} redeemed, {ledger.codes.byRequest} through a Point Request
                </span>
            </summary>
            <div className="ulk-points-tools">
                <div className="ulk-filters" role="group" aria-label="Show">
                    {FILTERS.map((option) => (
                        <button key={option.value} type="button" aria-pressed={filter === option.value}
                            className={`ulk-filter${filter === option.value ? ' is-active' : ''}`} onClick={() => setFilter(option.value)}>
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            {message && <p className="ulk-muted" role="status">{message}</p>}
            {rows.length === 0 ? <p className="ulk-muted">{filter === 'all' ? 'No points this school year yet.' : 'Nothing here this school year.'}</p> : (
                <ul className="ulk-list ulk-list--points">
                    {rows.map((row) => {
                        const removal = removalOf(row, revocable);
                        const open = openRow === row.id;
                        return (
                        <li key={row.id} className={`ulk-row${row.takenBack ? ' is-taken-back' : ''}${open ? ' is-removing' : ''}`}>
                            <span className="ulk-row__date">{dateText(row.date)}</span>
                            <span className="ulk-row__name">
                                {row.takenBack ? <s>{row.name}</s> : row.name}
                                {row.codeId && <code className="ulk-code">{row.codeId}</code>}
                                <span className="ulk-row__detail">
                                    <span className={`ulk-tag ulk-tag--${row.takenBack ? 'taken-back' : row.source}`}>{row.takenBack ? takenBackLabel(row.takenBack) : SOURCE_LABEL[row.source]}</span>
                                    {row.source !== 'adjustment' && ` ${row.eventType}${row.hours ? `, ${row.hours} hours` : ''}`}
                                    {row.enteredBy && ` · Entered by ${row.enteredBy}${row.enteredOn ? `, ${shortDate(row.enteredOn)}` : ''}`}
                                    {row.approvedBy && ` · ${row.vePoints < 0 ? 'Taken away' : 'Approved'} by ${row.approvedBy}${row.approvedOn ? `, ${shortDate(row.approvedOn)}` : ''}`}
                                    {row.takenBack && ` · ${row.takenBack.kind === 'removed' ? 'Removed' : 'Revoked'}${row.takenBack.by ? ` by ${row.takenBack.by}` : ''}${row.takenBack.on ? `, ${shortDate(row.takenBack.on)}` : ''}`}
                                </span>
                                {row.takenBack?.reason && <span className="ulk-row__detail ulk-note">“{row.takenBack.reason}”</span>}
                                {row.note && <span className="ulk-row__detail ulk-note">“{row.note}”</span>}
                            </span>
                            {removal && (
                                <button type="button" className="ulk-remove" aria-expanded={open}
                                    aria-label={`Remove ${row.name} from this Member`}
                                    onClick={() => { setOpenRow(open ? null : row.id); setMessage(''); }}>
                                    Remove
                                </button>
                            )}
                            <span className="ulk-row__end ulk-num">
                                {row.takenBack ? <s>+{row.vePoints} VE</s> : <>{row.vePoints > 0 ? '+' : ''}{row.vePoints} VE</>}
                                {cabinet && <small>{row.takenBack ? <s>{row.cabinetPoints} Cabinet</s> : `${row.cabinetPoints} Cabinet`}</small>}
                            </span>
                            {open && (
                                <div className="ulk-row__form">
                                    {removal === 'check-in' && (
                                        <RemoveCheckInForm row={row} cabinet={cabinet} standingFacts={standingFacts}
                                            onRemoved={done} onCancel={() => setOpenRow(null)} />
                                    )}
                                    {removal === 'entry' && (
                                        <RemoveEntryForm row={row} cabinet={cabinet} standingFacts={standingFacts}
                                            onRemoved={done} onCancel={() => setOpenRow(null)} />
                                    )}
                                    {removal === 'revoke' && (
                                        <RevokeForm requestId={row.requestId} points={row.vePoints} startOpen
                                            onRevoked={done} onCancel={() => setOpenRow(null)} />
                                    )}
                                </div>
                            )}
                        </li>
                        );
                    })}
                    {filter === 'all' && (
                        <li className="ulk-row ulk-row--total">
                            <span className="ulk-row__date" />
                            <span className="ulk-row__name">Total</span>
                            <span className="ulk-row__end ulk-num">
                                {ledger.vePoints} VE
                                {cabinet && <small>{ledger.cabinetPoints} Cabinet</small>}
                            </span>
                        </li>
                    )}
                </ul>
            )}
            {ledger.adjustments > 0 && filter === 'all' && (
                <p className="ulk-muted">Includes {plural(ledger.adjustments, 'Adjustment')} from E-Board.</p>
            )}
        </details>
    );
}

/** What E-Board reads before confirming: the points, and any Missed Event, Strike or Make-up it changes. */
function removalText(effect: RemovalEffect, cabinet: boolean, removal: 'check-in' | 'entry'): string {
    const lines = [`Takes away ${plural(effect.vePoints, 'VE Point')}${cabinet ? ` and ${plural(effect.cabinetPoints, 'Cabinet Point')}` : ''}.`];
    if (effect.missed.length) lines.push(`${effect.missed.join(', ')} becomes a Missed Event.`);
    if (effect.owedAgain.length) lines.push(`It made up ${effect.owedAgain.join(', ')}, which is owed again.`);
    if (effect.strikes > 0) lines.push(`Adds ${plural(effect.strikes, 'open Strike')}; excuse it under Missed Events and Strikes below if they had a reason.`);
    if (removal === 'check-in') lines.push("They can't check in with this code again.");
    return lines.join(' ');
}

type RemoveFormProps = {
    row: LookupRow;
    cabinet: boolean;
    standingFacts: StandingFacts;
    onRemoved: (message: string) => void;
    onCancel: () => void;
};

// Removing one code check-in (a Removed Check-in), opened by the row's
// Remove: what it will change, and a reason box, since the Member sees why.
function RemoveCheckInForm({ row, cabinet, standingFacts, onRemoved, onCancel }: RemoveFormProps) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const effect = useMemo(() => checkInRemovalEffect(standingFacts, row.attendanceIds), [standingFacts, row.attendanceIds]);

    const remove = async () => {
        setSaving(true);
        setError('');
        try {
            const result = await removeCheckIn(db, row.id, { reason, reviewer: auth.currentUser?.email ?? 'E-Board', today: standingFacts.today });
            if ('error' in result) setError(result.error);
            else onRemoved(`Removed the ${row.codeId} check-in. The Member sees it with your reason.`);
        } catch (err) {
            console.error('Error removing check-in:', err);
            setError("Couldn't remove it. Try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="danger-form">
            <p className="danger-form__hint">{removalText(effect, cabinet, 'check-in')}</p>
            <label htmlFor={`remove-${row.id}`}>Reason (the Member sees this)</label>
            <textarea id={`remove-${row.id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            {error && <p className="danger-form__error" role="alert">{error}</p>}
            <div className="danger-form__actions">
                <button type="button" className="danger-form__cancel" disabled={saving} onClick={onCancel}>Cancel</button>
                <button type="button" className="danger-form__confirm" disabled={saving} onClick={remove}>
                    {saving ? 'Removing…' : `Remove ${row.codeId}`}
                </button>
            </div>
        </div>
    );
}

// Undoing an event E-Board entered (an Entered Attendance), opened by the
// row's Remove: what it will change, then a confirm. It was E-Board's own
// entry, so it goes without a reason, and the Member can still check in to
// its code if they really attended.
function RemoveEntryForm({ row, cabinet, standingFacts, onRemoved, onCancel }: RemoveFormProps) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const effect = useMemo(() => checkInRemovalEffect(standingFacts, row.attendanceIds), [standingFacts, row.attendanceIds]);

    const remove = async () => {
        setSaving(true);
        setError('');
        try {
            const result = await removeEnteredAttendance(db, row.attendanceIds);
            if ('error' in result) setError(result.error);
            else onRemoved(`Removed ${row.name}, which E-Board had entered.`);
        } catch (err) {
            console.error('Error removing entered event:', err);
            setError("Couldn't remove it. Try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="danger-form">
            <p className="danger-form__hint">{removalText(effect, cabinet, 'entry')} Undoes the entry by E-Board{row.enteredBy ? ` (${row.enteredBy})` : ''}.</p>
            {error && <p className="danger-form__error" role="alert">{error}</p>}
            <div className="danger-form__actions">
                <button type="button" className="danger-form__cancel" disabled={saving} onClick={onCancel}>Cancel</button>
                <button type="button" className="danger-form__confirm" disabled={saving} onClick={remove}>
                    {saving ? 'Removing…' : 'Remove event'}
                </button>
            </div>
        </div>
    );
}

function Requests({ rows }: { rows: LookupRequest[] }) {
    const pending = rows.filter((row) => row.status === 'pending').length;
    return (
        <details className="ulk-panel" id="ulk-requests" open>
            <summary>
                <h4>Point Requests ({rows.length})</h4>
                <span className="ulk-muted">{pending} pending</span>
            </summary>
            {rows.length === 0 ? <p className="ulk-muted">No Point Requests this school year.</p> : (
                <ul className="ulk-list">
                    {rows.map((row) => (
                        <li key={row.id} className={`ulk-row ulk-req is-${row.status}`}>
                            <span className="ulk-row__date">{dateText(row.date)}</span>
                            <span className="ulk-row__name">
                                {row.name}
                                <span className="ulk-row__detail">
                                    {row.eventType} · {pts(row.points)} {row.pointsLabel}
                                    {row.reviewedBy && ` · ${row.statusLabel} by ${row.reviewedBy}${row.reviewedOn ? `, ${shortDate(row.reviewedOn)}` : ''}`}
                                </span>
                                {row.revoked && (
                                    <span className="ulk-row__detail">
                                        Had earned {pts(row.revoked.points)}{row.revoked.approvedBy ? `, approved by ${row.revoked.approvedBy}` : ''}
                                    </span>
                                )}
                                {row.notes && <span className="ulk-row__detail ulk-note">“{row.notes}”</span>}
                            </span>
                            <span className="ulk-row__end">
                                <span className={`ulk-status ulk-status--${row.revoked ? 'revoked' : row.status}`}>{row.statusLabel}</span>
                                {row.status === 'pending' && (
                                    <Link to={`/eboard/point-requests?request=${encodeURIComponent(row.id)}`}>Review</Link>
                                )}
                            </span>
                            {row.revocable && <div className="ulk-row__form"><RevokeForm requestId={row.id} points={row.points} /></div>}
                        </li>
                    ))}
                </ul>
            )}
        </details>
    );
}

export default UserPointsLookup;
