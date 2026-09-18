import { useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { findMembersByName, type NameMatch, type NamedMember } from '../../lib/nameSearch';

type EmailLookupProps = {
    /** Called with the chosen member's email ("Look Up Points"). */
    onSelect: (email: string) => void;
};

// "UFL/SF Email Lookup" on the User Lookup page: type a first and/or last
// name, get the 5 closest account names with their emails. Accounts are
// loaded once (first search) and matched in the browser, since Firestore
// can't do fuzzy text search.
function EmailLookup({ onSelect }: EmailLookupProps) {
    const [name, setName] = useState('');
    const [matches, setMatches] = useState<NameMatch[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const members = useRef<NamedMember[] | null>(null);

    const loadMembers = async () => {
        if (members.current) return members.current;
        const snapshot = await getDocs(collection(db, 'users'));
        members.current = snapshot.docs.map((d) => ({
            email: d.id,
            firstName: d.data().firstName || '',
            lastName: d.data().lastName || '',
        }));
        return members.current;
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter a first and/or last name');
            setMatches(null);
            return;
        }
        setLoading(true);
        setError('');
        try {
            setMatches(findMembersByName(await loadMembers(), name, 5));
        } catch (err) {
            console.error('Error searching members by name:', err);
            setError('Could not search accounts. Please try again.');
            setMatches(null);
        } finally {
            setLoading(false);
        }
    };

    const clear = () => {
        setName('');
        setMatches(null);
        setError('');
    };

    return (
        <section className="email-lookup">
            <h2>UFL/SF Email Lookup</h2>
            <p className="email-lookup__subtitle">
                Don't know their email? Search by first and last name to find it
            </p>

            <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-group">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="First and last name (e.g., Maria Gonzalez)"
                        className="search-input"
                        aria-label="Member name"
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading} className="search-button">
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                    {(matches || error) && (
                        <button type="button" onClick={clear} className="clear-button">
                            Clear
                        </button>
                    )}
                </div>
                {error && <p className="error-message">{error}</p>}

                {matches && (
                    matches.length === 0 ? (
                        <p className="email-lookup__empty">No accounts match that name</p>
                    ) : (
                        <ul className="email-lookup__results">
                            {matches.map((match) => (
                                <li key={match.email} className="email-lookup__result">
                                    <div className="email-lookup__who">
                                        <span className="email-lookup__name">{match.firstName} {match.lastName}</span>
                                        <span className="email-lookup__email">{match.email}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="email-lookup__use"
                                        onClick={() => onSelect(match.email)}
                                    >
                                        Look Up Points
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )
                )}
            </form>
        </section>
    );
}

export default EmailLookup;
