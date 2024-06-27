import './Logout.css';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
function Logout() {
    const auth = getAuth();
	let navigate = useNavigate();
    if(!auth.currentUser == null)
        {
            //calls the variable navigate, which has the navigation function
            //redirects to the login page
            navigate('/login'); 
            
        }
	function logout()
    {
        if(auth.currentUser == null)
            {
                //calls the variable navigate, which has the navigation function
                //redirects to the login page
                navigate('/login'); 
                
            }
        const user = auth.currentUser;
        console.log(user.email);
        signOut(auth);
        navigate('/login');
    };
	return (
        <button onClick= {logout}>Logout</button>
	);
}

export default Logout;

