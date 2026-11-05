// Whether the signed-in Member may file Excuse Requests (held to Cabinet rules,
// not E-Board exempt), from their own users doc alone and through the "View as"
// preview. Lighter than useMemberStanding, for pages that only need the yes/no
// (Points > My Requests, to decide whether to offer the Excuse form link).
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Member } from '../../lib/computeStanding';
import { canFileExcuseRequests } from '../../lib/excuseRequests';
import { withView, type View } from '../../lib/viewAs';

export function useCanFileExcuse(email: string | null | undefined, view: View | null = null): boolean {
    const [member, setMember] = useState<Member | null>(null);

    useEffect(() => {
        if (!email) {
            setMember(null);
            return undefined;
        }
        return onSnapshot(
            doc(db, 'users', email.toLowerCase()),
            (snap) => setMember((snap.data() as Member) ?? null),
            (error) => console.error('Error loading member:', error),
        );
    }, [email]);

    return member !== null && canFileExcuseRequests(withView(member, view));
}
