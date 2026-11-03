import { describe, expect, it } from 'vitest';
import { hasPhoto, legacyPhoto } from './requestEvidence';

const PHOTO = 'data:image/jpeg;base64,abc';
const OLD_FIELDS = ['imageData', 'imageUrl', 'photoUrl', 'photoURL', 'imageURL', 'image'];

describe('legacyPhoto', () => {
    it('finds a photo the request still carries, under any of its old names', () => {
        for (const field of OLD_FIELDS) expect(legacyPhoto({ [field]: PHOTO })).toBe(PHOTO);
    });

    it('prefers imageData, the field the form used to write', () => {
        expect(legacyPhoto({ imageData: PHOTO, imageUrl: 'https://example.org/old.jpg' })).toBe(PHOTO);
    });

    it('is null for a moved request, a blank field, or anything that is not a string', () => {
        expect(legacyPhoto({ hasPhoto: true })).toBeNull();
        expect(legacyPhoto({ imageData: '', imageUrl: '' })).toBeNull();
        expect(legacyPhoto({ imageData: null, image: 0 })).toBeNull();
    });
});

describe('hasPhoto', () => {
    it('is true for a moved request, from hasPhoto alone', () => {
        expect(hasPhoto({ hasPhoto: true })).toBe(true);
    });

    it('is true for a request that still carries its own photo', () => {
        expect(hasPhoto({ imageData: PHOTO })).toBe(true);
        expect(hasPhoto({ photoUrl: 'https://example.org/proof.jpg' })).toBe(true);
    });

    it('is false when there is no photo either way', () => {
        expect(hasPhoto({})).toBe(false);
        expect(hasPhoto({ hasPhoto: false, imageData: '' })).toBe(false);
    });

    it('takes only a true hasPhoto for an answer, never a stray value', () => {
        expect(hasPhoto({ hasPhoto: 'yes' })).toBe(false);
        expect(hasPhoto({ hasPhoto: 1 })).toBe(false);
    });
});
