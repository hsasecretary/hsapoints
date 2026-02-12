import './Master.css';
import React, { useState } from "react";
import { db, auth } from './firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, arrayUnion, updateDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

function SignUp() {
	let navigate = useNavigate();
	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		uflEmail: '',
		cabinet: 'select',
		position: 'select',
		password: '',
		confirmPassword: ''
	});
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);

	// Position options based on cabinet selection
	const positionOptions = {
		none: [{ value: 'general', label: 'General Member' }],
		president: [
			{ value: 'president', label: 'President' },
			{ value: 'press-secretary', label: 'Press Secretary' },
			{ value: 'hlsa-ed', label: 'HLSA Executive Director' },
			{ value: 'adelante-ed', label: 'Adelante Executive Director' },
			{ value: 'hlhm-ed', label: 'HLHM Executive Director' }
		],
		operations: [
			{ value: 'vp-operations', label: 'Vice President of Operations' },
			{ value: 'assistant-operations-ed', label: 'Assistant Operations Executive Director' },
			{ value: 'affiliated-org-liaison', label: 'Affiliated Organization Liaison' },
			{ value: 'alumni-outreach-director', label: 'Alumni Outreach Director' }
		],
		programming: [
			{ value: 'vp-programming', label: 'Vice President of Programming' },
			{ value: 'assistant-executive-director', label: 'Assistant Executive Director' },
			{ value: 'gbm-director', label: 'GBM Director' },
			{ value: 'athletics-coordinator', label: 'Athletics Coordinator' },
			{ value: 'service-director', label: 'Service Director' },
			{ value: 'internal-socials-director', label: 'Internal Socials Director' },
			{ value: 'external-socials-director', label: 'External Socials Director' },
			{ value: 'keystone-event-director', label: 'Keystone Event Director' }
		],
		communications: [
			{ value: 'vp-communications', label: 'Vice President of Communications' },
			{ value: 'assistant-communications-ed', label: 'Assistant Communications Executive Director' },
			{ value: 'graphics-director', label: 'Graphics Director' },
			{ value: 'copywriting-director', label: 'Copywriting Director' },
			{ value: 'engagement-director', label: 'Engagement Director' },
			{ value: 'digital-content-director', label: 'Digital Content Director' },
			{ value: 'merch-director', label: 'Merch Director' },
			{ value: 'photographer', label: 'Photographer' },
			{ value: 'videographer', label: 'Videographer' }
		],
		treasurey: [
			{ value: 'treasurer', label: 'Treasurer' },
			{ value: 'assistant-treasurer', label: 'Assistant Treasurer' },
			{ value: 'internal-fundraising-director', label: 'Internal Fundraising Director' },
			{ value: 'external-fundraising-director', label: 'External Fundraising Director' }
		],
		secretary: [
			{ value: 'secretary', label: 'Secretary' },
			{ value: 'assistant-secretary', label: 'Assistant Secretary' },
			{ value: 'newsletter-director', label: 'Newsletter Director' },
			{ value: 'webmaster', label: 'Webmaster' }
		],
		mlpFall: [
			{ value: 'mlp-fall-ed', label: 'MLP Fall Executive Director' },
			{ value: 'assistant-ed', label: 'Assistant Executive Director' },
			{ value: 'finance-director', label: 'Finance Director' },
			{ value: 'health-wellness-director', label: 'Health and Wellness Affairs Director' },
			{ value: 'marketing-director', label: 'Marketing Director' },
			{ value: 'membership-relations-director', label: 'Membership Relations Director' },
			{ value: 'mentorship-director', label: 'Mentorship Director' },
			{ value: 'inclusivity-multicultural-director', label: 'Inclusivity and Multicultural Affairs Director' },
			{ value: 'professional-academic-director', label: 'Professional and Academic Development Director' },
			{ value: 'servant-leadership-director', label: 'Servant Leadership Director' }
		],
		mlpSpring: [
			{ value: 'mlp-spring-ed', label: 'MLP Spring Executive Director' },
			{ value: 'assistant-ed', label: 'Assistant Executive Director' },
			{ value: 'finance-director', label: 'Finance Director' },
			{ value: 'health-wellness-director', label: 'Health and Wellness Affairs Director' },
			{ value: 'marketing-director', label: 'Marketing Director' },
			{ value: 'membership-relations-director', label: 'Membership Relations Director' },
			{ value: 'mentorship-director', label: 'Mentorship Director' },
			{ value: 'inclusivity-multicultural-director', label: 'Inclusivity and Multicultural Affairs Director' },
			{ value: 'professional-academic-director', label: 'Professional and Academic Development Director' },
			{ value: 'servant-leadership-director', label: 'Servant Leadership Director' }
		],
		opa: [
			{ value: 'opa-ed-internal', label: 'OPA Executive Director - Internal' },
			{ value: 'opa-ed-external', label: 'OPA Executive Director - External' },
			{ value: 'internal-communications-director', label: 'Internal Communications Director' },
			{ value: 'special-events-director', label: 'Special Events Director' },
			{ value: 'research-education-director', label: 'Research and Education Director' },
			{ value: 'internal-outreach-director', label: 'Internal Outreach Project Director' },
			{ value: 'historian', label: 'Historian' },
			{ value: 'external-communications-director', label: 'External Communications Director' },
			{ value: 'civic-engagement-director', label: 'Civic Engagement Director' },
			{ value: 'external-outreach-director', label: 'External Outreach Project Director' },
			{ value: 'legislative-affairs', label: 'Legislative Affairs' }
		]
	};

	const handleInputChange = (field, value) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));

		// Clear specific error when user starts typing
		if (errors[field]) {
			setErrors(prev => ({
				...prev,
				[field]: ''
			}));
		}

		// Reset position when cabinet changes
		if (field === 'cabinet') {
			setFormData(prev => ({
				...prev,
				position: 'select'
			}));
		}
	};

	const validateForm = () => {
		const newErrors = {};

		if (!formData.firstName.trim()) {
			newErrors.firstName = "*Required: Input your first name";
		}

		if (!formData.lastName.trim()) {
			newErrors.lastName = "*Required: Input your last name";
		}

		const email = formData.uflEmail.toLowerCase();
		if (!email.endsWith('@ufl.edu') && !email.endsWith('@sfcollege.edu')) {
			newErrors.uflEmail = "*Required: Input your UFL/SF email";
		}

		if (formData.cabinet === 'select') {
			newErrors.cabinet = "*Required: Select either your cabinet or no cabinet";
		}

		if (formData.position === 'select') {
			newErrors.position = "*Required: Select your position within cabinet";
		}

		if (formData.password.length < 6) {
			newErrors.password = "*Required: Passwords must be at least 6 characters long";
		}

		if (formData.password !== formData.confirmPassword) {
			newErrors.confirmPassword = "*Required: Passwords must match";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		
		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			const approved = formData.cabinet === "none";
			const email = formData.uflEmail.toLowerCase();

			const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
			
			await setDoc(doc(db, "users", email), {
				firstName: formData.firstName.trim(),
				lastName: formData.lastName.trim(),
				cabinet: formData.cabinet,
				position: formData.position,
				approved: approved,
				eboard: false,
				fallPoints: 0,
				springPoints: 0,
				cabinetPoints: 0,
				programmingPointsVE: 0,
				gbmPointsVE: 0,
				mlpFallPointsVE: 0,
				mlpSpringPointsVE: 0,
				programmingPointsNVE: 0,
				gbmPointsNVE: 0,
				mlpFallPointsNVE: 0,
				mlpSpringPointsNVE: 0,
				opaPointsNVE: 0,
				opaPointsVE: 0,
				otherPoints: 0,
				strikes: 0,
				eventCodes: [],
				excusedEvents: [],
				excusedReason: [],
				unexcusedEvents: []
			});

			// Add user to appropriate cabinet collection
			const collectionName = approved ? "regular" : "pending";
			const cabinetDocRef = doc(db, "cabinets", collectionName);
			await updateDoc(cabinetDocRef, {
				"emails": arrayUnion(email)
			});

			navigate('/login');
		} catch (error) {
			console.error('Error signing up:', error);
			setErrors({ general: 'Error creating account. Please try again.' });
		} finally {
			setLoading(false);
		}
	};

	const currentPositions = formData.cabinet !== 'select' ? positionOptions[formData.cabinet] || [] : [];

	return (
		<div className="form">
			<h2>Sign Up</h2>
			<form onSubmit={handleSubmit}>
				{errors.general && <p className='errorMsg'>{errors.general}</p>}
				
				<p className='errorMsg'>{errors.firstName}</p>
				<label htmlFor='firstName'>First Name/Nombre: </label><br/>
				<input 
					type="text" 
					id='firstName' 
					placeholder='Albert'
					value={formData.firstName}
					onChange={(e) => handleInputChange('firstName', e.target.value)}
				/>
				
				<p className='errorMsg'>{errors.lastName}</p>
				<label htmlFor="lastName">Last Name/Apellido: </label><br/>
				<input 
					type="text" 
					id="lastName" 
					placeholder='Gator'
					value={formData.lastName}
					onChange={(e) => handleInputChange('lastName', e.target.value)}
				/>
				
				<p className='errorMsg'>{errors.uflEmail}</p>
				<label htmlFor="uflEmail">UFL/SF Email: </label><br/>
				<input 
					type="email" 
					id="uflEmail" 
					placeholder='albert@ufl.edu'
					value={formData.uflEmail}
					onChange={(e) => handleInputChange('uflEmail', e.target.value)}
				/>
				
				<p className='errorMsg'>{errors.cabinet}</p>
				<label htmlFor="cabinet">Involvement in HSA Cabinet:</label> <br/>
				<select 
					id="cabinet" 
					value={formData.cabinet}
					onChange={(e) => handleInputChange('cabinet', e.target.value)}
				>
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
				
				<p className='errorMsg'>{errors.position}</p>
				<label htmlFor="position">Position:</label><br/>
				<select 
					id="position"
					value={formData.position}
					onChange={(e) => handleInputChange('position', e.target.value)}
				>
					<option value="select">Select</option>
					{currentPositions.map(pos => (
						<option key={pos.value} value={pos.value}>{pos.label}</option>
					))}
				</select>
				
				<p className='errorMsg'>{errors.password}</p>
				<label htmlFor="password">Password: </label><br/>
				<input 
					type="password" 
					id="password"
					value={formData.password}
					onChange={(e) => handleInputChange('password', e.target.value)}
				/>
				
				<p className='errorMsg'>{errors.confirmPassword}</p>
				<label htmlFor="confirmPassword">Confirm Password: </label><br/>
				<input 
					type="password" 
					id="confirmPassword"
					value={formData.confirmPassword}
					onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
				/>
				
				<div className="center">
					<input 
						type='submit' 
						value={loading ? 'Creating Account...' : 'Sign Up'}
						disabled={loading}
					/>
				</div>
			</form>
			<div className="center"><a href="./Login">Already have an account? Log In</a></div><br/>
		</div>
	);
}

export default SignUp;
