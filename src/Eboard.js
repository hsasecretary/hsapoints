import './Eboard.css';
import CreateCode from './CreateCode';
import Logout from './Logout';
import ApprovedCabinet from './ApprovedCabinet';
import ExcuseAbscense from './ExcuseAbscense';
import UserPointsLookup from './UserPointsLookup';
import PointRequestReview from './PointRequestReview';
import EditableCodesTable from './EditableCodesTable';
import scrapeCabinetRoles from './scrapeCabinetRoles';
import removeAllCabinetRoles from './removeAllCabinetRoles';
import assignCabinetRoles from './assignCabinetRoles';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

function Eboard({ eboard }) {
  let navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    const fetchCodes = async () => {
      const codesCollection = collection(db, "codes");
      const codesSnapshot = await getDocs(codesCollection);
      const codesData = codesSnapshot.docs.map(doc => ({
        id: doc.id.toUpperCase(),
        ...doc.data(),
      }));
      setCodes(codesData);
    };

    fetchCodes();
  }, []);

  function isEboard(eboard) {
    if (eboard) {
      return true;
    } else {
      navigate("/dashboard");
    }
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedCodes = [...codes].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setCodes(sortedCodes);
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

  const handleRemoveAllCabinetRoles = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will remove ALL cabinet roles from ALL users and set everyone to 'none'. This action cannot be undone. Are you sure you want to continue?"
    );
    
    if (confirmed) {
      try {
        const result = await removeAllCabinetRoles();
        alert(`Cabinet roles removal completed! ${result.totalUpdated} users updated out of ${result.totalProcessed} total users. Check console for details and download for report.`);
      } catch (error) {
        console.error('Error removing cabinet roles:', error);
        alert('Error occurred while removing cabinet roles. Check the console for details.');
      }
    }
  };

  // Add handler for assigning cabinet roles from CSV
  const handleAssignCabinetRoles = async () => {
    const confirmed = window.confirm(
      "This will assign cabinet roles to all users listed in the CSV data. Users will be assigned to their respective cabinets and positions. Continue?"
    );
    
    if (confirmed) {
      try {
        const result = await assignCabinetRoles();
        alert(`Cabinet roles assignment completed! ${result.totalUpdated} users updated, ${result.totalNotFound} not found, ${result.totalAlreadyAssigned} already assigned. Check console for details.`);
      } catch (error) {
        console.error('Error assigning cabinet roles:', error);
        alert('Error occurred while assigning cabinet roles. Check the console for details.');
      }
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
              marginBottom: '10px',
              marginRight: '10px'
            }}
          >
            Scrape Cabinet Roles (One-Time)
          </button>
          
          <button 
            onClick={handleRemoveAllCabinetRoles}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '10px',
              marginRight: '10px'
            }}
          >
            ⚠️ Remove ALL Cabinet Roles
          </button>
          
          <button 
            onClick={handleAssignCabinetRoles}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            Assign Cabinet Roles from CSV
          </button>
          
          <p style={{fontSize: '12px', color: '#666'}}>
            Scrape: Export cabinet roles to JSON | Remove: Set everyone's cabinet to "none" | Assign: Assign roles from CSV
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
