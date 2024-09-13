import CabinetPoints from "./CabinetPoints";
import Logout from './Logout';
import { useNavigate } from 'react-router-dom';

function Cabinet({ cabinet }) {
    let navigate = useNavigate();
    function isCabinet(cabinet) {
        if (cabinet) {
          console.log('cabinet true');
          return true;
        } else {
          navigate("/dashboard");
        }
      }
    return (
        <div>
            <br/>
            <Logout/>
            {isCabinet(cabinet) && <CabinetPoints />}
        </div>
    )
}

export default Cabinet;