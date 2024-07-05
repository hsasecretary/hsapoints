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
	
	function userEmail()
	{
		if(null === auth.currentUser || null === auth.currentUser.email)
		{
			navigate("/login")
			return false;
		}
		var email = auth.currentUser.email;
		if(email === "matthewurra@ufl.edu"
			|| email === "garibaldig@ufl.edu"
			|| email === "urdanetalucia@ufl.edu"
			|| email === "amberhaydar@ufl.edu"
			|| email === "gcroasdaile@ufl.edu"
			|| email === "sofia.lynch@ufl.edu"
			|| email === "chaparteguimaite@ufl.edu"
			|| email === "m.hudtwalcker@ufl.edu"
			|| email === "imani.sanchez@ufl.edu")
		{
			return true;
		}
		return false; 
	}
	return (
		
		<div className="formDash" >
			<Logout/>
			<div id="dash"><h2>Dashboard</h2></div>
			<Points />
			<br/>
			<Attendance />
			<br/>
			{userEmail() && (
				<CreateCode />	
			)}
			<br/>
			
		</div>
	);
}

export default Dashboard;