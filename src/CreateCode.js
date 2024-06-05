import './CreateCode.css';


function CreateCode() {
	
	return (
		
		<div>
            <div id='eboardContainer'>
                <form className='subForm' id="eboard">
                    <h3>Create New Code</h3>
                    <label htmlFor='eventName'>Event Name:</label>
                    <input type="text" id="eventName" placeholder="GBM 1"></input>
                    <label htmlFor='code'>Event Code:</label>
                    <input type="text" id="code" placeholder="Familias"></input>
                    <label htmlFor='points'>Event Points:</label>
                    <input type="number" id="points" placeholder="1"></input>
                    <label htmlFor="cabinet">Category:</label><br/>
                    <select id="cabinet">
                        <option value="select">Select</option>
                        <option value="programming">Programming</option>
                        <option value="gbm">GBM</option>
                        <option value="mlpFall">MLP Fall</option>
                        <option value="mlpSpring">MLP Spring</option>
                        <option value="opa">OPA</option>
                        <option value="other">Other</option>
                    </select><br/>
                    <label htmlFor="graphicDate">Date Graphic Posted on Instagram:</label>
                    <input type="date" id="graphicDate"></input>
                    <label htmlFor="eventDate">Event Date:</label>
                    <input type="date" id="eventDate"></input>
                    <label htmlFor="cabinetRequired">Cabinet Required to Attend:</label>
                    <input type="checkbox" id="cabinetRequired"></input><br/>
                    <label htmlFor="cabinetOnly">Cabinet ONLY Event:</label>
                    <input type="checkbox" id="cabinetOnly"></input>
                    <div className="center"><input type="submit" id="submitNewCode"></input>
                    </div>  
                </form>
            </div>
        </div>
		
	);
}

export default CreateCode;