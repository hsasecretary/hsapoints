import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { computeStanding, type Attendance, type Code, type Member, type Standing } from '../../lib/computeStanding';
import { rubric } from '../../lib/rubric';
import { academicYear, toIsoDate } from '../../lib/semester';

/** A pointRequests/{id} doc still waiting on E-Board. */
export type PendingRequest = { id: string; codeId?: string | null; makeupFor?: (string | null)[] };

export type MemberStanding = {
    loading: boolean;
    member: Member | null;
    /** This school year's Attendance. */
    attendances: Attendance[];
    /** This school year's codes. */
    codes: Code[];
    pending: PendingRequest[];
    standing: Standing | null;
    today: string;
};

/**
 * Everything computeStanding needs for the signed-in Member, kept live, for
 * one school year (computeStanding works on one year at a time).
 */
export function useMemberStanding(email: string | null | undefined): MemberStanding {
    const today = toIsoDate(new Date());
    const [member, setMember] = useState<Member | null>(null);
    const [attendances, setAttendances] = useState<Attendance[] | null>(null);
    const [codes, setCodes] = useState<Code[] | null>(null);
    const [pending, setPending] = useState<PendingRequest[]>([]);

    useEffect(() => {
        if (!email) return undefined;
        const memberEmail = email.toLowerCase();
        const { start, end } = academicYear(today);
        const inYear = (row: { eventDate?: string }) => Boolean(row.eventDate) && row.eventDate >= start && row.eventDate <= end;

        const unsubscribers = [
            onSnapshot(doc(db, 'users', memberEmail), (snap) => setMember((snap.data() as Member) ?? {}),
                (error) => {
                    // Carry on as a Member with no facts rather than load forever.
                    console.error('Error loading member:', error);
                    setMember({});
                }),
            onSnapshot(query(collection(db, 'attendances'), where('email', '==', memberEmail)),
                (snap) => setAttendances(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Attendance).filter(inYear)),
                (error) => {
                    console.error('Error loading attendance:', error);
                    setAttendances([]);
                }),
            onSnapshot(query(collection(db, 'pointRequests'), where('userEmail', '==', memberEmail)),
                (snap) => setPending(snap.docs
                    .filter((d) => d.data().status === 'pending')
                    .map((d) => ({ id: d.id, codeId: d.data().codeId, makeupFor: d.data().makeupFor }))),
                (error) => console.error('Error loading point requests:', error)),
        ];
        getDocs(collection(db, 'codes'))
            .then((snap) => setCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Code).filter(inYear)))
            .catch((error) => {
                console.error('Error loading codes:', error);
                setCodes([]);
            });
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, [email, today]);

    const standing = useMemo(
        () => (member && attendances && codes ? computeStanding(member, attendances, rubric, codes, { today }) : null),
        [member, attendances, codes, today],
    );

    return {
        loading: !standing,
        member,
        attendances: attendances ?? [],
        codes: codes ?? [],
        pending,
        standing,
        today,
    };
}

/** The Missed Events a pending request already names, as "I was there" or a Make-up pick. */
export function pendingMakeups(pending: PendingRequest[]): Set<string> {
    return new Set(pending.flatMap((request) => [request.codeId, ...(request.makeupFor ?? [])]).filter(Boolean));
}
