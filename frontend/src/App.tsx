import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SignUp from './pages/auth/SignUp';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import SiteHeader from './components/layout/SiteHeader';
import Footer from './components/layout/Footer';
import NotFound from './pages/NotFound';
import ForgotPassword from './pages/auth/ForgotPassword';
import Requests from './pages/requests/Requests';
import Requirements from './pages/requirements/Requirements';
import { ViewAsContext, type ViewAsState } from './components/layout/ViewAsContext';
import { canSwitchView, effectiveView, ownView, type View } from './lib/viewAs';

import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
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
const ExcuseAbsence = lazy(() => import('./pages/eboard/excuseAbsence/ExcuseAbsence'));
const EboardHome = lazy(() => import('./pages/eboard/EboardHome'));
const ApprovedCabinet = lazy(() => import('./pages/eboard/ApprovedCabinet'));
const Cabinet = lazy(() => import('./pages/cabinet/Cabinet'));

function App() {
    const [userEmail, setUserEmail] = useState(null);
    const [isEboard, setIsEboard] = useState(false);
    const [isCabinetMember, setIsCabinetMember] = useState(false);
    // The view switcher (lib/viewAs.ts): the Member's Own View, whether they
    // may switch, and the view they picked (null = their own). Display only.
    const [own, setOwn] = useState<View>('general');
    const [canSwitch, setCanSwitch] = useState(false);
    const [picked, setPicked] = useState<View | null>(null);
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
        // A new sign-in (or sign-out) starts back in the Member's Own View.
        setPicked(null);
        if (!userEmail) {
            setIsEboard(false);
            setIsCabinetMember(false);
            setOwn('general');
            setCanSwitch(false);
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
                setOwn(data ? ownView(data) : 'general');
                setCanSwitch(data ? canSwitchView(data) : false);
                setRolesLoaded(true);
            },
            (error) => {
                console.error("Failed to load user roles:", error);
                setIsEboard(false);
                setIsCabinetMember(false);
                setOwn('general');
                setCanSwitch(false);
                setRolesLoaded(true);
            }
        );

        return () => unsubscribe();
    }, [userEmail]);

    const view = effectiveView({ own, canSwitch }, picked);
    const viewAs = useMemo<ViewAsState>(() => ({
        own,
        view,
        canSwitch,
        setView: (next) => setPicked(next === own ? null : next),
    }), [own, view, canSwitch]);
    const cabinetView = view === 'cabinet';

    return (
        <ViewAsContext.Provider value={viewAs}>
        <Router>
            {loading || (userEmail && !rolesLoaded) ? (
                <div>Loading...</div>
            ) : (
                <div className={`app-shell${userEmail ? ' app-shell--signed-in' : ''}`}>
                    <SiteHeader signedIn={!!userEmail} eboard={isEboard} cabinetView={cabinetView} />
                    <Suspense fallback={<div className="route-loading" role="status">Loading...</div>}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" />} />
                        <Route path="/signup" element={userEmail ? <Navigate to="/dashboard" replace /> : <SignUp />} />
                        <Route path="/login" element={userEmail ? <Navigate to="/dashboard" replace /> : <Login />} />
                        <Route path="/dashboard" element={userEmail ? <Dashboard email={userEmail} /> : <Navigate to="/login" />} />
                        <Route path="/requirements" element={!userEmail ? <Navigate to="/login" /> : cabinetView ? <Requirements email={userEmail} /> : <Navigate to="/dashboard" replace />} />
                        <Route path="/requests" element={userEmail ? <Requests /> : <Navigate to="/login" />} />
                        {/* The Guide page is gone; its explainer is the Overview's How it works bubble */}
                        <Route path="/guide" element={<Navigate to="/dashboard?open=how" replace />} />
                        <Route path="/cabinet" element={userEmail ? <Cabinet cabinet={isCabinetMember} /> : <Navigate to="/login" />} />
                        {/* E-Board tools, one page each (list in pages/eboard/eboardTools.ts) */}
                        <Route path="/eboard" element={userEmail ? <Eboard eboard={isEboard} /> : <Navigate to="/login" />}>
                            <Route index element={<EboardHome />} />
                            <Route path="event-codes" element={<EventCodesPage />} />
                            <Route path="point-requests" element={<PointRequestReview />} />
                            <Route path="user-lookup" element={<UserPointsLookup />} />
                            <Route path="excuse-absence" element={<ExcuseAbsence />} />
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
        </ViewAsContext.Provider>
    );
}

export default App;