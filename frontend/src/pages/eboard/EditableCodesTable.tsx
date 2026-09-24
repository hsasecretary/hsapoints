import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import SectionTitle from '../../components/ui/SectionTitle';

type EditableCodesTableProps = {
    /** Bump to reload the list (e.g. after a code is created). */
    refreshKey?: number;
};

function EditableCodesTable({ refreshKey = 0 }: EditableCodesTableProps) {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCode, setEditingCode] = useState(null);
    const [editData, setEditData] = useState<Record<string, any>>({});
    // Phone layout: rows are collapsed to Code / Event / Points; tap to expand.
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
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
    }, [refreshKey]);

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

    const handleInputChange = (field, value) => {
        if (editingCode) {
            setEditData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    // Only the first load shows the loading message; Refresh keeps the list up.
    if (loading && codes.length === 0) {
        return (
            <div className="editable-codes-table">
                <div className="loading-message">Loading codes...</div>
            </div>
        );
    }

    return (
        <div className="editable-codes-table">
            {/* New codes are made with "Create New Event Code" above; this lists,
                edits and deletes them. */}
            <section className="codes-card">
                <SectionTitle>List of Codes</SectionTitle>

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
                <button type="button" onClick={fetchCodes} className="refresh-button codes-refresh" disabled={loading}>
                    {loading ? 'Refreshing...' : '🔄 Refresh'}
                </button>
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
                            <th>Points</th>
                            <th>Attendees</th>
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
                                        {/* Read-only: redemptions bump this, so it's never part of the save. */}
                                        <td className="cell-detail" data-label="Attendees">{code.attendeeCount ?? 0}</td>
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
                                        <td className="cell-points" data-label="Points">{code.points}</td>
                                        <td className="cell-detail" data-label="Attendees">{code.attendeeCount ?? 0}</td>
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
                        No event codes found. Create one with the form above.
                    </div>
                )}
                {codes.length > 0 && visibleCodes.length === 0 && (
                    <div className="no-codes">
                        No codes match your search.
                    </div>
                )}
            </div>

            </section>
        </div>
    );
}

export default EditableCodesTable;