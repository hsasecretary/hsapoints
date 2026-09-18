import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';

// Shown for any address that doesn't match a route (see the "*" route in App.tsx).
function NotFound({ signedIn }: { signedIn: boolean }) {
    return (
        <div>
            {/* Signed-in pages already get the banner from App.tsx */}
            {!signedIn && <Header />}
            <div className="not-found">
                <p className="not-found__code">404</p>
                <h2>Page Not Found</h2>
                <p className="not-found__text">
                    The page you're looking for doesn't exist or may have been moved.
                </p>
                <Link to="/login" className="submit-button not-found__button">
                    Go to Login
                </Link>
            </div>
        </div>
    );
}

export default NotFound;
