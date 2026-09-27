import { describe, expect, it } from 'vitest';
import { isNavItemActive, navItems } from './navItems';

const labels = (options: Parameters<typeof navItems>[0]) => navItems(options).map((item) => item.label);

describe('navItems', () => {
    it('gives a General Member Dashboard, Requests and Guide', () => {
        expect(labels({ cabinetView: false, eboard: false })).toEqual(['Dashboard', 'Requests', 'Guide']);
    });

    it('adds Requirements in the Cabinet view, after Dashboard', () => {
        expect(labels({ cabinetView: true, eboard: false })).toEqual(['Dashboard', 'Requirements', 'Requests', 'Guide']);
    });

    it('ends with E-Board for E-Board, keeping the shared order', () => {
        expect(labels({ cabinetView: false, eboard: true })).toEqual(['Dashboard', 'Requests', 'Guide', 'E-Board']);
        expect(labels({ cabinetView: true, eboard: true }))
            .toEqual(['Dashboard', 'Requirements', 'Requests', 'Guide', 'E-Board']);
    });
});

describe('isNavItemActive', () => {
    const [dashboard, , , , eboard] = navItems({ cabinetView: true, eboard: true });

    it('marks E-Board active on the landing page and every tool', () => {
        expect(isNavItemActive(eboard, '/eboard')).toBe(true);
        expect(isNavItemActive(eboard, '/eboard/event-codes')).toBe(true);
        expect(isNavItemActive(eboard, '/eboardx')).toBe(false);
    });

    it('matches other items exactly', () => {
        expect(isNavItemActive(dashboard, '/dashboard')).toBe(true);
        expect(isNavItemActive(dashboard, '/requests')).toBe(false);
    });
});
