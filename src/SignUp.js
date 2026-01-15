import './Master.css';
// import React, { useEffect, useState } from "react";
import { db, auth } from './firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, arrayUnion, updateDoc } from "firebase/firestore";
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
		if((uflEmail.length <= 8 || uflEmail.substring(uflEmail.length-8) !== "@ufl.edu") && (uflEmail.length <= 14 || uflEmail.substring(uflEmail.length-14) !== "@sfcollege.edu"))
		{
			document.getElementById("uflEmailError").innerText = "*Required: Input your UFL/SF email";
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
				await setDoc(doc(db, "users", uflEmail), {
					firstName: firstName, 
					lastName: lastName, 
					cabinet: cabinet, 
					position: position, 
					approved: approved, 
					eboard: false, 
					fallPoints: 0, 
					springPoints: 0, 
					cabinetPoints:0,
					programmingPointsVE:0,
					gbmPointsVE:0,
					mlpFallPointsVE:0,
					mlpSpringPointsVE:0,
					programmingPointsNVE:0,
					gbmPointsNVE:0,
					mlpFallPointsNVE:0,
					mlpSpringPointsNVE:0,
					opaPointsNVE:0,
					opaPointsVE:0,
					otherPoints:0,
					strikes: 0,
					eventCodes: [],
					excusedEvents: [],
					excusedReason: [],
					unexcusedEvents: []
				});
                if(!approved)
				{
					const pendingDocref = await doc(db, "cabinets", "pending");
					await updateDoc(pendingDocref,{
						"emails": arrayUnion(uflEmail)
					});
				} else {
					const pendingDocref = await doc(db, "cabinets", "regular");
					await updateDoc(pendingDocref,{
						"emails": arrayUnion(uflEmail)
					});
					
				}
				navigate('/login');
			})
			.catch((error) => {
				console.error('Error signing up:', error);
			});
		} else {
			return false;
		}
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
				<label htmlFor="uflEmail">UFL/SF Email: </label><br/>
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
