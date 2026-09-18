// The E-Board tools, each on its own page under /eboard. Used by the routes
// in App.tsx and the E-Board dropdown in SiteHeader, so they stay in sync.
export const EBOARD_TOOLS = [
    { path: 'event-codes', label: 'Event Codes' },
    { path: 'point-requests', label: 'Point Request Review' },
    { path: 'user-lookup', label: 'User Lookup' },
    { path: 'excuse-absence', label: 'Excuse Absence' },
    { path: 'approvals', label: 'Pending E-Board Approval' },
] as const;
