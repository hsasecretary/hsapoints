import { Link } from 'react-router-dom';

/** Opens Requests already set to make up the Missed Event `codeId`. */
function MakeUpButton({ codeId }: { codeId: string }) {
    return <Link className="rq-makeup" to={`/requests?makeup=${encodeURIComponent(codeId)}`}>Make up event</Link>;
}

export default MakeUpButton;
