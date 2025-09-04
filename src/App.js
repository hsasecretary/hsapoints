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
                setIsCabinetMember(result);  // Set the state based on result
            }
        };
        
        if (userEmail) {
            checkCabinetStatus(userEmail);
        }
    }, [userEmail]);
    

    function isAdmin(email) {
		const adminEmails = [
			"einsuasti@ufl.edu",
            "garibaldig@ufl.edu",
            "ngarcialamboy@ufl.edu",
            "ichoa@ufl.edu",
            "msalvador@ufl.edu",
            "i.seguinot@ufl.edu",
            "Marcelasandino@ufl.edu",
            "drodriguezgomez@ufl.edu",
            "briannacastro@ufl.edu",
            "lizetmejia@ufl.edu",
         //ADD LESLY UFL EMAIL!!!!!!!!!
            "isabelhernandez@ufl.edu"
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
                    <Route path="/cabinet" element={<Cabinet cabinet={isCabinet(userEmail)}/>}/>
                    <Route path="/eboard" element={<Eboard eboard ={isAdmin(userEmail)}/>}/>
                    <Route path="/forgotPassword" element={<ForgotPassword/>} />
                </Routes>
            </Router>
        </div>
    )
}

export default App;