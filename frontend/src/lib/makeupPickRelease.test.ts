import { describe, expect, it } from 'vitest';
import type { Attendance, Code, Member } from './computeStanding';
import { picksToSetAside } from './makeupPickRelease';

const TODAY = '2027-04-20';
const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

function code(id: string, eventTypeId: string, eventDate: string): Code {
    return { id, eventTypeId, eventDate };
}

const retreat = code('RET1', 'cabinet-retreat', '2026-09-12');
const thursday = code('CT1', 'cabinet-thursday', '2026-09-03');

function requested(email: string, id: string, eventTypeId: string, eventDate: string, makeupFor?: string): Attendance {
    return { id: `${email}__req-${id}`, eventTypeId, eventDate, source: 'request', requestId: id, ...(makeupFor ? { makeupFor } : {}) };
}

function attendedThursday(email: string): Attendance {
    return { id: `${email}__CT1`, eventTypeId: 'cabinet-thursday', eventDate: '2026-09-03', source: 'code', codeId: 'CT1' };
}

describe('picksToSetAside', () => {
    it('sets aside a pick the old rule ignored, so the requirement stays filled and the miss stays owed', () => {
        const email = 'a@ufl.edu';
        const hlhm = requested(email, 'r1', 'hlhm', '2026-09-20', 'RET1');
        const result = picksToSetAside({
            today: TODAY,
            codes: [retreat, thursday],
            members: [{ email, member: cabinetMember, attendances: [attendedThursday(email), hlhm] }],
            approvedBefore: [hlhm.id],
        });

        expect(result).toEqual({ setAside: [{ email, attendanceId: hlhm.id, makeupFor: 'RET1' }], mismatches: [] });
    });

    it("sets aside the old pick without counting a later request's pick, which the new rule applies to, as a mismatch", () => {
        const email = 'd@ufl.edu';
        const oldHlhm = requested(email, 'r1', 'hlhm', '2026-09-20', 'RET1');
        const lateService = requested(email, 'r2', 'hsa-service', '2026-10-05', 'CT1');
        const result = picksToSetAside({
            today: TODAY,
            codes: [retreat, thursday],
            members: [{ email, member: cabinetMember, attendances: [oldHlhm, lateService] }],
            approvedBefore: [oldHlhm.id],
        });

        expect(result).toEqual({ setAside: [{ email, attendanceId: oldHlhm.id, makeupFor: 'RET1' }], mismatches: [] });
    });

    it('leaves a pick the old rule honoured, and one from a request approved after the release', () => {
        const email = 'b@ufl.edu';
        const crash = requested(email, 'r1', 'crash', '2026-09-20', 'RET1');
        const lateHlhm = requested(email, 'r2', 'hlhm', '2026-10-01', 'CT1');
        const result = picksToSetAside({
            today: TODAY,
            codes: [retreat, thursday],
            members: [{ email, member: cabinetMember, attendances: [crash, lateHlhm] }],
            // r2 was approved after the release, so the new rule applies to it.
            approvedBefore: [crash.id],
        });

        expect(result).toEqual({ setAside: [], mismatches: [] });
    });

    it('sets aside each ignored Tabling hour, keeping the hour whose pick was honoured', () => {
        const email = 'c@ufl.edu';
        // Both hours picked and both the first Tabling of the Semester: under the
        // old rule the first filled Tabling (pick ignored), the second made up CT1.
        const hours = [
            requested(email, 't1-h1', 'tabling', '2026-09-15', 'RET1'),
            requested(email, 't1-h2', 'tabling', '2026-09-15', 'CT1'),
        ];
        const result = picksToSetAside({
            today: TODAY,
            codes: [retreat, thursday],
            members: [{ email, member: cabinetMember, attendances: hours }],
            approvedBefore: hours.map((hour) => hour.id),
        });

        expect(result).toEqual({ setAside: [{ email, attendanceId: hours[0].id, makeupFor: 'RET1' }], mismatches: [] });
    });
});
