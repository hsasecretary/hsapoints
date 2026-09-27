import { Fragment, useState } from 'react';
import type { RequirementsBoard } from '../../../lib/requirementsBoard';
import { shortDate } from '../../../lib/semester';

// "By category" in the Cabinet view (#58 variant D): a table of Event Types
// with the events, Cabinet Points and VE Points of each and a total row. Each
// row opens to its events, and each event says what it did.
function EventTypeTable({ byType }: { byType: RequirementsBoard['byType'] }) {
    const [open, setOpen] = useState<string | null>(null);
    const { rows, total } = byType;

    return (
        <table className="ov-types">
            <thead>
                <tr><th scope="col">Event Type</th><th scope="col">Events</th><th scope="col">Cabinet</th><th scope="col">VE</th></tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <Fragment key={row.key}>
                        <tr className={open === row.key ? 'is-open' : ''}>
                            <th scope="row">
                                <button type="button" aria-expanded={open === row.key} aria-controls={open === row.key ? `ov-types-${row.key}` : undefined}
                                    onClick={() => setOpen(open === row.key ? null : row.key)}>
                                    {row.name}
                                </button>
                            </th>
                            <td>{row.events.length}</td><td>{row.cabinetPoints}</td><td>{row.vePoints}</td>
                        </tr>
                        {open === row.key && row.events.map((event, i) => (
                            <tr key={event.id} id={i === 0 ? `ov-types-${row.key}` : undefined} className="ov-types__sub">
                                <td colSpan={4}>
                                    <span>{[event.name, event.date && shortDate(event.date)].filter(Boolean).join(', ')}</span>
                                    {event.did && <small>{event.did}</small>}
                                </td>
                            </tr>
                        ))}
                    </Fragment>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <th scope="row">Total</th>
                    <td>{total.events}</td>
                    <td>{total.cabinetPoints} <small>of {total.cabinetGoal}</small></td>
                    <td>{total.vePoints} <small>of {total.veGoal}</small></td>
                </tr>
            </tfoot>
        </table>
    );
}

export default EventTypeTable;
