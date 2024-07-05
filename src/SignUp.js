import './Master.css';
// import React, { useEffect, useState } from "react";
import { db, auth } from './firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

function SignUp() {
	let navigate = useNavigate();

	function errorReset()
	{
		document.getElementById("firstNameError").innerText = "";
		document.getElementById("lastNameError").innerText = "";
		document.getElementById("uflEmailError").innerText = "";
		document.getElementById("cabinetError").innerText = "";
		document.getElementById("positionError").innerText = "";
		document.getElementById("passwordError").innerText = "";
		document.getElementById("confirmPasswordError").innerText = "";
		return false;
	}
	async function check(event)
	{
		event.preventDefault();
		errorReset();

		var firstName = document.getElementById("firstName").value;
		var lastName = document.getElementById("lastName").value; 
		var uflEmail = document.getElementById("uflEmail").value;
		var cabinet = document.getElementById("cabinet").value;
		var position = document.getElementById("position").value;
		var password = document.getElementById("password").value;
		var confirmPassword = document.getElementById("confirmPassword").value;
		var ready = true;
		if(firstName === "")
		{
			document.getElementById("firstNameError").innerText = "*Required: Input your first name";
			ready = false;
		}
		if(lastName === "")
		{
			document.getElementById("lastNameError").innerText = "*Required: Input your last name";
			ready = false
		}
		if(uflEmail.length <= 8 || uflEmail.substring(uflEmail.length-8) !== "@ufl.edu")
		{
			document.getElementById("uflEmailError").innerText = "*Required: Input your UFL email";
			ready = false; 
		}
		if(cabinet === "select")
		{
			document.getElementById("cabinetError").innerText ="*Required: Select either your cabinet or no cabinet";
			ready = false;
		}	
		if(position === "select")
		{
			document.getElementById("positionError").innerText = "*Required: Select your position within cabinet";
		}
		if(password.length < 6)
		{
			document.getElementById("passwordError").innerText = "*Required: Passwords must be at least 6 characters long";
			ready = false;
		}
		if(password !== confirmPassword)
		{
			document.getElementById("confirmPasswordError").innerText = "*Required: Passwords must match";
			ready = false;
		}

		if(ready)
		{
			var approved = false;
			if(cabinet==="none")
			{
				approved = true;
			}
			createUserWithEmailAndPassword(auth, uflEmail, password)
			.then(async (userCredential) => {
				uflEmail = uflEmail.toLowerCase();
				await setDoc(doc(db, "users", uflEmail), {firstName: firstName, lastName: lastName, cabinet: cabinet, position: position, approved: approved, eboard: false, fallPoints: 0, springPoints: 0, strikes: 0, eventCodes: []});
                navigate('/login');
			})
			.catch((error) => {
				console.error('Error signing up:', error);
			});
		} else {
			return false;
		}
	}
	function setPositions()
	{
		document.getElementById("positionError").innerText="";
		var cabinet = document.getElementById("cabinet").value;
		var options;
		if(cabinet === 'select')
		{
			options = "<option value='select'>Select</option>";
				document.getElementById("position").innerHTML = options; 
			document.getElementById("positionError").innerText ="*Required: Answer the Cabinet question above";
			return;
		}
		if(cabinet === "president")
		{
			options = "<option value='select'>Select</option>";
			options += "<option value='Chief of Staff'>Chief of Staff</option>";
			options += "<option value='Cultural Affairs Officer'>Cultural Affairs Officer</option>";
			options += "<option value='Member Relations Chair'>Member Relations Chair </option>";
			options += "<option value='Intramural Coordinator'>Intramural Coordinator</option>";
			options += "<option value='Organization Development Chair'>Organization Development Chair</option>";
			options += "<option value='HLSA Executive Director'>HLSA Executive Director</option>";
		} else if(cabinet === "operations") {
			options = "<option value='select'>Select</option>";
			options += "<option value='Assistant Operations Executive Director'>Assistant Operations Executive Director </option>";
			options += "<option value='Intercabinet Liason'>Intercabinet Liason</option>";
			options += "<option value='Affiliated Organization Liason'>Affiliated Organization Liason</option>";
			options += "<option value='Alumni Outreach Director'>Alumni Outreach Director</option>";
		} else if(cabinet === "programming") {
			options = "<option value='select'>Select</option>";
			options += "<option value='Assistant Programming Executive Director '>Assistant Programming Executive Director</option>";
			options += "<option value='GBM Director'>GBM Director</option>";
			options += "<option value='Community Affairs Director'>Community Affairs Director </option>";
			options += "<option value='Service Director'>Service Director</option>";
			options += "<option value='Special Events Director'>Special Events Director</option>";
			options += "<option value='Keystone Event Director '>Keystone Event Director </option>";
		} else if(cabinet === "communications") {
			options = "<option value='select'>Select</option>";
			options += "<option value='Assistant Communications Executive Director '>Assistant Communications Executive Director </option>";
			options += "<option value='Creative and Graphics Director '>Creative and Graphics Director </option>";
			options += "<option value='Engagement Director'>Engagement Director</option>";
			options += "<option value='Content Creation Director '>Content Creation Director </option>";
			options += "<option value='Visual Media Director '>Visual Media Director </option>";
			options += "<option value='Videographer'>Videographer</option>";
		} else if(cabinet === "treasurey") {
			options = "<option value='select'>Select</option>";
			options += "<option value='Assistant Treasurer'>Assistant Treasurer</option>";
			options += "<option value='Fundraising Director'>Fundraising Director</option>";
			options += "<option value='Financial Literacy Director'>Financial Literacy Director</option>";
		} else if(cabinet === "secretary") {
			options = "<option value='select'>Select</option>";
			options += "<option value='Assistant Secretary'>Assistant Secretary</option>";
			options += "<option value='Newsletter Director '>Newsletter Director </option>";
			options += "<option value='Webmaster'>Webmaster</option>";
		} else if(cabinet === "mlpFall") {
			options = "<option value='select'>Select</option>";
			options += "<option value='Assistant MLP Fall Executive Director'>Assistant MLP Fall Executive Director </option>";
			options += "<option value='Finance Director'>Finance Director </option>";
			options += "<option value='Health and Wellness Affairs Director'>Health and Wellness Affairs Director </option>";
			options += "<option value='Marketing Director'>Marketing Director </option>";
			options += "<option value='Membership Relations Director'>Membership Relations Director </option>";
			options += "<option value='Mentorship Director'>Mentorship Director </option>";
			options += "<option value='Inclusivity and Multicultural Affairs Director'>Inclusivity and Multicultural Affairs Director </option>";
			options += "<option value='Professional and Academic Development Director '>Professional and Academic Development Director</option>";
			options += "<option value='Servant Leadership Director '>Servant Leadership Director </option>";
		} else if(cabinet === "mlpSpring") {
			options = "<option value='select'>Select</option>";
			options += "<option value='Assistant MLP Spring Executive Director'>Assistant MLP Spring Executive Director </option>";
			options += "<option value='Finance Director'>Finance Director </option>";
			options += "<option value='Health and Wellness Affairs Director'>Health and Wellness Affairs Director </option>";
			options += "<option value='Marketing Director'>Marketing Director </option>";
			options += "<option value='Membership Relations Director'>Membership Relations Director </option>";
			options += "<option value='Mentorship Director'>Mentorship Director </option>";
			options += "<option value='Inclusivity and Multicultural Affairs Director'>Inclusivity and Multicultural Affairs Director </option>";
			options += "<option value='Professional and Academic Development Director '>Professional and Academic Development Director</option>";
			options += "<option value='Servant Leadership Director '>Servant Leadership Director </option>";
		} else if(cabinet === "opa") {
			options = "<option value='select'>Select</option>";
			options += "<option value='Assistant Executive Director for OPA'>Assistant Executive Director for OPA</option>";
			options += "<option value='OPA Communications Director'>OPA Communications Director</option>";
			options += "<option value='OPA Special Events Director'>OPA Special Events Director</option>";
			options += "<option value='Research and Education Director'>Research and Education Director</option>";
			options += "<option value='Community Engagement Director'>Community Engagement Director</option>";
			options += "<option value='Outreach Project Directors'>Outreach Project Directors</option>";

		} else {
			options = "<option value='select'>Select</option>";
			options = "<option value='none'>Not in Cabinet</option>";

		}
		document.getElementById("position").innerHTML = options;
	}
	return (
		<div className="form" onSubmit={check}>
			<h2>Sign Up</h2>
			<form>
				<p className='errorMsg' id="firstNameError"></p>
				<label htmlFor='firstName'>First Name/Nombre: </label><br/>
				<input type="text" id='firstName' placeholder='Albert'></input>
				<p className='errorMsg' id="lastNameError"></p>
				<label htmlFor="lastName">Last Name/Apellido: </label><br/>
				<input type="text" id="lastName" placeholder='Gator'></input>
				<p className='errorMsg' id="uflEmailError"></p>
				<label htmlFor="uflEmail">UFL Email: </label><br/>
				<input type="text" id="uflEmail" placeholder='albert@ufl.edu'></input>
				<p className='errorMsg' id="cabinetError"></p>
				<label htmlFor="cabinet">Involvement in HSA Cabinet:</label> <br/>
				<select id="cabinet" onChange={e => setPositions()}>
					<option value="select">Select</option>
					<option value="none">Not in Cabinet</option>
					<option value="president">Presidential Cabinet</option>
					<option value="operations">Operations Cabinet</option>
					<option value="programming">Programming Cabinet</option>
					<option value="communications">Communications Cabinet</option>
					<option value="treasurey">Treasurer Cabinet</option>
					<option value="secretary">Secretary Cabinet</option>
					<option value="mlpFall">MLP Fall Cabinet</option>
					<option value="mlpSpring">MLP Spring Cabinet</option>
					<option value="opa">Office of Political Affairs</option>
				</select>
				<p className='errorMsg' id="positionError"></p>
				<label htmlFor="position">Position:</label><br/>
				<select id="position">
					<option value="select">Select</option>
				</select>
				<p className='errorMsg' id="passwordError"></p>
				<label htmlFor="password">Password: </label><br/>
				<input type="password" id="password"></input>
				<p className='errorMsg' id="confirmPasswordError"></p>
				<label htmlFor="confirmPassword">Confirm Password: </label><br/>
				<input type="password" id="confirmPassword"></input>
				<div className="center"><input type='submit' value='Sign Up'></input></div>
			</form>
			<div className="center"><a href="./Login">Already have an account? Log In</a></div><br/>
		</div>
	);
}

export default SignUp;
