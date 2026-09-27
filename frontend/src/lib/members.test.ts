import { describe, expect, it } from 'vitest';
import { isHeldToCabinetRules, roleLine } from './members';

describe('roleLine', () => {
    it('names the role E-Board sees in a member search', () => {
        expect(roleLine({ cabinet: 'none', eboard: false, involvement: 'general' })).toBe('General Member');
        expect(roleLine({ cabinet: 'none', eboard: false, involvement: 'mlp' })).toBe('MLP General Member');
        expect(roleLine({ cabinet: 'none', eboard: true, position: 'secretary' })).toBe('E-Board, Secretary');
        expect(roleLine({ cabinet: 'none', eboard: false, webTeam: true })).toBe('Web-team Tester');
    });

    it('calls a web-team member on E-Board a tester first, since they follow the rubric', () => {
        expect(roleLine({ cabinet: 'none', eboard: true, position: 'secretary', webTeam: true }))
            .toBe('Web-team Tester (E-Board, Secretary)');
    });
});

describe('isHeldToCabinetRules', () => {
    it('holds a web-team member to the Cabinet rules even on E-Board', () => {
        expect(isHeldToCabinetRules({ cabinet: 'none', eboard: true, webTeam: true })).toBe(true);
        expect(isHeldToCabinetRules({ cabinet: 'none', eboard: true })).toBe(false);
    });
});
