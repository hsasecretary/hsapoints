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
import { doc, onSnapshot } from 'firebase/firestore';

function App() {
    const [userEmail, setUserEmail] = useState(null);
    const [isEboard, setIsEboard] = useState(false);
    const [isCabinetMember, setIsCabinetMember] = useState(false);
    const [loading, setLoading] = useState(true);
    const [rolesLoaded, setRolesLoaded] = useState(false);

	useEffect(() => {
		const listen = onAuthStateChanged(auth, (user) =>{
			if(!user)
			{
				setUserEmail(null);
				signOut(auth);
			} else {
				setUserEmail(user.email);
			}
			setLoading(false);
		});
        return () => {
            listen();
        }
    }, []);

    // Read the user's roles straight from their Firestore document.
    // onSnapshot keeps this live, so flipping `eboard` in Firebase updates
    // the site without the user having to sign out and back in.
    useEffect(() => {
        if (!userEmail) {
            setIsEboard(false);
            setIsCabinetMember(false);
            setRolesLoaded(false);
            return;
        }

        setRolesLoaded(false);

        const unsubscribe = onSnapshot(
            doc(db, "users", userEmail),
            (userDocSnap) => {
                const data = userDocSnap.exists() ? userDocSnap.data() : null;
                setIsEboard(data?.eboard === true);
                setIsCabinetMember(data?.approved === true && data?.cabinet !== "none");
                setRolesLoaded(true);
            },
            (error) => {
                console.error("Failed to load user roles:", error);
                setIsEboard(false);
                setIsCabinetMember(false);
                setRolesLoaded(true);
            }
        );

        return () => unsubscribe();
    }, [userEmail]);

    // Wait for the roles before rendering routes, otherwise <Eboard> would
    // bounce an e-board member to /dashboard before their flag arrives.
    if (loading || (userEmail && !rolesLoaded)) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <Router>
                {userEmail && <Header/>}
                {userEmail && <NavBar eboard = {isEboard} cabinet = {isCabinetMember}/>}
                <Routes>
                    <Route path="/" element={<Navigate to="/login"/>} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/login" element={userEmail ? <Navigate to="/dashboard"/> : <Login />} />
                    <Route path="/dashboard" element={userEmail ? <Dashboard cabinet ={isCabinetMember} email ={userEmail}/> : <Navigate to="/login"/>}/>
                    <Route path="/cabinet" element={userEmail ? <Cabinet cabinet={isCabinetMember}/> : <Navigate to="/login"/>}/>
                    <Route path="/eboard" element={userEmail ? <Eboard eboard ={isEboard}/> : <Navigate to="/login"/>}/>
                    <Route path="/forgotPassword" element={<ForgotPassword/>} />
                </Routes>
            </Router>
        </div>
    )
}

export default App;
