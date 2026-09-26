import { describe, expect, it } from 'vitest';
import type { Attendance, Code, Member } from './computeStanding';
import {
    buildPointRequest, eventChoices, makeupTypeChoices, NOT_LISTED, pickerGroups, previewRequest, type RequestDraft,
    type TypeChoice,
} from './pointRequests';

// Fall 2026 / Spring 2027.
const TODAY = '2026-10-15';
const EMAIL = 'm@ufl.edu';

function code(id: string, eventTypeId: string, eventDate: string, event = id): Code {
    return { id, eventTypeId, eventDate, event };
}

function attended(c: Code): Attendance {
    return { id: `${EMAIL}__${c.id}`, eventTypeId: c.eventTypeId, eventDate: c.eventDate, source: 'code', codeId: c.id };
}

const OPA: TypeChoice = { id: 'opa', label: 'OPA', eventTypeIds: ['opa-general', 'opa-solidarity-session'] };
const GBM: TypeChoice = { id: 'gbm', label: 'GBM', eventTypeIds: ['gbm'] };
const TABLING: TypeChoice = { id: 'tabling', label: 'Tabling', eventTypeIds: ['tabling'] };

describe('pickerGroups', () => {
    it('gives General Members OPA as one bubble, the Affiliates together, and no Cabinet-only Event Types', () => {
        const groups = pickerGroups(false);
        const choices = groups.flatMap((group) => group.choices);

        expect(choices.find((choice) => choice.label === 'OPA')?.eventTypeIds)
            .toEqual(['opa-general', 'opa-solidarity-session']);
        expect(groups.find((group) => group.label === 'Affiliates')?.choices.map((choice) => choice.eventTypeIds))
            .toEqual([['affiliate-org'], ['hlhm'], ['hlsa'], ['crash']]);
        const offered = choices.flatMap((choice) => choice.eventTypeIds);
        for (const cabinetOnly of ['cabinet-thursday', 'cabinet-retreat', 'cabinet-orientation', 'internal-social']) {
            expect(offered).not.toContain(cabinetOnly);
        }
        // Every other Event Type is somewhere.
        expect(offered).toHaveLength(14);
    });
});

describe('pickerGroups for Cabinet Members', () => {
    it('lists every Event Type as one set of chips, Cabinet-only ones included', () => {
        const groups = pickerGroups(true);

        expect(groups).toHaveLength(1);
        expect(groups[0].choices).toHaveLength(18);
        expect(groups[0].choices.map((choice) => choice.id)).toContain('internal-social');
    });
});

describe('eventChoices', () => {
    const lastYear = code('OPA25', 'opa-general', '2026-03-02');
    const opaGeneral = code('OPAGEN', 'opa-general', '2026-09-10');
    const solidarity = code('SOLID', 'opa-solidarity-session', '2026-10-01');
    const redeemed = code('OPAOLD', 'opa-general', '2026-08-28');
    const requested = code('OPAREQ', 'opa-general', '2026-09-20');
    const upcoming = code('OPANEXT', 'opa-general', '2026-10-30');
    const gbm = code('GBM1', 'gbm', '2026-09-03');
    const codes = [lastYear, opaGeneral, solidarity, redeemed, requested, upcoming, gbm];
    const context = { codes, attendances: [attended(redeemed)], pendingCodeIds: ['OPAREQ'], today: TODAY };

    it("lists this year's past codes of the picked Event Types, newest first, skipping any already redeemed or requested", () => {
        const choices = eventChoices(OPA, context);

        expect(choices.codes.map((c) => c.id)).toEqual(['SOLID', 'OPAGEN']);
        expect(choices.other).toBe(true);
        expect(choices.codeless).toBe(false);
    });

    it('never offers Other for a Core Event, since every Core Event gets a code', () => {
        const choices = eventChoices(GBM, context);

        expect(choices.codes.map((c) => c.id)).toEqual(['GBM1']);
        expect(choices.other).toBe(false);
    });

    it('lists nothing for Tabling, which never gets a code', () => {
        expect(eventChoices(TABLING, context)).toEqual({ codes: [], other: false, codeless: true });
    });
});

