// Every Excuse Request, whatever its status, kept live for the Excuse Request
// Review page: it filters Pending, Approved and Denied the way Point Request
// Review does. (useExcuseInbox is only the pending ones, for the menu badge.)
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { ExcuseRequest } from '../../../lib/excuseRequests';
import { toExcuseRequest } from '../../../lib/excuseRequestsDb';

/** Newest filing first; one the server has not stamped yet ('') is the newest of all. */
function newestFirst(a: ExcuseRequest, b: ExcuseRequest): number {
    return (b.filedAt || '9999').localeCompare(a.filedAt || '9999') || a.id.localeCompare(b.id);
}

export function useAllExcuseRequests(): { requests: ExcuseRequest[]; loading: boolean; error: string } {
    const [requests, setRequests] = useState<ExcuseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => onSnapshot(
        collection(db, 'excuseRequests'),
        (snap) => {
            setRequests(snap.docs.map((d) => toExcuseRequest(d.id, d.data())).sort(newestFirst));
            setError('');
            setLoading(false);
        },
        (err) => {
            console.error('Error loading Excuse Requests:', err);
            setError('Could not load Excuse Requests. Refresh to try again.');
            setLoading(false);
        },
    ), []);

    return { requests, loading, error };
}
