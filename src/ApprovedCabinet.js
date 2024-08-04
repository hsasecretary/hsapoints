import './ApprovedCabinet.css'; 
import React, { useEffect, useState } from "react";
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function ApprovedCabinet() {
    const [emails, setEmails] = useState([]);

    const updateDatabase = (email, status) => {
        console.log(`Updating ${email} with status ${status}`);
        // Add your update logic here
    };

    useEffect(() => {
        const fetchPending = async () => {
            const pendingDocRef = doc(db, 'cabinets', 'pending');
            const pendingDocSnap = await getDoc(pendingDocRef);
            if (pendingDocSnap.exists()) {
                const data = pendingDocSnap.data();
                setEmails(data.emails);
            }
        };
        fetchPending();
    }, []);

    const handleSubmit = (email, status) => {
        updateDatabase(email, status);
    };

    return (
        <div id='approvedCabinetContainer' className='attendanceForm'>
            <h3>Pending E-board Approval</h3>
            <table id='pendingApprovalTable'>
                <thead>
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
                        <TableRow key={index} email={email} onSubmit={handleSubmit} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const TableRow = ({ email, onSubmit }) => {
    const [status, setStatus] = useState('select');
    
    const handleChange = (event) => {
        setStatus(event.target.value);
    };

    return (
        <tr>
            <td>{email}</td>
            <td>Cabinet</td> {/* Replace with actual data */}
            <td>Position</td> {/* Replace with actual data */}
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
                    onClick={() => onSubmit(email, status)}
                    disabled={status === 'select'}
                >
                    Submit
                </button>
            </td>
        </tr>
    );
};

export default ApprovedCabinet;
