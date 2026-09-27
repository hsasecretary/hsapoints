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
    it('is General for E-Board and Cabinet for Web-team Testers', () => {
        expect(ownView(eboard)).toBe('general');
        expect(ownView(tester)).toBe('cabinet');
    });

    it('follows heldToCabinetRules once E-Board has set it', () => {
        expect(ownView({ ...eboard, heldToCabinetRules: true })).toBe('cabinet');
        expect(ownView({ ...tester, heldToCabinetRules: false })).toBe('general');
    });
});

describe('effectiveView', () => {
    it('is the Own View until another view is picked', () => {
        expect(effectiveView(eboard, null)).toBe('general');
        expect(effectiveView(eboard, 'cabinet')).toBe('cabinet');
        expect(effectiveView(tester, 'general')).toBe('general');
    });

    it('ignores a pick from a Member who may not switch', () => {
        expect(effectiveView(general, 'cabinet')).toBe('general');
        expect(effectiveView(cabinet, 'general')).toBe('cabinet');
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

    it('does not change the stored doc', () => {
        const member = { ...eboard };
        withView(member, 'cabinet');
        expect(member).toEqual(eboard);
    });
});
