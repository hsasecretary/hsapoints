import { eventType } from '../../../lib/rubric';
import { semesterLabel } from '../../../lib/eventCodes';
import { TIER_LABEL } from './EventTypeSelect';

type TypeFactsProps = {
    eventTypeId: string;
    eventDate: string;
};

// What a code is worth, from its Event Type, and which Semester its date puts
// it in: label over value, spaced out so the numbers don't run together.
function TypeFacts({ eventTypeId, eventDate }: TypeFactsProps) {
    const type = eventType(eventTypeId);
    if (!type) return null;
    const facts: [string, string | number][] = [
        ['Tier', TIER_LABEL[type.tier]],
        ['Cabinet', type.cabinetPoints],
        ['VE', type.vePoints],
        ['Semester', eventDate ? semesterLabel(eventDate) : '—'],
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
