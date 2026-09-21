import { useState } from 'react';
import SectionTitle from '../../components/ui/SectionTitle';
import PointsOverview from './sections/PointsOverview';
import EventCodeForm from './sections/EventCodeForm';
import LeaderboardSection from './sections/LeaderboardSection';
import PointTabs from './sections/PointTabs';

// /dashboard, top to bottom:
//   PointsOverview    — My Information, Points Summary,
//                        [EventCodeForm: "Have an Event Code?"],
//                        My Events Attended (EventsAttendedList), Points by Category
//   LeaderboardSection — Top Ranks + Your Standing among all members
//   PointTabs         — Submit Point Request / My Requests (tabbed)
function Dashboard({cabinet, email}) {
	const [pointsRefreshKey, setPointsRefreshKey] = useState(0);

	// Re-fetch points after an event code is accepted
	const handlePointsUpdate = () => {
		setPointsRefreshKey(prev => prev + 1);
	};

	return (
		<div className="formDash" >
			<div id="dash"><SectionTitle size="page">Dashboard</SectionTitle></div>
			<PointsOverview
				refreshKey={pointsRefreshKey}
				eventCodeForm={<EventCodeForm onPointsUpdate={handlePointsUpdate} />}
			/>
			<br/>
			<LeaderboardSection refreshKey={pointsRefreshKey} />
			<br/>
			<PointTabs />
			<br/>
		</div>
	);
}

export default Dashboard;