import type { UpcomingEvent } from '../../../lib/upcomingEvents';
import { fromIsoDate } from '../../../lib/semester';

// Overview, everyone (part of #98): what's on in the next week, at most five,
// soonest first. Gets events already stripped of their codes, since a code is
// what Members type to check in and must never reach the page.
function UpcomingEvents({ events }: { events: UpcomingEvent[] }) {
    return (
        <section className="ov-upcoming" aria-labelledby="ov-upcoming-title">
            <h2 id="ov-upcoming-title" className="ov-h2">Coming up</h2>
            {events.length === 0
                ? <p className="ov-upcoming__sub">Nothing scheduled in the next week. Check back soon.</p>
                : (
                    <>
                        <p className="ov-upcoming__sub">Events in the next week.</p>
                        <ul>
                            {events.map((event) => {
                                const date = fromIsoDate(event.eventDate);
                                return (
                                    <li key={event.key}>
                                        <time className="ov-upcoming__date" dateTime={event.eventDate}>
                                            <span>{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <b>{date.getDate()}</b>
                                        </time>
                                        <span className="ov-upcoming__name">
                                            {event.title}
                                            <small>{event.dayName} · {event.typeLabel}</small>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
        </section>
    );
}

export default UpcomingEvents;
