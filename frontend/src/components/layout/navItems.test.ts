import { describe, expect, it } from 'vitest';
import { navItems } from './navItems';

const labels = (options: Parameters<typeof navItems>[0]) => navItems(options).map((item) => item.label);

describe('navItems', () => {
    it('gives a General Member Dashboard and Requests', () => {
        expect(labels({ cabinetView: false })).toEqual(['Dashboard', 'Requests']);
    });

    it('adds Requirements in the Cabinet view, after Dashboard', () => {
        expect(labels({ cabinetView: true })).toEqual(['Dashboard', 'Requirements', 'Requests']);
    });

    it('leaves E-Board out: its tools are in the Account menu', () => {
        expect(navItems({ cabinetView: true }).map((item) => item.to)).not.toContain('/eboard');
    });
});
