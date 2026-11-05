// A Point Request's photo evidence lives in its own document,
// pointRequests/{id}/evidence/photo, not on the request (#124 follow-up).
// A compressed photo is ~100KB and the web SDK has no field mask, so a photo
// on the request itself is transferred by every query over the collection:
// the review page's "All" tab, My Requests' live listener, the dashboard's
// standing. The request carries `hasPhoto` instead, so the review page can
// offer the button without the photo, and the photo is read only when E-Board
// opens it.
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

/** The subcollection under a request, and the one document in it. */
export const EVIDENCE_COLLECTION = 'evidence';
export const PHOTO_DOC = 'photo';

/** The photo document. `userEmail` is the Member who submitted the request,
 *  copied here so firestore.rules can check who owns the photo without
 *  reading the request. */
export type PhotoEvidence = { imageData: string; userEmail: string };

/**
 * Where a photo was kept before the move: `imageData` as the form wrote it,
 * and the other names requests from before #71 used. Read as a fallback so a
 * request the backfill (scripts/move_photos_to_evidence.py) hasn't touched
 * still shows its photo.
 */
const LEGACY_FIELDS = ['imageData', 'imageUrl', 'photoUrl', 'photoURL', 'imageURL', 'image'];

/** The photo still stored on the request itself, or null. */
export function legacyPhoto(request: Record<string, unknown>): string | null {
    for (const field of LEGACY_FIELDS) {
        const value = request[field];
        if (typeof value === 'string' && value) return value;
    }
    return null;
}

/** Whether a request has photo evidence — answered from the request alone, so
 *  the review page can show the button without reading any photo. */
export function hasPhoto(request: Record<string, unknown>): boolean {
    return request.hasPhoto === true || legacyPhoto(request) !== null;
}

/** Saves a request's photo beside it, right after the request is created. */
export function savePhoto(db: Firestore, requestId: string, userEmail: string, photo: string) {
    return setDoc(doc(db, 'pointRequests', requestId, EVIDENCE_COLLECTION, PHOTO_DOC),
        { imageData: photo, userEmail } satisfies PhotoEvidence);
}

/** Reads one request's photo, for E-Board opening it. Null if there is none. */
export async function loadPhoto(db: Firestore, requestId: string): Promise<string | null> {
    const snap = await getDoc(doc(db, 'pointRequests', requestId, EVIDENCE_COLLECTION, PHOTO_DOC));
    const photo = snap.data()?.imageData;
    return typeof photo === 'string' && photo ? photo : null;
}
