import './Master.css';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword} from 'firebase/auth';
import Header from './Header';

function Login() {
	const auth = getAuth();
	let navigate = useNavigate();
	function check(event)
	{
		event.preventDefault();
		document.getElementById("loginError").innerText = "";
		var email = document.getElementById("uflEmail").value;
		var pass = document.getElementById("password").value;
		signInWithEmailAndPassword(auth, email, pass).then((userCredential) => {
			navigate('/dashboard');
		})
		.catch((error) => {
			document.getElementById("loginError").innerText = "Email/Password incorrect. Please try again";
		});		
		
	}
	
	return (
			<div>
				<Header />
				<div className="form">
					<h2>Login</h2>
					<form onSubmit={check}>
						<p className='errorMsg' id="loginError"></p>
						<label htmlFor="uflEmail">UFL/SF Email: </label><br/>
						<input type="text" id="uflEmail" placeholder='albert@ufl.edu'></input>
						<label htmlFor="password">Password: </label><br/>
						<input type="password" id="password"></input>
						{/*functional submit on backlog*/}
						<div className="center"><input type='submit' value='Log In'></input></div>
					</form>
					<div className="center"><a href="./SignUp">New? Create an account</a></div> 
					{/* Forgot password on */}
					<div className="center"><a href="/forgotPassword" id="reset">Forgot Password? Click here</a></div>
					<br/>
				</div>
			</div>
	);
}

export default Login;
