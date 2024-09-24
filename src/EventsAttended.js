import { useEffect, useState } from 'react';
import './EventsAttended.css';
import { collection, doc, getDoc, getDocs} from 'firebase/firestore';
import { db } from './firebase';

function EventsAttended({email, cabinet})
{
    const [gbmEvents, setGbm] = useState([]);
    const [programmingEvents, setProgramming] = useState([]);
    const [mlpFallEvents, setMlpFall] = useState([]);
    const [mlpSpringEvents, setMlpSpring] = useState([]);
    const [opaEvents, setOpa] = useState([]);
    const [cabinetEvents, setCabinet] = useState([]);
    const [otherEvents, setOther] = useState([]);
    const [missedEvents, setMissed] = useState([]);

    useEffect(() => {
        const fetchAttended = async () => {
            if(email === null) return;

            //Fetch user data
            const userDocRef = doc(db, "users", email);
            const userDocSnap = await getDoc(userDocRef);
            
            //Fetch event code data
            const codesCollectionRef = collection(db, "codes");
            const codesDocSnap = await getDocs(codesCollectionRef);
            
            if(userDocSnap.exists())
            {
                const data = userDocSnap.data();
                const attended = data.eventCodes;
                const gbm = [];
                const programming = [];
                const mlpFall = [];
                const mlpSpring = [];
                const opa = [];
                const other = [];
                const cabinet =[];
                const missed = [];
                codesDocSnap.forEach((doc) => {
                    var added = false; 
                    attended.forEach(code => {
                        if(code === doc.id)
                        {
                            added = true;
                            const docData = doc.data();
                            if(docData.category === "GBM")
                            {
                                gbm.push(doc);
                            } else if(docData.category === "Programming") {
                                programming.push(doc);
                            } else if(docData.category === "MLP Fall") {
                                mlpFall.push(doc);
                            } else if(docData.category === "MLP Spring") {
                                mlpSpring.push(doc);
                            } else if(docData.category === "OPA") {
                                opa.push(doc);
                            } else if(docData.category === "Cabinet") {
                                cabinet.push(doc);
                            } else {
                                other.push(doc);
                            }
                            return;
                        }
                     })
                     if(!added)
                     {
                        var missedData = doc.data();
                        let missedDate = missedData.eventDate.replace('-0', '-');
                        var today = new Date().toISOString().split('T')[0];
                        today = today.replace('-0', '-');                    


                        if(missedData.cabinetRequired && (new Date(missedDate) < new Date(today))) 
                        { 
                            missed.push(doc);
                        }
                       
                     }
                })

                //Update state
                setGbm(gbm);
                setProgramming(programming);
                setMlpFall(mlpFall);
                setMlpSpring(mlpSpring);
                setOpa(opa);
                setOther(other);
                setCabinet(cabinet);
                setMissed(missed);
            }
        };
        fetchAttended();
    }, [email]);
    return (
        <div id='EventsAttended'>
            <h2>Events Attended</h2>
            <p style={{textAlign:'center'}}>If a table is blank, that means you have not attended an event in that category</p>
            <hr/>
            <h3>GBM</h3>
            <table>
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Event Date</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {gbmEvents.map((event, index) => (
                        
                        <TableRow
                            key = {index}
                            event = {event}
                        />
                    ))}
                </tbody>
            </table>

            <h3>Programming</h3>
            <table>
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Event Date</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {programmingEvents.map((event, index) => (
                        
                        <TableRow
                            key = {index}
                            event = {event}
                        />
                    ))}
                </tbody>
            </table>

            <h3>OPA</h3>
            <table>
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Event Date</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {opaEvents.map((event, index) => (
                        
                        <TableRow
                            key = {index}
                            event = {event}
                        />
                    ))}
                </tbody>
            </table>

            <h3>MLP Fall</h3>
            <table>
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Event Date</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {mlpFallEvents.map((event, index) => (
                        
                        <TableRow
                            key = {index}
                            event = {event}
                        />
                    ))}
                </tbody>
            </table>

            <h3>MLP Spring</h3>
            <table>
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Event Date</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {mlpSpringEvents.map((event, index) => (
                        
                        <TableRow
                            key = {index}
                            event = {event}
                        />
                    ))}
                </tbody>
            </table>
    
            <h3>Other</h3>
            <table>
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Event Date</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {otherEvents.map((event, index) => (
                        
                        <TableRow
                            key = {index}
                            event = {event}
                        />
                    ))}
                </tbody>
            </table><br/>

            {cabinet && (
                <div>
                    <h3>Cabinet</h3>
                    <p style={{textAlign:'center'}}>Please remember, cabinet points do not count towards the total points</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Event Date</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cabinetEvents.map((event, index) => (
                                
                                <TableRow
                                    key = {index}
                                    event = {event}
                                />
                            ))}
                        </tbody>
                    </table>
                    <h3>Missed</h3>
                    <p style={{textAlign:'center'}}>These are required events you missed</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Event Date</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {missedEvents.map((event, index) => (
                                <TableRow
                                    key = {index}
                                    event = {event}
                                />
                            ))}
                        </tbody>
                    </table><br/>
                </div>
            )}
            <br/><br/><br/>
        </div>
    );
}

const TableRow = ({event}) => {
    return (
        <tr>
            <td>{event.data().event}</td>
            <td style={{textAlign:'center'}}>{event.data().eventDate}</td>
            <td style={{textAlign:'center'}}>{event.data().points}</td>
        </tr>
    );
}

export default EventsAttended;