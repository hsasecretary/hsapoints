import { Navigate, Outlet } from 'react-router-dom';

// Frame for every /eboard/* page: e-board members only. The tool itself
// (event codes, point requests, ...) renders in <Outlet />; the pages are
// listed in eboardTools.ts.
function Eboard({ eboard }) {
  if (!eboard) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default Eboard;
