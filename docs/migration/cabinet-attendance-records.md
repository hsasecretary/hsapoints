# Cabinet attendance records outside Firestore

Where attendance for events before the site had codes for them lives, so the migration can turn it into Attendance. Resolves [#61](https://github.com/hsasecretary/hsapoints/issues/61). The responses are Google Form exports that E-Board holds; they contain member data and are **never committed**. Counts only below, taken 2026-09-24 and compared with the Firestore snapshot from [#41](https://github.com/hsasecretary/hsapoints/issues/41).

## The records

| Event | Date | Source | Responses | Answers |
|---|---|---|---|---|
| Cabinet Orientation | Jul 30 | Cabinet Orientation Attendance Form | 53 (52 people; one submitted twice) | "Did you attend?": all 53 Yes |
| Cabinet Retreat | Aug 22 | Cabinet Retreat Attendance Form | 53 people | "Did you attend?": 52 Yes, 1 No |
| Cabinet Thursday | Aug 27 | 08/27 Cabinet Attendance Form | 63 people | Attendance code `Primero`: all 63 correct |
| Open House Social | Aug 28 | HSA Open House Social Attendance Form | 42 people | Photo proof on every response |

**Format.** The three cabinet forms share one shape: Timestamp, Email Address, "Name (First and Last)", "What Cabinet are you a part of?", and one attendance question. The cabinet answer uses the display labels from `lib/roles.ts` (`Presidential`, `Treasury`, `MLP Fall`, …), so it maps to a stored `cabinet` value through `cabinets`. The Open House form is a general proof form instead: separate First/Last Name, a free-text event name (19 spellings of "Open House" / "Casita Social", plus one "Game Night" and one "Intro"), date of event (all Aug 28), and a Google Drive photo link.

**When people submitted.** Orientation from Jul 30 evening to Jul 31; Retreat within two hours on Aug 22; the Aug 27 form stayed open until Sep 1, so some entries came days late. Open House all on Aug 28.

**Who is on them.** Self-reported cabinets, by form:

| Cabinet | Orientation | Retreat | Aug 27 |
|---|---|---|---|
| Communications | 10 | 10 | 10 |
| Programming | 9 | 10 | 11 |
| MLP Fall | 11 | 9 | 10 |
| MLP Spring | 7 | 4 | 10 |
| Office of Political Affairs | 6 | 7 | 8 |
| Operations | 5 | 7 | 4 |
| Secretary | 4 | 3 | 5 |
| Treasury | 1 | 2 | 3 |
| Presidential | 0 | 1 | 2 |

Firestore has 74 users holding a cabinet value, so each form is short of the full roster by 11–22 people. Only 29 people are on both the Orientation and Retreat forms, 36 on Orientation and Aug 27, 39 on Retreat and Aug 27.

**Excuses: none recorded.** No form asked for an excuse, and the one Retreat "No" has no reason attached. No "Valid Excuse Form" responses were among what E-Board sent. Under the policy an excuse had to reach the Secretary before the event, so if that form was live on Jul 30 / Aug 22, its responses are the only place excuses for these two events can be. _Deliberately left for later:_ those responses will be entered after the new system ships, as a bulk test of Excused Absences and Strike removal.

## What the migration has to deal with

1. **Emails don't all match a Member.** 37 of 53 Orientation, 38 of 53 Retreat, 51 of 63 Aug 27 and 33 of 42 Open House emails match a `users/{email}` doc. Almost every miss is a personal (Gmail etc.) address; each cabinet form also has one email typed with capitals, so match case-insensitively. Matching the rest means joining on name against `users.firstName`/`lastName` and a human checking the leftovers.
2. **The Aug 27 Cabinet Thursday isn't in Firestore.** The two Cabinet codes there are 09/10 and 09/17, so Aug 27 (and any Cabinet Thursday between it and 09/10) exists only as a form. It needs a code or ledger entry of its own, or the migration will count nobody as having attended it.
3. **A missing name is not yet a Missed Event.** People absent from a form may have been excused, may not have been on Cabinet yet (Orientation was in July), or may have filled in the form with an email that doesn't match. With no excuse records, turning absences into Strikes retroactively needs E-Board to confirm the roster for each date first.
4. **The one Retreat "No"** is a response that must *not* become Attendance.
5. **Open House Social is a social**, not a cabinet event. Which social Event Type it is (Internal or External) is an E-Board call; see disagreement 4 in [the policy transcription](../policy/cabinet-attendance-policy-2026-27.md#where-the-sources-disagree).
6. **The Orientation duplicate** must collapse to one Attendance (the ledger's deterministic ID already guarantees this).
