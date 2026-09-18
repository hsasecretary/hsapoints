import CabinetPoints from "./CabinetPoints";
import { Navigate } from 'react-router-dom';

function Cabinet({ cabinet }) {
    return (
        <div>
            {cabinet && <CabinetPoints />}
            {!cabinet && <Navigate to="/dashboard" replace />}
        </div>
    )
}

export default Cabinet;