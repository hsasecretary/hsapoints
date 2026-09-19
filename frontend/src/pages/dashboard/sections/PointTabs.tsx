import { useState } from 'react';
import PointRequestForm from './PointRequestForm';
import MyRequests from './MyRequests';

// Wraps the existing PointRequestForm with a new "My Requests" tab
// so members can check the status of what they've already submitted.
function PointTabs() {
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

    return (
        <div className="point-request-section">
            <div className="point-request-section__tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'submit'}
                    className={`tab-button${activeTab === 'submit' ? ' is-active' : ''}`}
                    onClick={() => setActiveTab('submit')}
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

            {activeTab === 'submit' ? <PointRequestForm /> : <MyRequests />}
        </div>
    );
}

export default PointTabs;