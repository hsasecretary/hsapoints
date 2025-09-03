import './CreateCode.css';
import { db } from './firebase'
import {getDoc, doc, setDoc, updateDoc} from 'firebase/firestore';


function CreateCode() {
    function resetError()
    {
        document.getElementById("eventNameError").textContent = "";
        document.getElementById("eventCodeError").textContent = "";
        document.getElementById("pointsError").textContent = "";
        document.getElementById("categoryError").textContent = "";
        document.getElementById("semesterError").textContent = "";
        document.getElementById("graphicDateError").textContent = "";
        document.getElementById("eventDateError").textContent = "";
        document.getElementById("cabinetRequiredError").textContent = "";
        document.getElementById("cabinetOnlyError").textContent = "";
        document.getElementById("attendanceFormSuccess").innerText = "";

    }
    function clearForm()
    {
        resetError();
        document.getElementById("attendanceFormSuccess").innerText = "Success: Event code created";
        document.getElementById("eventName").value = "";
        document.getElementById("eventCode").value = "";
        document.getElementById("points").value = "";
        document.getElementById("category").value = "select";
        document.getElementById("semester").value = "select";
        document.getElementById("graphicDate").value = "";
        document.getElementById("noGraphic").checked = false;
        document.getElementById("eventDate").value = "";
        document.getElementById("cabinetRequired").checked = false;
        document.getElementById("cabinetOnly").checked = false;
    }
	async function checkForm(event)
    {
        event.preventDefault();
        resetError();
        var eventName = document.getElementById("eventName").value;
        eventName = eventName.trim();
        var eventCode = document.getElementById("eventCode").value;
        eventCode = eventCode.trim();
        var points = document.getElementById("points").value;
        var category = document.getElementById("category").value;
        var semester = document.getElementById("semester").value;
        var graphicDate = document.getElementById("graphicDate").value;
        var noGraphic = document.getElementById("noGraphic").checked;
        var eventDate = document.getElementById("eventDate").value;
        var cabinetRequired = document.getElementById("cabinetRequired").checked;
        var cabinetOnly = document.getElementById("cabinetOnly").checked;
        var voterEligible = false; 
        var ready = true;
        if(eventName === null || eventName === "")
        {
            document.getElementById("eventNameError").innerText = "*Required: Input the name of the event";
            ready = false; 
        } else if (eventName.length > 45) {
            document.getElementById("eventNameError").innerText = "*Error: Event name is too long ";
            ready = false;
        }
        if(eventCode === null || eventCode === "")
        {
            document.getElementById("eventCodeError").innerText = "*Required: Input a code for event";
            ready = false; 
        } else if (eventCode.length > 45) {
            document.getElementById("eventCodeError").innerText = "Event Code Too Long";
            ready = false;
        } else {
            eventCode = eventCode.toLowerCase();
            const docRef = doc(db, "codes", eventCode);
            const docSnap = await getDoc(docRef);
            if(docSnap.exists())
            {
                document.getElementById("eventCodeError").innerText = "*Error: Event code already exists. Please choose a new one";
                ready = false;
            }
        }
        if(points === null || points === "" || points < 0)
        {
            document.getElementById("pointsError").innerText = "*Required: Input a points value greater or equal to 0";
            ready = false;
        }
        points = Number(points);
        if(category === "select")
        {
            document.getElementById("categoryError").innerText = "*Required: Select an event category";
            ready = false;
        }
        if(semester === "select")
        {
            document.getElementById("semesterError").innerText = "*Required: Select the semester the event will count towards";
            ready = false;
        }
        if(graphicDate === "" && !noGraphic)
        {
            document.getElementById("graphicDateError").innerText = "*Required: Input date graphic was/will be announced to General Body Members or select no graphic will be posted";
            ready = false;
        } else if (graphicDate !== "" && noGraphic) {
            document.getElementById("graphicDateError").innerText = "*Error: A graphic can not be simultaneously posted and not posted. Either delete the date the graphic will be posted OR uncheck the 'Graphic will NOT be posted' checkbox";
        } else if(noGraphic) {
            graphicDate = "None";
        }
        
        if(eventDate === "")
        {
            document.getElementById("eventDateError").innerText = "*Required: Input date event will occur";
            ready = false; 
        } else if((graphicDate !== "" && graphicDate !== "None")&& graphicDate > eventDate){
            document.getElementById("graphicDateError").innerText = "*Error: Graphic cannot be posted after event";
            ready = false;
        }
        if(category === "Cabinet" && !cabinetOnly) 
        {
            document.getElementById("categoryError").innerText = "*Error: Events in the 'Cabinet' Category are only for cabinet. Either change the event Category or Check the 'Cabinet ONLY Event' checkbox";
            document.getElementById("cabinetOnlyError").innerText = "*Error: Events in the 'Cabinet' Category are only for cabinet. Either change the event Category or Check the 'Cabinet ONLY Event' checkbox";
            ready = false;
        }
        var dateGraphic = new Date(graphicDate);
        var dateEvent  = new Date(eventDate);
        const diff = dateEvent - dateGraphic;
        if(isNaN(diff) || noGraphic || cabinetOnly)
        {
            voterEligible = false;
        } else if (diff < 0) {
            voterEligible = false;
        } else {
            var diffDays = Math.ceil(diff/(1000*60*60*24));
            if(diffDays >= 7 && (category === "GBM" || category === "Programming" || category === "MLP Fall" || category === "MLP Spring" || category === "OPA")) 
            {
                voterEligible = true;
            } else {
                voterEligible = false;
            }
        }
        if(ready)
        {
            createCode(eventName, eventCode, points, category, semester, graphicDate, eventDate, cabinetRequired, cabinetOnly, voterEligible);
            clearForm();
        }
        
    }
    async function createCode(eventName, eventCode, points, category, semester, graphicDate, eventDate, cabinetRequired, cabinetOnly, voterEligible)
    {
        const ptsDocRef = doc(db, "voterEligibility", "points");
        const ptsDocSnap = await getDoc(ptsDocRef);
        const ptsData = ptsDocSnap.data();
        var pts;
        if(voterEligible)
        {
            if(cabinetRequired)
            {
                if(category === "GBM")
                {
                    pts = ptsData.GBMVE + points;
                    var cpts = ptsData.cabinetGBM + points;
                    await updateDoc(ptsDocRef, {
                        "GBMVE": pts,
                        "cabinetGBM": cpts
                    });
                } else if(category === "Programming") {
                    pts = ptsData.ProgrammingVE + points;
                    cpts = ptsData.cabinetProgramming + points;
                    await updateDoc(ptsDocRef, {
                        "ProgrammingVE": pts,
                        "cabinetProgramming": cpts
                    })
                } else if(category === "OPA") {
                    pts = ptsData.opaVE + points;
                    cpts = ptsData.cabinetOPA + points;
                    await updateDoc(ptsDocRef, {
                        "opaVE": pts,
                        "cabinetOPA": cpts
                    })
                } else if(category === "MLP Fall") {
                    pts = ptsData.mlpFallVE + points;
                    cpts = ptsData.cabinetMLPFall + points;
                    await updateDoc(ptsDocRef, {
                        "mlpFallVE": pts,
                        "cabinetMLPFall": cpts
                    })
                } else if(category === "MLP Spring") {
                    pts = ptsData.mlpSpringVE + points;
                    cpts = ptsData.cabinetMLPSpring + points;
                    await updateDoc(ptsDocRef, {
                        "mlpSpringVE": pts,
                        "cabinetMLPSpring": cpts
                    })
                }
            } else {
                if(category === "GBM")
                {
                    pts = ptsData.GBMVE + points;
                    await updateDoc(ptsDocRef, {
                        "GBMVE": pts
                    });
                } else if(category === "Programming") {
                    pts = ptsData.ProgrammingVE + points;
                    await updateDoc(ptsDocRef, {
                        "ProgrammingVE": pts
                    })
                } else if(category === "OPA") {
                    pts = ptsData.opaVE + points;
                    await updateDoc(ptsDocRef, {
                        "opaVE": pts
                    })
                } else if(category === "MLP Fall") {
                    pts = ptsData.mlpFallVE + points;
                    await updateDoc(ptsDocRef, {
                        "mlpFallVE": pts
                    })
                } else if(category === "MLP Spring") {
                    pts = ptsData.mlpSpringVE + points;
                    await updateDoc(ptsDocRef, {
                        "mlpSpringVE": pts
                    })
                }
            }
            
        } else {
            if(cabinetRequired)
            {
                if(category === "GBM")
                {
                    pts = ptsData.GBMNVE + points;
                    cpts = ptsData.cabinetGBM + points;
                    await updateDoc(ptsDocRef, {
                        "GBMNVE": pts,
                        "cabinetGBM": cpts
                    });
                } else if(category === "Programming") {
                    pts = ptsData.ProgrammingNVE + points;
                    cpts = ptsData.cabinetProgramming + points;
                    await updateDoc(ptsDocRef, {
                        "ProgrammingNVE": pts,
                        "cabinetProgramming": cpts
                    })
                } else if(category === "OPA") {
                    pts = ptsData.opaNVE + points;
                    cpts = ptsData.cabinetOPA + points;
                    await updateDoc(ptsDocRef, {
                        "opaNVE": pts,
                        "cabinetOPA": cpts
                    })
                } else if(category === "MLP Fall") {
                    pts = ptsData.mlpFallNVE + points;
                    cpts = ptsData.cabinetMLPFall + points;
                    await updateDoc(ptsDocRef, {
                        "mlpFallNVE": pts,
                        "cabinetMLPFall": cpts
                    })
                } else if(category === "MLP Spring") {
                    pts = ptsData.mlpSpringNVE + points;
                    cpts = ptsData.cabinetMLPSpring + points;
                    await updateDoc(ptsDocRef, {
                        "mlpSpringNVE": pts,
                        "cabinetMLPSpring":cpts
                    })
                } else if(category === "Cabinet") {
                    pts = ptsData.cabinet + points;
                    await updateDoc(ptsDocRef, {
                        "cabinet": pts
                    })
                } else {
                    pts = ptsData.other + points;
                    cpts = ptsData.cabinetOther + points;
                    await updateDoc(ptsDocRef, {
                        "other": pts,
                        "cabinetOther": cpts
                    })
                }
            } else {
                if(category === "GBM")
                {
                    pts = ptsData.GBMNVE + points;
                    await updateDoc(ptsDocRef, {
                        "GBMNVE": pts
                    });
                } else if(category === "Programming") {
                    pts = ptsData.ProgrammingNVE + points;
                    await updateDoc(ptsDocRef, {
                        "ProgrammingNVE": pts
                    })
                } else if(category === "OPA") {
                    pts = ptsData.opaNVE + points;
                    await updateDoc(ptsDocRef, {
                        "opaNVE": pts
                    })
                } else if(category === "MLP Fall") {
                    pts = ptsData.mlpFallNVE + points;
                    await updateDoc(ptsDocRef, {
                        "mlpFallNVE": pts
                    })
                } else if(category === "MLP Spring") {
                    pts = ptsData.mlpSpringNVE + points;
                    await updateDoc(ptsDocRef, {
                        "mlpSpringNVE": pts
                    })
                } else if(category === "Cabinet") {
                    pts = ptsData.cabinet + points;
                    await updateDoc(ptsDocRef, {
                        "cabinet": pts
                    })
                } else {
                    pts = ptsData.other + points;
                    await updateDoc(ptsDocRef, {
                        "other": pts
                    })
                }
            }
        }
        await setDoc(doc(db, "codes", eventCode), {cabinetOnly:cabinetOnly, cabinetRequired: cabinetRequired, category:category, event: eventName, eventDate:eventDate, graphicDate:graphicDate, points:points, semester:semester, voterEligible:voterEligible});
    }
	return (
		<div className="attendanceForm" id='eboardContainer'>
                <form id="eboard" onSubmit={checkForm}>
                    <h3>Create New Code</h3>
                    <p className='successMsg' id='attendanceFormSuccess'></p>
                    <p className='errorMsg' id='eventNameError'></p>
                    <label htmlFor='eventName'>Event Name:</label>
                    <input type="text" id="eventName" placeholder="GBM 1"/>
                    <p className='errorMsg' id='eventCodeError'></p>
                    <label htmlFor='eventCode'>Event Code:</label>
                    <input type="text" id="eventCode" placeholder="Familias"></input>
                    <p className='errorMsg' id='pointsError'></p>
                    <label htmlFor='points'>Event Points:</label>
                    <input type="number" id="points" placeholder="1"></input>
                    <p className='errorMsg' id='categoryError'></p>
                    <label htmlFor="category">Category:</label><br/>
                    <select id="category">
                        <option value="select">Select</option>
                        <option value="Programming">Programming</option>
                        <option value="GBM">GBM</option>
                        <option value="MLP Fall">MLP Fall</option>
                        <option value="MLP Spring">MLP Spring</option>
                        <option value="OPA">OPA</option>
                        <option value="Cabinet">Cabinet</option>
                        <option value="Other">Other</option>
                    </select><br/>
                    <p className= 'errorMsg' id="semesterError"></p>
                    <label htmlFor="semester">Semester:</label><br/>
                    <select id="semester">
                        <option value="select">Select</option>
                        <option value="fallPoints">Fall</option>
                        <option value="springPoints">Spring</option>
                    </select> <br/>
                    <p className='errorMsg' id='graphicDateError'></p>
                    <label htmlFor="graphicDate">Date Graphic Posted on Instagram:</label>
                    <input type="date" id="graphicDate"></input><br/>
                    <label htmlFor= "noGraphic">Graphic will NOT be posted:</label>
                    <input type="checkbox" id="noGraphic"></input>
                    <p className='errorMsg' id='eventDateError'></p>
                    <label htmlFor="eventDate">Event Date:</label>
                    <input type="date" id="eventDate"></input><br/>
                    <p className='errorMsg' id="cabinetRequiredError"></p>
                    <label htmlFor="cabinetRequired">Cabinet Required to Attend:</label>
                    <input type="checkbox" id="cabinetRequired"></input><br/>
                    <p className='errorMsg' id="cabinetOnlyError"></p>
                    <label htmlFor="cabinetOnly">Cabinet ONLY Event:</label>
                    <input type="checkbox" id="cabinetOnly"></input>
                    <br/><br/>
                    <div className="center"><input type="submit" id="submitNewCode"></input>
                    </div>  
                </form>
            </div>
		
	);
}

export default CreateCode;