import './Eboard.css';
import CreateCode from './CreateCode';
import Logout from './Logout';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

function Eboard({ eboard }) {
  let navigate = useNavigate();

  useEffect(() => {
    const fetchCodes = async () => {
      const table = document.getElementById("codeTable");
      if (table) {
        let rows = "";
        rows += "<tr id='codeTableHeader'>";
        rows += "<th>Event</th>";
        rows += "<th>Code</th>";
        rows += "<th>Category</th>";
        rows += "<th>Graphic Date</th>";
        rows += "<th>Event Date</th>";
        rows += "<th>Points</th>";
        rows += "<th>Voter Eligible</th>";
        rows += "</tr>";

        let num = 1;
        const codes = collection(db, "codes");
        const codesSnapshot = await getDocs(codes);

        codesSnapshot.forEach((code) => {
            let curr = num % 2 === 0 ? "<tr class='even'>" : "<tr class='odd'>";
            curr += `<td>${code.data().event}</td>`;
            curr += `<td>${code.id.toUpperCase()}</td>`;
            curr += `<td>${code.data().category}</td>`;
            curr += `<td>${code.data().graphicDate}</td>`;
            curr += `<td>${code.data().eventDate}</td>`;
            curr += `<td>${code.data().points}</td>`;
            curr += `<td>${code.data().voterEligible ? 'True':'False'}</td>`;
            curr += "</tr>";
            rows += curr;
            num += 1;
        });

        table.innerHTML = rows;
      }
    };

    fetchCodes();
  }, []); // Empty dependency array to run once after initial render

  function isEboard(eboard) {
    if (eboard) {
      return true;
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div>
      <br /><Logout />
      {isEboard(eboard) && <CreateCode />}
      <br />
      <div id='pointsTable'>
        <table id="codeTable">
          <tr className="even">
            <th>Event:</th>
            <th>Code:</th>
            <th>Category:</th>
            <th>Graphic Date:</th>
            <th>Event Date:</th>
            <th>Points:</th>
            <th>Voter Eligible:</th>
          </tr>
        </table>
      </div>
      <br />
      <br />
      <br />

    </div>
  );
}

export default Eboard;
