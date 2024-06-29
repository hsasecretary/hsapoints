import './Dashboard.css';
import Points from './Points'
import Attendance from './Attendance';
import CreateCode from './CreateCode';
import Logout from './Logout';

import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

function Dashboard() {
	let navigate = useNavigate(); //Function to navigate to different pages
	const [authUser, setAuthUser] = useState(null); 

	useEffect(() => {
		const listen = onAuthStateChanged(auth, (user) =>{
			if(user)
			{
				setAuthUser(user);
			} else {
				signOut(auth);
				navigate("/login");
			}
		});
        return () => {
            listen();
        }
    }, []);
	
	

	return (
		
		<div className="formDash" >
			<Logout></Logout>
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