// E-Board's browser refreshing leaderboard/current (docs/adr/0004): list every
// Member and this year's Attendance, give anyone without one a
// leaderboardToken, and write the snapshot lib/leaderboard.ts builds.
// scripts/refresh_leaderboard.py does the same from the command line.
import {
    collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, where, type Firestore,
} from 'firebase/firestore';
import type { Attendance, Member } from './computeStanding';
import { isStale, snapshotFor, type LeaderboardSnapshot } from './leaderboard';
import { academicYear, toIsoDate } from './semester';

export const LEADERBOARD_DOC = 'leaderboard/current';

/** How many users docs one token transaction touches (Firestore allows 500 writes). */
const TOKEN_CHUNK = 400;

/**
 * Gives each of `emails` a leaderboardToken unless one is already there, and
 * returns every one's token. In a transaction, so two E-Board pages refreshing
 * at once agree on a Member's token instead of the later one overwriting it.
 */
async function assignTokens(db: Firestore, emails: string[]): Promise<Map<string, string>> {
    const tokens = new Map<string, string>();
    for (let i = 0; i < emails.length; i += TOKEN_CHUNK) {
        const chunk = emails.slice(i, i + TOKEN_CHUNK);
        const assigned = await runTransaction(db, async (transaction) => {
            const refs = chunk.map((email) => doc(db, 'users', email));
            const snaps = await Promise.all(refs.map((ref) => transaction.get(ref)));
            const result: [string, string][] = [];
            snaps.forEach((snap, j) => {
                if (!snap.exists()) return;
                const existing = snap.data().leaderboardToken;
                if (existing) {
                    result.push([chunk[j], existing]);
                } else {
                    const token = crypto.randomUUID();
                    transaction.update(refs[j], { leaderboardToken: token });
                    result.push([chunk[j], token]);
                }
            });
            return result;
        });
        assigned.forEach(([email, token]) => tokens.set(email, token));
    }
    return tokens;
}

/** One refresh. Reads every users doc and this year's Attendance. */
export async function refreshLeaderboard(db: Firestore, by: string, today = toIsoDate(new Date())): Promise<LeaderboardSnapshot> {
    const { start, end } = academicYear(today);
    const [usersSnap, attendanceSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'attendances'), where('eventDate', '>=', start), where('eventDate', '<=', end))),
    ]);

    const byEmail = new Map<string, Attendance[]>();
    for (const snap of attendanceSnap.docs) {
        const email = String(snap.data().email ?? '').toLowerCase();
        byEmail.set(email, [...(byEmail.get(email) ?? []), { id: snap.id, ...snap.data() } as Attendance]);
    }

    const users = usersSnap.docs.map((snap) => ({ email: snap.id, data: snap.data() as Member & { firstName?: string; lastName?: string; leaderboardToken?: string } }));
    const tokens = new Map(users.filter((user) => user.data.leaderboardToken).map((user) => [user.email, user.data.leaderboardToken]));
    const missing = users.filter((user) => !user.data.leaderboardToken && user.data.eboard !== true).map((user) => user.email);
    (await assignTokens(db, missing)).forEach((token, email) => tokens.set(email, token));

    const snapshot = snapshotFor({
        today,
        members: users
            .filter((user) => tokens.has(user.email))
            .map((user) => ({ token: tokens.get(user.email), member: user.data, attendances: byEmail.get(user.email.toLowerCase()) ?? [] })),
    });
    await setDoc(doc(db, LEADERBOARD_DOC), { ...snapshot, refreshedAt: serverTimestamp(), refreshedBy: by });
    return snapshot;
}

let inFlight: Promise<boolean> | null = null;

/**
 * Refreshes when the snapshot is missing or over an hour old; otherwise reads
 * one doc and stops. Fire and forget from any E-Board page: one refresh at a
 * time per tab, and a failure is only logged.
 */
export function refreshLeaderboardIfStale(db: Firestore, by: string, now = new Date()): Promise<boolean> {
    if (inFlight) return inFlight.then(() => false);
    inFlight = (async () => {
        const snap = await getDoc(doc(db, LEADERBOARD_DOC));
        const refreshedAt = snap.data()?.refreshedAt?.toDate?.() ?? null;
        if (!isStale(refreshedAt, now)) return false;
        await refreshLeaderboard(db, by, toIsoDate(now));
        return true;
    })()
        .catch((error) => {
            console.error('Error refreshing the Leaderboard:', error);
            return false;
        })
        .finally(() => {
            inFlight = null;
        });
    return inFlight;
}
