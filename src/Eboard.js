import './Eboard.css';
import CreateCode from './CreateCode';
import Logout from './Logout';
import ApprovedCabinet from './ApprovedCabinet';
import ExcuseAbscense from './ExcuseAbscense';
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

  return (
    <div>
      <br /><Logout />
      {isEboard(eboard) && <CreateCode />}
      <br />
      <div id='pointsTable'>
        <h2>Table of Event Codes</h2>
        <table id="codeTable">
          <thead>
            <tr>
              <th onClick={() => handleSort("event")}>Event</th>
              <th onClick={() => handleSort("id")}>Code</th>
              <th onClick={() => handleSort("category")}>Category</th>
              <th onClick={() => handleSort("graphicDate")}>Graphic Date</th>
              <th onClick={() => handleSort("eventDate")}>Event Date</th>
              <th onClick={() => handleSort("points")}>Points</th>
              <th onClick={() => handleSort("voterEligible")}>Voter Eligible</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code, index) => (
              <tr key={code.id} className={index % 2 === 0 ? 'even' : 'odd'}>
                <td>{code.event}</td>
                <td>{code.id}</td>
                <td>{code.category}</td>
                <td>{code.graphicDate}</td>
                <td>{code.eventDate}</td>
                <td>{code.points}</td>
                <td>{code.voterEligible ? 'True' : 'False'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <br /><br /><br />
      {isEboard(eboard) && <ExcuseAbscense />}
      {isEboard(eboard) && <ApprovedCabinet />}
    </div>
  );
}

export default Eboard;
