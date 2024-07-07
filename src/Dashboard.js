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
	const [userEmail, setUserEmail] = useState(null);
	let navigate = useNavigate(); //Function to navigate to different pages

	useEffect(() => {
		const listen = onAuthStateChanged(auth, (user) =>{
			if(!user)
			{
				signOut(auth);
				navigate("/login");
			} else {
				setUserEmail(user.email);
			}
		});
        return () => {
            listen();
        }
    }, [navigate]);
	
	function isAdmin(email) {
		const adminEmails = [
			"matthewurra@ufl.edu",
            "garibaldig@ufl.edu",
            "urdanetalucia@ufl.edu",
            "amberhaydar@ufl.edu",
            "gcroasdaile@ufl.edu",
            "sofia.lynch@ufl.edu",
            "chaparteguimaite@ufl.edu",
            "m.hudtwalcker@ufl.edu",
            "imani.sanchez@ufl.edu"
		];
		return adminEmails.includes(email);
	}
	
	return (
		
		<div className="formDash" >
			<Logout/>
			<div id="dash"><h2>Dashboard</h2></div>
			<Points />
			<br/>
			<Attendance />
			<br/>
			{isAdmin(userEmail) && (
				<CreateCode />	
			)}
			<br/>
			
		</div>
	);
}

export default Dashboard;