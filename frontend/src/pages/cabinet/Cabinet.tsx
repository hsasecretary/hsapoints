import CabinetPoints from "./CabinetPoints";
import Logout from '../../components/layout/Logout';
import { Navigate } from 'react-router-dom';

function Cabinet({ cabinet }) {
    return (
        <div>
            <br/>
            <Logout/>
            {cabinet && <CabinetPoints />}
            {!cabinet && <Navigate to="/dashboard" replace />}
        </div>
    )
}

export default Cabinet;