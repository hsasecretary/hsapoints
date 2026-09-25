import { describe, expect, it } from 'vitest';
import { eventType, rubric } from './rubric';

describe('the Event Type rubric', () => {
    it('scores a GBM at 1 Cabinet Point and 2 VE Points, as a Core Event', () => {
        expect(eventType('gbm')).toMatchObject({
            label: 'GBM',
            tier: 'core',
            cabinetPoints: 1,
            vePoints: 2,
        });
    });

    it('has the 18 Event Types locked in #40', () => {
        expect(rubric).toHaveLength(18);
        expect(new Set(rubric.map((type) => type.id)).size).toBe(18);
    });

    it('makes exactly the four Cabinet-only Event Types cabinet-only', () => {
        const cabinetOnly = rubric.filter((type) => type.cabinetOnly).map((type) => type.label);
        expect(cabinetOnly.sort()).toEqual(
            ['Cabinet Orientation', 'Cabinet Retreat', 'Cabinet Thursday', 'Internal Social'],
        );
    });

    it('gives HLHM its own Core Event row, not the Affiliate Org one (#60)', () => {
        expect(eventType('hlhm')).toMatchObject({ tier: 'core', cabinetPoints: 1, vePoints: 1 });
    });

    it('makes External Social an Additional Event', () => {
        expect(eventType('external-social')?.tier).toBe('additional');
    });

    it('never offers codes for Tabling or CRASH, and counts Tabling by the hour', () => {
        const codeless = rubric.filter((type) => !type.codeable).map((type) => type.id);
        expect(codeless.sort()).toEqual(['crash', 'tabling']);
        expect(eventType('tabling')?.perHour).toBe(true);
    });

    it('knows nothing about an id that is not in the rubric', () => {
        expect(eventType('other')).toBeUndefined();
    });
});
