import { codeableTypes, eventType, tierLabels, tiers } from '../../../lib/rubric';
import { filterCodes, NO_EVENT_TYPE, semesterLabel, type CodeFilters, type CodeRow } from '../../../lib/eventCodes';

type FacetsProps = {
    codes: CodeRow[];
    filters: CodeFilters;
    onChange: (filters: CodeFilters) => void;
    today: string;
    semesters: { thisYear: string[]; earlier: string[] };
    open: boolean;
};

const WHEN_LABEL: Record<CodeFilters['when'], string> = {
    all: 'Any time',
    upcoming: 'Today and later',
    past: 'Before today',
};

function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

// The filter sidebar. Each option's count ignores its own facet, so it shows
// what picking that option would give.
function Facets({ codes, filters, onChange, today, semesters, open }: FacetsProps) {
    const set = (change: Partial<CodeFilters>) => onChange({ ...filters, ...change });
    const count = (facet: keyof CodeFilters, test: (code: CodeRow) => boolean) =>
        filterCodes(codes, filters, today, facet).filter(test).length;
    const typeOf = (code: CodeRow) => eventType(code.eventTypeId ?? '');
    const narrowed = filters.when !== 'all' || filters.tiers.length > 0 || filters.eventTypeIds.length > 0 || filters.search !== '';

    return (
        <aside id="code-facets" className={`code-facets${open ? ' is-open' : ''}`} aria-label="Filter codes">
            <input type="search" placeholder="Search code or event" aria-label="Search codes" value={filters.search}
                onChange={(e) => set({ search: e.target.value })} />
            <fieldset>
                <legend>Semester</legend>
                {[...semesters.thisYear, ...semesters.earlier].map((semester, i) => (
                    <label key={semester} className={i === semesters.thisYear.length ? 'is-earlier' : ''}>
                        <input type="radio" name="facet-semester" checked={filters.semester === semester}
                            onChange={() => set({ semester })} />
                        {semester}
                        <span>{count('semester', (code) => semesterLabel(code.eventDate) === semester)}</span>
                    </label>
                ))}
            </fieldset>
            <fieldset>
                <legend>When</legend>
                {(Object.keys(WHEN_LABEL) as CodeFilters['when'][]).map((when) => (
                    <label key={when}>
                        <input type="radio" name="facet-when" checked={filters.when === when} onChange={() => set({ when })} />
                        {WHEN_LABEL[when]}
                    </label>
                ))}
            </fieldset>
            <fieldset>
                <legend>Tier</legend>
                {tiers.map((tier) => (
                    <label key={tier}>
                        <input type="checkbox" checked={filters.tiers.includes(tier)}
                            onChange={() => set({ tiers: toggle(filters.tiers, tier) })} />
                        {tierLabels[tier]}s
                        <span>{count('tiers', (code) => typeOf(code)?.tier === tier)}</span>
                    </label>
                ))}
            </fieldset>
            <fieldset>
                <legend>Event Type</legend>
                {codeableTypes.filter((type) => filters.tiers.length === 0 || filters.tiers.includes(type.tier)).map((type) => {
                    const n = count('eventTypeIds', (code) => code.eventTypeId === type.id);
                    return (
                        <label key={type.id} className={n === 0 ? 'is-zero' : ''}>
                            <input type="checkbox" checked={filters.eventTypeIds.includes(type.id)}
                                onChange={() => set({ eventTypeIds: toggle(filters.eventTypeIds, type.id) })} />
                            {type.label}
                            <span>{n}</span>
                        </label>
                    );
                })}
                <label>
                    <input type="checkbox" checked={filters.eventTypeIds.includes(NO_EVENT_TYPE)}
                        onChange={() => set({ eventTypeIds: toggle(filters.eventTypeIds, NO_EVENT_TYPE) })} />
                    No Event Type yet
                    <span>{count('eventTypeIds', (code) => !typeOf(code))}</span>
                </label>
            </fieldset>
            {narrowed && (
                <button type="button" className="link-button"
                    onClick={() => set({ when: 'all', tiers: [], eventTypeIds: [], search: '' })}>
                    Clear filters
                </button>
            )}
        </aside>
    );
}

export default Facets;
