// Which semester's points a new event counts toward, by today's date:
// August–December is Fall, January–May is Spring. June–July (summer) counts
// toward the upcoming Fall. Values match users/{email}.fallPoints / springPoints.
export function currentSemester(today: Date = new Date()): 'fallPoints' | 'springPoints' {
    const month = today.getMonth() + 1; // 1 = January
    return month >= 1 && month <= 5 ? 'springPoints' : 'fallPoints';
}

// Event dates are stored as 'YYYY-MM-DD' strings in the member's local time
// (codes/{CODE}.eventDate). new Date('YYYY-MM-DD') would read them as UTC and
// land on the previous day in Florida, so convert through these instead.

/** A local date as 'YYYY-MM-DD'. */
export function toIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

/** 'YYYY-MM-DD' as a local Date at midnight. */
export function fromIsoDate(isoDate: string): Date {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/** 'YYYY-MM-DD' as 'Sep 3'. */
export function shortDate(isoDate: string): string {
    return fromIsoDate(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Fall or spring, from an event date: Semester is never a stored field. */
export function semesterOf(isoDate: string): 'fall' | 'spring' {
    return currentSemester(fromIsoDate(isoDate)) === 'springPoints' ? 'spring' : 'fall';
}

/** A school year runs June to May, since June and July count toward the coming Fall. */
export function academicYear(today: string): { start: string; end: string } {
    const date = fromIsoDate(today);
    const fallYear = date.getMonth() + 1 >= 6 ? date.getFullYear() : date.getFullYear() - 1;
    return { start: `${fallYear}-06-01`, end: `${fallYear + 1}-05-31` };
}
