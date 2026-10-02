import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { computeStanding, type Attendance, type Code, type Member, type Standing } from '../../../lib/computeStanding';
import type { AbsenceMember } from '../../../lib/excuseAbsence';
import { rubric } from '../../../lib/rubric';
import { academicYear, toIsoDate } from '../../../lib/semester';

/** A users/{email} doc as Excuse Absence reads it. */
export type RosterMember = Member & AbsenceMember & {
    email: string;
    firstName: string;
    lastName: string;
    position?: string;
};

export type RosterRow = { member: RosterMember; standing: Standing | null };

export type Roster = {
    loading: boolean;
    error: string;
    rows: RosterRow[];
    /** This school year's Attendance, by the Member's email. */
    attendancesOf: (email: string) => Attendance[];
    /** This school year's codes. */
    codes: Code[];
    today: string;
};

/**
 * Every account with its standing for this school year: users kept live (so
 * a save, or another E-Board member's, shows at once), Attendance and codes
 * read once when the page opens.
 */
export function useRoster(): Roster {
    const today = toIsoDate(new Date());
    const [members, setMembers] = useState<RosterMember[] | null>(null);
    const [attendances, setAttendances] = useState<Map<string, Attendance[]> | null>(null);
    const [codes, setCodes] = useState<Code[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const { start, end } = academicYear(today);
        const inYear = (row: { eventDate?: string }) => Boolean(row.eventDate) && row.eventDate >= start && row.eventDate <= end;
        const failed = (what: string) => (err: unknown) => {
            console.error(`Error loading ${what}:`, err);
            setError('Could not load members. Refresh to try again.');
        };

        const unsubscribe = onSnapshot(collection(db, 'users'),
            (snap) => setMembers(snap.docs.map((d) => ({
                ...(d.data() as RosterMember),
                email: d.id,
                firstName: d.data().firstName || '',
                lastName: d.data().lastName || '',
            }))),
            failed('members'));
        getDocs(collection(db, 'attendances'))
            .then((snap) => {
                const byEmail = new Map<string, Attendance[]>();
                for (const d of snap.docs) {
                    const attendance = { id: d.id, ...d.data() } as Attendance & { email?: string };
                    if (!attendance.email || !inYear(attendance)) continue;
                    const email = attendance.email.toLowerCase();
                    byEmail.set(email, [...(byEmail.get(email) ?? []), attendance]);
                }
                setAttendances(byEmail);
            })
            .catch(failed('attendance'));
        getDocs(collection(db, 'codes'))
            .then((snap) => setCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Code).filter(inYear)))
            .catch(failed('codes'));
        return unsubscribe;
    }, [today]);

    const rows = useMemo(() => {
        if (!members || !attendances || !codes) return [];
        return members.map((member) => ({
            member,
            standing: computeStanding(member, attendances.get(member.email) ?? [], rubric, codes, { today }),
        }));
    }, [members, attendances, codes, today]);

    return {
        loading: !error && (!members || !attendances || !codes),
        error,
        rows,
        attendancesOf: (email) => attendances?.get(email) ?? [],
        codes: codes ?? [],
        today,
    };
}
