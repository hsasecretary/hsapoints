import { rubric, type EventType, type Tier } from '../../../lib/rubric';

export const TIERS: Tier[] = ['core', 'semester', 'additional'];

export const TIER_LABEL: Record<Tier, string> = {
    core: 'Core Event',
    semester: 'Semester Requirement',
    additional: 'Additional Event',
};

/** The Event Types E-Board can give a code: Tabling and CRASH arrive only by Point Request. */
export const CODEABLE_TYPES: EventType[] = rubric.filter((type) => type.codeable);

type EventTypeSelectProps = {
    id?: string;
    value: string;
    onChange: (eventTypeId: string) => void;
};

// A native select like Sign Up's and the old Create Code's, grouped by tier,
// each option showing what it's worth.
function EventTypeSelect({ id, value, onChange }: EventTypeSelectProps) {
    return (
        <select id={id} aria-label={id ? undefined : 'Event Type'} className="event-type-select" value={value}
            onChange={(e) => onChange(e.target.value)}>
            <option value="">Select Event Type</option>
            {TIERS.map((tier) => (
                <optgroup key={tier} label={`${TIER_LABEL[tier]}s`}>
                    {CODEABLE_TYPES.filter((type) => type.tier === tier).map((type) => (
                        <option key={type.id} value={type.id}>
                            {type.label} ({type.cabinetPoints} Cab / {type.vePoints} VE)
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
}

export default EventTypeSelect;
