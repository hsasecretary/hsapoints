import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SignUp from './pages/auth/SignUp';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import SiteHeader from './components/layout/SiteHeader';
import Footer from './components/layout/Footer';
import NotFound from './pages/NotFound';
import Eboard from './pages/eboard/Eboard';
import EventCodesPage from './pages/eboard/EventCodesPage';
import PointRequestReview from './pages/eboard/PointRequestReview';
import UserPointsLookup from './pages/eboard/UserPointsLookup';
import ExcuseAbscense from './pages/eboard/ExcuseAbscense';
import ApprovedCabinet from './pages/eboard/ApprovedCabinet';
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
                    <SiteHeader signedIn={!!userEmail} eboard={isEboard} />
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" />} />
                        <Route path="/signup" element={userEmail ? <Navigate to="/dashboard" replace /> : <SignUp />} />
                        <Route path="/login" element={userEmail ? <Navigate to="/dashboard" replace /> : <Login />} />
                        <Route path="/dashboard" element={userEmail ? <Dashboard cabinet={isCabinetMember} email={userEmail} /> : <Navigate to="/login" />} />
                        <Route path="/cabinet" element={userEmail ? <Cabinet cabinet={isCabinetMember} /> : <Navigate to="/login" />} />
                        {/* E-Board tools, one page each (list in pages/eboard/eboardTools.ts) */}
                        <Route path="/eboard" element={userEmail ? <Eboard eboard={isEboard} cabinet={isCabinetMember} /> : <Navigate to="/login" />}>
                            <Route index element={<Navigate to="event-codes" replace />} />
                            <Route path="event-codes" element={<EventCodesPage />} />
                            <Route path="point-requests" element={<PointRequestReview />} />
                            <Route path="user-lookup" element={<UserPointsLookup />} />
                            <Route path="excuse-absence" element={<ExcuseAbscense />} />
                            <Route path="approvals" element={<ApprovedCabinet />} />
                        </Route>
                        <Route path="/forgotPassword" element={<ForgotPassword />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                    <Footer signedIn={!!userEmail} eboard={isEboard} />
                </div>
            )}
        </Router>
    );
}

export default App;