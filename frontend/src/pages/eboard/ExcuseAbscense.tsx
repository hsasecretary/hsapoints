import { useState } from 'react';
import { db } from '../../lib/firebase';
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';

function ExcuseAbscense() {
    const[user, setUser] = useState<any>();
    const[userSnap, setUserSnap] = useState<any>();
    async function updateUsers(event)
    {
        event.preventDefault();
        document.getElementById("abscenseEmailError").innerText = "";
        
        let email = (document.getElementById("searchName") as HTMLInputElement).value;
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
        let unexcusedAbsense = (document.getElementById("userUnexcusedAbsense") as HTMLSelectElement).value;
        let reason = (document.getElementById("reason") as HTMLSelectElement).value;
        let detail = (document.getElementById("details") as HTMLInputElement).value; 

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

            });
            //Reset everything
            (document.getElementById("userUnexcusedAbsense") as HTMLSelectElement).value = "select";
            (document.getElementById("reason") as HTMLSelectElement).value = "select";
            (document.getElementById("details") as HTMLInputElement).value = ""; 
            document.getElementById("findUserForm").classList.toggle("hidden");
            document.getElementById("updateExcuseForm").classList.toggle("hidden");
            (document.getElementById("searchName") as HTMLInputElement).value = "";
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
    // Same look as the User Points Lookup page (reuses its classes). The two
    // forms and the element ids below are driven by updateUsers / updateExcuse.
    return(
        <div className="user-points-lookup excuse-absence">
            <h2>Excuse Absence</h2>
            <p style={{textAlign: 'center', color: '#666', marginBottom: '20px'}}>
                Enter a member's email to excuse one of their unexcused absences
            </p>

            <form className="search-form" id="findUserForm" onSubmit = {updateUsers}>
                <div className="search-input-group">
                    <input
                        type="email"
                        id="searchName"
                        className="search-input"
                        placeholder="Enter UFL/SF email (e.g., user@ufl.edu)"
                        aria-label="Member email"
                    />
                    <button type="submit" className="search-button">Search</button>
                </div>
                <p className='error-message errorMsg' id="abscenseEmailError"></p>
            </form>

            <form className="hidden user-info-card excuse-absence__form" id="updateExcuseForm" onSubmit = {updateExcuse}>
                <h3>Excuse an Absence</h3>
                <div className="user-info-grid">
                    <div id="userFullName"></div>
                    <div id="userEmail"></div>
                </div>

                <div className="form-group">
                    <label htmlFor="userUnexcusedAbsense">Unexcused Absence</label>
                    <select id="userUnexcusedAbsense">
                        <option value="select">Select</option>
                    </select>
                    <p className='errorMsg' id='userUnexcusedAbsenseError'></p>
                </div>

                <div className="form-group">
                    <label htmlFor="reason">Reason</label>
                    <select id="reason">
                        <option value = "select">Select</option>
                        <option value = "validExcuse">Valid Excuse</option>
                        <option value = "pointRecovery">Point Recovery</option>
                    </select>
                    <p className='errorMsg' id='reasonErrror'></p>
                </div>

                <div className="form-group">
                    <label htmlFor="details">Details</label>
                    <input id="details" type="text" placeholder='Attended SHPE GBM 11/7'></input>
                    <p className="errorMsg" id="detailsError"></p>
                </div>

                <div className="search-input-group excuse-absence__actions">
                    <button type="submit" className="search-button">Excuse Absence</button>
                    <button type="button" id='backToUserEmail' className="clear-button" onClick= {back}>Back</button>
                </div>
            </form>
        </div>
    )
}

export default ExcuseAbscense;
