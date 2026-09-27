// User Lookup (#37): one Member's standing for this school year, every point
// behind it and where it came from, and their Point Requests with who
// reviewed them. One scrolling page (docs/research/user-lookup-eboard-ux.md);
// numbers come from computeStanding through lib/memberLookup.ts, so they
// match the Member's own dashboard. E-Board can take points away and revoke
// an approved request here; Strikes are changed on Excuse Absence and pending
// requests reviewed on Point Request Review, each linked from here.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import type { Attendance, Code, Standing } from '../../lib/computeStanding';
import {
    lookupLedger, lookupRequests, lookupSummary, missedEventRows, MISSED_STATE_LABEL, SOURCE_LABEL,
    type LookupLedger, type LookupRequest, type LookupRow, type LookupSummary,
} from '../../lib/memberLookup';
import { roleLine } from '../../lib/members';
import { deductPoints } from '../../lib/requestReview';
import { displayName } from '../../lib/nameSearch';
import { eventType } from '../../lib/rubric';
import { shortDate } from '../../lib/semester';
import MemberSearch from '../../components/members/MemberSearch';
import { useMemberStanding } from '../dashboard/useMemberStanding';
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

    return (
        <div className="ulk">
            <h2 className="ulk-title">User Lookup</h2>
            {membersError && <p className="ulk-error" role="alert">{membersError}</p>}
            {!members && !membersError && <p className="ulk-muted">Loading members…</p>}
            <MemberSearch<LookupMember> members={members ?? []} disabled={!members} detail={roleLine}
                onPick={(member) => setParams({ member: member.email })} />

            {!email && members && <p className="ulk-muted">Find a member by name to see their points and Point Requests.</p>}
            {email && members && !picked && <p className="ulk-error" role="alert">No account found for {email}.</p>}
            {picked && <MemberDetail key={picked.email} member={picked} />}
        </div>
    );
}

function MemberDetail({ member: profile }: { member: LookupMember }) {
    // Someone else's standing: never pass the signed-in viewer's view override.
    const { loading, member, attendances, codes, requests, standing, today } = useMemberStanding(profile.email);
    const summary = useMemo(() => standing && lookupSummary(member, standing, requests), [member, standing, requests]);
    const ledger = useMemo(() => member && lookupLedger({ member, attendances, codes, requests }), [member, attendances, codes, requests]);
    const requestRows = useMemo(() => lookupRequests(requests, today), [requests, today]);

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
                    <Points ledger={ledger} cabinet={summary.rules === 'cabinet'} email={profile.email} today={today} />
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
                <Link to={`/eboard/excuse-absence?member=${encodeURIComponent(email)}`}>Open in Excuse Absence</Link> to excuse, remove a Strike or close a Missed Event.
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

type PointsFilter = 'all' | 'codes' | 'requests' | 'adjustments';

const FILTERS: { value: PointsFilter; label: string; keep: (row: LookupRow) => boolean }[] = [
    { value: 'all', label: 'All', keep: () => true },
    { value: 'codes', label: 'Codes', keep: (row) => Boolean(row.codeId) },
    { value: 'requests', label: 'Point Requests', keep: (row) => row.source === 'request' || Boolean(row.requestId) },
    { value: 'adjustments', label: 'Adjustments', keep: (row) => row.source === 'adjustment' },
];

function Points({ ledger, cabinet, email, today }: { ledger: LookupLedger; cabinet: boolean; email: string; today: string }) {
    const [filter, setFilter] = useState<PointsFilter>('all');
    const rows = ledger.rows.filter(FILTERS.find((option) => option.value === filter).keep);
    return (
        <details className="ulk-panel" open>
            <summary>
                <h4>Points ({ledger.rows.length})</h4>
                <span className="ulk-muted">
                    {plural(ledger.codes.redeemed, 'code')} redeemed, {ledger.codes.byRequest} through a Point Request
                </span>
            </summary>
            <div className="ulk-filters" role="group" aria-label="Show">
                {FILTERS.map((option) => (
                    <button key={option.value} type="button" aria-pressed={filter === option.value}
                        className={`ulk-filter${filter === option.value ? ' is-active' : ''}`} onClick={() => setFilter(option.value)}>
                        {option.label}
                    </button>
                ))}
            </div>
            {rows.length === 0 ? <p className="ulk-muted">{filter === 'all' ? 'No points this school year yet.' : 'Nothing here this school year.'}</p> : (
                <ul className="ulk-list">
                    {rows.map((row) => (
                        <li key={row.id} className="ulk-row">
                            <span className="ulk-row__date">{dateText(row.date)}</span>
                            <span className="ulk-row__name">
                                {row.name}
                                {row.codeId && <code className="ulk-code">{row.codeId}</code>}
                                <span className="ulk-row__detail">
                                    <span className={`ulk-tag ulk-tag--${row.source}`}>{SOURCE_LABEL[row.source]}</span>
                                    {row.source !== 'adjustment' && ` ${row.eventType}${row.hours ? `, ${row.hours} hours` : ''}`}
                                    {row.approvedBy && ` · ${row.vePoints < 0 ? 'Taken away' : 'Approved'} by ${row.approvedBy}${row.approvedOn ? `, ${shortDate(row.approvedOn)}` : ''}`}
                                </span>
                            </span>
                            <span className="ulk-row__end ulk-num">
                                {row.vePoints > 0 ? '+' : ''}{row.vePoints} VE
                                {cabinet && <small>{row.cabinetPoints} Cabinet</small>}
                            </span>
                        </li>
                    ))}
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
            <TakeAway email={email} today={today} />
        </details>
    );
}

// Taking points off for something that happened: a negative Adjustment.
// A request approved by mistake is revoked under Point Requests instead.
function TakeAway({ email, today }: { email: string; today: string }) {
    const [open, setOpen] = useState(false);
    const [points, setPoints] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const result = await deductPoints(db, email, { points: Number(points), note }, auth.currentUser?.email ?? 'E-Board', today);
            if ('error' in result) setError(result.error);
            else {
                setOpen(false);
                setPoints('');
                setNote('');
                setMessage(`Took away ${pts(Number(points))}.`);
            }
        } catch (err) {
            console.error('Error taking points away:', err);
            setError("Couldn't save it. Try again.");
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <p className="ulk-takeaway">
                <button type="button" className="danger-form__open" onClick={() => { setOpen(true); setMessage(''); }}>Take away points</button>
                {message && <span role="status">{message}</span>}
            </p>
        );
    }
    return (
        <div className="danger-form ulk-takeaway-form">
            <p className="danger-form__hint">For something that happened, such as using someone else's code. To undo an approval, revoke the request under Point Requests.</p>
            <label htmlFor="ulk-takeaway-points">Points to take away</label>
            <input id="ulk-takeaway-points" type="number" min={1} step={1} inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} />
            <label htmlFor="ulk-takeaway-note">Reason (the Member sees this)</label>
            <textarea id="ulk-takeaway-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            {error && <p className="danger-form__error" role="alert">{error}</p>}
            <div className="danger-form__actions">
                <button type="button" className="danger-form__cancel" disabled={saving} onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
                <button type="button" className="danger-form__confirm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Take away'}</button>
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
                            {row.revocable && <div className="ulk-row__revoke"><RevokeForm requestId={row.id} points={row.points} /></div>}
                        </li>
                    ))}
                </ul>
            )}
        </details>
    );
}

export default UserPointsLookup;
