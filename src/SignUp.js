import './Master.css';
import React, { useState } from "react";
import { db, auth } from './firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, arrayUnion, updateDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import Header from './Header';

// E-Board positions. `cabinet` is the cabinet each position belongs to, so the
// existing `cabinet` field on the user document keeps working downstream.
const eboardPositions = [
	{ value: 'president', label: 'President', cabinet: 'president' },
	{ value: 'vp-operations', label: 'Vice President of Operations', cabinet: 'operations' },
	{ value: 'vp-programming', label: 'Vice President of Programming', cabinet: 'programming' },
	{ value: 'treasurer', label: 'Treasurer', cabinet: 'treasurey' },
	{ value: 'secretary', label: 'Secretary', cabinet: 'secretary' },
	{ value: 'mlp-fall-ed', label: 'MLP Fall Executive Director', cabinet: 'mlpFall' },
	{ value: 'mlp-spring-ed', label: 'MLP Spring Executive Director', cabinet: 'mlpSpring' },
	{ value: 'opa-ed-external', label: 'OPA External Executive Director', cabinet: 'opa' },
	{ value: 'opa-ed-internal', label: 'OPA Internal Executive Director', cabinet: 'opa' },
	{ value: 'chief-of-staff', label: 'Chief of Staff', cabinet: 'president' }
];

// Cabinet keys match the values already stored on existing user documents.
const cabinets = [
	{ value: 'president', label: 'Presidential' },
	{ value: 'operations', label: 'Operations' },
	{ value: 'programming', label: 'Programming' },
	{ value: 'communications', label: 'Communications' },
	{ value: 'treasurey', label: 'Treasury' },
	{ value: 'secretary', label: 'Secretary' },
	{ value: 'mlpFall', label: 'MLP Fall' },
	{ value: 'mlpSpring', label: 'MLP Spring' },
	{ value: 'opa', label: 'Office of Political Affairs' }
];

// Rolls forward on its own each year, so this never needs editing again.
const graduationYears = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() + i));

// Which involvement choices open a second dropdown, and what it contains.
const subRoleConfig = {
	eboard: {
		label: 'E-Board Position',
		options: eboardPositions,
		error: '*Required: Select your e-board position'
	},
	cabinet: {
		label: 'Cabinet',
		options: cabinets,
		error: '*Required: Select your cabinet'
	}
};

function SignUp() {
	let navigate = useNavigate();
	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		uflEmail: '',
		graduationYear: 'select',
		involvement: 'select',
		subRole: 'select',
		password: '',
		confirmPassword: ''
	});
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);

	// Null for MLP and General Member, which have no second dropdown.
	const currentSubRole = subRoleConfig[formData.involvement] || null;

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

		// Reset the second dropdown when involvement changes
		if (field === 'involvement') {
			setFormData(prev => ({
				...prev,
				subRole: 'select'
			}));
			setErrors(prev => ({
				...prev,
				subRole: ''
			}));
		}
	};

	// Translate the two dropdowns back into the `cabinet` / `position` fields
	// the rest of the app already reads.
	const deriveRole = () => {
		if (formData.involvement === 'eboard') {
			const selected = eboardPositions.find(pos => pos.value === formData.subRole);
			return { cabinet: selected.cabinet, position: selected.label };
		}

		if (formData.involvement === 'cabinet') {
			const selected = cabinets.find(cab => cab.value === formData.subRole);
			return { cabinet: selected.value, position: '' };
		}

		// MLP participants and general members are not cabinet, so they are
		// auto-approved. `involvement` still records which of the two they are.
		return { cabinet: 'none', position: '' };
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

		if (formData.graduationYear === 'select') {
			newErrors.graduationYear = "*Required: Select your graduation year";
		}

		if (formData.involvement === 'select') {
			newErrors.involvement = "*Required: Select your involvement in HSA";
		}

		if (currentSubRole && formData.subRole === 'select') {
			newErrors.subRole = currentSubRole.error;
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
			const { cabinet, position } = deriveRole();
			const approved = cabinet === "none";
			const email = formData.uflEmail.toLowerCase();

			await createUserWithEmailAndPassword(auth, email, formData.password);

			await setDoc(doc(db, "users", email), {
				firstName: formData.firstName.trim(),
				lastName: formData.lastName.trim(),
				graduationYear: formData.graduationYear,
				involvement: formData.involvement,
				cabinet: cabinet,
				position: position,
				approved: approved,
				// Never granted at sign up. An admin flips this in Firestore.
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

	return (
			<div>
				<Header />
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

						<p className='errorMsg'>{errors.graduationYear}</p>
						<label htmlFor="graduationYear">Expected Graduation Year: </label><br/>
						<select
							id="graduationYear"
							value={formData.graduationYear}
							onChange={(e) => handleInputChange('graduationYear', e.target.value)}
						>
							<option value="select">Select</option>
							{graduationYears.map(year => (
								<option key={year} value={year}>{year}</option>
							))}
							<option value="N/A">N/A</option>
						</select>

						<p className='errorMsg'>{errors.involvement}</p>
						<label htmlFor="involvement">Involvement in HSA Cabinet:</label> <br/>
						<select
							id="involvement"
							value={formData.involvement}
							onChange={(e) => handleInputChange('involvement', e.target.value)}
						>
							<option value="select">Select</option>
							<option value="eboard">E-Board</option>
							<option value="cabinet">Cabinet</option>
							<option value="mlp">MLP</option>
							<option value="general">General Member</option>
						</select>

						{currentSubRole && (
							<>
								<p className='errorMsg'>{errors.subRole}</p>
								<label htmlFor="subRole">{currentSubRole.label}:</label><br/>
								<select
									id="subRole"
									value={formData.subRole}
									onChange={(e) => handleInputChange('subRole', e.target.value)}
								>
									<option value="select">Select</option>
									{currentSubRole.options.map(option => (
										<option key={option.value} value={option.value}>{option.label}</option>
									))}
								</select>
							</>
						)}

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
			</div>
	);
}

export default SignUp;
