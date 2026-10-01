# Upcoming events on the dashboard (from the UF HSA Google Calendar)

## What
A section on `/dashboard` listing what's coming up, pulled from the UF HSA Google Calendar. We read only the **title** and **date/time**. The category (and any photo) is tagged by hand by E-Board, no LLM.

## Prototype
Branch `prototype/upcoming-events`, three layouts on `/dashboard?variant=A|B|C` (arrow keys switch):
- **A, Agenda list**: date chip, title, category tag, thumbnail; filter chips by category.
- **B, Spotlight**: big "next event" card + swipeable poster strip.
- **C, Month calendar**: category-coloured dots per day, tap a day for details.

Sample data is the October 2026 calendar. Run: `cd frontend && npm run dev`, sign in, open `/dashboard`.

## The hard part: events with no past photos
New events (Volleyball Tournament, Cardmaking, Color Run…) have no photo. Prototype rule, in order:
1. A photo hand-picked for that event
2. Otherwise a random photo from the event's **category** pool (e.g. any past GBM)
3. Otherwise a coloured **poster tile** (category colour + glyph)

## Open questions (decide before building)
- Which layout (or which pieces of each)?
- Category list: reuse `lib/rubric.ts` Event Types, or a smaller display-only list (GBM, HLHM, MLP, OPA, Fundraiser, Service, Social, Cabinet, Tabling)?
- Where does the tag live? Idea: `eventTags/{calendarEventId}` in Firestore, edited by E-Board on a new `/eboard/*` tool; untagged events show as "Other".
- Noise events (NO SCHOOL, football, parade): a `hidden` flag.
- Recurring items (Cabinet Thursday, Familia Fridays): hide, collapse, or show? Cabinet-only should only show in the Cabinet view.
- Where do photos live? Firebase Storage vs. committed to the repo (size!).
- Calendar access: public calendar API key from the client, or a scheduled script writing a cache to Firestore (no Cloud Functions here)?
- Should an upcoming event link to its code / "Make up event" flow?

## Tasks (for web members)
- [ ] Calendar fetch + title/date parser (+ unit tests, pure logic)
- [ ] Tag store + E-Board tagging tool
- [ ] Photo pool: upload/curate past-year photos per category
- [ ] Dashboard section (winning layout), mobile-first
- [ ] Fallback poster tiles
