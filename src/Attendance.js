import './Dashboard.css';
import React from 'react';
import { auth, db} from './firebase';
import { doc, getDoc, arrayUnion, updateDoc } from 'firebase/firestore';

function Attendance() {
    async function checkCode(event)
    {
        event.preventDefault();
        document.getElementById("attendanceCodeError").innerText = "";
        
        var email = auth.currentUser.email;
        var code = document.getElementById("code").value.toLowerCase();
        if(code === "")
        {
            document.getElementById("attendanceCodeError").innerText = "*Required: Type in a Code to Submit";
        } else if(code.length > 45) {
            document.getElementById("attendanceCodeError").innerText = "*Error: Code is Too Long";
        }

        const userDocRef = doc(db, "users", email);
        const userDocSnap = await getDoc(userDocRef);
        if(userDocSnap.exists())
        {
            const eventCodes = userDocSnap.data().eventCodes;
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
                added = true;
                var semester = codeDocSnap.data().semester;
                var addPoints = codeDocSnap.data().points;
                var currentPoints;
                if(semester === "fallPoints")
                {
                    currentPoints = userDocSnap.data().fallPoints;
                    currentPoints = currentPoints + addPoints;
                    await updateDoc(userDocRef, {
                        "eventCodes": arrayUnion(code),
                        "fallPoints": currentPoints
                    });
                } else {
                    currentPoints = userDocSnap.data().springPoints;
                    currentPoints += addPoints;
                    await updateDoc(userDocRef, {
                        "eventCodes": arrayUnion(code),
                        "springPoints": currentPoints
                    });
                }
            }
            if(added)
            {
                document.getElementById("code").value = "";
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
                    <label htmlFor="code">Attendance Code:</label><br/>
                    <input type="text" id="code"  placeholder="GBM1"></input>
                </div>
                <div className="center"><input type="submit" value="Submit"></input></div>
            </form>
        </div>
    );
}

export default Attendance;