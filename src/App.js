import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SignUp from './SignUp';
import Login from './Login';
import Dashboard from './Dashboard';
import Header from './Header';
import NavBar from './NavBar';
import Eboard from './Eboard';

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

function App() {
    const [userEmail, setUserEmail] = useState(null);

	useEffect(() => {
		const listen = onAuthStateChanged(auth, (user) =>{
			if(!user)
			{
				signOut(auth);
			} else {
				setUserEmail(user.email);
			}
		});
        return () => {
            listen();
        }
    }, []);
	
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
        <div>
            <Router>
                <Header/>
                <NavBar eboard = {isAdmin(userEmail)}/>
                <Routes>
                    <Route path="/" element={<Navigate to="/login"/>} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard eboard ={isAdmin(userEmail)}/>}/>
                    <Route path="/eboard" element={<Eboard eboard ={isAdmin(userEmail)}/>}/>
                </Routes>
            </Router>
        </div>
    )
}

export default App;