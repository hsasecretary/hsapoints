import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SignUp from './pages/auth/SignUp';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Header from './components/layout/Header';
import NavBar from './components/layout/NavBar';
import Footer from './components/layout/Footer';
import NotFound from './pages/NotFound';
import Eboard from './pages/eboard/Eboard';
import ForgotPassword from './pages/auth/ForgotPassword';
import Cabinet from './pages/cabinet/Cabinet';

import React, { useEffect, useState } from "react";
import { onAuthStateChanged} from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

function App() {
    const [userEmail, setUserEmail] = useState(null);
    const [isEboard, setIsEboard] = useState(false);
    const [isCabinetMember, setIsCabinetMember] = useState(false);
    const [loading, setLoading] = useState(true);
    const [rolesLoaded, setRolesLoaded] = useState(false);

    useEffect(() => {
        const listen = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setUserEmail(null);
            } else {
                setUserEmail(user.email);
            }
            setLoading(false);
        });
        return () => {
            listen();
        };
    }, []);

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

    return (
        <Router>
            {loading || (userEmail && !rolesLoaded) ? (
                <div>Loading...</div>
            ) : (
                <div className="app-shell">
                    {userEmail && <Header />}
                    {userEmail && <NavBar eboard={isEboard} cabinet={isCabinetMember} />}
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" />} />
                        <Route path="/signup" element={userEmail ? <Navigate to="/dashboard" replace /> : <SignUp />} />
                        <Route path="/login" element={userEmail ? <Navigate to="/dashboard" replace /> : <Login />} />
                        <Route path="/dashboard" element={userEmail ? <Dashboard cabinet={isCabinetMember} email={userEmail} /> : <Navigate to="/login" />} />
                        <Route path="/cabinet" element={userEmail ? <Cabinet cabinet={isCabinetMember} /> : <Navigate to="/login" />} />
                        <Route path="/eboard" element={userEmail ? <Eboard eboard={isEboard} /> : <Navigate to="/login" />} />
                        <Route path="/forgotPassword" element={<ForgotPassword />} />
                        <Route path="*" element={<NotFound signedIn={!!userEmail} />} />
                    </Routes>
                    <Footer signedIn={!!userEmail} eboard={isEboard} cabinet={isCabinetMember} />
                </div>
            )}
        </Router>
    );
}

export default App;