import './ExcuseAbscense.css';

function ExcuseAbscense() {

    return(
        <div className="attendanceForm">
            <h2>Excuse Abscense</h2><br/>
            <label htmlFor="searchName">Name:</label><br/>
            <input type="text" id="searchName" placeholder="John Doe"></input>
        </div>
    )
}

export default ExcuseAbscense;