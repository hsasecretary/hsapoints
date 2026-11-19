import { START_HOURS, startHourLabel } from '../../../lib/checkInWindow';

type StartTimeSelectProps = {
    id?: string;
    /** The hour as a string, '' for all day (see lib/checkInWindow.ts). */
    value: string;
    onChange: (startHour: string) => void;
};

// When the event starts, on the hour from 6 AM to 12 AM. Check-in then stays
// open for three hours; "All day" keeps a code open the whole event date.
function StartTimeSelect({ id, value, onChange }: StartTimeSelectProps) {
    return (
        // event-type-select for the same teal field and chevron.
        <select id={id} aria-label={id ? undefined : 'Start time'} className="event-type-select start-time-select" value={value}
            onChange={(e) => onChange(e.target.value)}>
            <option value="">All day</option>
            {START_HOURS.map((hour) => (
                <option key={hour} value={String(hour)}>{startHourLabel(hour)}</option>
            ))}
        </select>
    );
}

export default StartTimeSelect;
