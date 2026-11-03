// Point Request Review loads one status at a time (#124 follow-up). The page
// used to read the whole pointRequests collection on mount, which is slow
// because every request carries its photo evidence as a ~100KB data URL in
// `imageData` — the web SDK has no field mask, so the only way to move less
// is to ask for fewer documents.
import {
    collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where,
    type DocumentData, type Firestore, type QueryDocumentSnapshot,
} from 'firebase/firestore';

/** The four choices in the status filter; 'all' puts no status on the query. */
export type StatusFilter = 'pending' | 'approved' | 'denied' | 'all';

export const STATUS_FILTERS: StatusFilter[] = ['pending', 'approved', 'denied', 'all'];

/** How many requests a tab loads at a time. Photos make each document big, so
 *  this stays small and the page offers "Load more" rather than everything. */
export const PAGE_SIZE = 25;

/** One `where` on the query, as plain data so the choice of filters can be
 *  tested without a Firestore instance. */
export type Filter = { field: string; value: string };

/** The filters a tab needs: its status (except "All"), and the picked Member
 *  (?member=) when E-Board has narrowed to one person. */
export function requestFilters(status: StatusFilter, member: string | null): Filter[] {
    const filters: Filter[] = [];
    if (status !== 'all') filters.push({ field: 'status', value: status });
    if (member) filters.push({ field: 'userEmail', value: member.toLowerCase() });
    return filters;
}

function requestsQuery(db: Firestore, status: StatusFilter, member: string | null) {
    const filters = requestFilters(status, member).map((f) => where(f.field, '==', f.value));
    return query(collection(db, 'pointRequests'), ...filters, orderBy('submittedAt', 'desc'));
}

/** One page of requests, newest first. Pass the last snapshot of the previous
 *  page as `after` to get the next one. */
export function requestsPage(
    db: Firestore,
    status: StatusFilter,
    member: string | null,
    after?: QueryDocumentSnapshot<DocumentData>,
) {
    const base = requestsQuery(db, status, member);
    // One extra document tells the page whether a "Load more" is worth showing.
    return getDocs(after ? query(base, startAfter(after), limit(PAGE_SIZE + 1)) : query(base, limit(PAGE_SIZE + 1)));
}

/** How many requests a tab holds, counted on the server: an aggregation is
 *  billed at about one read per 1000 documents and sends no photos. */
export async function countRequests(db: Firestore, status: StatusFilter, member: string | null): Promise<number> {
    const filters = requestFilters(status, member).map((f) => where(f.field, '==', f.value));
    const snapshot = await getCountFromServer(query(collection(db, 'pointRequests'), ...filters));
    return snapshot.data().count;
}
