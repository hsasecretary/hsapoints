import React, { useEffect, useState } from "react";
import { db } from '../../lib/firebase';
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';

function ApprovedCabinet() {
    const [emails, setEmails] = useState([]);
    const [cabinets, setCabinets] = useState([]);
    const [positions, setPositions] = useState([]);

    const updateDatabase = async (email, status, cabinet) => {
        cabinet = cabinet.charAt(0).toLowerCase() + cabinet.slice(1);

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

    const approve = (email, cabinet) => handleSubmit(email, 'approve', cabinet);

    // Deny removes them from the cabinet, so ask first (the old dropdown +
    // Submit was a two-step action).
    const deny = (email, cabinet) => {
        if (window.confirm(`Deny ${email}? They will be removed from ${cabinet} and set as a general member.`)) {
            handleSubmit(email, 'deny', cabinet);
        }
    };

    // Same layout as Manage Event Codes: title card, then a table that turns
    // into one card per member on phones.
    return (
        <div id='approvedCabinetContainer' className='approvals'>
            <div className='approvals__header'>
                <h2>E-Board Member Approval</h2>
                <p className='approvals__count'>
                    {emails.length === 0
                        ? 'No members pending approval'
                        : `${emails.length} member${emails.length === 1 ? '' : 's'} waiting for approval`}
                </p>
            </div>

            {emails.length > 0 && (
                <div className='approvals__table-container'>
                    <table className='approvals__table'>
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>Cabinet</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {emails.map((email, index) => {
                                const cabinet = cabinets[index] || 'Loading...';
                                return (
                                    <tr key={email} className={index % 2 === 0 ? 'even' : 'odd'}>
                                        <td className='approvals__email' data-label='Member'>{email}</td>
                                        <td data-label='Cabinet'>{cabinet}</td>
                                        <td className='approvals__actions'>
                                            <button type='button' className='approvals__approve' onClick={() => approve(email, cabinet)}>
                                                ✓ Approve
                                            </button>
                                            <button type='button' className='approvals__deny' onClick={() => deny(email, cabinet)}>
                                                ✗ Deny
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ApprovedCabinet;
