import './Master.css';
// import React, { useEffect, useState } from "react";
// import { db, auth } from './firebase';
// import { onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
// import { setDoc, doc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

function Login() {
	
	let navigate = useNavigate();
	function check(event)
	{
		event.preventDefault();
		navigate('/dashboard');
	}
	return (
		<div className="form" >
			<h2>Login</h2>
			<form onSubmit={check}>
				<p className='errorMsg' id="loginError"></p>
				<label htmlFor="uflEmail">UFL Email: </label><br/>
				<input type="text" id="uflEmail" placeholder='albert@ufl.edu'></input>
				<label htmlFor="password">Password: </label><br/>
				<input type="password" id="password"></input>
				
				<div className="center"><input type='submit' value='Log In'></input></div>
			</form>
			<div className="center"><a href="./SignUp">New? Create an account</a></div>
			<div className="center"><a href="./">Forget Password? Click to Reset</a></div><br/>
		</div>
	);
}

export default Login;
