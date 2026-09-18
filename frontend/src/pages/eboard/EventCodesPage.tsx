import CreateCode from './CreateCode';
import EditableCodesTable from './EditableCodesTable';
import scrapeCabinetRoles from '../../lib/admin/scrapeCabinetRoles';

// /eboard/event-codes: create a code, the one-time cabinet-role export,
// and the Manage Event Codes table.
function EventCodesPage() {
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
    <div>
      <CreateCode />
      <br />

      {/* Cabinet Management Section */}
      <div style={{textAlign: 'center', margin: '20px'}}>
        <button 
          onClick={handleScrapeCabinetRoles}
          style={{
            backgroundColor: '#155776',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          Scrape Cabinet Roles (One-Time)
        </button>
        
        <p style={{fontSize: '12px', color: '#666'}}>
          Export cabinet roles to JSON
        </p>
      </div>

      <EditableCodesTable />
    </div>
  );
}

export default EventCodesPage;
