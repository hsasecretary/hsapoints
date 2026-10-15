import PointTabs from '../dashboard/sections/PointTabs';

// /points/requests: Submit Point Request and the requests already sent. The
// Overview's "Make up event" buttons land here with ?makeup={CODE}; the old
// /requests redirects here with its query string.
function Requests() {
    return <PointTabs />;
}

export default Requests;
