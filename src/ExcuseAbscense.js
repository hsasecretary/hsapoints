import { useState } from 'react';
import './ExcuseAbscense.css';
import { db } from './firebase';
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';

function ExcuseAbscense() {
    const[user, setUser] = useState();
    const[userSnap, setUserSnap] = useState();
    async function updateUsers(event)
    {
        event.preventDefault();
        document.getElementById("abscenseEmailError").innerText = "";
        
        let email = document.getElementById("searchName").value;
        if(email === "")
        {
            document.getElementById("abscenseEmailError").innerText = "*Required: Submit a UFL or SF email";
            return false;
        }

        const userRef = doc(db, "users", email);
        const user = await getDoc(userRef);

        setUser(userRef);
        setUserSnap(user);
        if(user.exists())
        {
            document.getElementById("findUserForm").classList.toggle("hidden");
            document.getElementById("updateExcuseForm").classList.toggle("hidden");
            let data = user.data();
            document.getElementById("userFullName").innerText = "Name: " + data.firstName + " " + data.lastName;
            document.getElementById("userEmail").innerText = "Email: " + user.id;
            let unexcusedEvents = data.unexcusedEvents; 
            let options = "<option value='select'>Select</option>";
            for (const e of unexcusedEvents) {
                let codeRef = doc(db, "codes", e);
                let codeSnap = await getDoc(codeRef);  // Wait for the async call
                options += "<option value='" + e + "'>";
                if (codeSnap.exists()) {
                    let event = codeSnap.data().event;
                    options += event;
                }
                options += "</option>";
            }
            document.getElementById("userUnexcusedAbsense").innerHTML = options;
        } else {
            document.getElementById("abscenseEmailError").innerText = "*Error: User with email '" + email + "' does not exist";
            return false; 
        }
    }
    async function updateExcuse(event)
    {
        event.preventDefault();
        //Reset error messages
        document.getElementById("userUnexcusedAbsenseError").innerText = "";
        document.getElementById("reasonErrror").innerText = "";
        document.getElementById("detailsError").innerText = "";

        //Check for valid input
        let unexcusedAbsense = document.getElementById("userUnexcusedAbsense").value;
        let reason = document.getElementById("reason").value;
        let detail = document.getElementById("details").value; 

        var ready = true; 

        if(unexcusedAbsense === "select")
        {
            document.getElementById("userUnexcusedAbsenseError").innerText = "*Required: Select an event to excuse";
            ready = false;
        }
        if(reason === "select") 
        {
            document.getElementById("reasonErrror").innerText = "*Error: Input a reason to excuse the absense";
            ready = false;
        }
        if(reason === "pointRecovery" && detail === "")
        {
            document.getElementById("detailsError").innerText = "*Required: Include details on point recovery";
            ready = false;
        }
        if(ready)
        {
            if(reason === "validExcuse")
            {
                detail = "Excused due to Valid Excuse"; 
            } else {
                detail = "Excused due to Point Recovery: " + detail;
            }
            let addedExcuse = userSnap.data().excusedReason;
            if(addedExcuse === undefined)
            {
                addedExcuse = [detail];
            } else {
                addedExcuse.push(detail);
            }
            console.log(addedExcuse);
            updateDoc(user, {
                excusedEvents:arrayUnion(unexcusedAbsense),
                excusedReason: addedExcuse, 
                unexcusedEvents:arrayRemove(unexcusedAbsense)

            })
            //Reset everything
            document.getElementById("userUnexcusedAbsense").value = "select";
            document.getElementById("reason").value = "select";
            document.getElementById("details").value = ""; 
            document.getElementById("findUserForm").classList.toggle("hidden");
            document.getElementById("updateExcuseForm").classList.toggle("hidden");
            document.getElementById("searchName").value = "";
        } else {
            return false;
        }
    }
    function back(event)
    {
        event.preventDefault();
        document.getElementById("findUserForm").classList.toggle("hidden");
        document.getElementById("updateExcuseForm").classList.toggle("hidden");
    }
    return(
        <div className="attendanceForm">
            <h2>Excuse Abscense</h2>
            <form className= "" id="findUserForm" onSubmit = {updateUsers}>
                <p className='errorMsg' id="abscenseEmailError"></p>
                <label htmlFor="searchName">User Email:</label><br/>
                <input type="text" id="searchName" placeholder="John Doe"></input>
                <div className='center'><input type="submit"></input></div>
            </form>
            <form className = "hidden" id="updateExcuseForm" onSubmit = {updateExcuse}>
                <p></p>
                <p id="userFullName"></p>
                <p id="userEmail"></p>
                <p className='errorMsg' id='userUnexcusedAbsenseError'></p>
                <label htmlFor="userUnexcusedAbsense">Unexcused Absense:</label>
                <select id="userUnexcusedAbsense">
                    <option value="select">Select</option>
                </select>
                <p className='errorMsg' id='reasonErrror'></p>
                <label htmlFor="reason">Reason:</label>
                <select id="reason">
                    <option value = "select">Select</option>
                    <option value = "validExcuse">Valid Excuse</option>
                    <option value = "pointRecovery">Point Recovery</option>
                </select>
                
                <p className="errorMsg" id="detailsError"></p>
                <label html="details">Details:</label>
                <input id="details" type="text" placeholder='Attended SHPE GBM 11/7'></input>
                <div className='center'><input type="submit"></input></div>
                <div className='center'><button id='backToUserEmail' onClick= {back}>Back</button></div>
            </form>
        </div>
    )
}

export default ExcuseAbscense;