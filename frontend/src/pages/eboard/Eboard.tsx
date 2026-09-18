import { Link, Navigate, Outlet } from 'react-router-dom';

// Frame for every /eboard/* page: e-board-only, plus shortcuts at the top.
// The tool itself (event codes, point requests, ...) renders in <Outlet />;
// the pages are listed in eboardTools.ts.
function Eboard({ eboard, cabinet }) {
  if (!eboard) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      {/* Cabinet points used to be its own nav tab; for now it lives here. */}
      {cabinet && (
        <div className="eboard-shortcuts">
          <Link to="/cabinet" className="eboard-shortcuts__button">TEMP - View Cabinet Points</Link>
        </div>
      )}
      <Outlet />
    </div>
  );
}

export default Eboard;
