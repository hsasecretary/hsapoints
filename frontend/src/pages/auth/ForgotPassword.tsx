import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';

function ForgotPassword() {
	function check(event) 
    {
        event.preventDefault();
        document.getElementById("emailError").innerText = "";
        document.getElementById("resetStatus").innerText = "";
        var uflEmail = (document.getElementById("uflEmail") as HTMLInputElement).value.trim().toLowerCase();
        if(!uflEmail.endsWith("@ufl.edu") && !uflEmail.endsWith("@sfcollege.edu"))
        {
            document.getElementById("emailError").innerText = "*Required: Input your UFL or SF email";
            return false;
        }
        sendPasswordResetEmail(auth, uflEmail)
            .then(() => {
                document.getElementById("resetStatus").innerText = "If an account exists for " + uflEmail + ", a reset email is on its way. Check your inbox and spam folder.";
            })
            .catch((error) => {
                console.error("Error sending password reset email:", error);
                document.getElementById("emailError").innerText = "*Couldn't send the reset email. Please try again.";
            });
    }
	return (
			<div>
				<div className="form">
					<h2>Forgot Password</h2>
					<form onSubmit={check}>
						<p className='errorMsg' id="emailError"></p>
						<p role="status" id="resetStatus"></p>
						<label htmlFor="uflEmail">UFL Email: </label><br/>
						<input type="text" id="uflEmail" placeholder='albert@ufl.edu'></input>
						<div className="center"><input type='submit' value='Reset'></input></div>
						<br/>
					</form>

					{/* Same link block as the Login page */}
					<div className="login-links">
						<div className="link-item">
							<a href="/signup" className="signup-link">New? Create an account</a>
						</div>
						<div className="link-item">
							<a href="/login" className="forgot-link">Remember your password? Log in</a>
						</div>
					</div>
				</div>
			</div>
	);
}

export default ForgotPassword;
