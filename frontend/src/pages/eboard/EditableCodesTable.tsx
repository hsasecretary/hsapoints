import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

function EditableCodesTable() {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCode, setEditingCode] = useState(null);
    const [editData, setEditData] = useState<Record<string, any>>({});
    const [showAddForm, setShowAddForm] = useState(false);
    // Phone layout: rows are collapsed to Code / Event / Points; tap to expand.
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [newCode, setNewCode] = useState({
        id: '',
        event: '',
        category: '',
        graphicDate: '',
        eventDate: '',
        points: '',
        voterEligible: true,  // Changed from false to true to default to voter eligible
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

    const searchTerm = search.trim().toLowerCase();
    const visibleCodes = codes.filter((code) =>
        (!categoryFilter || code.category === categoryFilter) &&
        (!searchTerm ||
            code.id.toLowerCase().includes(searchTerm) ||
            (code.event || '').toLowerCase().includes(searchTerm))
    );

    const toggleExpanded = (codeId) => {
        setExpandedId((prev) => (prev === codeId ? null : codeId));
    };

    // Tapping anywhere on a collapsed row expands it — except on its buttons
    // and inputs, which keep their own behaviour.
    const handleRowClick = (e, codeId) => {
        if (editingCode === codeId) return;
        if ((e.target as HTMLElement).closest('button, input, select, a')) return;
        toggleExpanded(codeId);
    };

    const fetchCodes = async () => {
        try {
            setLoading(true);
            const codesCollection = collection(db, "codes");
            const codesSnapshot = await getDocs(codesCollection);
            const codesData = codesSnapshot.docs.map((doc): Record<string, any> => ({
                id: doc.id,
                ...doc.data(),
            }));
            
            // Sort by event date (newest first)
            codesData.sort((a, b) => new Date(b.eventDate || 0).getTime() - new Date(a.eventDate || 0).getTime());
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
                voterEligible: true,  // Changed to true to match the default
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
                                    Voter Eligible to Vote
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={newCode.cabinetRequired}
                                        onChange={(e) => handleNewCodeChange('cabinetRequired', e.target.checked)}
                                    />
                                    Cabinet Required to Attend
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

            {/* Search / filter */}
            <div className="codes-filters">
                <input
                    type="search"
                    className="codes-search"
                    placeholder="Search code or event..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search codes by code or event name"
                />
                <select
                    className="codes-category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by category"
                >
                    <option value="">All categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <p className="codes-count">
                    Showing {visibleCodes.length} of {codes.length} codes
                </p>
            </div>

            {/* Codes Table (collapses to expandable rows on phones) */}
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
                            <th className="cell-toggle" aria-hidden="true"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleCodes.map((code, index) => {
                            const isEditing = editingCode === code.id;
                            const isExpanded = isEditing || expandedId === code.id;
                            const rowClass = [
                                index % 2 === 0 ? 'even' : 'odd',
                                isExpanded ? 'expanded' : '',
                                isEditing ? 'editing' : '',
                            ].filter(Boolean).join(' ');

                            return (
                            <tr
                                key={code.id}
                                className={rowClass}
                                onClick={(e) => handleRowClick(e, code.id)}
                            >
                                {isEditing ? (
                                    // Edit mode
                                    <>
                                        <td className="code-id" data-label="Code">{code.id}</td>
                                        <td className="cell-event" data-label="Event">
                                            <input
                                                type="text"
                                                value={editData.event || ''}
                                                onChange={(e) => handleInputChange('event', e.target.value)}
                                                className="edit-input"
                                            />
                                        </td>
                                        <td className="cell-detail" data-label="Category">
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
                                        <td className="cell-detail" data-label="Event Date">
                                            <input
                                                type="date"
                                                value={editData.eventDate || ''}
                                                onChange={(e) => handleInputChange('eventDate', e.target.value)}
                                                className="edit-input"
                                            />
                                        </td>
                                        <td className="cell-detail" data-label="Graphic Date">
                                            <input
                                                type="text"
                                                value={editData.graphicDate || ''}
                                                onChange={(e) => handleInputChange('graphicDate', e.target.value)}
                                                className="edit-input"
                                            />
                                        </td>
                                        <td className="cell-points" data-label="Points">
                                            <input
                                                type="number"
                                                value={editData.points || ''}
                                                onChange={(e) => handleInputChange('points', e.target.value)}
                                                className="edit-input points-input"
                                                min="0"
                                                max="10"
                                            />
                                        </td>
                                        <td className="cell-detail" data-label="Semester">
                                            <select
                                                value={editData.semester || ''}
                                                onChange={(e) => handleInputChange('semester', e.target.value)}
                                                className="edit-select"
                                            >
                                                <option value="fallPoints">Fall</option>
                                                <option value="springPoints">Spring</option>
                                            </select>
                                        </td>
                                        <td className="cell-detail" data-label="Voter Eligible">
                                            <input
                                                type="checkbox"
                                                checked={editData.voterEligible || false}
                                                onChange={(e) => handleInputChange('voterEligible', e.target.checked)}
                                            />
                                        </td>
                                        <td className="cell-detail" data-label="Cabinet Required">
                                            <input
                                                type="checkbox"
                                                checked={editData.cabinetRequired || false}
                                                onChange={(e) => handleInputChange('cabinetRequired', e.target.checked)}
                                            />
                                        </td>
                                        <td className="actions-cell cell-detail">
                                            <button onClick={handleSaveEdit} className="save-btn">✓<span className="btn-label"> Save</span></button>
                                            <button onClick={handleCancelEdit} className="cancel-btn">✗<span className="btn-label"> Cancel</span></button>
                                        </td>
                                        <td className="cell-toggle"></td>
                                    </>
                                ) : (
                                    // View mode
                                    <>
                                        <td className="code-id" data-label="Code">{code.id.toUpperCase()}</td>
                                        <td className="cell-event" data-label="Event">{code.event}</td>
                                        <td className="cell-detail" data-label="Category">{code.category}</td>
                                        <td className="cell-detail" data-label="Event Date">{code.eventDate}</td>
                                        <td className="cell-detail" data-label="Graphic Date">{code.graphicDate}</td>
                                        <td className="cell-points" data-label="Points">{code.points}</td>
                                        <td className="cell-detail" data-label="Semester">{code.semester === 'fallPoints' ? 'Fall' : 'Spring'}</td>
                                        <td className="cell-detail" data-label="Voter Eligible">
                                            <span className={`badge ${code.voterEligible ? 'badge-yes' : 'badge-no'}`}>
                                                {code.voterEligible ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="cell-detail" data-label="Cabinet Required">
                                            <span className={`badge ${code.cabinetRequired ? 'badge-yes' : 'badge-no'}`}>
                                                {code.cabinetRequired ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="actions-cell cell-detail">
                                            <button onClick={() => handleEdit(code)} className="edit-btn">✏️<span className="btn-label"> Edit</span></button>
                                            <button
                                                onClick={() => handleDelete(code.id)}
                                                className="delete-btn"
                                                title="Delete code"
                                            >
                                                🗑️<span className="btn-label"> Delete</span>
                                            </button>
                                        </td>
                                        <td className="cell-toggle">
                                            <button
                                                type="button"
                                                className="toggle-btn"
                                                onClick={() => toggleExpanded(code.id)}
                                                aria-expanded={isExpanded}
                                                aria-label={`${isExpanded ? 'Hide' : 'Show'} details for ${code.id.toUpperCase()}`}
                                            >
                                                ›
                                            </button>
                                        </td>
                                    </>
                                )}
                            </tr>
                            );
                        })}
                    </tbody>
                </table>

                {codes.length === 0 && (
                    <div className="no-codes">
                        No event codes found. Click "Add New Code" to create one.
                    </div>
                )}
                {codes.length > 0 && visibleCodes.length === 0 && (
                    <div className="no-codes">
                        No codes match your search.
                    </div>
                )}
            </div>
        </div>
    );
}

export default EditableCodesTable;