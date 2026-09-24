# Leaderboard ranks are computed client-side; anonymity is UI-only

The Leaderboard needs every Member's Total Points to compute anyone's Rank, but this app has no backend beyond Firebase Hosting and manually-run Python scripts — there's no Cloud Function or server to precompute standings. We fetch the full `users` collection client-side (`getDocs(collection(db, 'users'))`) on each dashboard load and derive Rank in the browser, the same pattern `PointsOverview.tsx` already uses to fetch all `codes` for voter-eligibility math.

This means the anonymity the Leaderboard presents (hiding non-Top-Ranks Members' names) is enforced only by the UI, not by Firestore: every Member's real name and Total Points are already present in the client's memory, same as the rest of the app today (`firestore.rules` is `allow read, write: if true`). This is a deliberate extension of the existing security model, not a gap introduced by this feature — see CLAUDE.md's note that "all access control lives in the React client."


> **Superseded in part by [ADR-0002](0002-attendance-ledger-calculated-on-read.md).** The premise that `firestore.rules` is `allow read, write: if true` is stale: `users` can no longer be listed by Members, so the Leaderboard reads the `standings` projection instead of the full `users` collection. Client-side ranking over that projection still stands.
