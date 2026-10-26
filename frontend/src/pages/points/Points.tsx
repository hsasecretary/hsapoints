import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Segments from '../../components/ui/Segments';

type Segment = 'requests' | 'leaderboard';

const SEGMENTS: [Segment, string][] = [['requests', 'Requests'], ['leaderboard', 'Leaderboard']];

// /points: the Points tab. Each segment is its own nested route
// (/points/requests, /points/leaderboard) so it survives a reload; /points
// opens on Requests. #114 adds a Requirements segment in front.
function Points() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const segment: Segment = pathname.startsWith('/points/leaderboard') ? 'leaderboard' : 'requests';

    return (
        <div className="points-page">
            <h1 className="points-page__title">Points</h1>
            <Segments label="Points" options={SEGMENTS} value={segment} onChange={(next) => navigate(`/points/${next}`)} />
            <Outlet />
        </div>
    );
}

export default Points;
