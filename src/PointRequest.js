import { useState } from 'react';
import './PointRequest.css';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from './firebase';

function PointRequest() {
    const [formData, setFormData] = useState({
        activityType: '',
        customActivityName: '',
        description: '',
        date: '',
        pointsRequested: '',
        image: null
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [imagePreview, setImagePreview] = useState(null);

    const activityTypes = [
        { value: 'tabling', label: 'Tabling', defaultPoints: 1 },
        { value: 'fundraiser', label: 'Fundraiser', defaultPoints: 1 },
        { value: 'open_mlp_event', label: 'Open MLP Event', defaultPoints: 1 },
        { value: 'affiliated_org_event', label: 'Affiliated Organization Event', defaultPoints: 1 },
        { value: 'committee_meeting', label: 'Committee Meeting', defaultPoints: 1 },
        { value: 'other', label: 'Other (specify)', defaultPoints: 1 }
    ];


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Auto-populate points based on activity type
        if (name === 'activityType') {
            const selectedActivity = activityTypes.find(activity => activity.value === value);
            if (selectedActivity) {
                setFormData(prev => ({
                    ...prev,
                    pointsRequested: selectedActivity.defaultPoints.toString()
                }));
            }
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                setMessage({ text: 'Please upload a valid image file (JPG, PNG, or GIF)', type: 'error' });
                return;
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxSize) {
                setMessage({ text: 'Image size must be less than 5MB', type: 'error' });
                return;
            }

            setFormData(prev => ({
                ...prev,
                image: file
            }));

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const convertImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            // Validation
            if (!formData.activityType) {
                throw new Error('Please select an activity type');
            }
            if (formData.activityType === 'other' && !formData.customActivityName.trim()) {
                throw new Error('Please specify the custom activity name');
            }
            if (!formData.description.trim()) {
                throw new Error('Please provide a description');
            }
            if (!formData.date) {
                throw new Error('Please select a date');
            }
            if (!formData.pointsRequested || formData.pointsRequested <= 0) {
                throw new Error('Please enter a valid number of points');
            }
            if (!formData.image) {
                throw new Error('Please upload an image as proof');
            }

            const user = auth.currentUser;
            if (!user) {
                throw new Error('You must be logged in to submit a request');
            }

            // Convert image to base64
            const imageBase64 = await convertImageToBase64(formData.image);

            // Prepare request data
            const requestData = {
                userEmail: user.email,
                activityType: formData.activityType,
                activityName: formData.activityType === 'other' ? formData.customActivityName : 
                             activityTypes.find(a => a.value === formData.activityType)?.label,
                description: formData.description.trim(),
                date: formData.date,
                pointsRequested: parseInt(formData.pointsRequested),
                imageData: imageBase64,
                imageFileName: formData.image.name,
                imageSize: formData.image.size,
                status: 'pending',
                submittedAt: serverTimestamp(),
                reviewedAt: null,
                reviewedBy: null,
                reviewNotes: ''
            };

            // Submit to Firestore
            await addDoc(collection(db, 'pointRequests'), requestData);

            setMessage({ text: 'Point request submitted successfully! You will be notified once it is reviewed.', type: 'success' });
            
            // Reset form
            setFormData({
                activityType: '',
                customActivityName: '',
                description: '',
                date: '',
                pointsRequested: '',
                image: null
            });
            setImagePreview(null);

        } catch (error) {
            console.error('Error submitting request:', error);
            setMessage({ text: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const clearImage = () => {
        setFormData(prev => ({ ...prev, image: null }));
        setImagePreview(null);
        // Clear the file input
        const fileInput = document.getElementById('imageUpload');
        if (fileInput) fileInput.value = '';
    };

    return (
        <div className="point-request">
            <h2>Submit Point Request</h2>
            <p className="description">
                Use this form to request points for activities like tabling, community service, 
                or other qualifying activities that require photo verification.
            </p>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="request-form">
                <div className="form-group">
                    <label htmlFor="activityType">Activity Type *</label>
                    <select
                        id="activityType"
                        name="activityType"
                        value={formData.activityType}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="">Select an activity type</option>
                        {activityTypes.map(activity => (
                            <option key={activity.value} value={activity.value}>
                                {activity.label} ({activity.defaultPoints} point{activity.defaultPoints !== 1 ? 's' : ''})
                            </option>
                        ))}
                    </select>
                </div>

                {formData.activityType === 'other' && (
                    <div className="form-group">
                        <label htmlFor="customActivityName">Custom Activity Name *</label>
                        <input
                            type="text"
                            id="customActivityName"
                            name="customActivityName"
                            value={formData.customActivityName}
                            onChange={handleInputChange}
                            placeholder="Specify the activity"
                            required
                        />
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="description">Description *</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Describe the activity, location, duration, and any other relevant details"
                        rows="4"
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="date">Date *</label>
                        <input
                            type="date"
                            id="date"
                            name="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            max={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="pointsRequested">Points Requested *</label>
                        <input
                            type="number"
                            id="pointsRequested"
                            name="pointsRequested"
                            value={formData.pointsRequested}
                            onChange={handleInputChange}
                            min="1"
                            max="10"
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="imageUpload">Photo Evidence * (Max 5MB)</label>
                    <input
                        type="file"
                        id="imageUpload"
                        accept="image/*"
                        onChange={handleImageChange}
                        required
                    />
                    <p className="help-text">
                        Upload a clear photo showing you at the activity/location as proof of participation
                    </p>
                </div>

                {imagePreview && (
                    <div className="image-preview">
                        <h4>Image Preview:</h4>
                        <div className="preview-container">
                            <img src={imagePreview} alt="Preview" />
                            <button type="button" onClick={clearImage} className="clear-image">
                                Remove Image
                            </button>
                        </div>
                    </div>
                )}

                <div className="form-actions">
                    <button type="submit" disabled={loading} className="submit-button">
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form>

            <div className="info-section">
                <h3>Important Information</h3>
                <ul>
                    <li>All requests must include photo evidence</li>
                    <li>Photos should clearly show your participation in the activity</li>
                    <li>Requests will be reviewed by E-board members within 3-5 business days</li>
                    <li>You will be notified via email once your request is processed</li>
                    <li>Points will only be awarded for activities that align with HSA values and goals</li>
                </ul>
            </div>
        </div>
    );
}

export default PointRequest;