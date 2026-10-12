// PROTOTYPE (throwaway): made-up data for the four coming features. Today is
// taken as Mon 12 Oct 2026. Nothing here is read from or written to Firestore.

export type UpcomingEvent = {
    id: string;
    day: string;      // "Thu"
    date: string;     // "Oct 15"
    time: string;
    title: string;
    tag: string;
    /** A Core Event: Cabinet Members must attend, so it can be excused. */
    core?: boolean;
    /** E-Board linked this calendar event to an Event Code (Q13). Only a coded
     *  Core Event can be named in an Excuse Request. The code is never shown. */
    coded?: boolean;
    cabinetOnly?: boolean;
};

export const upcoming: UpcomingEvent[] = [
    { id: 'gbm5', day: 'Thu', date: 'Oct 15', time: '7:00pm', title: 'GBM #5: Heritage Trivia Night', tag: 'GBM', core: true, coded: true },
    { id: 'fam', day: 'Fri', date: 'Oct 16', time: '10:00am', title: 'Familia Fridays (tabling)', tag: 'Tabling' },
    { id: 'sol2', day: 'Tue', date: 'Oct 20', time: '5:30pm', title: 'Solidarity Session #2', tag: 'OPA' },
    { id: 'cab', day: 'Thu', date: 'Oct 22', time: '7:00pm', title: 'Cabinet meeting', tag: 'Cabinet', core: true, coded: true, cabinetOnly: true },
    { id: 'ddlm', day: 'Fri', date: 'Oct 30', time: '6:00pm', title: 'Día de los Muertos Social', tag: 'Social' },
    { id: 'gbm6', day: 'Thu', date: 'Nov 5', time: '7:00pm', title: 'GBM #6', tag: 'GBM', core: true },
];

export type RankRow = { rank: number; name?: string; points: number; you?: boolean; tie?: number };

/** Top Ranks are named; Neighboring Ranks show only Rank and Total Points (CONTEXT.md). */
export const topRanks: RankRow[] = [
    { rank: 1, name: 'Valeria R.', points: 48 },
    { rank: 2, name: 'Mateo G.', points: 45 },
    { rank: 3, name: 'Camila S.', points: 44 },
    { rank: 4, name: 'Diego M.', points: 41 },
    { rank: 5, name: 'Sofía L.', points: 40 },
];

export const aroundYou: RankRow[] = [
    { rank: 11, points: 31 },
    { rank: 12, points: 30 },
    { rank: 13, points: 28 },
    { rank: 14, points: 27, you: true, tie: 2 },
    { rank: 16, points: 26 },
    { rank: 17, points: 25 },
    { rank: 18, points: 24 },
];

export const memberCount = 212;

export type ClosetItem = { id: string; name: string; kind: 'Merch' | 'Borrow'; note: string; left: number; swatch: string };

export const closet: ClosetItem[] = [
    { id: 'tee', name: 'HSA 2026 Tee', kind: 'Merch', note: 'Black · S–XL', left: 14, swatch: 'var(--hsa-teal-700)' },
    { id: 'crew', name: 'Crewneck', kind: 'Merch', note: 'Navy · M–XL', left: 6, swatch: 'var(--hsa-ink-soft)' },
    { id: 'tote', name: 'Tote bag', kind: 'Merch', note: 'One size', left: 22, swatch: 'var(--hsa-warm-edge)' },
    { id: 'blazer', name: 'Blazer (to borrow)', kind: 'Borrow', note: 'For career fair · return in 7 days', left: 3, swatch: 'var(--hsa-gold-700)' },
    { id: 'stick', name: 'Sticker pack', kind: 'Merch', note: '5 stickers', left: 40, swatch: 'var(--hsa-success)' },
];

export type ExcuseRequest = { id: string; event: string; date: string; reason: string; filed: string; status: 'pending' | 'approved' | 'denied'; denial?: string };

export const excuses: ExcuseRequest[] = [
    { id: 'x1', event: 'Cabinet meeting', date: 'Thu Oct 22', reason: 'Organic Chem exam review', filed: 'Oct 11, 9:42pm', status: 'pending' },
    { id: 'x2', event: 'GBM #3', date: 'Thu Sep 24', reason: 'Family emergency', filed: 'Sep 20, 3:10pm', status: 'approved' },
    { id: 'x3', event: 'Cabinet meeting', date: 'Thu Oct 1', reason: 'Intramural game', filed: 'Sep 30, 11:05am', status: 'denied', denial: 'Intramurals aren’t a valid excuse under the policy.' },
];

/* ---- Closet (#104): free loans of equipment, tracked by sticker number ---- */

/** Closet Items by sticker number, for the checkout form's lookup. */
export const closetItems: Record<string, string> = {
    '003': 'Folding table (6 ft)',
    '014': 'Folding table (6 ft)',
    '021': 'Bluetooth speaker',
    '031': 'Extension cord (25 ft)',
    '042': 'HSA banner (large)',
    '057': 'Tablecloth, black',
};

/** E-Board members a borrower can name as Witness. */
export const witnesses = ['Andrea P. (President)', 'Luis F. (Treasurer)', 'Diana M. (Secretary)'];

export type Checkout = { sticker: string; item: string; out: string; due: string; overdue?: boolean; extended?: string; /** Due Date as an Oct day, for sorting */ dueDay: number };

/** The signed-in Member's open Checkouts ("My items"). */
export const myCheckouts: Checkout[] = [
    { sticker: '014', item: 'Folding table (6 ft)', out: 'Mon Oct 5, 6:12 PM', due: 'Wed Oct 7, 8 PM', overdue: true, dueDay: 7 },
    { sticker: '031', item: 'Extension cord (25 ft)', out: 'Fri Oct 9, 4:30 PM', due: 'Wed Oct 14, 8 PM', dueDay: 14, extended: 'Extended from Tue Oct 13 by Andrea P.: tabling ran two days' },
];

/** Due Date for a checkout made today (Mon) per #104's table: Mon → Wed 8 PM. */
export const dueIfCheckedOutNow = 'Wed Oct 14, 8 PM';
