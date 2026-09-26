import { describe, expect, it } from 'vitest';
import type { Attendance, Code, Member } from './computeStanding';
import {
    approvalAttendances, attachableCodes, initialDecision, previewApproval, type ReviewDecision, type ReviewRequest,
} from './requestReview';

// Fall 2026 / Spring 2027.
const TODAY = '2026-10-15';
const EMAIL = 'm@ufl.edu';

function code(id: string, eventTypeId: string, eventDate: string, event = id): Code {
    return { id, eventTypeId, eventDate, event };
}

function attended(c: Code): Attendance {
    return { id: `${EMAIL}__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source: 'code', codeId: c.id };
}

function request(extra: Partial<ReviewRequest>): ReviewRequest {
    return {
        id: 'r1', userEmail: EMAIL, codeId: null, typeChoiceId: null, eventTypeId: null, date: '2026-10-12',
        makeupFor: [], ...extra,
    };
}

function decision(extra: Partial<ReviewDecision>): ReviewDecision {
    return { eventTypeId: '', codeId: null, makeupFor: [], ...extra };
}

const generalMember: Member = { cabinet: 'none', eboard: false, involvement: 'general' };
const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

describe('initialDecision', () => {
    it("starts from the Member's pick: Event Type, code and one Make-up pick per Tabling hour", () => {
        const tabling = request({ eventTypeId: 'tabling', hours: 3, makeupFor: ['CT1'] });

        expect(initialDecision(tabling)).toEqual({ eventTypeId: 'tabling', codeId: null, makeupFor: ['CT1', null, null] });
    });

    it('leaves the Event Type blank when the Member left it to E-Board', () => {
        expect(initialDecision(request({ typeChoiceId: 'not-listed' })).eventTypeId).toBe('');
    });

    it('reads a request from before Event Types, which has none of the new fields', () => {
        const old = { id: 'old', userEmail: EMAIL, date: '2026-03-02' } as ReviewRequest;

        expect(initialDecision(old)).toEqual({ eventTypeId: '', codeId: null, makeupFor: [null] });
    });
});

describe('approvalAttendances', () => {
    it('makes a 3-hour Tabling request three Attendances, one per hour, each with its own Make-up pick', () => {
        const result = approvalAttendances(request({ eventTypeId: 'tabling', hours: 3 }), null,
            decision({ eventTypeId: 'tabling', makeupFor: ['CT1', null, 'GBM3'] }), cabinetMember);

        expect(result).toEqual({
            ok: true,
            attendances: [
                { id: `${EMAIL}__req-r1-h1`, data: { email: EMAIL, eventTypeId: 'tabling', eventDate: '2026-10-12', source: 'request', requestId: 'r1', makeupFor: 'CT1' } },
                { id: `${EMAIL}__req-r1-h2`, data: { email: EMAIL, eventTypeId: 'tabling', eventDate: '2026-10-12', source: 'request', requestId: 'r1' } },
                { id: `${EMAIL}__req-r1-h3`, data: { email: EMAIL, eventTypeId: 'tabling', eventDate: '2026-10-12', source: 'request', requestId: 'r1', makeupFor: 'GBM3' } },
            ],
        });
    });

    it('makes a code-less request one Attendance under the request ID', () => {
        const result = approvalAttendances(request({ eventTypeId: 'crash' }), null, decision({ eventTypeId: 'crash' }), generalMember);

        expect(result.ok && result.attendances.map((attendance) => attendance.id)).toEqual([`${EMAIL}__req-r1`]);
    });

    it("files a coded event under {email}__{CODE}, with the code's Event Type and date, so it can't double count with redeeming", () => {
        const gbm = code('GBM3', 'gbm', '2026-09-10');
        const result = approvalAttendances(request({ userEmail: 'M@UFL.edu', codeId: 'GBM3', eventTypeId: 'hsa-programming' }), gbm,
            decision({ eventTypeId: 'hsa-programming', codeId: 'GBM3' }), generalMember);

        expect(result).toEqual({
            ok: true,
            attendances: [{
                id: `${EMAIL}__GBM3`,
                data: { email: EMAIL, eventTypeId: 'gbm', eventDate: '2026-09-10', source: 'request', requestId: 'r1', codeId: 'GBM3' },
            }],
        });
    });

    it('needs the Event Type confirmed', () => {
        expect(approvalAttendances(request({}), null, decision({}), generalMember))
            .toEqual({ ok: false, error: 'Confirm the Event Type.' });
    });

    it("refuses a Cabinet-only Event Type for someone who isn't held to the Cabinet rules", () => {
        expect(approvalAttendances(request({}), null, decision({ eventTypeId: 'internal-social' }), generalMember))
            .toEqual({ ok: false, error: 'Internal Social is Cabinet-only.' });
    });

    it('refuses a code that no longer exists', () => {
        expect(approvalAttendances(request({}), null, decision({ eventTypeId: 'gbm', codeId: 'GONE' }), generalMember))
            .toEqual({ ok: false, error: 'GONE is no longer a code.' });
    });
});

describe('attachableCodes', () => {
    const codes = [
        code('SALSA', 'hsa-programming', '2026-10-20'),
        code('MIXER', 'hsa-programming', '2026-09-01'),
        code('SPRING', 'hsa-programming', '2027-02-01'),
        code('LASTFALL', 'hsa-programming', '2025-10-01'),
        code('GBM3', 'gbm', '2026-10-01'),
    ];

    it("lists the confirmed Event Type's codes from the request's Semester, created before or after it", () => {
        expect(attachableCodes(request({}), 'hsa-programming', codes).map((c) => c.id)).toEqual(['MIXER', 'SALSA']);
    });

    it('offers none when the request already names a code, or for Tabling and CRASH, which never get codes', () => {
        expect(attachableCodes(request({ codeId: 'MIXER' }), 'hsa-programming', codes)).toEqual([]);
        expect(attachableCodes(request({}), 'tabling', codes)).toEqual([]);
    });
});

describe('previewApproval', () => {
    const gbmSept = code('GBMSEP', 'gbm', '2026-09-03', 'September GBM');
    const gbmOct = code('GBMOCT', 'gbm', '2026-10-01');
    const thursday = code('CT1', 'cabinet-thursday', '2026-09-10');
    const codes = [gbmSept, gbmOct, thursday];

    it('shows which Missed Event each Tabling hour will make up', () => {
        // Missed GBMSEP (excused) and CT1.
        const member = { ...cabinetMember, excusals: [{ codeId: 'GBMSEP' }] };
        const tabling = request({ eventTypeId: 'tabling', hours: 3 });
        const preview = previewApproval(member, [attended(gbmOct)], codes, tabling, null,
            decision({ eventTypeId: 'tabling', makeupFor: [null, null, null] }), TODAY);

        expect(preview.cabinetPoints).toBe(3);
        expect(preview.vePoints).toBe(3);
        expect(preview.attendances).toEqual([
            { id: `${EMAIL}__req-r1-h1`, alreadyCounted: false, surplus: false, makeupFor: null },
            { id: `${EMAIL}__req-r1-h2`, alreadyCounted: false, surplus: true, makeupFor: 'CT1' },
            { id: `${EMAIL}__req-r1-h3`, alreadyCounted: false, surplus: true, makeupFor: 'GBMSEP' },
        ]);
        expect(preview.covers.map((missed) => [missed.codeId, missed.strike])).toEqual([['GBMSEP', false], ['CT1', true]]);
    });

    it('earns nothing for a code the Member already redeemed', () => {
        const preview = previewApproval(generalMember, [attended(gbmSept)], codes, request({ codeId: 'GBMSEP' }), gbmSept,
            decision({ eventTypeId: 'gbm', codeId: 'GBMSEP' }), TODAY);

        expect(preview).toMatchObject({
            cabinetPoints: 0,
            vePoints: 0,
            attendances: [{ id: `${EMAIL}__GBMSEP`, alreadyCounted: true }],
        });
    });

    it('previews nothing until the Event Type is confirmed', () => {
        expect(previewApproval(generalMember, [], codes, request({}), null, decision({}), TODAY)).toBeNull();
    });
});
