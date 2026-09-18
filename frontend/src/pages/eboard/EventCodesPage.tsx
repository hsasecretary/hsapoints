import { useState } from 'react';
import CreateCode from './CreateCode';
import SectionTitle from '../../components/ui/SectionTitle';
import EditableCodesTable from './EditableCodesTable';
import scrapeCabinetRoles from '../../lib/admin/scrapeCabinetRoles';

// /eboard/event-codes: create a code, the one-time cabinet-role export,
// and the Manage Event Codes table.
function EventCodesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState('');
  const [codesRefreshKey, setCodesRefreshKey] = useState(0);

  // After a code is saved: close the form, confirm, and reload the list.
  const handleCreated = (code: string) => {
    setCreateOpen(false);
    setLastCreated(code);
    setCodesRefreshKey((key) => key + 1);
  };

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

      <div className="create-code-toggle">
        <button
          type="button"
          className="create-code-toggle__button"
          onClick={() => { setCreateOpen((open) => !open); setLastCreated(''); }}
          aria-expanded={createOpen}
          aria-controls="create-code-panel"
        >
          {createOpen ? '✗ Cancel' : '+ Create New Event Code'}
        </button>
        {lastCreated && !createOpen && (
          <p className="create-code-toggle__done">Event code "{lastCreated}" created.</p>
        )}
      </div>

      {/* Slides open below the button; closes itself after a successful create */}
      <div id="create-code-panel" className={`collapsible${createOpen ? ' is-open' : ''}`}>
        <div className="collapsible__inner">
          <CreateCode onCreated={handleCreated} />
        </div>
      </div>

      <EditableCodesTable refreshKey={codesRefreshKey} />

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
