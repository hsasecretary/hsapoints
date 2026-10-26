import { describe, expect, it } from 'vitest';
import { navItems } from './navItems';

const labels = (options: Parameters<typeof navItems>[0]) => navItems(options).map((item) => item.label);

describe('navItems', () => {
    it('gives a General Member Dashboard and Points', () => {
        expect(labels({ cabinetView: false })).toEqual(['Dashboard', 'Points']);
    });

    it('adds Requirements in the Cabinet view, after Dashboard', () => {
        expect(labels({ cabinetView: true })).toEqual(['Dashboard', 'Requirements', 'Points']);
    });

    it('sends Points to /points, which opens on Requests', () => {
        expect(navItems({ cabinetView: false }).at(-1)).toEqual({ label: 'Points', to: '/points', icon: 'points' });
    });

    it('leaves E-Board out: SiteHeader adds it (E-Board ▾, or the Account menu on phones)', () => {
        expect(navItems({ cabinetView: true }).map((item) => item.to)).not.toContain('/eboard');
    });
});
