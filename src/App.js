import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SignUp from './SignUp';
import Login from './Login';
import Dashboard from './Dashboard';
import Header from './Header';
import NavBar from './NavBar';
import Eboard from './Eboard';
import ForgotPassword from './ForgotPassword';
import Cabinet from './Cabinet';

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db} from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function App() {
    const [userEmail, setUserEmail] = useState(null);
    const [isEboard, setIsEboard] = useState(false);
    const [isCabinetMember, setIsCabinetMember] = useState(false);

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
    
    // Check if user is admin
	useEffect(() => {
        if (userEmail) {
            setIsEboard(isAdmin(userEmail));
        }
    }, [userEmail]);

    // Check if user is part of cabinet asynchronously
    useEffect(() => {
        const checkCabinetStatus = async (email) => {
            if (email) {
                const result = await isCabinet(email);
                setIsCabinetMember(result);
            }
        };
        checkCabinetStatus(userEmail);
    }, [userEmail]);

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

    async function isCabinet(email)
    {
        if(email=== null) {return false; }
        const userDocRef = doc(db, "users", email);
        const userDocSnap = await getDoc(userDocRef);
        if(userDocSnap.exists())            
        {
            const data = userDocSnap.data();
            if(data.approved && data.cabinet !== "none") 
            {

                return true;
            }
            return false; 
        }
        return false;
    }
    return (
        <div>
            <Router>
                <Header/>
                <NavBar eboard = {isEboard} cabinet = {isCabinetMember}/>
                <Routes>
                    <Route path="/" element={<Navigate to="/login"/>} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard cabinet ={isCabinetMember} email ={userEmail}/>}/>
                    <Route path="/cabinet" element={<Cabinet cabinet={isCabinetMember}/>}/>
                    <Route path="/eboard" element={<Eboard eboard ={isEboard}/>}/>
                    <Route path="/forgotPassword" element={<ForgotPassword/>} />
                </Routes>
            </Router>
        </div>
    )
}

export default App;