import { Link } from 'react-router-dom';

/** Opens Points → Requests already set to make up the Missed Event `codeId`. */
function MakeUpButton({ codeId, name }: { codeId: string; name: string }) {
    return (
        <Link className="rq-makeup" to={`/points/requests?makeup=${encodeURIComponent(codeId)}`} aria-label={`Make up ${name}`}>
            Make up event
        </Link>
    );
}

export default MakeUpButton;
