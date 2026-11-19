import { checkInHoursLabel } from '../../../lib/checkInWindow';
import { eventType, tierLabels } from '../../../lib/rubric';
import { semesterLabel } from '../../../lib/eventCodes';

type TypeFactsProps = {
    eventTypeId: string;
    eventDate: string;
    /** As the start time select holds it; '' for all day. */
    startHour?: string;
};

// What a code is worth, from its Event Type, and which Semester its date puts
// it in, and when it takes check-ins: label over value, spaced out so the
// numbers don't run together.
function TypeFacts({ eventTypeId, eventDate, startHour = '' }: TypeFactsProps) {
    const type = eventType(eventTypeId);
    if (!type) return null;
    const facts: [string, string | number][] = [
        ['Tier', tierLabels[type.tier]],
        ['Cabinet', type.cabinetPoints],
        ['VE', type.vePoints],
        ['Semester', eventDate ? semesterLabel(eventDate) : '—'],
        ['Check-in', checkInHoursLabel(startHour ? Number(startHour) : null)],
    ];
    if (type.cabinetOnly) facts.push(['Who', 'Cabinet only']);
    return (
        <dl className="type-facts">
            {facts.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
        </dl>
    );
}

export default TypeFacts;
