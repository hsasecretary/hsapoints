import './CreateTier.css';


function CreateTier() {
	
	return (
		<div id='createTier'>
            <form className='subForm' id="tier">
                <h3>Create New Tier</h3>
                <label htmlFor='tierName'>Tier Name:</label>
                <input type="text" id="tierName"></input>
                <label  htmlFor='requiresApproval'>Requires approval to join:</label>
                <input type="checkbox" id="requiresApproval"></input>
                <div className="center"><input type="submit" id="submitNewTier"></input>
                </div>  
            </form>
        </div>
       
		
	);
}

export default CreateTier;