import React from 'react';
import './Dashboard.css';

function Attendance() {

    return (
        <div className="attendanceForm" >
            <h2>Attendance</h2>
            <form>
                <div id="attendanceInput">
                    <label htmlFor="code">Attendance Code:</label><br/>
                    <input type="text" id="code"  placeholder="GBM1"></input>
                </div>
                <div className="center"><input type="submit" value="Submit"></input></div>
            </form>
        </div>
    );
}

export default Attendance;