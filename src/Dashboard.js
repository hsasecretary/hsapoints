import './Dashboard.css';
import Points from './Points'
import Attendance from './Attendance';
import CreateCode from './CreateCode';
import Logout from './Logout';

import React, { useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

function Dashboard() {
	let navigate = useNavigate(); //Function to navigate to different pages

	useEffect(() => {
		const listen = onAuthStateChanged(auth, (user) =>{
			if(!user)
			{
				signOut(auth);
				navigate("/login");
			}
		});
        return () => {
            listen();
        }
    }, [navigate]);
	

	return (
		
		<div className="formDash" >
			<Logout/>
			<div id="dash"><h2>Dashboard</h2></div>
			<Points />
			<br/>
			<Attendance />
			<br/>
			<CreateCode />
			<br/>
			
		</div>
	);
}

export default Dashboard;