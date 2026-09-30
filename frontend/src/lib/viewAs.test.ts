import { describe, expect, it } from 'vitest';
import { computeStanding, type Member } from './computeStanding';
import { rubric } from './rubric';
import { canSwitchView, effectiveView, ownView, withView } from './viewAs';

const general: Member = { cabinet: 'none', eboard: false, involvement: 'general' };
const cabinet: Member = { cabinet: 'programming', approved: true, eboard: false };
const eboard: Member = { cabinet: 'none', eboard: true, involvement: 'eboard' };
const tester: Member = { cabinet: 'none', eboard: false, involvement: 'general', webTeam: true };

describe('canSwitchView', () => {
    it('is only for E-Board and Web-team Testers', () => {
        expect(canSwitchView(eboard)).toBe(true);
        expect(canSwitchView(tester)).toBe(true);
        expect(canSwitchView(general)).toBe(false);
        expect(canSwitchView(cabinet)).toBe(false);
        expect(canSwitchView({})).toBe(false);
    });
});

describe('ownView', () => {
    it('is Cabinet for E-Board and Web-team Testers, General for everyone else', () => {
        expect(ownView(eboard)).toBe('cabinet');
        expect(ownView(tester)).toBe('cabinet');
        expect(ownView(general)).toBe('general');
    });

    it('follows heldToCabinetRules once E-Board has set it', () => {
        expect(ownView({ ...eboard, heldToCabinetRules: true })).toBe('cabinet');
        expect(ownView({ ...tester, heldToCabinetRules: false })).toBe('general');
    });
});

describe('effectiveView', () => {
    it('is the Own View until another view is picked', () => {
        const as = (member: Member) => ({ own: ownView(member), canSwitch: canSwitchView(member) });
        expect(effectiveView(as(eboard), null)).toBe('cabinet');
        expect(effectiveView(as(eboard), 'general')).toBe('general');
        expect(effectiveView(as(tester), 'general')).toBe('general');
    });

    it('ignores a pick from a Member who may not switch', () => {
        expect(effectiveView({ own: ownView(general), canSwitch: false }, 'cabinet')).toBe('general');
        expect(effectiveView({ own: ownView(cabinet), canSwitch: false }, 'general')).toBe('cabinet');
    });
});

describe('withView', () => {
    it('leaves the Member alone with no view picked', () => {
        expect(withView(eboard, null)).toBe(eboard);
    });

    it('makes the standing follow the picked view', () => {
        const standing = (member: Member) => computeStanding(member, [], rubric, [], { today: '2026-09-26' });
        expect(standing(withView(eboard, 'cabinet')).heldToCabinetRules).toBe(true);
        expect(standing(withView(tester, 'general')).heldToCabinetRules).toBe(false);
    });

    it('marks E-Board in the Cabinet view as exempt, and nobody else', () => {
        const standing = (member: Member) => computeStanding(member, [], rubric, [], { today: '2026-09-26' });
        expect(standing(withView(eboard, 'cabinet')).exempt).toBe(true);
        expect(standing(withView(eboard, 'general')).exempt).toBe(false);
        expect(standing(withView(tester, 'cabinet')).exempt).toBe(false);
        expect(standing(withView({ ...eboard, webTeam: true }, 'cabinet')).exempt).toBe(false);
        expect(standing(withView({ ...eboard, heldToCabinetRules: true }, 'cabinet')).exempt).toBe(false);
        expect(standing(withView(cabinet, 'cabinet')).exempt).toBe(false);
    });

    it('owes E-Board nothing for a Core Event they skipped, but still lists it', () => {
        const gbm = [{ id: 'GBM1', eventTypeId: 'gbm', eventDate: '2026-09-10' }];
        const standing = (member: Member) => computeStanding(member, [], rubric, gbm, { today: '2026-09-26' });
        const exempt = standing(withView(eboard, 'cabinet'));
        expect(exempt.coreEvents.map((event) => event.status)).toEqual(['missed']);
        expect(exempt.missedEvents.filter((missed) => missed.owed)).toEqual([]);
        expect(exempt.openStrikes).toBe(0);
        expect(standing(withView(tester, 'cabinet')).openStrikes).toBe(1);
    });

    it('does not change the stored doc', () => {
        const member = { ...eboard };
        withView(member, 'cabinet');
        expect(member).toEqual(eboard);
    });
});
