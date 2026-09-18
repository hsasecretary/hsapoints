// Fuzzy "find a member by name". Firestore can't do partial or typo-tolerant
// text search, so we score names in the browser.

export type NamedMember = {
    email: string;
    firstName: string;
    lastName: string;
};

export type NameMatch = NamedMember & { score: number };

/** Lowercase, strip accents (José -> jose) and punctuation, collapse spaces. */
export function normalizeName(value: string): string {
    return (value || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const curr = [i];
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        prev = curr;
    }
    return prev[b.length];
}

function similarity(a: string, b: string): number {
    const longest = Math.max(a.length, b.length);
    return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
}

/** How well one typed word matches one part of a name (0..1). */
function wordScore(typed: string, part: string): number {
    if (typed === part) return 1;
    if (typed.length >= 2 && part.startsWith(typed)) return 0.9;
    if (typed.length >= 3 && part.includes(typed)) return 0.75;
    return similarity(typed, part) * 0.85; // typo tolerance
}

/** Score a member against the typed name (0..1). */
export function scoreName(query: string, member: NamedMember): number {
    const typed = normalizeName(query);
    const full = normalizeName(`${member.firstName} ${member.lastName}`);
    if (!typed || !full) return 0;
    if (typed === full) return 1;

    const parts = full.split(' ');
    const words = typed.split(' ');
    const perWord = words.map((w) => Math.max(...parts.map((p) => wordScore(w, p))));
    const wordsAvg = perWord.reduce((sum, s) => sum + s, 0) / perWord.length;

    return Math.max(wordsAvg, similarity(typed, full) * 0.9);
}

/** Best matches for a typed name, strongest first. */
export function findMembersByName(
    members: NamedMember[],
    query: string,
    limit = 5,
    minScore = 0.6,
): NameMatch[] {
    return members
        .map((member) => ({ ...member, score: scoreName(query, member) }))
        .filter((match) => match.score >= minScore)
        .sort((a, b) =>
            b.score - a.score ||
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
        .slice(0, limit);
}
