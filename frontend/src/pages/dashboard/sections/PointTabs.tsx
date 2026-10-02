import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PointRequestForm from './PointRequestForm';
import MyRequests from './MyRequests';

// Wraps the existing PointRequestForm with a new "My Requests" tab
// so members can check the status of what they've already submitted.
function PointTabs() {
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
    const [params, setParams] = useSearchParams();

    // Submit Request always lands on the form, even from the Strikes view
    // (?view=strikes), which sits under the same tab.
    const openSubmit = () => {
        setActiveTab('submit');
        if (params.has('view')) {
            const updated = new URLSearchParams(params);
            updated.delete('view');
            setParams(updated);
        }
    };

    return (
        <div className="point-request-section">
            <div className="point-request-section__tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'submit'}
                    className={`tab-button${activeTab === 'submit' ? ' is-active' : ''}`}
                    onClick={openSubmit}
                >
                    Submit Request
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    className={`tab-button${activeTab === 'history' ? ' is-active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    My Requests
                </button>
            </div>

            {/* key: React replaces the panel on every tab click, so the
                animation in animations.css replays and the card fades in */}
            <div className="point-request-section__panel hsa-reveal" key={activeTab}>
                {activeTab === 'submit' ? <PointRequestForm /> : <MyRequests />}
            </div>
        </div>
    );
}

export default PointTabs;