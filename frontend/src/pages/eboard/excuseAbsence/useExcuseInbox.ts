// The pending Excuse Requests, kept live for E-Board: the inbox on Excuse
// Absence, and (with `enabled` set to whether the viewer is E-Board) the badge
// count on the E-Board menu.
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { excuseInbox, type ExcuseRequest } from '../../../lib/excuseRequests';
import { toExcuseRequest } from '../../../lib/excuseRequestsDb';

export function useExcuseInbox(enabled = true): { requests: ExcuseRequest[]; loading: boolean; error: string } {
    const [requests, setRequests] = useState<ExcuseRequest[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!enabled) {
            setRequests([]);
            setLoading(false);
            return undefined;
        }
        setLoading(true);
        return onSnapshot(
            query(collection(db, 'excuseRequests'), where('status', '==', 'pending')),
            (snap) => {
                setRequests(excuseInbox(snap.docs.map((d) => toExcuseRequest(d.id, d.data()))));
                setError('');
                setLoading(false);
            },
            (err) => {
                console.error('Error loading Excuse Requests:', err);
                setError('Could not load Excuse Requests. Refresh to try again.');
                setLoading(false);
            },
        );
    }, [enabled]);

    return { requests, loading, error };
}
