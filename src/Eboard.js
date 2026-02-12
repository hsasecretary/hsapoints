import './Eboard.css';
import CreateCode from './CreateCode';
import Logout from './Logout';
import ApprovedCabinet from './ApprovedCabinet';
import ExcuseAbscense from './ExcuseAbscense';
import UserPointsLookup from './UserPointsLookup';
import PointRequestReview from './PointRequestReview';
import EditableCodesTable from './EditableCodesTable';
import scrapeCabinetRoles from './scrapeCabinetRoles';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function Eboard({ eboard }) {
  let navigate = useNavigate();

  useEffect(() => {
    // Effect can be removed since EditableCodesTable handles its own data fetching
  }, []);

  function isEboard(eboard) {
    if (eboard) {
      return true;
    } else {
      navigate("/dashboard");
    }
  }

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
      <br /><Logout />
      {isEboard(eboard) && <CreateCode />}
      <br />
      
      {/* Cabinet Management Section */}
      {isEboard(eboard) && (
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
      )}

      {/* Replace the old table with the new editable one */}
      {isEboard(eboard) && <EditableCodesTable />}
      
      <br /><br /><br />
      {isEboard(eboard) && <PointRequestReview />}
      <br /><br />
      {isEboard(eboard) && <UserPointsLookup />}
      <br /><br />
      {isEboard(eboard) && <ExcuseAbscense />}
      {isEboard(eboard) && <ApprovedCabinet />}
    </div>
  );
}

export default Eboard;
