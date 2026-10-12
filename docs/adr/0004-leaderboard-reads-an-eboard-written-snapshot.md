# The Leaderboard reads one E-Board-written snapshot, with the viewer slotted in live

Members can't list `users`, and there is no server, so the Leaderboard needs a Member-readable source of everyone's Total Points. ADR-0002 planned a `standings/{email}` doc per Member, written by each Member's own client. We replace that with a single doc, `leaderboard/current`, that only E-Board can write: a list of every ranked Member's Total Points under a random per-Member token, plus names for Top Ranks only. Each Member's own token sits on their `users` doc (`leaderboardToken`, E-Board-only), so the viewer's browser swaps their own snapshot entry for their live Total Points and ranks exactly, while everyone else is as of the last refresh.

**Considered options**

- **`standings/{email}`, self-written (ADR-0002).** Firestore rules can't check a calculated total, so any Member could write `totalPoints: 999` from the console and appear by name in Top Ranks until a reconcile ran. It also sends every Member's name and score to every browser, leaving the anonymity in ADR-0003 as UI only.
- **Let Members list `users`.** Exposes Strikes, excusals and `absenceLog` to everyone.
- **Snapshot without tokens.** The viewer's stale entry would stay in the list as a phantom row next to them, and a just-redeemed code wouldn't move them until E-Board's next refresh.

**Consequences**

- The snapshot is refreshed by E-Board's browser: automatically when an E-Board member opens an E-Board page and it is over an hour old, by a "Refresh now" button, or by an admin script. A refresh reads every `users` doc and every Attendance (a few thousand reads), so it is never run per change.
- Other Members' standings lag by up to the refresh interval; the board says when it was refreshed.
- Tokens don't rotate. Someone watching the snapshot over time can follow one anonymous score between refreshes, but putting a name to it needs outside knowledge of that Member's points, and the board already shows Neighboring Ranks' scores. Rotating would cost a write per Member per refresh.
- E-Board are not ranked, and Members with no points are never in Top Ranks (see CONTEXT.md).
