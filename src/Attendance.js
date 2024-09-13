import './Dashboard.css';
import React from 'react';
import { auth, db} from './firebase';
import { doc, getDoc, arrayUnion, updateDoc } from 'firebase/firestore';

function Attendance() {
    async function checkCode(event)
    {
        event.preventDefault();
        document.getElementById("attendanceCodeError").innerText = "";
        document.getElementById("attendanceCodeSuccess").innerText="";

        var email = auth.currentUser.email;
        var code = document.getElementById("code").value.toLowerCase();
        if(code === "")
        {
            document.getElementById("attendanceCodeError").innerText = "*Required: Type in a Code to Submit";
        } else if(code.length > 45) {
            document.getElementById("attendanceCodeError").innerText = "*Error: Code is Too Long";
        }
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
        if(userDocSnap.exists())
        {
            const eventCodes = data.eventCodes;
            if(eventCodes.length !== 0)
            {
                for(var i = 0; i < eventCodes.length; i++)
                {
                    if(eventCodes[i] === code)
                    {
                        document.getElementById("attendanceCodeError").innerText = "*Error: Already Submitted This Code";
                        return;
                    }
                }
            }
            const codeDocRef = await doc(db, "codes", code);
            const codeDocSnap = await getDoc(codeDocRef);
            var added = false;
            if(codeDocSnap.exists())
            {
                
                if(date !== codeDocSnap.data().eventDate)
                {
                    document.getElementById("attendanceCodeError").innerText = "*Error: Code is not active";
                    return;
                }
                added = true;
                var semester = codeDocSnap.data().semester;
                var addPoints = codeDocSnap.data().points;
                var currentPoints;
                var voterEligible = codeDocSnap.data().voterEligible;
                var category = codeDocSnap.data().category;
                if(category === "Cabinet")
                {
                    var cabinetPoints = data.cabinetPoints;
                    cabinetPoints += 1;
                    await updateDoc(userDocRef, {
                        "eventCodes": arrayUnion(code),
                        "cabinetPoints": cabinetPoints
                    });
                }
               
                if(semester === "fallPoints")
                {
                    currentPoints = data.fallPoints;
                    currentPoints = currentPoints + addPoints;
                    if(voterEligible === false)
                    {
                        if(category === "GBM")
                        {
                            var gbmNVE = data.gbmPointsNVE;
                            gbmNVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints, 
                                "gbmPointsNVE": gbmNVE
                            });
                        } else if(category === "MLP Fall") {
                            var mlpFallNVE = data.mlpFallPointsNVE;
                            mlpFallNVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints, 
                                "mlpFallPointsNVE": mlpFallNVE
                            });
                        } else if(category === "MLP Spring") {
                            var mlpSpringNVE = data.mlpSpringPointsNVE;
                            mlpSpringNVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints, 
                                "mlpSpringPointsNVE": mlpSpringNVE
                            });
                        } else if(category === "OPA") {
                            var opa = data.opaPointsNVE;
                            opa += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints,
                                "opaPointsNVE": opa
                            });
                        } else if(category === "Programming") {
                            var prgmNVE = data.programmingPointsNVE;
                            prgmNVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints,
                                "programmingPointsNVE": prgmNVE
                            });
                        } else {
                            var other = data.otherPoints;
                            other += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints,
                                "otherPoints": other
                            });
                        }
                    } else {
                        if(category === "Programming")
                        {
                            var prgmVE = data.programmingPointsVE;
                            prgmVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints,
                                "programmingPointsVE": prgmVE
                            });
                        } else if(category === "GBM") {
                            var gbmVE = data.gbmPointsVE;
                            gbmVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints, 
                                "gbmPointsVE": gbmVE
                            });
                        } else if(category === "MLP Fall") {
                            var mlpFallVE = data.mlpFallPointsVE;
                            mlpFallVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints, 
                                "mlpFallPointsVE": mlpFallVE
                            });
                        } else if(category === "MLP Spring") {
                            var mlpSpringVE = data.mlpSpringPointsVE;
                            mlpSpringVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints, 
                                "mlpSpringPointsVE": mlpSpringVE
                            });
                        } else if(category === "OPA") {
                            var opaVE = data.opaPointsVE;
                            opaVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "fallPoints": currentPoints, 
                                "opaPointsVE": opaVE
                            });
                        } 
                    }
                        
                } else {
                    currentPoints = data.springPoints;
                    currentPoints += addPoints;
                    if(voterEligible === false)
                    {
                        if(category === "GBM")
                        {
                            gbmNVE = data.gbmPointsNVE;
                            gbmNVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints, 
                                "gbmPointsNVE": gbmNVE
                            });
                        } else if(category === "MLP Fall") {
                            mlpFallNVE = data.mlpFallPointsNVE;
                            mlpFallNVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints, 
                                "mlpFallPointsNVE": mlpFallNVE
                            });
                        } else if(category === "MLP Spring") {
                            mlpSpringNVE = data.mlpSpringPointsNVE;
                            mlpSpringNVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints, 
                                "mlpSpringPointsNVE": mlpSpringNVE
                            });
                        } else if(category === "OPA") {
                            opa = data.opaPointsNVE;
                            opa += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints,
                                "opaPointsNVE": opa
                            });
                        } else if(category === "Programming") {
                            prgmNVE = data.programmingPointsNVE;
                            prgmNVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints,
                                "programmingPointsNVE": prgmNVE
                            });
                        } else {
                            other = data.otherPoints;
                            other += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints,
                                "otherPoints": other
                            });
                        }
                    } else {
                        if(category === "Programming")
                        {
                            prgmVE = data.programmingPointsVE;
                            prgmVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints,
                                "programmingPointsVE": prgmVE
                            });
                        } else if(category === "GBM") {
                            gbmVE = data.gbmPointsVE;
                            gbmVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints, 
                                "gbmPointsVE": gbmVE
                            });
                        } else if(category === "MLP Fall") {
                            mlpFallVE = data.mlpFallPointsVE;
                            mlpFallVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints, 
                                "mlpFallPointsVE": mlpFallVE
                            });
                        } else if(category === "MLP Spring") {
                            mlpSpringVE = data.mlpSpringPointsVE;
                            mlpSpringVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints, 
                                "mlpSpringPointsVE": mlpSpringVE
                            });
                        } else if(category === "OPA") {
                            opaVE = data.opaPointsVE;
                            opaVE += addPoints;
                            await updateDoc(userDocRef, {
                                "eventCodes": arrayUnion(code),
                                "springPoints": currentPoints, 
                                "opaPointsVE": opaVE
                            });
                        } 
                    }
                }
            }
            console.log('here');
            if(added)
            {
                document.getElementById("code").value = "";
                document.getElementById("attendanceCodeSuccess").innerText="Success! Please reload page!";
                window.location.reload();
            } else {
                document.getElementById("attendanceCodeError").innerText = "*Error: Code in Invalid";
            }
        }

    }
    return (
        <div className="attendanceForm" >
            <h2>Attendance</h2>
            <form onSubmit={checkCode}>
                <div id="attendanceInput">
                    <p className='errorMsg' id="attendanceCodeError"></p>
                    <p className='successMsg' id="attendanceCodeSuccess"></p>
                    <label htmlFor="code">Attendance Code:</label><br/>
                    <input type="text" id="code"  placeholder="GBM1"></input>
                </div>
                <div className="center"><input type="submit" value="Submit"></input></div>
            </form>
        </div>
    );
}

export default Attendance;