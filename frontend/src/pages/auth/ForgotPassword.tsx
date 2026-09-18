import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';

function ForgotPassword() {
	function check(event) 
    {
        event.preventDefault();
        document.getElementById("emailError").innerText = "";
        var uflEmail = (document.getElementById("uflEmail") as HTMLInputElement).value;
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
				<div className="form">
					<h2>Forgot Password</h2>
					<form onSubmit={check}>
						<p className='errorMsg' id="emailError"></p>
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
