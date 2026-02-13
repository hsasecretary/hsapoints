import './Dashboard.css';
import React, { useState } from 'react';
import { auth, db} from './firebase';
import { doc, getDoc, arrayUnion, updateDoc } from 'firebase/firestore';

function Attendance({ onPointsUpdate }) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleCodeChange = (e) => {
        setCode(e.target.value);
        // Clear any existing messages when user starts typing
        if (message.text) {
            setMessage({ text: '', type: '' });
        }
    };

    async function checkCode(event) {
        event.preventDefault();
        
        if (loading) return;
        
        setLoading(true);
        setMessage({ text: '', type: '' });

        if (!code.trim()) {
            setMessage({ text: '*Required: Type in a Code to Submit', type: 'error' });
            setLoading(false);
            return;
        } 
        
        if (code.length > 45) {
            setMessage({ text: '*Error: Code is Too Long', type: 'error' });
            setLoading(false);
            return;
        }

        try {
            var email = auth.currentUser.email;
            var codeToCheck = code.toUpperCase().trim(); // Changed to uppercase to match database
            
            let date = new Date();
            let day = date.getDate();
            if(day < 10) {
                day = "0" + day;
            }
            let month = date.getMonth()+1;
            if(month < 10) {
                month = "0" + month;
            }
            let year = date.getFullYear();
            date = year + "-" + month + "-" +day;
            
            const userDocRef = doc(db, "users", email);
            const userDocSnap = await getDoc(userDocRef);
            var data = userDocSnap.data();
            
            if(userDocSnap.exists()) {
                const eventCodes = data.eventCodes;
                if(eventCodes.length !== 0) {
                    for(var i = 0; i < eventCodes.length; i++) {
                        if(eventCodes[i] === codeToCheck) {
                            setMessage({ text: '*Error: Already Submitted This Code', type: 'error' });
                            setLoading(false);
                            return;
                        }
                    }
                }
                
                const codeDocRef = await doc(db, "codes", codeToCheck);
                const codeDocSnap = await getDoc(codeDocRef);
                var added = false;
                
                if(codeDocSnap.exists()) {
                    if(date !== codeDocSnap.data().eventDate) {
                        setMessage({ text: '*Error: Code is not active', type: 'error' });
                        setLoading(false);
                        return;
                    }
                    
                    added = true;
                    var semester = codeDocSnap.data().semester;
                    var addPoints = codeDocSnap.data().points;
                    var currentPoints;
                    var voterEligible = codeDocSnap.data().voterEligible;
                    var category = codeDocSnap.data().category;
                    
                    if (semester === "fallPoints") {
                        currentPoints = data.fallPoints;
                        currentPoints = currentPoints + addPoints;
                        if(voterEligible === false) {
                            if(category === "GBM") {
                                var gbmNVE = data.gbmPointsNVE;
                                gbmNVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints, 
                                    "gbmPointsNVE": gbmNVE
                                });
                            } else if(category === "MLP Fall") {
                                var mlpFallNVE = data.mlpFallPointsNVE;
                                mlpFallNVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints, 
                                    "mlpFallPointsNVE": mlpFallNVE
                                });
                            } else if(category === "MLP Spring") {
                                var mlpSpringNVE = data.mlpSpringPointsNVE;
                                mlpSpringNVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints, 
                                    "mlpSpringPointsNVE": mlpSpringNVE
                                });
                            } else if(category === "OPA") {
                                var opa = data.opaPointsNVE;
                                opa += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints,
                                    "opaPointsNVE": opa
                                });
                            } else if(category === "Programming") {
                                var prgmNVE = data.programmingPointsNVE;
                                prgmNVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints,
                                    "programmingPointsNVE": prgmNVE
                                });
                            } else if(category === "Cabinet") {
                                var cabinet = data.cabinetPoints;
                                cabinet += addPoints;
                                await updateDoc(userDocRef, { 
                                    "eventCodes":arrayUnion(codeToCheck), 
                                    "fallPoints":currentPoints,
                                    "cabinetPoints":cabinet
                                })
                            } else {
                                var other = data.otherPoints;
                                other += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints,
                                    "otherPoints": other
                                });
                            }
                        } else {
                            if(category === "Programming") {
                                var prgmVE = data.programmingPointsVE;
                                prgmVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints,
                                    "programmingPointsVE": prgmVE
                                });
                            } else if(category === "GBM") {
                                var gbmVE = data.gbmPointsVE;
                                gbmVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints, 
                                    "gbmPointsVE": gbmVE
                                });
                            } else if(category === "MLP Fall") {
                                var mlpFallVE = data.mlpFallPointsVE;
                                mlpFallVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints, 
                                    "mlpFallPointsVE": mlpFallVE
                                });
                            } else if(category === "MLP Spring") {
                                var mlpSpringVE = data.mlpSpringPointsVE;
                                mlpSpringVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints, 
                                    "mlpSpringPointsVE": mlpSpringVE
                                });
                                
                            } else if(category === "OPA") {
                                var opaVE = data.opaPointsVE;
                                opaVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "fallPoints": currentPoints, 
                                    "opaPointsVE": opaVE
                                });
                            } else if(category === "Cabinet") {
                                cabinet = data.cabinetPoints;
                                cabinet += addPoints;
                                await updateDoc(userDocRef, { 
                                    "eventCodes":arrayUnion(codeToCheck), 
                                    "fallPoints":currentPoints,
                                    "cabinetPoints":cabinet
                                })
                            } 
                        }
                            
                    } else {
                        currentPoints = data.springPoints;
                        currentPoints += addPoints;
                        if(voterEligible === false) {
                            if(category === "GBM") {
                                gbmNVE = data.gbmPointsNVE;
                                gbmNVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints, 
                                    "gbmPointsNVE": gbmNVE
                                });
                            } else if(category === "MLP Fall") {
                                mlpFallNVE = data.mlpFallPointsNVE;
                                mlpFallNVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints, 
                                    "mlpFallPointsNVE": mlpFallNVE
                                });
                            } else if(category === "MLP Spring") {
                                mlpSpringNVE = data.mlpSpringPointsNVE;
                                mlpSpringNVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints, 
                                    "mlpSpringPointsNVE": mlpSpringNVE
                                });
                            } else if(category === "OPA") {
                                opa = data.opaPointsNVE;
                                opa += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints,
                                    "opaPointsNVE": opa
                                });
                            } else if(category === "Programming") {
                                prgmNVE = data.programmingPointsNVE;
                                prgmNVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints,
                                    "programmingPointsNVE": prgmNVE
                                });
                            } else if(category === "Cabinet") {
                                cabinet = data.cabinetPoints;
                                cabinet += addPoints;
                                await updateDoc(userDocRef, { 
                                    "eventCodes":arrayUnion(codeToCheck), 
                                    "springPoints":currentPoints,
                                    "cabinetPoints":cabinet
                                })
                            } else {
                                other = data.otherPoints;
                                other += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints,
                                    "otherPoints": other
                                });
                            }
                        } else {
                            if(category === "Programming") {
                                prgmVE = data.programmingPointsVE;
                                prgmVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints,
                                    "programmingPointsVE": prgmVE
                                });
                            } else if(category === "GBM") {
                                gbmVE = data.gbmPointsVE;
                                gbmVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints, 
                                    "gbmPointsVE": gbmVE
                                });
                            } else if(category === "MLP Fall") {
                                mlpFallVE = data.mlpFallPointsVE;
                                mlpFallVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints, 
                                    "mlpFallPointsVE": mlpFallVE
                                });
                            } else if(category === "MLP Spring") {
                                mlpSpringVE = data.mlpSpringPointsVE;
                                mlpSpringVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints, 
                                    "mlpSpringPointsVE": mlpSpringVE
                                });
                            } else if(category === "OPA") {
                                opaVE = data.opaPointsVE;
                                opaVE += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints, 
                                    "opaPointsVE": opaVE
                                });
                            } else if(category === "Cabinet") {
                                cabinet = data.cabinetPoints;
                                cabinet += addPoints;
                                await updateDoc(userDocRef, { 
                                    "eventCodes":arrayUnion(codeToCheck), 
                                    "springPoints":currentPoints,
                                    "cabinetPoints":cabinet
                                })
                            } else {
                                other = data.otherPoints;
                                other += addPoints;
                                await updateDoc(userDocRef, {
                                    "eventCodes": arrayUnion(codeToCheck),
                                    "springPoints": currentPoints,
                                    "otherPoints": other
                                });
                            }
                        }
                    }
                }

                if(added) {
                    setCode('');
                    setMessage({ text: 'Success! Code submitted and points added to your account!', type: 'success' });
                    
                    // Call the callback to refresh points instead of reloading the page
                    setTimeout(() => {
                        if (onPointsUpdate) {
                            onPointsUpdate();
                        }
                    }, 1500);
                } else {
                    setMessage({ text: '*Error: Code is Invalid', type: 'error' });
                }
            }
        } catch (error) {
            console.error('Error submitting code:', error);
            setMessage({ text: 'An error occurred. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="attendanceForm">
            <h2>Event Attendance</h2>
            <p style={{textAlign: 'center', color: '#666', marginBottom: '20px'}}>
                Enter the code provided at the event to record your attendance and earn points
            </p>
            
            {message.text && (
                <div className={`message ${message.type}`} style={{
                    padding: '10px',
                    marginBottom: '15px',
                    borderRadius: '5px',
                    textAlign: 'center',
                    backgroundColor: message.type === 'error' ? '#fee' : '#efe',
                    color: message.type === 'error' ? '#c33' : '#060',
                    border: `1px solid ${message.type === 'error' ? '#fcc' : '#cfc'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={checkCode} style={{width: '80%', margin: 'auto', paddingBottom: '20px'}}>
                <div className="form-group" style={{marginBottom: '20px'}}>
                    <label htmlFor="code" style={{
                        display: 'block',
                        fontSize: '1.2em',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                        color: '#155776'
                    }}>
                        Attendance Code:
                    </label>
                    <input 
                        type="text" 
                        id="code"
                        value={code}
                        onChange={handleCodeChange}
                        placeholder="Enter event code (e.g., GBM1)"
                        style={{
                            width: '100%',
                            fontSize: '1.3rem',
                            padding: '12px',
                            borderRadius: '5px',
                            border: '2px solid #155776',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.3s ease',
                            textTransform: 'uppercase'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6db0cf'}
                        onBlur={(e) => e.target.style.borderColor = '#155776'}
                        disabled={loading}
                    />
                    <p style={{
                        fontSize: '0.9em',
                        color: '#666',
                        marginTop: '5px',
                        textAlign: 'center'
                    }}>
                        Codes are case-insensitive and only valid on the event date
                    </p>
                </div>
                
                <div className="center">
                    <input 
                        type="submit" 
                        value={loading ? 'Submitting...' : 'Submit Code'}
                        disabled={loading || !code.trim()}
                        style={{
                            backgroundColor: loading || !code.trim() ? '#ccc' : '#f2f6f8',
                            cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                            fontSize: '1.1rem',
                            padding: '12px 30px',
                            border: '2px solid #155776',
                            borderRadius: '5px',
                            transition: 'all 0.3s ease'
                        }}
                    />
                </div>
            </form>
        </div>
    );
}

export default Attendance;