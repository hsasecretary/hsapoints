// The signed-in Member's own Excuse Requests, kept live, newest first. Only
// listens when `enabled` (a Member who is held to Cabinet rules and not E-Board
// exempt), so everyone else makes no read.
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { ExcuseRequest } from '../../lib/excuseRequests';
import { toExcuseRequest } from '../../lib/excuseRequestsDb';

export function useExcuseRequests(email: string | null | undefined, enabled: boolean): ExcuseRequest[] {
    const [requests, setRequests] = useState<ExcuseRequest[]>([]);

    useEffect(() => {
        if (!email || !enabled) {
            setRequests([]);
            return undefined;
        }
        return onSnapshot(
            query(collection(db, 'excuseRequests'), where('email', '==', email.toLowerCase())),
            (snap) => {
                // A request just filed has no server time yet: treat it as the newest.
                const stamp = (request: ExcuseRequest) => request.filedAt || '\uffff';
                setRequests(snap.docs
                    .map((d) => toExcuseRequest(d.id, d.data()))
                    .sort((a, b) => stamp(b).localeCompare(stamp(a)) || a.id.localeCompare(b.id)));
            },
            (error) => console.error('Error loading excuse requests:', error),
        );
    }, [email, enabled]);

    return requests;
}
