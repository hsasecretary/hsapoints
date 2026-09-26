import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Member } from '../../lib/computeStanding';
import { isHeldToCabinetRules } from '../../lib/members';
import Explainer from './Explainer';

// /guide: how points work, in the version for the Member's role (#49).
function Guide({ email }: { email: string }) {
    const [member, setMember] = useState<Member | null>(null);

    useEffect(() => {
        getDoc(doc(db, 'users', email.toLowerCase()))
            .then((snap) => setMember((snap.data() as Member) ?? {}))
            .catch((error) => {
                console.error('Error loading member:', error);
                setMember({});
            });
    }, [email]);

    return (
        <div className="guide">
            <h1 className="guide__title">How points work</h1>
            {member ? (
                <Explainer cabinet={isHeldToCabinetRules(member) || member.eboard === true} mlpSpring={member.mlpCohort === 'spring'} />
            ) : <p className="guide__loading">Loading…</p>}
        </div>
    );
}

export default Guide;
