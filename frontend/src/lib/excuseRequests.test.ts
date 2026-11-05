import { describe, expect, it } from 'vitest';
import type { Attendance, Code, Member } from './computeStanding';
import {
    buildExcuseRequests,
    EXCUSE_EVENT_REQUIRED,
    EXCUSE_REASON_REQUIRED,
    excusableEvents,
    excuseInbox,
    pendingExcuseCount,
    type ExcuseRequest,
} from './excuseRequests';
import { withView } from './viewAs';

const TODAY = '2026-10-15';
const FILED_AT = '2026-10-14T23:00:00.000Z';
const EMAIL = 'ana@ufl.edu';

const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };
const webTester: Member = { cabinet: 'none', approved: false, eboard: true, webTeam: true, heldToCabinetRules: true };
const eboardMember: Member = { cabinet: 'president', approved: true, eboard: true };
const generalMember: Member = { cabinet: 'none', eboard: false, involvement: 'general' };

function code(id: string, eventTypeId: string, eventDate: string, event = ''): Code {
    return { id, eventTypeId, eventDate, ...(event ? { event } : {}) };
}

function attended(c: Code): Attendance {
    return { id: `${EMAIL}__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source: 'code', codeId: c.id };
}

describe('excusableEvents', () => {
    const pastCore = code('CTPAST', 'cabinet-thursday', '2026-10-08', 'Past Thursday');
    const todayCore = code('CTTODAY', 'cabinet-thursday', TODAY, 'Cabinet Thursday #4');
    const nextGbm = code('GBM2', 'gbm', '2026-10-22', 'October GBM');
    const retreat = code('RET1', 'cabinet-retreat', '2026-11-01');
    const attendedCore = code('CTATT', 'cabinet-thursday', '2026-10-29', 'Attended Thursday');
    const filedCore = code('CTFILED', 'cabinet-thursday', '2026-11-05', 'Already Filed Thursday');
    const semesterReq = code('OPAGEN', 'opa-general', '2026-10-20', 'OPA General');
    const additional = code('SOC1', 'external-social', '2026-10-25', 'Open House Social');
    const hlhm = code('HLHM1', 'hlhm', TODAY, 'HLHM Closing');
    const uncoded = { id: '', eventTypeId: 'gbm', eventDate: '2026-10-28', event: 'Uncoded GBM' } as Code;
    const untyped = { id: 'OLD', eventDate: '2026-10-28', event: 'Untyped Event' } as Code;

    const codes = [
        retreat, pastCore, todayCore, nextGbm, attendedCore, filedCore,
        semesterReq, additional, hlhm, uncoded, untyped,
    ];

    it('offers only coded Core Events on today or later, sorted by date, leaving out attended and already-filed ones', () => {
        const offered = excusableEvents({
            member: cabinetMember,
            codes,
            attendances: [attended(attendedCore)],
            requests: [{ codeId: 'ctfiled' }],
            today: TODAY,
        });

        expect(offered).toEqual([
            { codeId: 'CTTODAY', name: 'Cabinet Thursday #4', eventTypeId: 'cabinet-thursday', eventDate: TODAY },
            { codeId: 'GBM2', name: 'October GBM', eventTypeId: 'gbm', eventDate: '2026-10-22' },
            // Falls back to the Event Type label when the code has no custom title — never the secret code ID.
            { codeId: 'RET1', name: 'Cabinet Retreat', eventTypeId: 'cabinet-retreat', eventDate: '2026-11-01' },
        ]);
    });

    it('offers the same upcoming Core Events to a Web-team Tester', () => {
        const offered = excusableEvents({
            member: webTester,
            codes: [todayCore, nextGbm],
            attendances: [],
            today: TODAY,
        });

        expect(offered.map((e) => e.codeId)).toEqual(['CTTODAY', 'GBM2']);
    });

    it('offers none to E-Board (even when previewing the Cabinet view) or General Members', () => {
        expect(excusableEvents({ member: eboardMember, codes, attendances: [], today: TODAY })).toEqual([]);
        expect(excusableEvents({ member: withView(eboardMember, 'cabinet'), codes, attendances: [], today: TODAY })).toEqual([]);
        expect(excusableEvents({ member: generalMember, codes, attendances: [], today: TODAY })).toEqual([]);
    });
});

describe('buildExcuseRequests', () => {
    const todayCore = code('CTTODAY', 'cabinet-thursday', TODAY, 'Cabinet Thursday #4');
    const nextGbm = code('GBM2', 'gbm', '2026-10-22', 'October GBM');
    const context = {
        email: 'Ana@UFL.edu',
        member: cabinetMember,
        codes: [nextGbm, todayCore],
        attendances: [] as Attendance[],
        today: TODAY,
        filedAt: FILED_AT,
    };

    it('builds one request doc per selected event with the deterministic ID, shared trimmed reason, and passed filing time', () => {
        const built = buildExcuseRequests(
            { codeIds: ['gbm2', 'CTTODAY', 'GBM2'], reason: '  Organic chemistry exam conflict  ' },
            context,
        );

        expect(built).toEqual({
            ok: true,
            requests: [
                {
                    id: 'ana@ufl.edu__CTTODAY',
                    data: {
                        email: 'ana@ufl.edu',
                        codeId: 'CTTODAY',
                        eventName: 'Cabinet Thursday #4',
                        eventTypeId: 'cabinet-thursday',
                        eventDate: TODAY,
                        reason: 'Organic chemistry exam conflict',
                        filedAt: FILED_AT,
                        status: 'pending',
                        reviewedBy: null,
                        reviewedAt: null,
                        reviewNotes: '',
                    },
                },
                {
                    id: 'ana@ufl.edu__GBM2',
                    data: {
                        email: 'ana@ufl.edu',
                        codeId: 'GBM2',
                        eventName: 'October GBM',
                        eventTypeId: 'gbm',
                        eventDate: '2026-10-22',
                        reason: 'Organic chemistry exam conflict',
                        filedAt: FILED_AT,
                        status: 'pending',
                        reviewedBy: null,
                        reviewedAt: null,
                        reviewNotes: '',
                    },
                },
            ],
        });
    });

    it('requires at least one picked event and a non-blank reason', () => {
        expect(buildExcuseRequests({ codeIds: [], reason: 'Exam' }, context)).toEqual({
            ok: false,
            error: EXCUSE_EVENT_REQUIRED,
        });
        expect(buildExcuseRequests({ codeIds: ['GBM2'], reason: '   ' }, context)).toEqual({
            ok: false,
            error: EXCUSE_REASON_REQUIRED,
        });
    });

    it('refuses events that are past, non-Core, already attended, already filed, or filed by an exempt Member', () => {
        expect(buildExcuseRequests({ codeIds: ['NOPE'], reason: 'Exam' }, context)).toMatchObject({ ok: false });
        expect(
            buildExcuseRequests(
                { codeIds: ['GBM2'], reason: 'Exam' },
                { ...context, requests: [{ codeId: 'GBM2' }] },
            ),
        ).toMatchObject({ ok: false });
        expect(
            buildExcuseRequests(
                { codeIds: ['GBM2'], reason: 'Exam' },
                { ...context, attendances: [attended(nextGbm)] },
            ),
        ).toMatchObject({ ok: false });
        expect(
            buildExcuseRequests(
                { codeIds: ['GBM2'], reason: 'Exam' },
                { ...context, member: eboardMember },
            ),
        ).toMatchObject({ ok: false });
    });
});

describe('excuseInbox and pendingExcuseCount', () => {
    function req(
        id: string,
        status: ExcuseRequest['status'],
        eventDate: string,
        filedAt: string,
    ): ExcuseRequest {
        return {
            id,
            email: EMAIL,
            codeId: id,
            eventName: id,
            eventTypeId: 'gbm',
            eventDate,
            reason: 'Conflict',
            filedAt,
            status,
            reviewedBy: status === 'pending' ? null : 'cos@ufl.edu',
            reviewedAt: status === 'pending' ? null : '2026-10-15T12:00:00.000Z',
            reviewNotes: '',
        };
    }

    it('counts only pending requests and orders the inbox by event date, then filing time, then ID', () => {
        const items = [
            req('b__GBM3', 'pending', '2026-10-29', '2026-10-14T10:00:00.000Z'),
            req('a__CT1', 'approved', '2026-10-15', '2026-10-12T08:00:00.000Z'),
            req('c__CT2', 'pending', '2026-10-15', '2026-10-14T09:00:00.000Z'),
            req('a__CT2', 'pending', '2026-10-15', '2026-10-13T18:00:00.000Z'),
            req('d__CT1', 'denied', '2026-10-15', '2026-10-11T08:00:00.000Z'),
        ];

        expect(pendingExcuseCount(items)).toBe(3);
        expect(excuseInbox(items).map((r) => r.id)).toEqual(['a__CT2', 'c__CT2', 'b__GBM3']);
    });
});