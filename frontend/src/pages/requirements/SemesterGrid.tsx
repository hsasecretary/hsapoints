import type { Cell, RequirementsBoard, SemesterColumn } from '../../lib/requirementsBoard';

function CellBody({ cell }: { cell: Cell }) {
    switch (cell.kind) {
        case 'done':
            return <><span aria-hidden="true">✓</span> <small>{cell.by}</small></>;
        case 'waived':
            return <small>Not needed</small>;
        case 'fall-only':
            return <small>Fall only</small>;
        case 'pending':
            return <small>Waiting for E-Board</small>;
        default:
            return <span className="rq-hole" role="img" aria-label="Not yet" />;
    }
}

function Heading({ column, notStarted }: { column: SemesterColumn; notStarted?: string }) {
    return (
        <th scope="col">
            {column.label} <small>{column.started ? `${column.done} of ${column.needed}` : notStarted}</small>
        </th>
    );
}

// Tier 2 as a Fall | Spring grid (#58 variant D): one row per Semester
// Requirement, the cell naming the event that filled it. Spring is there
// because Missed Events and Strikes carry over and the contract asks for
// two a year (#62).
function SemesterGrid({ grid }: { grid: RequirementsBoard['grid'] }) {
    return (
        <table className="rq-grid">
            <thead>
                <tr>
                    <th scope="col">One of each</th>
                    <Heading column={grid.fall} />
                    <Heading column={grid.spring} notStarted="Starts in Jan" />
                </tr>
            </thead>
            <tbody>
                {grid.rows.map((row) => (
                    <tr key={row.eventTypeId}>
                        <th scope="row">{row.name}{row.note && <small>{row.note}</small>}</th>
                        {([['fall', row.fall], ['spring', row.spring]] as const).map(([semester, cell]) => (
                            <td key={semester} className={`is-${cell.kind}${grid[semester].started ? '' : ' is-later'}`}>
                                <CellBody cell={cell} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default SemesterGrid;
