import { useState } from 'react';
import './CreateCode.css';
import { db } from './firebase';
import { addDoc, collection, getDocs } from 'firebase/firestore';

function CreateCode() {
    const [formData, setFormData] = useState({
        eventName: '',
        eventCode: '',
        category: '',
        eventDate: '',
        graphicDate: '',
        points: '',
        semester: 'springPoints',
        voterEligible: true,  // Changed to true by default
        cabinetRequired: false,
        noGraphic: false
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const categories = [
        'GBM',
        'Programming',
        'OPA',
        'MLP Fall',
        'MLP Spring',
        'Cabinet',
        'Other',
        'Tabling',
        'Affiliate Org GBM',
        'Affiliate Org Event'
    ];

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const calculateVoterEligibility = (data) => {
        // Not eligible if no graphic or cabinet only
        if (data.noGraphic || data.category === 'Cabinet') {
            return false;
        }

        // Must have both dates and be in eligible categories
        if (!data.graphicDate || !data.eventDate) {
            return false;
        }

        const eligibleCategories = ['GBM', 'Programming', 'MLP Fall', 'MLP Spring', 'OPA'];
        if (!eligibleCategories.includes(data.category)) {
            return false;
        }

        // Calculate days between graphic and event
        const graphicDate = new Date(data.graphicDate);
        const eventDate = new Date(data.eventDate);
        const diffDays = Math.ceil((eventDate - graphicDate) / (1000 * 60 * 60 * 24));

        // Must be at least 7 days advance notice
        return diffDays >= 7;
    };

    const validateForm = async () => {
        const errors = [];

        // Required field validation
        if (!formData.eventName.trim()) {
            errors.push('Event name is required');
        }
        if (!formData.eventCode.trim()) {
            errors.push('Event code is required');
        }
        if (!formData.category) {
            errors.push('Category is required');
        }
        if (!formData.eventDate) {
            errors.push('Event date is required');
        }
        if (!formData.points || formData.points < 0) {
            errors.push('Valid points value is required');
        }

        // Graphic date validation
        if (!formData.noGraphic && !formData.graphicDate) {
            errors.push('Graphic date is required (or check "No Graphic")');
        }
        if (formData.noGraphic && formData.graphicDate) {
            errors.push('Cannot have both graphic date and "No Graphic" selected');
        }

        // Date logic validation
        if (formData.graphicDate && formData.eventDate) {
            const graphicDate = new Date(formData.graphicDate);
            const eventDate = new Date(formData.eventDate);
            if (graphicDate > eventDate) {
                errors.push('Graphic date cannot be after event date');
            }
        }

        // Cabinet-only validation
        if (formData.category === 'Cabinet' && !formData.cabinetRequired) {
            errors.push('Cabinet events must be marked as "Cabinet Required"');
        }

        // Check for duplicate code
        try {
            const codesCollection = collection(db, 'codes');
            const codesSnapshot = await getDocs(codesCollection);
            const existingCodes = codesSnapshot.docs.map(doc => doc.id.toLowerCase());
            
            if (existingCodes.includes(formData.eventCode.toLowerCase().trim())) {
                errors.push('Event code already exists');
            }
        } catch (error) {
            console.error('Error checking duplicate codes:', error);
            errors.push('Error validating event code');
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const errors = await validateForm();
            if (errors.length > 0) {
                setMessage({ text: errors.join(', '), type: 'error' });
                setLoading(false);
                return;
            }

            // Prepare code data
            const codeData = {
                event: formData.eventName.trim(),
                category: formData.category,
                eventDate: formData.eventDate,
                graphicDate: formData.noGraphic ? 'None' : formData.graphicDate,
                points: parseInt(formData.points),
                semester: formData.semester,
                voterEligible: formData.voterEligible,
                cabinetRequired: formData.cabinetRequired,
                cabinetOnly: formData.category === 'Cabinet'
            };

            // Create the code in Firebase
            await addDoc(collection(db, 'codes'), codeData);

            // Reset form and show success
            setFormData({
                eventName: '',
                eventCode: '',
                category: '',
                eventDate: '',
                graphicDate: '',
                points: '',
                semester: 'springPoints',
                voterEligible: true,  // Changed to true by default
                cabinetRequired: false,
                noGraphic: false
            });

            setMessage({ 
                text: `Event code "${formData.eventCode.toUpperCase()}" created successfully!`, 
                type: 'success' 
            });

        } catch (error) {
            console.error('Error creating code:', error);
            setMessage({ text: 'Error creating event code. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-code-container">
            <div className="create-code-header">
                <h2>Create New Event Code</h2>
                <p>Create a new event code for members to check in and earn points</p>
            </div>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="create-code-form">
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="eventName">Event Name *</label>
                        <input
                            type="text"
                            id="eventName"
                            value={formData.eventName}
                            onChange={(e) => handleInputChange('eventName', e.target.value)}
                            placeholder="e.g., GBM 1, Programming Workshop"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventCode">Event Code *</label>
                        <input
                            type="text"
                            id="eventCode"
                            value={formData.eventCode}
                            onChange={(e) => handleInputChange('eventCode', e.target.value)}
                            placeholder="e.g., GBM1, PROG5"
                            required
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="category">Category *</label>
                        <select
                            id="category"
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            required
                        >
                            <option value="">Select category</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="points">Points *</label>
                        <input
                            type="number"
                            id="points"
                            value={formData.points}
                            onChange={(e) => handleInputChange('points', e.target.value)}
                            min="0"
                            max="10"
                            required
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="eventDate">Event Date *</label>
                        <input
                            type="date"
                            id="eventDate"
                            value={formData.eventDate}
                            onChange={(e) => handleInputChange('eventDate', e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="semester">Semester</label>
                        <select
                            id="semester"
                            value={formData.semester}
                            onChange={(e) => handleInputChange('semester', e.target.value)}
                        >
                            <option value="fallPoints">Fall</option>
                            <option value="springPoints">Spring</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="graphicDate">Graphic Posted Date</label>
                        <input
                            type="date"
                            id="graphicDate"
                            value={formData.graphicDate}
                            onChange={(e) => handleInputChange('graphicDate', e.target.value)}
                            disabled={formData.noGraphic}
                        />
                    </div>
                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.noGraphic}
                                onChange={(e) => handleInputChange('noGraphic', e.target.checked)}
                            />
                            No graphic will be posted
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.cabinetRequired}
                                onChange={(e) => handleInputChange('cabinetRequired', e.target.checked)}
                            />
                            Cabinet required to attend
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.voterEligible}
                                onChange={(e) => handleInputChange('voterEligible', e.target.checked)}
                            />
                            Voter Eligible to Vote
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading} className="submit-button">
                        {loading ? 'Creating...' : 'Create Event Code'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateCode;