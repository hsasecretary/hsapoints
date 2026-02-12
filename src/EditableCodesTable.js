import { useState, useEffect } from 'react';
import './EditableCodesTable.css';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

function EditableCodesTable() {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCode, setEditingCode] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCode, setNewCode] = useState({
        id: '',
        event: '',
        category: '',
        graphicDate: '',
        eventDate: '',
        points: '',
        voterEligible: false,
        semester: 'springPoints',
        cabinetRequired: false
    });

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

    useEffect(() => {
        fetchCodes();
    }, []);

    const fetchCodes = async () => {
        try {
            setLoading(true);
            const codesCollection = collection(db, "codes");
            const codesSnapshot = await getDocs(codesCollection);
            const codesData = codesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            
            // Sort by event date (newest first)
            codesData.sort((a, b) => new Date(b.eventDate || 0) - new Date(a.eventDate || 0));
            setCodes(codesData);
        } catch (error) {
            console.error('Error fetching codes:', error);
            alert('Error loading codes. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (code) => {
        setEditingCode(code.id);
        setEditData({ ...code });
    };

    const handleCancelEdit = () => {
        setEditingCode(null);
        setEditData({});
    };

    const handleSaveEdit = async () => {
        try {
            const codeDocRef = doc(db, 'codes', editingCode);
            await updateDoc(codeDocRef, {
                event: editData.event,
                category: editData.category,
                graphicDate: editData.graphicDate,
                eventDate: editData.eventDate,
                points: parseInt(editData.points),
                voterEligible: editData.voterEligible,
                semester: editData.semester,
                cabinetRequired: editData.cabinetRequired || false
            });

            await fetchCodes();
            setEditingCode(null);
            setEditData({});
            alert('Code updated successfully!');
        } catch (error) {
            console.error('Error updating code:', error);
            alert('Error updating code. Please try again.');
        }
    };

    const handleDelete = async (codeId) => {
        const confirmed = window.confirm('Are you sure you want to delete this code? This action cannot be undone.');
        if (!confirmed) return;

        try {
            await deleteDoc(doc(db, 'codes', codeId));
            await fetchCodes();
            alert('Code deleted successfully!');
        } catch (error) {
            console.error('Error deleting code:', error);
            alert('Error deleting code. Please try again.');
        }
    };

    const handleAddNew = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!newCode.id.trim() || !newCode.event.trim() || !newCode.category || 
            !newCode.eventDate || !newCode.points) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            // Check if code ID already exists
            const existingCodes = codes.map(c => c.id.toLowerCase());
            if (existingCodes.includes(newCode.id.toLowerCase())) {
                alert('A code with this ID already exists. Please choose a different ID.');
                return;
            }

            await addDoc(collection(db, 'codes'), {
                ...newCode,
                points: parseInt(newCode.points),
                voterEligible: newCode.voterEligible,
                cabinetRequired: newCode.cabinetRequired
            });

            // Reset form
            setNewCode({
                id: '',
                event: '',
                category: '',
                graphicDate: '',
                eventDate: '',
                points: '',
                voterEligible: false,
                semester: 'springPoints',
                cabinetRequired: false
            });
            setShowAddForm(false);
            await fetchCodes();
            alert('New code added successfully!');
        } catch (error) {
            console.error('Error adding code:', error);
            alert('Error adding code. Please try again.');
        }
    };

    const handleInputChange = (field, value) => {
        if (editingCode) {
            setEditData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleNewCodeChange = (field, value) => {
        setNewCode(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (loading) {
        return (
            <div className="editable-codes-table">
                <div className="loading-message">Loading codes...</div>
            </div>
        );
    }

    return (
        <div className="editable-codes-table">
            <div className="table-header">
                <h2>Manage Event Codes</h2>
                <div className="table-actions">
                    <button 
                        onClick={fetchCodes} 
                        className="refresh-button"
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                    <button 
                        onClick={() => setShowAddForm(!showAddForm)} 
                        className="add-button"
                    >
                        {showAddForm ? '✗ Cancel' : '+ Add New Code'}
                    </button>
                </div>
            </div>

            {/* Add New Code Form */}
            {showAddForm && (
                <div className="add-form">
                    <h3>Add New Event Code</h3>
                    <form onSubmit={handleAddNew} className="new-code-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Code ID *</label>
                                <input
                                    type="text"
                                    value={newCode.id}
                                    onChange={(e) => handleNewCodeChange('id', e.target.value)}
                                    placeholder="e.g., GBM1, PROG5"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Event Name *</label>
                                <input
                                    type="text"
                                    value={newCode.event}
                                    onChange={(e) => handleNewCodeChange('event', e.target.value)}
                                    placeholder="Event name"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category *</label>
                                <select
                                    value={newCode.category}
                                    onChange={(e) => handleNewCodeChange('category', e.target.value)}
                                    required
                                >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Points *</label>
                                <input
                                    type="number"
                                    value={newCode.points}
                                    onChange={(e) => handleNewCodeChange('points', e.target.value)}
                                    min="0"
                                    max="10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Event Date *</label>
                                <input
                                    type="date"
                                    value={newCode.eventDate}
                                    onChange={(e) => handleNewCodeChange('eventDate', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Graphic Date</label>
                                <input
                                    type="text"
                                    value={newCode.graphicDate}
                                    onChange={(e) => handleNewCodeChange('graphicDate', e.target.value)}
                                    placeholder="Date for graphics"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Semester</label>
                                <select
                                    value={newCode.semester}
                                    onChange={(e) => handleNewCodeChange('semester', e.target.value)}
                                >
                                    <option value="fallPoints">Fall</option>
                                    <option value="springPoints">Spring</option>
                                </select>
                            </div>
                            <div className="form-group checkboxes">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={newCode.voterEligible}
                                        onChange={(e) => handleNewCodeChange('voterEligible', e.target.checked)}
                                    />
                                    Voter Eligible
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={newCode.cabinetRequired}
                                        onChange={(e) => handleNewCodeChange('cabinetRequired', e.target.checked)}
                                    />
                                    Cabinet Required
                                </label>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="save-button">Add Code</button>
                            <button type="button" onClick={() => setShowAddForm(false)} className="cancel-button">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Codes Table */}
            <div className="table-container">
                <table className="codes-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Event</th>
                            <th>Category</th>
                            <th>Event Date</th>
                            <th>Graphic Date</th>
                            <th>Points</th>
                            <th>Semester</th>
                            <th>Voter Eligible</th>
                            <th>Cabinet Required</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {codes.map((code, index) => (
                            <tr key={code.id} className={index % 2 === 0 ? 'even' : 'odd'}>
                                {editingCode === code.id ? (
                                    // Edit mode
                                    <>
                                        <td className="code-id">{code.id}</td>
                                        <td>
                                            <input
                                                type="text"
                                                value={editData.event || ''}
                                                onChange={(e) => handleInputChange('event', e.target.value)}
                                                className="edit-input"
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={editData.category || ''}
                                                onChange={(e) => handleInputChange('category', e.target.value)}
                                                className="edit-select"
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="date"
                                                value={editData.eventDate || ''}
                                                onChange={(e) => handleInputChange('eventDate', e.target.value)}
                                                className="edit-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={editData.graphicDate || ''}
                                                onChange={(e) => handleInputChange('graphicDate', e.target.value)}
                                                className="edit-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={editData.points || ''}
                                                onChange={(e) => handleInputChange('points', e.target.value)}
                                                className="edit-input points-input"
                                                min="0"
                                                max="10"
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={editData.semester || ''}
                                                onChange={(e) => handleInputChange('semester', e.target.value)}
                                                className="edit-select"
                                            >
                                                <option value="fallPoints">Fall</option>
                                                <option value="springPoints">Spring</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={editData.voterEligible || false}
                                                onChange={(e) => handleInputChange('voterEligible', e.target.checked)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={editData.cabinetRequired || false}
                                                onChange={(e) => handleInputChange('cabinetRequired', e.target.checked)}
                                            />
                                        </td>
                                        <td className="actions-cell">
                                            <button onClick={handleSaveEdit} className="save-btn">✓</button>
                                            <button onClick={handleCancelEdit} className="cancel-btn">✗</button>
                                        </td>
                                    </>
                                ) : (
                                    // View mode
                                    <>
                                        <td className="code-id">{code.id.toUpperCase()}</td>
                                        <td>{code.event}</td>
                                        <td>{code.category}</td>
                                        <td>{code.eventDate}</td>
                                        <td>{code.graphicDate}</td>
                                        <td>{code.points}</td>
                                        <td>{code.semester === 'fallPoints' ? 'Fall' : 'Spring'}</td>
                                        <td>
                                            <span className={`badge ${code.voterEligible ? 'badge-yes' : 'badge-no'}`}>
                                                {code.voterEligible ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${code.cabinetRequired ? 'badge-yes' : 'badge-no'}`}>
                                                {code.cabinetRequired ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button onClick={() => handleEdit(code)} className="edit-btn">✏️</button>
                                            <button 
                                                onClick={() => handleDelete(code.id)} 
                                                className="delete-btn"
                                                title="Delete code"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {codes.length === 0 && (
                    <div className="no-codes">
                        No event codes found. Click "Add New Code" to create one.
                    </div>
                )}
            </div>
        </div>
    );
}

export default EditableCodesTable;