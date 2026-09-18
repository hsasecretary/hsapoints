import { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../../lib/firebase';

function PointRequest() {
    const [formData, setFormData] = useState({
        activityType: '',
        customActivityName: '',
        description: '',
        date: '',
        pointsRequested: ''
    });

    const [imageData, setImageData] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const activityTypes = [
        { value: 'gbm', label: 'GBM', defaultPoints: 2 },
        { value: 'tabling', label: 'Tabling', defaultPoints: 1 },
        { value: 'fundraiser', label: 'Fundraiser', defaultPoints: 2 },
        { value: 'open_mlp_event', label: 'Open MLP Event', defaultPoints: 1 },
        { value: 'affiliated_org_event', label: 'Affiliated Organization Event', defaultPoints: 1 },
        { value: 'committee_meeting', label: 'Committee Meeting', defaultPoints: 1 },
        { value: 'other', label: 'Other (specify)', defaultPoints: 1 }
    ];

    // Compresses photos client-side to ~100KB so the website stays fast and within Firestore's 1MB limit
    const compressImage = (file) => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress as JPEG at 75% quality
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    resolve(compressedDataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Auto-populate default points based on activity
        if (name === 'activityType') {
            const selectedActivity = activityTypes.find(activity => activity.value === value);

            if (selectedActivity) {
                setFormData(prev => ({
                    ...prev,
                    activityType: value,
                    pointsRequested: selectedActivity.defaultPoints.toString()
                }));
            }
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 20MB maximum file size check
        const MAX_SIZE_MB = 20;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setMessage({
                text: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose an image under ${MAX_SIZE_MB}MB.`,
                type: 'error'
            });
            e.target.value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            setMessage({
                text: 'Please upload a valid image file (PNG, JPG, JPEG, WEBP).',
                type: 'error'
            });
            e.target.value = '';
            return;
        }

        try {
            const compressed = await compressImage(file);
            setImageData(compressed);
            setImagePreview(compressed);
            setMessage({ text: '', type: '' });
        } catch (err) {
            console.error('Error processing image:', err);
            setMessage({
                text: 'Could not process the selected image. Please try a different photo.',
                type: 'error'
            });
        }
    };

    const handleClearImage = () => {
        setImageData('');
        setImagePreview('');
        const fileInput = document.getElementById('imageUpload') as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
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

            if (!formData.pointsRequested || Number(formData.pointsRequested) <= 0) {
                throw new Error('Please enter a valid number of points');
            }

            // Photo Evidence is required
            if (!imageData) {
                throw new Error('Please attach photo evidence to verify your attendance');
            }

            const user = auth.currentUser;
            if (!user) {
                throw new Error('You must be logged in to submit a request');
            }

            const requestData = {
                userEmail: user.email,
                activityType: formData.activityType,
                activityName:
                    formData.activityType === 'other'
                        ? formData.customActivityName
                        : activityTypes.find(a => a.value === formData.activityType)?.label,
                description: formData.description.trim(),
                date: formData.date,
                pointsRequested: parseInt(formData.pointsRequested),
                imageData: imageData, // Saved for PointRequestReview.js
                status: 'pending',
                submittedAt: serverTimestamp(),
                reviewedAt: null,
                reviewedBy: null,
                reviewNotes: ''
            };

            await addDoc(collection(db, 'pointRequests'), requestData);

            setMessage({
                text: 'Point request submitted successfully! You will be notified once it is reviewed.',
                type: 'success'
            });

            // Reset Form
            setFormData({
                activityType: '',
                customActivityName: '',
                description: '',
                date: '',
                pointsRequested: ''
            });
            handleClearImage();

        } catch (error) {
            console.error('Error submitting request:', error);
            setMessage({
                text: error.message,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="point-request">
            <h2>Submit Point Request</h2>

            <p className="description">
                Use this form to request points for activities like tabling, community service,
                or other qualifying activities.
            </p>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="request-form">

                <div className="form-group">
                    <label htmlFor="activityType">Activity Type</label>

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
                        <label htmlFor="customActivityName">Custom Activity Name</label>

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
                    <label htmlFor="description">Description</label>

                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Describe the activity, location, duration, and any other relevant details"
                        rows={4}
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="date">Date</label>

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
                        <label htmlFor="pointsRequested-1" id="pointsRequested-label">Points Requested</label>

                        {/* Requests are 1 or 2 points: two tap targets instead of a number box.
                            The value is still saved as a number (parseInt on submit). */}
                        <div className="points-choice" role="radiogroup" aria-labelledby="pointsRequested-label">
                            {['1', '2'].map((value) => (
                                <label
                                    key={value}
                                    className={`points-choice__option${formData.pointsRequested === value ? ' is-selected' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        id={`pointsRequested-${value}`}
                                        name="pointsRequested"
                                        value={value}
                                        checked={formData.pointsRequested === value}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    {value} {value === '1' ? 'point' : 'points'}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Photo Evidence Upload Section */}
                <div className="form-group">
                    <label htmlFor="imageUpload">Photo Evidence</label>

                    <input
                        type="file"
                        id="imageUpload"
                        name="imageUpload"
                        accept="image/*"
                        onChange={handleImageChange}
                        required
                    />
                    <span className="help-text">Max file size: 20MB (JPG, PNG, WEBP). Photo evidence is required for point verification.</span>

                    {imagePreview && (
                        <div className="image-preview">
                            <h4>Image Preview:</h4>
                            <div className="preview-container">
                                <img src={imagePreview} alt="Evidence preview" />
                                <button
                                    type="button"
                                    className="clear-image"
                                    onClick={handleClearImage}
                                    title="Remove image"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-actions">
                    <button
                        type="submit"
                        disabled={loading}
                        className="submit-button"
                    >
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>

            </form>

            <div className="info-section">
                <h3>Important Information</h3>

                <ul>
                    <li>Requests should accurately describe the activity completed</li>
                    <li>Photo evidence must clearly show your attendance or participation</li>
                    <li>E-board may contact you for clarification if needed</li>
                    <li>Requests are typically reviewed within 3–5 business days</li>
                </ul>
            </div>
        </div>
    );
}

export default PointRequest;