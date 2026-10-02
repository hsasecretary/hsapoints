import PointTabs from '../dashboard/sections/PointTabs';

// /requests: Submit Point Request and the requests already sent. The
// Overview's "Make up event" buttons land here with ?makeup={CODE}.
function Requests() {
    return (
        <div className="requests-page">
            <h1 className="requests-page__title">Requests</h1>
            <PointTabs />
        </div>
    );
}

export default Requests;
