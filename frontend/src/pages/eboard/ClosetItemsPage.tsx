import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { addClosetItem, retireClosetItem, type ClosetItemRow } from '../../lib/closetItems';
import SectionTitle from '../../components/ui/SectionTitle';

const blankForm = { stickerNumber: '', description: '' };

function byStickerNumber(a: ClosetItemRow, b: ClosetItemRow): number {
    return a.stickerNumber.localeCompare(b.stickerNumber);
}

// /eboard/closet (#104, #105): add a Closet Item by sticker number and
// description, and retire one. A retired item stays listed (its Checkout
// history survives) but moves out of the active list and can't be checked
// out again (lib/closet.ts handles that half).
function ClosetItemsPage() {
    const [items, setItems] = useState<ClosetItemRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(blankForm);
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState('');
    const [confirmingRetire, setConfirmingRetire] = useState<string | null>(null);
    const [retiring, setRetiring] = useState<string | null>(null);
    const [retireError, setRetireError] = useState('');

    useEffect(() => onSnapshot(
        collection(db, 'closetItems'),
        (snapshot) => {
            setItems(snapshot.docs.map((snap) => ({ stickerNumber: snap.id, ...snap.data() }) as ClosetItemRow));
            setLoading(false);
        },
        (error) => {
            console.error('Error loading Closet Items:', error);
            setLoading(false);
        },
    ), []);

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        setAddError('');
        try {
            const result = await addClosetItem(db, form);
            if (result.ok === true) setForm(blankForm);
            else setAddError(result.error);
        } catch (error) {
            console.error('Error adding Closet Item:', error);
            setAddError("Couldn't add it. Try again.");
        } finally {
            setAdding(false);
        }
    };

    const retire = async (stickerNumber: string) => {
        setRetiring(stickerNumber);
        setRetireError('');
        try {
            const result = await retireClosetItem(db, stickerNumber);
            if (result.ok === false) setRetireError(result.error);
            setConfirmingRetire(null);
        } catch (error) {
            console.error('Error retiring Closet Item:', error);
            setRetireError("Couldn't retire it. Try again.");
        } finally {
            setRetiring(null);
        }
    };

    const active = items.filter((item) => !item.retired).sort(byStickerNumber);
    const retired = items.filter((item) => item.retired).sort(byStickerNumber);

    return (
        <div className="closet-items-page">
            <SectionTitle size="page">Closet</SectionTitle>

            <form className="closet-items-page__add" onSubmit={add} aria-label="Add a Closet Item">
                <label>
                    Sticker number
                    <input value={form.stickerNumber} inputMode="numeric" placeholder="e.g. 21"
                        onChange={(e) => { setForm((current) => ({ ...current, stickerNumber: e.target.value })); setAddError(''); }} />
                </label>
                <label>
                    Description
                    <input value={form.description} placeholder="e.g. Bluetooth speaker"
                        onChange={(e) => { setForm((current) => ({ ...current, description: e.target.value })); setAddError(''); }} />
                </label>
                <button type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add item'}</button>
                {addError && <p className="closet-items-page__error" role="alert">{addError}</p>}
            </form>

            {loading ? <p>Loading…</p> : (
                <>
                    <section>
                        <h2>Active <span>{active.length}</span></h2>
                        {active.length === 0 ? (
                            <p className="closet-items-page__empty">No active Closet Items yet.</p>
                        ) : (
                            <ul className="closet-items-page__list">
                                {active.map((item) => (
                                    <li key={item.stickerNumber} className="closet-items-page__row">
                                        <span className="closet-items-page__sticker">#{item.stickerNumber}</span>
                                        <span className="closet-items-page__description">{item.description}</span>
                                        {confirmingRetire === item.stickerNumber ? (
                                            <span className="closet-items-page__confirm">
                                                Retire #{item.stickerNumber}?
                                                <button type="button" onClick={() => retire(item.stickerNumber)} disabled={retiring === item.stickerNumber}>
                                                    {retiring === item.stickerNumber ? 'Retiring…' : 'Yes, retire'}
                                                </button>
                                                <button type="button" className="link-button" onClick={() => setConfirmingRetire(null)}>Cancel</button>
                                            </span>
                                        ) : (
                                            <button type="button" className="link-button link-button--danger"
                                                onClick={() => { setConfirmingRetire(item.stickerNumber); setRetireError(''); }}>
                                                Retire
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {retireError && <p className="closet-items-page__error" role="alert">{retireError}</p>}
                    </section>

                    {retired.length > 0 && (
                        <section>
                            <h2>Retired <span>{retired.length}</span></h2>
                            <ul className="closet-items-page__list closet-items-page__list--retired">
                                {retired.map((item) => (
                                    <li key={item.stickerNumber} className="closet-items-page__row">
                                        <span className="closet-items-page__sticker">#{item.stickerNumber}</span>
                                        <span className="closet-items-page__description">{item.description}</span>
                                        <span className="closet-items-page__tag">Retired</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

export default ClosetItemsPage;
