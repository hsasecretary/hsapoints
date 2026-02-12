import './Master.css';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword} from 'firebase/auth';
import Header from './Header';

function Login() {
	const auth = getAuth();
	let navigate = useNavigate();
	
	function check(event) {
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
			<div className="form login-form">
				<h2>Login</h2>
				<form onSubmit={check} className="login-form-content">
					<p className='errorMsg' id="loginError"></p>
					
					<div className="input-group">
						<label htmlFor="uflEmail">UFL/SF Email:</label>
						<input type="email" id="uflEmail" placeholder='albert@ufl.edu' required />
					</div>
					
					<div className="input-group">
						<label htmlFor="password">Password:</label>
						<input type="password" id="password" required />
					</div>
					
					<div className="button-group">
						<input type='submit' value='Log In' className="login-button" />
					</div>
				</form>
				
				<div className="login-links">
					<div className="link-item">
						<a href="./SignUp" className="signup-link">New? Create an account</a>
					</div>
					<div className="link-item">
						<a href="/forgotPassword" className="forgot-link">Forgot Password? Click here</a>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Login;
