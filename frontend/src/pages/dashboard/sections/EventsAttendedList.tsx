import { useState } from 'react';

export type AttendedEvent = {
    code: string;
    event: string;
    category: string;
    eventDate: string;
    points: number;
    semester: string;
    voterEligible: boolean;
};

// "My Events Attended": one compact row per event (code + points), tap a row
// to see the rest. Same look as the E-Board codes list on phones.
function EventsAttendedList({ events }: { events: AttendedEvent[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (events.length === 0) {
        return <p className="attended-empty">No events attended yet</p>;
    }

    return (
        <ul className="attended-list">
            {events.map((event, index) => {
                const open = openIndex === index;
                return (
                    <li key={`${event.code}-${index}`} className={`attended-item${open ? ' is-open' : ''}`}>
                        <button
                            type="button"
                            className="attended-item__summary"
                            onClick={() => setOpenIndex(open ? null : index)}
                            aria-expanded={open}
                        >
                            <span className="attended-item__code">{event.code}</span>
                            <span className="attended-item__points">
                                {event.points}<span className="attended-item__unit">{event.points === 1 ? ' pt' : ' pts'}</span>
                            </span>
                            <span className="attended-item__chevron" aria-hidden="true">›</span>
                        </button>

                        {open && (
                            <dl className="attended-item__details">
                                <div><dt>Event</dt><dd>{event.event}</dd></div>
                                <div><dt>Category</dt><dd>{event.category}</dd></div>
                                <div><dt>Date</dt><dd>{event.eventDate}</dd></div>
                                <div><dt>Semester</dt><dd>{event.semester === 'fallPoints' ? 'Fall' : 'Spring'}</dd></div>
                                <div>
                                    <dt>Voter Eligible</dt>
                                    <dd>
                                        <span className={event.voterEligible ? 'badge-yes' : 'badge-no'}>
                                            {event.voterEligible ? 'Yes' : 'No'}
                                        </span>
                                    </dd>
                                </div>
                            </dl>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

export default EventsAttendedList;
