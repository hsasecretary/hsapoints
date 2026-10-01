# Upcoming events on the dashboard: mobile UX

Researched 2026-10-01 against `frontend/src/pages/dashboard/prototype-upcoming/` (events.ts, Variants.tsx, ISSUE-DRAFT.md; variants A, B, C on `?variant=`).

## The question

Which layout is the most functional and visual for an "Upcoming events" section on `/dashboard`, with phones as the primary device (college students; fixed bottom tab bar under 600px; content column max 720px)? Variants so far: **A** agenda list with category filter chips, **B** spotlight hero plus horizontal poster strip, **C** month grid with day detail. Data: Google Calendar title and date/time only; categories hand-tagged by E-Board; only GBM has photos, so most events fall back to a coloured poster tile. October 2026 has about 32 events, of which 7 are noise (hidden) and 4 Cabinet-only.

## Findings

### Scanning and lists

- People scan, they don't read. In NN/g's eyetracking of 232 users, attention runs down the left edge and the first words of each line get the most attention; the follow-up study 11 years later confirmed it ([NN/g, F-shaped pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/)). So the date and title belong at the start of each row, left-aligned.
- Cards suit heterogeneous content. They "deemphasize the ranking of content" and are less scannable than lists. For uniform collections (here: events, all title + date), a list or grid is preferable ([NN/g, Cards](https://www.nngroup.com/articles/cards-component/)).
- Calendar widgets pay off for near-term dates ("less than a year") when the task is picking a date ([NN/g, Date input](https://www.nngroup.com/articles/date-input/)). That article is about *input*; I found no NN/g primary study on month grids as a *browse* view on mobile, so "a grid is slow to browse on a phone" is my inference, not a verified result.

### Horizontal scrolling and carousels

- Mobile carousels are easy to miss. Dots are "generally weak signifiers"; a partially visible next item is a much stronger cue. Most people stop after 3-4 items, so put the most relevant first, keep the last item reachable in 3-4 swipes, and give critical content another path ([NN/g, Mobile carousels](https://www.nngroup.com/articles/mobile-carousels/)). The first item acts as a preview; if it's dull, people don't continue (same source).
- NN/g's horizontal-scroll study is desktop-only (users ignore even visible arrows; keep alternative navigation), so it doesn't transfer to phones directly ([NN/g, Horizontal scrolling](https://www.nngroup.com/articles/horizontal-scrolling/)). On mobile tables NN/g says to signal off-screen content with a cut-off element ([NN/g, Mobile tables](https://www.nngroup.com/articles/mobile-tables/)).
- Material's carousel has "hero" and "multi-browse" layouts; hero is for "large content, like movies and other media" ([Material Components Android: Carousel](https://github.com/material-components/material-components-android/blob/master/docs/components/Carousel.md)). Poster-style hero fits media with real artwork, which most of our events don't have. (The m3.material.io pages are JS-rendered and returned no text, so I used the Android docs.)
- Reflow (WCAG 1.4.10): vertical content must work at 320 CSS px without two-dimensional scrolling, except for content that needs it, such as data tables and grids, maps. The exception covers only that content, not text beside it ([W3C, Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)). A horizontal poster strip is a judgment call under this rule (see open questions); a month grid fits the "grid" exception.

### Touch targets and chips

- WCAG 2.5.8 (AA): targets at least 24x24 CSS px, or a 24px circle around each that doesn't hit another target ([W3C, Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). Platform defaults are larger: 44x44pt Apple, 48dp Android, as cited in `dashboard-navbar.md` ([Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility); [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps)). The HIG layout page is JS-rendered and I couldn't re-verify the number here.
- Material filter chips are for narrowing content by tags, with a 48dp minimum touch target; a single scrolling row needs a horizontal scroll container ([Material Components Android: Chip](https://github.com/material-components/material-components-android/blob/master/docs/components/Chip.md)). A 10-chip category row therefore overflows a 360px phone and hides chips off-screen.
- A calendar cell 1/7 of a 360px column is about 46px wide, so day cells can meet 44px if cell height is also at least 44px. (Arithmetic, not a cited claim.)

### Performance

- Aim for LCP of 2.5s or less at the 75th percentile; over 4.0s is poor ([web.dev, LCP](https://web.dev/articles/lcp)). CLS 0.1 or less; images with unknown dimensions are a named cause ([web.dev, CLS](https://web.dev/articles/cls)).
- Use `loading="lazy"` below the fold, never on likely-in-viewport images, and always set `width` and `height` ([web.dev, lazy loading](https://web.dev/articles/browser-level-image-lazy-loading)). In CSS terms, give thumbnails a fixed `aspect-ratio` box so photo and tile variants take identical space.
- Poster tiles (colour plus glyph) cost zero image bytes. That is an inference from the above, and it also removes any LCP risk from the events section.

### Google Calendar feasibility

- `events.list` takes `singleEvents` (expands recurring events into instances), `orderBy=startTime` (only valid with `singleEvents=true`), `timeMin`/`timeMax` (RFC3339) and `maxResults` up to 2500. "Authorization is optional for public calendars" ([Google, events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)). So a 30-day window with `singleEvents=true&orderBy=startTime` is one small request.
- Making the calendar public exposes all event titles and descriptions unless set to free/busy ([Google Calendar Help](https://support.google.com/calendar/answer/37083)). Check that no private titles sit on this calendar.
- Quota is 10,000 requests per minute per project and 1,000,000 per day before billing ([Google, Usage limits](https://developers.google.com/workspace/calendar/api/guides/quota)). Client-side fetching won't hit that at HSA scale.
- Not verified at a primary source: whether a browser-exposed API key is acceptable practice and how to restrict it by HTTP referrer. The pages I fetched don't cover it. The caching alternative (a script writes to Firestore) avoids the question.

### Not verified

- "Thumb zone" reachability. The Apple layout page returned no text and I found no primary Material/Apple/NN/g statement. I use only the weaker, cited rule that nav lives at the bottom ([dashboard-navbar.md](dashboard-navbar.md)) and treat reach as a soft factor.

## Evaluation

| Principle | A: agenda + chips | B: spotlight + strip | C: month grid + detail |
|---|---|---|---|
| Scan speed | Best: one vertical list, date first, left-aligned | Good for the next event, weak for the rest (strip hides items) | Slow: dots only, every event costs a tap |
| Touch target | Rows are full-width (fine). Chips need 44px height | Strip cards large. Fine | Cells about 46px wide if height matches. Tight but OK |
| Horizontal discoverability | Chip row scrolls sideways; hidden chips unless cut off at the edge | Strip depends on a peeking card; NN/g says dots and arrows are weak | None, grid fits 320px |
| Photo-less events | Small thumbnail or tile: a tile is fine at 56px | Hero and poster cards look empty with a glyph tile; worst fit | No photos needed; colour dots |
| Dense days (Oct 2: 2 events) | Two rows, natural | Two posters side by side, works | Cell shows 2 dots, detail on tap; 3+ gets cramped |
| Recurring/noise | Filter chips or a collapsed "Weekly" group handle it; list gets long | Strip must drop them or it floods | Dots multiply (Familia Fridays x4) |
| Mobile data | Thumbnails only, lazy-loadable | Hero is an LCP candidate and the strip is the heaviest | Lightest: no images |

**Verdict.** A has the best scan speed and handles photo-less and dense days without extra work, but chips are the weak spot on a phone. B's visual appeal depends on art we mostly lack, and its strip is the carousel pattern NN/g warns about. C answers "what's on my day?", which a student rarely asks first; it is the slowest way to answer "what's next?".

## Recommendation

**Hybrid: A's vertical agenda as the spine, with a B-style "Next up" card on top, and C demoted to an optional "Month" link.** The default section shows:

1. one **Next up** card (the nearest visible event), and
2. an **agenda list** of the next ~6 events grouped by date, with "See all" expanding or linking to the full list.

Everything primary is vertical, so there is no discoverability problem and no horizontal scroll to justify against reflow.

### Variant D: "Next up + agenda" (recommended build)

- **Layout.** Section heading "Upcoming events" with "See all" at right (44px target).
  - *Next up card*: full column width, fixed `aspect-ratio: 16/9`. Photo if the event has one, else the category-coloured poster tile with glyph. Overlay is a scrim at the bottom with date line ("Fri Oct 2 · 5pm · Tomorrow") and title, large and left-aligned. Whole card is one link target.
  - *Agenda*: below, rows grouped under a date header ("Fri, Oct 2"). Each row is at least 56px tall: title first (one line, truncate with ellipsis, wrap allowed to 2), time and category tag as a second line, a 48x48 thumbnail or tile on the right. Two events on one date sit under one header (Oct 2).
- **Hierarchy.** Date header, then title, then time, then category. Colour never carries the category alone: always the label text.
- **Interaction.** Tap a row to expand inline (time, full title, "Add to calendar" link, and the "Make up event" link when it has a code); no navigation away. Show 6 rows, then a "Show more" button (44px high) rather than infinite scroll, so the tab bar and footer stay reachable.
- **No-photo state.** Tile uses the category colour with the glyph and no lorem image. Tile and photo share the same box, so nothing shifts when images load. Skip the random-category-photo fallback from the prototype; a mismatched photo is more misleading than a tile (my judgment, no primary source).
- **Empty state.** "Nothing scheduled yet. Check back soon." with a "Add the HSA calendar" link; never an empty box.
- **Noise/recurring.** Hidden flag drops NO SCHOOL, football and the like. Recurring items (Familia Fridays) collapse into one "Every Friday, 10am" line under the list, not four rows. Cabinet-only appear only in the Cabinet view, with a "Cabinet" tag.
- **Performance.** Next up image gets no `loading=lazy` if above the fold; thumbnails do. All images have width/height or `aspect-ratio`. Fetch one 30-day `singleEvents=true` window.

### Variant E: "This week + filter sheet" (alternative if the list gets long)

- **Layout.** Three stacked groups: **Today**, **This week**, **Later** (collapsed to "N more"). Rows as in D, but no hero card, which is lighter and works when no event has a photo.
- **Filter.** Replace the scrolling chip row with one 44px "Filter" button that opens a bottom sheet with category checkboxes (all visible at once, no hidden chips). Active filters show as a count on the button.
- **Month view.** A "Month" text link opens C's grid as a secondary page, for people who want to plan ahead.
- **States.** Photo-less rows use the tile. Empty group headers are hidden.

D leans on visuals and works when photos exist; E leans on function and degrades better with none.

## Open questions

1. Is a horizontal poster strip acceptable at all? WCAG 1.4.10's exceptions don't clearly cover carousels, and NN/g's carousel guidance is cautionary. D and E avoid the question.
2. Does the E-Board have, or want to make, any photos beyond GBM? If not, D's hero card is a coloured rectangle with a glyph, and E may be the better choice.
3. Should the Next up card follow the Overview's primary job (the code box) or sit below it? A tab-bar user on a 640px viewport may not scroll that far.
4. Public API key in the browser (needs verification of referrer restriction) vs a scheduled script writing a cache to Firestore.
5. Recurring series: collapse to one line (proposed), or let E-Board hide per series?
6. Is the E-Board tagging flow (category, hidden flag) needed before launch, or do untagged events show as "Other" with the neutral tile?
7. No primary source found for a month grid beating or losing to a list for browsing events on mobile; worth a 5-person test of A vs D vs C with real members.
