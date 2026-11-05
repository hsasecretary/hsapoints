import { describe, expect, it } from 'vitest';
import { buildIdOf, CHUNK_RELOAD_WINDOW_MS, isOutdated, mayReloadForChunk } from './appVersion';

describe('buildIdOf', () => {
    it('reads the build from /version.json', () => {
        expect(buildIdOf({ build: 'a1b2c3d4e5f6' })).toBe('a1b2c3d4e5f6');
    });

    it('is null for anything that is not a version file', () => {
        // The hosting rewrite answers a missing file with index.html, which won't parse
        // as this; a bad response must never look like a new build.
        expect(buildIdOf(null)).toBeNull();
        expect(buildIdOf({})).toBeNull();
        expect(buildIdOf({ build: '' })).toBeNull();
        expect(buildIdOf({ build: 42 })).toBeNull();
        expect(buildIdOf('<!doctype html>')).toBeNull();
    });
});

describe('isOutdated', () => {
    it('is true only when a different build is live', () => {
        expect(isOutdated('aaa', 'bbb')).toBe(true);
        expect(isOutdated('aaa', 'aaa')).toBe(false);
    });

    it('never reloads on an unreadable version file', () => {
        expect(isOutdated('aaa', null)).toBe(false);
    });
});

describe('mayReloadForChunk', () => {
    const now = 1_000_000;

    it('reloads the first time a chunk is missing', () => {
        expect(mayReloadForChunk(null, now)).toBe(true);
    });

    it('does not reload again straight after, so a chunk that is truly gone cannot loop the page', () => {
        expect(mayReloadForChunk(now - 2_000, now)).toBe(false);
    });

    it('reloads again once the window has passed, as after a later deploy', () => {
        expect(mayReloadForChunk(now - CHUNK_RELOAD_WINDOW_MS - 1, now)).toBe(true);
    });
});
