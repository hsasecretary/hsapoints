import './Logout.css';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import React, {useEffect} from "react";
function Logout() {
    const navigate = useNavigate(); 

    useEffect(() => {
        const listen = onAuthStateChanged(auth, (user) => {
            if(!user)
            {
                signOut(auth);
                console.log("Dashboad: no one home");
                navigate("/login");
            }
        });
        return () => {
            listen();
        }
    }, [navigate]);

	function logout()
    {
        signOut(auth);
        navigate('/login');
    };

	return (
        <div className="logout-container">
            <button className="logout-button" onClick={logout}>
                Logout
            </button>
        </div>
	);
}

export default Logout;

