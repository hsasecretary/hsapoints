import CabinetPoints from "./CabinetPoints";
import Logout from './Logout';
import { useNavigate } from 'react-router-dom';

function Cabinet({ cabinet }) {
    let navigate = useNavigate();
    
    return (
        <div>
            <br/>
            <Logout/>
            {cabinet && <CabinetPoints />}
            {!cabinet && navigate("/dashboard")}
        </div>
    )
}

export default Cabinet;