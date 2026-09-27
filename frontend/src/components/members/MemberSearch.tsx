import { useMemo, useState } from 'react';
import { displayName, findMembersByName, type NamedMember } from '../../lib/nameSearch';

// The E-Board "find a member by name" box (Excuse Absence, User Lookup): the
// 5 closest names show under it as you type. Matching is in the browser
// (lib/nameSearch.ts), since Firestore can't do fuzzy text search.
function MemberSearch<M extends NamedMember>({ members, disabled, detail, onPick }: {
    members: M[];
    disabled?: boolean;
    /** A second line under the name, e.g. their role. */
    detail?: (member: M) => string;
    onPick: (member: M) => void;
}) {
    const [query, setQuery] = useState('');
    const results = useMemo(() => {
        if (!query.trim()) return [];
        const byEmail = new Map(members.map((m) => [m.email, m]));
        return findMembersByName(members, query, 5).map((match) => byEmail.get(match.email));
    }, [members, query]);

    return (
        <div className="member-search" role="search">
            <input
                type="text"
                className="member-search__input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, e.g. Valeria Ortiz"
                aria-label="Search members by name"
                disabled={disabled}
            />
            {query.trim() && (
                <ul className="member-search__results">
                    {results.length === 0 && <li className="member-search__empty">No member matches that name</li>}
                    {results.map((member) => (
                        <li key={member.email}>
                            <button type="button" onClick={() => { setQuery(''); onPick(member); }}>
                                <span><strong>{displayName(member)}</strong> <span className="member-search__muted">{member.email}</span></span>
                                {detail && <span className="member-search__muted">{detail(member)}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default MemberSearch;
