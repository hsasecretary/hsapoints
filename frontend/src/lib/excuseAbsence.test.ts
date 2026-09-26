import { describe, expect, it } from 'vitest';
import { computeStanding, type Attendance, type Code, type Member } from './computeStanding';
import {
    actionsFor, applyAbsenceAction, atRiskMembers, previewAbsenceAction, type AbsenceAction, type AbsenceMember,
} from './excuseAbsence';
import { rubric } from './rubric';

// Fall 2026. Every code below has already happened.
const TODAY = '2026-10-15';
const BY = 'cos@ufl.edu';
const AT = '2026-10-15T14:00:00.000Z';

const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

function code(id: string, eventTypeId: string, eventDate: string): Code {
    return { id, eventTypeId, eventDate };
}

function attended(c: Code): Attendance {
    return { id: `m__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source: 'code', codeId: c.id };
}

const ct1 = code('CT1', 'cabinet-thursday', '2026-09-03');
const ct2 = code('CT2', 'cabinet-thursday', '2026-09-10');
const ct3 = code('CT3', 'cabinet-thursday', '2026-09-17');
const social = code('SOC1', 'external-social', '2026-09-20');
const codes = [ct1, ct2, ct3, social];

const act = (kind: AbsenceAction['kind'], codeId: string, note = ''): AbsenceAction => ({ kind, codeId, note });

function standingOf(member: Member, attendances: Attendance[] = []) {
    return computeStanding(member, attendances, rubric, codes, { today: TODAY });
}

describe('actionsFor', () => {
    it('offers Mark excused, Remove Strike and Close on a miss carrying a Strike', () => {
        const [missed] = standingOf(cabinetMember).missedEvents;

        expect(actionsFor(missed)).toEqual(['excuse', 'remove-strike', 'close']);
    });

    it('offers Undo excuse on an excused miss, and no Strike action', () => {
        const [missed] = standingOf({ ...cabinetMember, excusals: [{ codeId: 'CT1' }] }).missedEvents;

        expect(actionsFor(missed)).toEqual(['unexcuse', 'close']);
    });

    it('offers Restore Strike once a Strike was removed', () => {
        const [missed] = standingOf({ ...cabinetMember, strikeRemovals: [{ codeId: 'CT1' }] }).missedEvents;

        expect(actionsFor(missed)).toEqual(['excuse', 'restore-strike', 'close']);
    });

    it('offers only Reopen on a closed miss', () => {
        const [missed] = standingOf({ ...cabinetMember, missedEventOverrides: [{ codeId: 'CT1' }] }).missedEvents;

        expect(actionsFor(missed)).toEqual(['reopen']);
    });

    it('offers no Remove Strike on a made-up miss, which has no Strike left', () => {
        const [missed] = standingOf(cabinetMember, [attended(ct2), attended(ct3), attended(social)]).missedEvents;

        expect(missed.madeUpBy).toBe('m__SOC1');
        expect(actionsFor(missed)).toEqual(['excuse', 'close']);
    });
});

describe('applyAbsenceAction', () => {
    it('records an excusal with its note and appends it to the absenceLog', () => {
        const member: AbsenceMember = { absenceLog: [{ kind: 'closed', codeId: 'CT9', note: 'old', by: BY, at: '2026-09-01T00:00:00.000Z' }] };

        const result = applyAbsenceAction(member, act('excuse', 'CT1', ' Valid Excuse Form '), BY, AT);

        expect(result).toEqual({
            ok: true,
            patch: {
                excusals: [{ codeId: 'CT1', note: 'Valid Excuse Form', by: BY, at: AT }],
                strikeRemovals: [],
                missedEventOverrides: [],
                absenceLog: [
                    member.absenceLog[0],
                    { kind: 'excused', codeId: 'CT1', note: 'Valid Excuse Form', by: BY, at: AT },
                ],
            },
        });
    });

    it('keeps the history when an excusal is undone', () => {
        const excused = applyAbsenceAction({}, act('excuse', 'CT1'), BY, AT);
        if (excused.ok === false) throw new Error(excused.error);

        const undone = applyAbsenceAction(excused.patch, act('unexcuse', 'CT1'), BY, AT);

        expect(undone.ok && undone.patch.excusals).toEqual([]);
        expect(undone.ok && undone.patch.absenceLog.map((entry) => entry.kind)).toEqual(['excused', 'unexcused']);
    });

    it('stores a removed Strike and a closed miss with their reason', () => {
        const removed = applyAbsenceAction({}, act('remove-strike', 'CT1', 'Appeal granted'), BY, AT);
        const closed = applyAbsenceAction({}, act('close', 'CT2', 'Was there, never redeemed'), BY, AT);

        expect(removed.ok && removed.patch.strikeRemovals).toEqual([{ codeId: 'CT1', reason: 'Appeal granted', by: BY, at: AT }]);
        expect(closed.ok && closed.patch.missedEventOverrides).toEqual([{ codeId: 'CT2', reason: 'Was there, never redeemed', by: BY, at: AT }]);
        expect(closed.ok && closed.patch.absenceLog).toEqual([{ kind: 'closed', codeId: 'CT2', note: 'Was there, never redeemed', by: BY, at: AT }]);
    });

    it.each(['remove-strike', 'close'] as const)('needs a reason to %s', (kind) => {
        expect(applyAbsenceAction({}, act(kind, 'CT1', '  '), BY, AT)).toEqual({ ok: false, error: expect.stringMatching(/reason/i) });
    });

    it('keeps a removed Strike through an excuse and its undo, so the History still matches', () => {
        const member: AbsenceMember = { strikeRemovals: [{ codeId: 'CT1', reason: 'Appeal', by: BY, at: AT }] };

        const excused = applyAbsenceAction(member, act('excuse', 'CT1'), BY, AT);
        if (excused.ok === false) throw new Error(excused.error);
        const undone = applyAbsenceAction(excused.patch, act('unexcuse', 'CT1'), BY, AT);

        expect(excused.patch.strikeRemovals).toEqual(member.strikeRemovals);
        expect(undone.ok && undone.patch.strikeRemovals).toEqual(member.strikeRemovals);
        const [missed] = standingOf({ ...cabinetMember, ...(undone.ok ? undone.patch : {}) }).missedEvents;
        expect(missed.strike).toBe(false);
    });

    it("refuses a change that's already been made, e.g. by another E-Board member", () => {
        const member: AbsenceMember = { excusals: [{ codeId: 'CT1', note: '', by: BY, at: AT }] };

        expect(applyAbsenceAction(member, act('excuse', 'CT1'), BY, AT).ok).toBe(false);
        expect(applyAbsenceAction({}, act('unexcuse', 'CT1'), BY, AT).ok).toBe(false);
        expect(applyAbsenceAction({}, act('reopen', 'CT1'), BY, AT).ok).toBe(false);
        expect(applyAbsenceAction({}, act('restore-strike', 'CT1'), BY, AT).ok).toBe(false);
    });

    it('matches code IDs regardless of case', () => {
        const member: AbsenceMember = { excusals: [{ codeId: 'ct1', note: '', by: BY, at: AT }] };

        const result = applyAbsenceAction(member, act('unexcuse', 'CT1'), BY, AT);

        expect(result.ok && result.patch.excusals).toEqual([]);
    });
});

describe('previewAbsenceAction', () => {
    it('moves a Make-up onto the next miss with a Strike when the miss it covered is excused', () => {
        // CT1 and CT2 missed; the External Social made up CT1 (the oldest with a Strike).
        const attendances = [attended(ct3), attended(social)];
        expect(standingOf(cabinetMember, attendances).missedEvents[0].madeUpBy).toBe('m__SOC1');

        const effect = previewAbsenceAction(cabinetMember, attendances, codes, act('excuse', 'CT1'), TODAY);

        expect(effect).toEqual({
            strikes: { before: 1, after: 0 },
            owed: { before: 1, after: 1 },
            moves: [{ attendanceId: 'm__SOC1', eventTypeId: 'external-social', eventDate: '2026-09-20', from: 'CT1', to: 'CT2' }],
        });
    });

    it('shows a closed miss dropping a Strike and a Missed Event owed', () => {
        const effect = previewAbsenceAction(cabinetMember, [attended(ct2), attended(ct3)], codes, act('close', 'CT1', 'x'), TODAY);

        expect(effect).toEqual({ strikes: { before: 1, after: 0 }, owed: { before: 1, after: 0 }, moves: [] });
    });

    it('shows only Missed Events owed changing when an excused miss is closed', () => {
        const member = { ...cabinetMember, excusals: [{ codeId: 'CT1' }] };

        const effect = previewAbsenceAction(member, [attended(ct2), attended(ct3)], codes, act('close', 'CT1', 'x'), TODAY);

        expect(effect).toEqual({ strikes: { before: 0, after: 0 }, owed: { before: 1, after: 0 }, moves: [] });
    });
});

describe('atRiskMembers', () => {
    it('lists Members with 3 or more open Strikes, most Strikes first', () => {
        const three = standingOf(cabinetMember);
        const two = standingOf({ ...cabinetMember, excusals: [{ codeId: 'CT1' }] });
        const four = { ...three, openStrikes: 4 };

        const rows = atRiskMembers([
            { email: 'a@ufl.edu', standing: three },
            { email: 'b@ufl.edu', standing: two },
            { email: 'c@ufl.edu', standing: four },
            { email: 'd@ufl.edu', standing: null },
        ]);

        expect(rows.map((row) => row.email)).toEqual(['c@ufl.edu', 'a@ufl.edu']);
    });
});
