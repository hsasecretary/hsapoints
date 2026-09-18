// HSA roles shown at sign-up and on the Dashboard. `value` is what's stored
// in Firestore (users/{email}.cabinet / .position); `label` is what people see.

export const eboardPositions = [
    { value: 'president', label: 'President', cabinet: 'president' },
    { value: 'vp-operations', label: 'Vice President of Operations', cabinet: 'operations' },
    { value: 'vp-programming', label: 'Vice President of Programming', cabinet: 'programming' },
    { value: 'communications', label: 'Communications' },
    { value: 'treasurer', label: 'Treasurer', cabinet: 'treasurey' },
    { value: 'secretary', label: 'Secretary', cabinet: 'secretary' },
    { value: 'mlp-fall-ed', label: 'MLP Fall Executive Director', cabinet: 'mlpFall' },
    { value: 'mlp-spring-ed', label: 'MLP Spring Executive Director', cabinet: 'mlpSpring' },
    { value: 'opa-ed-external', label: 'OPA External Executive Director', cabinet: 'opa' },
    { value: 'opa-ed-internal', label: 'OPA Internal Executive Director', cabinet: 'opa' },
    { value: 'chief-of-staff', label: 'Chief of Staff', cabinet: 'president' }
];

export const cabinets = [
    { value: 'president', label: 'Presidential' },
    { value: 'operations', label: 'Operations' },
    { value: 'programming', label: 'Programming' },
    { value: 'communications', label: 'Communications' },
    { value: 'treasurey', label: 'Treasury' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'mlpFall', label: 'MLP Fall' },
    { value: 'mlpSpring', label: 'MLP Spring' },
    { value: 'opa', label: 'Office of Political Affairs' }
];

/** Readable Account Type for a stored cabinet value, e.g. "mlpFall" -> "MLP Fall". */
export function formatAccountType(cabinet?: string): string {
    if (!cabinet || cabinet === 'none') return 'General Member';
    const known = cabinets.find((c) => c.value === cabinet);
    if (known) return known.label;
    return cabinet.charAt(0).toUpperCase() + cabinet.slice(1);
}