const generalMember: Member = { cabinet: 'none', eboard: false, involvement: 'general' };
const cabinetMember: Member = { cabinet: 'programming', approved: true, eboard: false, heldToCabinetRules: true };

function draft(extra: Partial<RequestDraft>): RequestDraft {
    return {
        eventTypeId: null, codeId: null, eventName: '', eventDate: '', note: '',
        hours: 1, makeupFor: [], photo: 'data:image/jpeg;base64,x', ...extra,
    };
}

describe('previewRequest', () => {
    const gbmSept = code('GBMSEP', 'gbm', '2026-09-03');
    const gbmOct = code('GBMOCT', 'gbm', '2026-10-01');
    const thursday = code('CT1', 'cabinet-thursday', '2026-09-10');
    const codes = [gbmSept, gbmOct, thursday];
    const options = { email: EMAIL, today: TODAY };

    it('shows a General Member the points a coded event earns, and no Make-ups', () => {
        const preview = previewRequest(generalMember, [], codes,
            draft({ codeId: 'GBMSEP', eventTypeId: 'gbm', eventDate: '2026-09-03' }), options);

        expect(preview).toEqual({ cabinetPoints: 1, vePoints: 2, attendances: [{ surplus: false, makeupFor: null }], covers: [] });
    });

    it("clears a Missed Event and its Strike when the Member names that event's code (\"I was there\")", () => {
        // Missed both GBMs and the Cabinet Thursday; the Thursday is excused.
        const member = { ...cabinetMember, excusals: [{ codeId: 'CT1' }] };
        const preview = previewRequest(member, [], codes,
            draft({ codeId: 'GBMOCT', eventTypeId: 'gbm', eventDate: '2026-10-01' }), options);

        expect(preview.attendances).toEqual([{ surplus: false, makeupFor: null }]);
        expect(preview.covers).toEqual([{ codeId: 'GBMOCT', eventTypeId: 'gbm', eventDate: '2026-10-01', strike: true }]);
    });

    it('makes each Tabling hour past the first a Make-up: oldest Strike first, then the excused miss', () => {
        const member = { ...cabinetMember, excusals: [{ codeId: 'GBMSEP' }] };
        const tabled = [attended(gbmOct)];
        const preview = previewRequest(member, tabled, codes,
            draft({ eventTypeId: 'tabling', eventDate: '2026-10-12', hours: 3 }), options);

        expect(preview.cabinetPoints).toBe(3);
        expect(preview.vePoints).toBe(3);
        expect(preview.attendances).toEqual([
            { surplus: false, makeupFor: null },
            { surplus: true, makeupFor: 'CT1' },
            { surplus: true, makeupFor: 'GBMSEP' },
        ]);
        expect(preview.covers.map((missed) => [missed.codeId, missed.strike])).toEqual([['GBMSEP', false], ['CT1', true]]);
    });

    it('honours the Make-up the Member picked for each hour', () => {
        const member = { ...cabinetMember, excusals: [{ codeId: 'GBMSEP' }] };
        const alreadyTabled: Attendance = { id: `${EMAIL}__req-old-h1`, eventTypeId: 'tabling', eventDate: '2026-09-01', source: 'request' };
        const preview = previewRequest(member, [alreadyTabled, attended(gbmOct)], codes,
            draft({ eventTypeId: 'tabling', eventDate: '2026-10-12', hours: 2, makeupFor: ['GBMSEP', null] }), options);

        expect(preview.attendances).toEqual([
            { surplus: true, makeupFor: 'GBMSEP' },
            { surplus: true, makeupFor: 'CT1' },
        ]);
    });

    it('previews nothing until the Event Type and date are known (E-Board picks the type for "Not listed")', () => {
        expect(previewRequest(generalMember, [], codes, draft({ eventName: 'Mixer', eventDate: '2026-10-02' }), options)).toBeNull();
    });
});

