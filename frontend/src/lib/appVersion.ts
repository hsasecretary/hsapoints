// Members keep the site open in a tab for days, and as a one-page app it never
// reloads itself as they move around, so a deploy only reached them when they
// happened to refresh. Members kept submitting through old code after the
// photo move (#125) for exactly that reason. The pieces that decide when to
// pick up a new build live here; components/layout/AppUpdates.tsx does it.

/** The build ID in a fetched /version.json, or null if it isn't one. */
export function buildIdOf(body: unknown): string | null {
    const build = (body as { build?: unknown } | null)?.build;
    return typeof build === 'string' && build !== '' ? build : null;
}

/** Whether a different build is live than the one running. */
export function isOutdated(running: string, live: string | null): boolean {
    return live !== null && live !== running;
}

/** How soon after reloading for a missing chunk another reload counts as a loop. */
export const CHUNK_RELOAD_WINDOW_MS = 10_000;

/**
 * Whether to reload because a page's chunk failed to load. After a deploy an
 * old tab asks for chunks the new build no longer has, and one reload fixes
 * that. A second failure straight after means the chunk is missing for real,
 * so let the error show rather than reload forever.
 */
export function mayReloadForChunk(lastReloadAt: number | null, now: number): boolean {
    return lastReloadAt === null || now - lastReloadAt > CHUNK_RELOAD_WINDOW_MS;
}
