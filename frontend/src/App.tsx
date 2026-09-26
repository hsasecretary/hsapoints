import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SignUp from './pages/auth/SignUp';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import SiteHeader from './components/layout/SiteHeader';
import Footer from './components/layout/Footer';
import NotFound from './pages/NotFound';
import ForgotPassword from './pages/auth/ForgotPassword';

import React, { Suspense, lazy, useEffect, useState } from "react";
import { onAuthStateChanged} from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// The E-Board tools and the cabinet page load as their own chunks. Most people
// signing in are general members who can never open any of them, and bundling
// them in meant every member downloaded all of it to look at their points.
const Eboard = lazy(() => import('./pages/eboard/Eboard'));
const EventCodesPage = lazy(() => import('./pages/eboard/EventCodesPage'));
const PointRequestReview = lazy(() => import('./pages/eboard/PointRequestReview'));
const UserPointsLookup = lazy(() => import('./pages/eboard/UserPointsLookup'));
const ExcuseAbscense = lazy(() => import('./pages/eboard/ExcuseAbscense'));
const ApprovedCabinet = lazy(() => import('./pages/eboard/ApprovedCabinet'));
const Cabinet = lazy(() => import('./pages/cabinet/Cabinet'));
const Strikes = lazy(() => import('./pages/strikes/Strikes'));

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
                    <SiteHeader signedIn={!!userEmail} eboard={isEboard} cabinet={isCabinetMember} />
                    <Suspense fallback={<div className="route-loading" role="status">Loading...</div>}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" />} />
                        <Route path="/signup" element={userEmail ? <Navigate to="/dashboard" replace /> : <SignUp />} />
                        <Route path="/login" element={userEmail ? <Navigate to="/dashboard" replace /> : <Login />} />
                        <Route path="/dashboard" element={userEmail ? <Dashboard cabinet={isCabinetMember} email={userEmail} /> : <Navigate to="/login" />} />
                        <Route path="/strikes" element={userEmail ? <Strikes /> : <Navigate to="/login" />} />
                        <Route path="/cabinet" element={userEmail ? <Cabinet cabinet={isCabinetMember} /> : <Navigate to="/login" />} />
                        {/* E-Board tools, one page each (list in pages/eboard/eboardTools.ts) */}
                        <Route path="/eboard" element={userEmail ? <Eboard eboard={isEboard} /> : <Navigate to="/login" />}>
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
                    </Suspense>
                    <Footer signedIn={!!userEmail} eboard={isEboard} />
                </div>
            )}
        </Router>
    );
}

export default App;