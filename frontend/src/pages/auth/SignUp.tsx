import React, { useState } from "react";
import { db, auth } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, arrayUnion, updateDoc } from "firebase/firestore";
import { useNavigate, Link } from 'react-router-dom';
import { cabinets, eboardPositions } from '../../lib/roles';


const graduationYears = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() + i));

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
    const navigate = useNavigate();
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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const currentSubRole = subRoleConfig[formData.involvement] || null;

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }

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

    const deriveRole = () => {
        if (formData.involvement === 'eboard') {
            const selected = eboardPositions.find(pos => pos.value === formData.subRole);
            return { cabinet: selected.cabinet, position: selected.label };
        }

        if (formData.involvement === 'cabinet') {
            const selected = cabinets.find(cab => cab.value === formData.subRole);
            return { cabinet: selected.value, position: '' };
        }

        return { cabinet: 'none', position: '' };
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

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
            const email = formData.uflEmail.toLowerCase().trim();

  await createUserWithEmailAndPassword(auth, email, formData.password);

// 1. Create user document in Firestore
            await setDoc(doc(db, "users", email), {
                email: email,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                graduationYear: formData.graduationYear,
                involvement: formData.involvement,
                cabinet: cabinet,
                position: position,
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

            // 2. Wrap cabinet update in its own try/catch
            try {
                const collectionName = approved ? "regular" : "pending";
                const cabinetDocRef = doc(db, "cabinets", collectionName);
                await updateDoc(cabinetDocRef, {
                    "emails": arrayUnion(email)
                });
            } catch (cabinetError) {
                console.warn('Could not update cabinet collection:', cabinetError);
            }

            // 3. Redirect directly to the Dashboard
            navigate('/dashboard', { replace: true });

        } catch (error) {
            console.error('Error signing up:', error);
            if (error.code === 'auth/email-already-in-use') {
                setErrors({ general: 'An account with this email already exists.' });
            } else {
                setErrors({ general: 'Error creating account. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="form">
                <h2>Sign Up</h2>
                <form onSubmit={handleSubmit}>
                    {errors.general && <p className='errorMsg'>{errors.general}</p>}

                    <label htmlFor='firstName'>First Name/Nombre:</label>
                    <p className='errorMsg'>{errors.firstName}</p>
                    <input
                        type="text"
                        id='firstName'
                        placeholder='Albert'
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />

                    <label htmlFor="lastName">Last Name/Apellido:</label>
                    <p className='errorMsg'>{errors.lastName}</p>
                    <input
                        type="text"
                        id="lastName"
                        placeholder='Gator'
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />

                    <label htmlFor="uflEmail">UFL/SF Email:</label>
                    <p className='errorMsg'>{errors.uflEmail}</p>
                    <input
                        type="email"
                        id="uflEmail"
                        placeholder='albert@ufl.edu'
                        value={formData.uflEmail}
                        onChange={(e) => handleInputChange('uflEmail', e.target.value)}
                    />

                    <label htmlFor="graduationYear">Expected Graduation Year:</label>
                    <p className='errorMsg'>{errors.graduationYear}</p>
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

                    <label htmlFor="involvement">Involvement in HSA Cabinet:</label>
                    <p className='errorMsg'>{errors.involvement}</p>
                    <select
                        id="involvement"
                        value={formData.involvement}
                        onChange={(e) => handleInputChange('involvement', e.target.value)}
                    >
                        <option value="select">Select</option>
                        <option value="general">General member</option>
                        <option value="mlp">MLP general member</option>
                        <option value="eboard">E-Board</option>
                        <option value="cabinet">Cabinet</option>
                    </select>

                    {currentSubRole && (
                        <>
                            <label htmlFor="subRole">{currentSubRole.label}:</label>
                            <p className='errorMsg'>{errors.subRole}</p>
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

                    <label htmlFor="password">Password:</label>
                    <p className='errorMsg'>{errors.password}</p>
                    <input
                        type="password"
                        id="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                    />

                    <label htmlFor="confirmPassword">Confirm Password:</label>
                    <p className='errorMsg'>{errors.confirmPassword}</p>
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
                <div className="center">
                    <Link to="/login" className="signup-link">Already have an account? Log In</Link>
                </div>
            </div>
        </div>
    );
}

export default SignUp;