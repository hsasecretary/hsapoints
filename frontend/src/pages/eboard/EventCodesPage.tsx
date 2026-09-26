import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
    filterCodes, groupByWeek, semesterLabel, semesterOptions, type CodeFilters, type CodeRow as Code, type WeekGroup,
} from '../../lib/eventCodes';
import { toIsoDate } from '../../lib/semester';
import SectionTitle from '../../components/ui/SectionTitle';
import scrapeCabinetRoles from '../../lib/admin/scrapeCabinetRoles';
import QuickAdd from './eventCodes/QuickAdd';
import Facets from './eventCodes/Facets';
import CodeRow from './eventCodes/CodeRow';

function weekHeading(weekOf: string): string {
    if (!weekOf) return 'No date';
    const sunday = new Date(`${weekOf}T12:00:00`);
    return `Week of ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// /eboard/event-codes (#70, variant B of #46): a sticky quick-add row over
// the codes list, filtered by a facet sidebar and grouped by week, upcoming
// split from past. Tap a code to edit it.
function EventCodesPage() {
    const today = toIsoDate(new Date());
    const [codes, setCodes] = useState<Code[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [filters, setFilters] = useState<CodeFilters>({
        semester: semesterLabel(today), when: 'all', tiers: [], eventTypeIds: [], search: '',
    });
    const [openCode, setOpenCode] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Live, so new codes and check-in counts show up without a refresh.
    useEffect(() => onSnapshot(
        collection(db, 'codes'),
        (snapshot) => {
            setCodes(snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }) as Code));
            setLoading(false);
        },
        (error) => {
            console.error('Error loading codes:', error);
            setLoadError(true);
            setLoading(false);
        },
    ), []);

    const semesters = useMemo(() => semesterOptions(codes.map((code) => code.eventDate ?? ''), today), [codes, today]);
    const visible = filterCodes(codes, filters, today);
    const { upcoming, past } = groupByWeek(visible, today);

    const renderBlock = (heading: string, weeks: WeekGroup<Code>[]) => weeks.length > 0 && (
        <section className="code-block">
            <h2 className="code-block__title">
                {heading} <span>{weeks.reduce((n, week) => n + week.codes.length, 0)}</span>
            </h2>
            {weeks.map((week) => (
                <div key={week.weekOf} className="code-week">
                    <h3>{weekHeading(week.weekOf)}</h3>
                    <ul>
                        {week.codes.map((code) => (
                            <CodeRow key={code.id} code={code} today={today} open={openCode === code.id}
                                onToggle={() => setOpenCode((current) => (current === code.id ? null : code.id))} />
                        ))}
                    </ul>
                </div>
            ))}
        </section>
    );

    const handleScrapeCabinetRoles = async () => {
        try {
            await scrapeCabinetRoles();
            alert('Cabinet roles scraping completed! Check the console for results and look for the downloaded JSON file.');
        } catch (error) {
            console.error('Error running cabinet scraping:', error);
            alert('Error occurred while scraping cabinet roles. Check the console for details.');
        }
    };

    return (
        <div className="event-codes-page">
            <SectionTitle size="page">Event Codes</SectionTitle>

            <QuickAdd />

            <div className="event-codes-page__body">
                <button type="button" className="link-button code-facets-toggle" onClick={() => setShowFilters((open) => !open)}
                    aria-expanded={showFilters} aria-controls="code-facets">
                    {showFilters ? 'Hide filters' : 'Filters'}
                </button>
                <Facets codes={codes} filters={filters} onChange={setFilters} today={today} semesters={semesters} open={showFilters} />

                <div className="code-list">
                    {loading ? <p className="code-list__note">Loading codes…</p>
                        : loadError ? <p className="code-list__note">Couldn't load the codes. Reload the page to try again.</p>
                        : (
                            <>
                                <p className="code-list__note">{visible.length} {visible.length === 1 ? 'code' : 'codes'} in {filters.semester}</p>
                                {renderBlock('Coming up', upcoming)}
                                {renderBlock('Past', past)}
                                {visible.length === 0 && (
                                    <p className="code-list__empty">Nothing matches. Loosen a filter, or add a code above.</p>
                                )}
                            </>
                        )}
                </div>
            </div>

            {/* One-time admin export, kept out of the way at the bottom */}
            <section className="admin-tool-card">
                <button type="button" className="admin-tool-card__button" onClick={handleScrapeCabinetRoles}>
                    Scrape Cabinet Roles (One-Time)
                </button>
                <p className="admin-tool-card__note">Export cabinet roles to JSON</p>
            </section>
        </div>
    );
}

export default EventCodesPage;
