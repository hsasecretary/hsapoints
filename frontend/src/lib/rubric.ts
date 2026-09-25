// The point rubric: every Event Type and the points it is worth. One rubric
// for everyone, fixed for the year (see CONTEXT.md "Event Type" and
// docs/adr/0002-attendance-ledger-calculated-on-read.md). Changing a row is a
// deploy, and every past Attendance of that type re-scores with it — nothing
// stores points, so this file is the only place they come from.
//
// `id` is what's stored in Firestore (codes/{CODE}.eventTypeId and
// attendances/{id}.eventTypeId), so never rename one.

export type Tier = 'core' | 'semester' | 'additional';

export interface EventType {
    id: string;
    label: string;
    /** Core Event (Tier 1), Semester Requirement (Tier 2) or Additional Event. */
    tier: Tier;
    cabinetPoints: number;
    vePoints: number;
    /** Only Cabinet Members can earn it, by code or Point Request. */
    cabinetOnly: boolean;
    /** False for types that never get codes and arrive only by Point Request. */
    codeable: boolean;
    /** Each hour is its own Attendance (partial hours round down). */
    perHour?: boolean;
}

const rows = [
    // Core Events
    { id: 'cabinet-thursday', label: 'Cabinet Thursday', tier: 'core', cabinetPoints: 0, vePoints: 0, cabinetOnly: true, codeable: true },
    { id: 'gbm', label: 'GBM', tier: 'core', cabinetPoints: 1, vePoints: 2, cabinetOnly: false, codeable: true },
    { id: 'cabinet-retreat', label: 'Cabinet Retreat', tier: 'core', cabinetPoints: 1, vePoints: 1, cabinetOnly: true, codeable: true },
    { id: 'cabinet-orientation', label: 'Cabinet Orientation', tier: 'core', cabinetPoints: 1, vePoints: 1, cabinetOnly: true, codeable: true },
    { id: 'hlsa', label: 'HLSA', tier: 'core', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },
    // One HLHM event a year fills the Core Event; any beyond it is surplus.
    { id: 'hlhm', label: 'HLHM', tier: 'core', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },

    // Semester Requirements
    { id: 'opa-general', label: 'OPA General', tier: 'semester', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },
    { id: 'opa-solidarity-session', label: 'OPA Solidarity Session', tier: 'semester', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },
    { id: 'hsa-programming', label: 'HSA Programming', tier: 'semester', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },
    { id: 'hsa-operations', label: 'HSA Operations', tier: 'semester', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },
    { id: 'hsa-fundraising', label: 'HSA Fundraising', tier: 'semester', cabinetPoints: 1, vePoints: 2, cabinetOnly: false, codeable: true },
    { id: 'hsa-service', label: 'HSA Service', tier: 'semester', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },
    // Waived for Cabinet Members on the MLP Fall / MLP Spring cabinets.
    { id: 'affiliate-org', label: 'Affiliate Org event', tier: 'semester', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },
    { id: 'tabling', label: 'Tabling', tier: 'semester', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: false, perHour: true },
    { id: 'internal-social', label: 'Internal Social', tier: 'semester', cabinetPoints: 0, vePoints: 0, cabinetOnly: true, codeable: true },

    // Additional Events
    { id: 'external-social', label: 'External Social', tier: 'additional', cabinetPoints: 0, vePoints: 0, cabinetOnly: false, codeable: true },
    { id: 'mlp-open', label: 'MLP Open event', tier: 'additional', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: true },
    { id: 'crash', label: 'CRASH event', tier: 'additional', cabinetPoints: 1, vePoints: 1, cabinetOnly: false, codeable: false },
] as const satisfies readonly EventType[];

export type EventTypeId = (typeof rows)[number]['id'];

export const rubric: readonly EventType[] = rows;

const byId = new Map<string, EventType>(rubric.map((type) => [type.id, type]));

/** The Event Type stored under `id`, or undefined if no row has that id. */
export function eventType(id: string): EventType | undefined {
    return byId.get(id);
}
