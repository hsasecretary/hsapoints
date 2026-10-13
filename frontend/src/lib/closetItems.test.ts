import { describe, expect, it } from 'vitest';
import { normalizeSticker, prepareNewItem } from './closetItems';

describe('normalizeSticker', () => {
    it('pads a short sticker number to 3 digits', () => {
        expect(normalizeSticker('3')).toBe('003');
    });

    it('leaves a sticker number that is already 3+ digits alone', () => {
        expect(normalizeSticker('042')).toBe('042');
        expect(normalizeSticker('1042')).toBe('1042');
    });

    it('trims surrounding whitespace before padding', () => {
        expect(normalizeSticker('  21 ')).toBe('021');
    });
});

describe('prepareNewItem', () => {
    const form = { stickerNumber: '21', description: 'Bluetooth speaker' };

    it('saves the padded sticker number as the doc id, unretired', () => {
        expect(prepareNewItem(form)).toEqual({
            ok: true, id: '021', data: { description: 'Bluetooth speaker', retired: false },
        });
    });

    it('trims the description', () => {
        expect(prepareNewItem({ ...form, description: '  Bluetooth speaker  ' })).toEqual({
            ok: true, id: '021', data: { description: 'Bluetooth speaker', retired: false },
        });
    });

    it('refuses an empty sticker number', () => {
        expect(prepareNewItem({ ...form, stickerNumber: '' })).toEqual({ ok: false, error: 'Give it a sticker number.' });
        expect(prepareNewItem({ ...form, stickerNumber: '   ' })).toEqual({ ok: false, error: 'Give it a sticker number.' });
    });

    it('refuses a sticker number with letters or symbols', () => {
        expect(prepareNewItem({ ...form, stickerNumber: '21A' })).toEqual({ ok: false, error: 'Sticker numbers can only use digits.' });
    });

    it('refuses an empty description', () => {
        expect(prepareNewItem({ ...form, description: '  ' })).toEqual({ ok: false, error: 'Give the item a description.' });
    });
});