describe('buildPointRequest', () => {
    const gbm = code('GBMSEP', 'gbm', '2026-09-03', 'September GBM');
    const context = { email: EMAIL, codes: [gbm], today: TODAY };

    it('saves a picked code with its Event Type and date, and asks nothing but the photo', () => {
        const built = buildPointRequest(
            draft({ typeChoiceId: 'gbm', codeId: 'GBMSEP', eventTypeId: 'gbm', eventDate: '2026-09-03' }), context);

        expect(built).toEqual({
            ok: true,
            data: {
                userEmail: EMAIL,
                codeId: 'GBMSEP',
                typeChoiceId: 'gbm',
                eventTypeId: 'gbm',
                activityName: 'September GBM',
                date: '2026-09-03',
                description: '',
                makeupFor: [null],
                imageData: 'data:image/jpeg;base64,x',
                pointsRequested: 2,
                status: 'pending',
                reviewedAt: null,
                reviewedBy: null,
                reviewNotes: '',
            },
        });
    });

    it("saves a Tabling request's hours with one Make-up pick per hour", () => {
        const built = buildPointRequest(draft({
            typeChoiceId: 'tabling', eventTypeId: 'tabling', eventName: 'Turlington table', eventDate: '2026-10-12', hours: 3,
            note: 'Tabled at Turlington', makeupFor: ['CT1'],
        }), context);

        expect(built.ok && built.data).toMatchObject({
            codeId: null,
            eventTypeId: 'tabling',
            activityName: 'Turlington table',
            hours: 3,
            makeupFor: ['CT1', null, null],
            description: 'Tabled at Turlington',
            pointsRequested: 3,
            status: 'pending',
        });
    });

    it('leaves the Event Type to E-Board for "Not listed"', () => {
        const built = buildPointRequest(draft({
            typeChoiceId: NOT_LISTED, eventName: ' Mixer ', eventDate: '2026-10-02', note: 'Helped set up',
        }), context);

        expect(built.ok && built.data).toMatchObject({ eventTypeId: null, typeChoiceId: NOT_LISTED, activityName: 'Mixer', pointsRequested: 0 });
    });

    it.each([
        ['no event picked', draft({}), 'Pick the event you went to.'],
        ['no photo', draft({ typeChoiceId: 'gbm', codeId: 'GBMSEP', eventTypeId: 'gbm', eventDate: '2026-09-03', photo: '' }), 'Add a photo from the event.'],
        ['no name for an event without a code', draft({ typeChoiceId: 'crash', eventTypeId: 'crash', eventDate: '2026-10-02', note: 'x' }), 'Name the event.'],
        ['no date', draft({ typeChoiceId: 'crash', eventTypeId: 'crash', eventName: 'CRASH', note: 'x' }), 'Pick the date of the event.'],
        ['a date in the future', draft({ typeChoiceId: 'crash', eventTypeId: 'crash', eventName: 'CRASH', eventDate: '2026-10-16', note: 'x' }), "The event can't be in the future."],
        ['no note', draft({ typeChoiceId: 'crash', eventTypeId: 'crash', eventName: 'CRASH', eventDate: '2026-10-02' }), 'Say what you did.'],
        ['no name for Tabling', draft({ typeChoiceId: 'tabling', eventTypeId: 'tabling', eventDate: '2026-10-02', note: 'x' }), 'Name the event.'],
        ['part of an hour', draft({ typeChoiceId: 'tabling', eventTypeId: 'tabling', eventName: 'Table', eventDate: '2026-10-02', note: 'x', hours: 1.5 }), 'Enter whole hours, from 1 to 8.'],
        ['more hours than a day', draft({ typeChoiceId: 'tabling', eventTypeId: 'tabling', eventName: 'Table', eventDate: '2026-10-02', note: 'x', hours: 9 }), 'Enter whole hours, from 1 to 8.'],
    ])('refuses a request with %s', (_, request, error) => {
        expect(buildPointRequest(request, context)).toEqual({ ok: false, error });
    });
});

describe('makeupTypeChoices', () => {
    it('offers only the Event Types that would be Surplus today: Additional Events, a Semester Requirement already met, HLHM after the first, and Tabling (its second hour is Surplus)', () => {
        const opa = code('OPA1', 'opa-general', '2026-09-10');
        const hlhm = code('HLHM1', 'hlhm', '2026-09-20');
        const choices = makeupTypeChoices(cabinetMember, [attended(opa), attended(hlhm)], [opa, hlhm], { email: EMAIL, today: TODAY });

        expect(choices.map((choice) => choice.id)).toEqual(['hlhm', 'opa-general', 'tabling', 'external-social', 'mlp-open', 'crash']);
    });
});
