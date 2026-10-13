// The Closet Item registry E-Board manages on /eboard/closet (#104, #105).
// Sticker numbers are the doc ID, unique and zero-padded to 3+ digits, the
// convention the Checkout prototype used (frontend/src/pages/prototype-feature-layout/mock.ts).
// Retiring an item keeps it (and its Checkout history) in the collection,
// just marked retired, so it shows but can't be checked out again.
import { doc, runTransaction, type Firestore } from 'firebase/firestore';

export type ClosetItemForm = {
    stickerNumber: string;
    description: string;
};

export type ClosetItemDoc = {
    description: string;
    retired: boolean;
};

export type ClosetItemRow = ClosetItemDoc & { stickerNumber: string };

export type Result = { ok: true } | { ok: false; error: string };

/** '3' or '  21 ' -> '003' / '021': sticker numbers are zero-padded to 3+ digits. */
export function normalizeSticker(raw: string): string {
    return raw.trim().padStart(3, '0');
}

export type Prepared =
    | { ok: true; id: string; data: ClosetItemDoc }
    | { ok: false; error: string };

export function prepareNewItem(form: ClosetItemForm): Prepared {
    const trimmed = form.stickerNumber.trim();
    if (!trimmed) return { ok: false, error: 'Give it a sticker number.' };
    if (!/^\d+$/.test(trimmed)) return { ok: false, error: 'Sticker numbers can only use digits.' };
    const description = form.description.trim();
    if (!description) return { ok: false, error: 'Give the item a description.' };
    return { ok: true, id: normalizeSticker(trimmed), data: { description, retired: false } };
}

/** Adds a Closet Item, unless its sticker number is already taken. */
export async function addClosetItem(db: Firestore, form: ClosetItemForm): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    const prepared = prepareNewItem(form);
    if (!prepared.ok) return prepared;
    const { id, data } = prepared;
    const ref = doc(db, 'closetItems', id);
    return runTransaction(db, async (tx) => {
        if ((await tx.get(ref)).exists()) return { ok: false, error: `#${id} is already a Closet Item.` } as const;
        tx.set(ref, data);
        return { ok: true, id } as const;
    });
}

/** Retires a Closet Item: it keeps its history and can't be checked out again. */
export async function retireClosetItem(db: Firestore, stickerNumber: string): Promise<Result> {
    const ref = doc(db, 'closetItems', stickerNumber);
    return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return { ok: false, error: `#${stickerNumber} isn't a Closet Item.` } as const;
        if ((snap.data() as ClosetItemDoc).retired) return { ok: false, error: `#${stickerNumber} is already retired.` } as const;
        tx.update(ref, { retired: true });
        return { ok: true } as const;
    });
}
