import './ApprovedCabinet.css'; 
import React, { useEffect, useState } from "react";
import { db } from './firebase';
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';

function ApprovedCabinet() {
    const [emails, setEmails] = useState([]);
    const [cabinets, setCabinets] = useState([]);
    const [positions, setPositions] = useState([]);

    const updateDatabase = async (email, status, cabinet) => {
        cabinet = cabinet.charAt(0).toLowerCase() + cabinet.slice(1);
        console.log(`Updating ${email} with status ${status} and cabinet ${cabinet}`);

        if(cabinet === "mLP Fall") 
        {
            cabinet = "mlpFall";
        } else if(cabinet === "mLP Spring") {
            cabinet = "mlpSpring";
        }
        if(status === "deny")
        {
            cabinet = "regular";
        }
        const updateUserRef = doc(db, "users", email);
        const updateUserSnap = await getDoc(updateUserRef);
        const updatePendingRef = doc(db, "cabinets", "pending");
        const updatePendingSnap = await getDoc(updatePendingRef);
        const updateCabinetRef = doc(db, "cabinets", cabinet);
        const updateCabinetSnap = await getDoc(updateCabinetRef);

        if(updateUserSnap.exists())
        {
            if(status === "approve"){
                await updateDoc(updateUserRef, {
                    "approved": true,
                });
            } else {
                await updateDoc(updateUserRef, {
                    "approved": true,
                    "cabinet": "none", 
                    "position": "none"
                });
            }  
        }
        if(updatePendingSnap.exists())
        {
            //Regardless no longer pending
            await updateDoc(updatePendingRef, {
                "emails": arrayRemove(email)
            })
        }
        if(updateCabinetSnap.exists())
        {
            await updateDoc(updateCabinetRef, {
                "emails": arrayUnion(email)
            })
        }
        
    };
    function capitalize (cabinet)
    {
        if(cabinet === "mlpFall") return "MLP Fall";
        if(cabinet === "mlpSpring") return "MLP Spring";
        return cabinet.charAt(0).toUpperCase() + cabinet.slice(1);
    }
    useEffect(() => {
        const fetchPending = async () => {
            const pendingDocRef = doc(db, 'cabinets', 'pending');
            const pendingDocSnap = await getDoc(pendingDocRef);
            if (pendingDocSnap.exists()) {
                const data = pendingDocSnap.data();
                setEmails(data.emails);


                // Prepare to fetch cabinet and position data for each email
                const promises = data.emails.map(async email => {
                    const pendingUserRef = doc(db, 'users', email);
                    const pendingUserSnap = await getDoc(pendingUserRef);
                    if (pendingUserSnap.exists()) {
                        const userData = pendingUserSnap.data();
                        return { cabinet: capitalize(userData.cabinet), position: userData.position };
                    }
                    return { cabinet: 'Unknown', position: 'Unknown' }; // Fallback in case data is missing
                });

                // Wait for all data to be fetched
                const fetchedData = await Promise.all(promises);

                // Extract cabinet and position arrays
                setCabinets(fetchedData.map(item => item.cabinet));
                setPositions(fetchedData.map(item => item.position));
            }
        };
        fetchPending();
    }, []);

    const handleSubmit = (email, status, cabinet) => {
        updateDatabase(email, status,cabinet);
        // Remove the row by filtering out the submitted email
        setEmails(prevEmails => prevEmails.filter(e => e !== email));
        setCabinets(prevCabinets => prevCabinets.filter((_, index) => emails[index] !== email));
        setPositions(prevPositions => prevPositions.filter((_, index) => emails[index] !== email));

    };

    return (
        <div id='approvedCabinetContainer'>
            <h3>Pending E-board Approval</h3>
            <table id='pendingApprovalTable'>
                <thead className='head'>
                    <tr>
                        <th>Name</th>
                        <th>Cabinet</th>
                        <th>Position</th>
                        <th>Status</th>
                        <th>Submit</th>
                    </tr>
                </thead>
                <tbody>
                    {emails.map((email, index) => (
                        
                        <TableRow 
                            key={index} 
                            className={index%2===0? "even":"odd"}
                            email={email} 
                            cabinet={cabinets[index] || 'Loading...'}
                            position={positions[index] || 'Loading...'}
                            onSubmit={handleSubmit} 
                        />
                    ))}
                </tbody>
            </table>
            <p className='center'>{emails.length === 0 ? "No members pending approval" : "End of pending approval list"}</p>
            <br/>
            <br/>
        </div>
    );
}

const TableRow = ({className, email,cabinet, position, onSubmit }) => {
    const [status, setStatus] = useState('select');
    const handleChange = (event) => {
        setStatus(event.target.value);
    };

    return (        <tr className = {className}>
            <td>{email}</td>
            <td>{cabinet}</td> 
            <td>{position}</td>
            <td>
                <select value={status} onChange={handleChange}>
                    <option value='select'>Select</option>
                    <option value='approve'>Approve</option>
                    <option value='deny'>Deny</option>
                </select>
            </td>
            <td>
                <button
                    type='button'
                    onClick={() => onSubmit(email, status, cabinet)}
                    disabled={status === 'select'}
                >
                    Submit
                </button>
            </td>
        </tr>
    );
};

export default ApprovedCabinet;
