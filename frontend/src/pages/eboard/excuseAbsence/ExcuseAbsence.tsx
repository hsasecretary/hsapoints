// Excused Absence Requests: the inbox of Excuse Requests Members filed, each
// approved or denied here. Looking up one Member's Missed Events and Strikes
// moved to User Lookup (StrikesLookup.tsx); an old link here that names a
// Member is sent there.
import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import ExcuseInbox from './ExcuseInbox';
import { displayName } from './parts';
import { STRIKES_PARAM, STRIKES_SECTION_ID } from './StrikesLookup';
import { useExcuseInbox } from './useExcuseInbox';

function ExcuseAbsence() {
    const [params] = useSearchParams();
    const member = params.get('member');
    if (member) {
        const search = new URLSearchParams({ [STRIKES_PARAM]: member.toLowerCase() });
        return <Navigate to={`/eboard/user-lookup?${search}#${STRIKES_SECTION_ID}`} replace />;
    }
    return <Requests />;
}

function Requests() {
    const inbox = useExcuseInbox();
    // Only names, to label each request: a request shows its email until they load, or if they can't.
    const [names, setNames] = useState<Map<string, string>>(new Map());
    useEffect(() => {
        getDocs(collection(db, 'users'))
            .then((snap) => setNames(new Map(snap.docs.map((d) => [d.id.toLowerCase(), displayName({
                email: d.id, firstName: d.data().firstName || '', lastName: d.data().lastName || '',
            })]))))
            .catch((err) => console.error('Error loading member names:', err));
    }, []);
    const nameOf = (requestEmail: string) => names.get(requestEmail) ?? requestEmail;

    return (
        <div className="eap">
            <h2 className="eap-title">Excused Absence Requests</h2>
            <ExcuseInbox requests={inbox.requests} loading={inbox.loading} error={inbox.error} nameOf={nameOf} />
        </div>
    );
}

export default ExcuseAbsence;
