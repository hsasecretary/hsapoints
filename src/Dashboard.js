import './Dashboard.css';
import Points from './Points'
import Attendance from './Attendance';
import CreateCode from './CreateCode';
import CreateTier from './CreateTier';

import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './firebase';

function Dashboard() {
	let navigate = useNavigate(); //Function to navigate to different pages
	const [authUser, setAuthUser] = useState(null); 

	useEffect(() => {
		const listen = onAuthStateChanged(auth, (user) => {
		if(user) {
			setAuthUser(user);
		} else {
			setAuthUser(null);
		}
		});

		return () => {
			listen();
		}
	}, []);

	//If no user is logged in, redirect to login page
	if(!authUser)
	{
		//calls the variable navigate, which has the navigation function
		//redirects to the login page
		navigate('/login'); 
		
	}


	return (
		
		<div className="formDash" >
			<div id="dash"><h2>Dashboard</h2></div>
			<Points />
			<br/>
			<Attendance />
			<br/>
			<CreateCode />
			<br/>
			<CreateTier />
		</div>
	);
}

export default Dashboard;