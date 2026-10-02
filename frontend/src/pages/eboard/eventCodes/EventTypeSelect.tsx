import { codeableTypes, tierLabels, tiers } from '../../../lib/rubric';

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
            {tiers.map((tier) => (
                <optgroup key={tier} label={`${tierLabels[tier]}s`}>
                    {codeableTypes.filter((type) => type.tier === tier).map((type) => (
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
