import './Logout.css';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import React, {useEffect, useState} from "react";
function Logout() {
    const navigate = useNavigate(); 
    const [authUser, setAuthUser] = useState(null);

    useEffect(() => {
        const listen = onAuthStateChanged(auth, (user) => {
            if(user) {
                setAuthUser(user);
                console.log("Dashboard: " + user.email);
            } else {
                signOut(auth);
                console.log("Dashboad: no one home");
                navigate("/login");
            }
        });
        return () => {
            listen();
        }
    }, []);

	function logout()
    {
        signOut(auth);
        navigate('/login');
    };

	return (
        <button onClick= {logout}>Logout</button>
	);
}

export default Logout;

