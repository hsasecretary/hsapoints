import './Master.css';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';
import Header from './Header';

function ForgotPassword() {
	function check(event) 
    {
        event.preventDefault();
        document.getElementById("emailError").innerText = "";
        var uflEmail = document.getElementById("uflEmail").value;
        if(uflEmail.length <= 8 || uflEmail.substring(uflEmail.length-8) !== "@ufl.edu")
        {
            document.getElementById("emailError").innerText = "*Required: Input your UFL email";
            return false;
        }
        sendPasswordResetEmail(auth, uflEmail)
            .then(() => {
            // Password reset email sent successfully
                window.location.reload();
            })
            .catch((error) => {
            // Handle errors
            console.error("Error sending password reset email:", error);
            });
    }
	return (
			<div>
				<Header />
				<div className="form">
					<h2>Forgot Password</h2>
					<form onSubmit={check}>
						<p className='errorMsg' id="emailError"></p>
						<label htmlFor="uflEmail">UFL Email: </label><br/>
						<input type="text" id="uflEmail" placeholder='albert@ufl.edu'></input>
						<div className="center"><input type='submit' value='Reset'></input></div>
						<div className="center"><a href="./SignUp">New? Create an account</a></div> 
						<div className="center"><a href="/login">Remember Your Password? Login</a></div>
						<br/>
					</form>
				</div>
			</div>
	);
}

export default ForgotPassword;
