import { describe, expect, it } from 'vitest';
import { computeStanding, type Code, type Member } from './computeStanding';
import type { AbsenceMember } from './excuseAbsence';
import { approvalFor, toExcuseRequest } from './excuseRequestsDb';
import { rubric } from './rubric';

const TODAY = '2026-10-15';
const BY = 'cos@ufl.edu';
const AT = '2026-10-16T10:00:00.000Z';
const FILED_AT = '2026-10-14T23:00:00.000Z';

describe('approvalFor', () => {
    const request = { codeId: 'CT0', reason: 'Family wedding in Miami' };

    it("writes the excusal with the Member's reason as its note, and logs it", () => {
        expect(approvalFor({}, request, BY, AT)).toEqual({
            ok: true,
            memberPatch: expect.objectContaining({
                excusals: [{ codeId: 'CT0', note: 'Family wedding in Miami', by: BY, at: AT }],
                absenceLog: [{ kind: 'excused', codeId: 'CT0', note: 'Family wedding in Miami', by: BY, at: AT }],
            }),
        });
    });

    it('writes nothing when E-Board already excused that event, so the request still closes cleanly', () => {
        const member: AbsenceMember = { excusals: [{ codeId: 'ct0', note: 'By hand', by: BY, at: AT }] };

        expect(approvalFor(member, request, BY, AT)).toEqual({ ok: true, memberPatch: null });
    });

    it('removes the Strike its miss earned, even when approved after the event', () => {
        const pastThursday: Code = { id: 'CT0', eventTypeId: 'cabinet-thursday', eventDate: '2026-10-08' };
        const member: Member & AbsenceMember = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };
        const standing = (m: Member) => computeStanding(m, [], rubric, [pastThursday], { today: TODAY });

        const before = standing(member);
        const approval = approvalFor(member, request, BY, AT);
        const after = approval.ok && approval.memberPatch ? standing({ ...member, ...approval.memberPatch }) : before;

        expect(before.openStrikes).toBe(1);
        expect(after.openStrikes).toBe(0);
        expect(after.missedEvents[0]).toMatchObject({ codeId: 'CT0', excused: true, owed: true });
    });
});

describe('toExcuseRequest', () => {
    const stamp = { toDate: () => new Date(FILED_AT) };

    it('reads the server timestamps as ISO strings', () => {
        expect(toExcuseRequest('ana@ufl.edu__CT0', {
            email: 'ana@ufl.edu', codeId: 'CT0', eventName: 'Cabinet Thursday', eventTypeId: 'cabinet-thursday',
            eventDate: '2026-10-22', reason: 'Exam', status: 'denied', filedAt: stamp, reviewedBy: BY,
            reviewedAt: stamp, reviewNotes: 'We need you there',
        })).toEqual({
            id: 'ana@ufl.edu__CT0', email: 'ana@ufl.edu', codeId: 'CT0', eventName: 'Cabinet Thursday',
            eventTypeId: 'cabinet-thursday', eventDate: '2026-10-22', reason: 'Exam', status: 'denied',
            filedAt: FILED_AT, reviewedBy: BY, reviewedAt: FILED_AT, reviewNotes: 'We need you there',
        });
    });

    it('treats a timestamp the server has not stamped yet as empty, and a pending request as unreviewed', () => {
        const request = toExcuseRequest('a', { status: 'pending', filedAt: null, reviewedBy: null, reviewedAt: null, reviewNotes: '' });

        expect(request).toMatchObject({ filedAt: '', reviewedBy: null, reviewedAt: null, reviewNotes: '' });
    });
});
