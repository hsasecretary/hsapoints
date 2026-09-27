# Cabinet Member Tier 1: showing Missed Events without overload

Researched 2026-09-27 against the current `/requirements` page (`frontend/src/pages/requirements/YearBoard.tsx`, `ToMakeUp.tsx`) and the "What's left first" prototype (variant B, `standingPrototype/VariantB.tsx` at `8ea52f5`).

## The question

A Cabinet Member has to attend every Core Event (Tier 1), about 15–25 a year. A Missed Event must be made up by an Additional Event, and an unexcused one also carries a Strike. Today `/requirements` shows Tier 1 as a year board: one coloured, tappable tile per Core Event grouped by month, five states (attended, made up, to make up, to make up + Strike, coming up), a five-item colour key, and a detail line for the tapped tile. The "To make up" cards at the bottom of the page list the same open misses again. Coworkers say it's information overload, cramped on a phone, and will get worse as the year fills up. What should Tier 1 show so a Member sees at once what they've missed and must make up, and nothing they don't need?

## Findings

### Show the exceptions, summarise the rest

- **Progressive disclosure.** Show the few most important things first and move rarely needed detail to a secondary level. The way to reach that level must be obvious, and its label should set "clear expectations" for what's behind it ([Nielsen 2006](https://www.nngroup.com/articles/progressive-disclosure/)). For Tier 1 the frequent question is "what do I still owe?". The full attendance history is the rare one.
- **Apple says the same about disclosure.** "Use a disclosure control to hide details until they're relevant." Put the most-used information at the top, always visible, and give the control a label that says what it hides ([HIG: Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls)).
- **Cut extraneous load.** Decoding a colour key and remembering which tile is which is extraneous load, the kind worth removing ([Whitenton 2013](https://www.nngroup.com/articles/minimize-cognitive-load/)). A five-colour legend and 20+ tiles ask the Member to hold several colour-to-meaning pairs in mind while scanning.
- **De-emphasise what's done.** GOV.UK redesigned its task list so "Completed" is plain black text with no coloured tag. The stated reason: it "will draw more attention to tasks that require action" ([GOV.UK task list](https://design-system.service.gov.uk/components/task-list/)). Its pattern page adds: make clear "which tasks they've completed and which still need their attention" ([GOV.UK: Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)). The current board does the opposite: attended tiles are the darkest, most saturated fill (`--hsa-teal-700`), so the finished items are the loudest thing on screen.
- **Keep the number of statuses small.** GOV.UK: "start with the smallest number of statuses you think might work" because more are harder to remember ([GOV.UK tag](https://design-system.service.gov.uk/components/tag/)). The board has five, plus a detail-only sixth ("Missed. Nothing to make up.") and HLHM's "by" state.
- **A count is not something GOV.UK prescribes.** Its task-list pattern relies on per-task status, not an "X of Y" line ([GOV.UK: Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)). A summary line like "12 of 14 attended" is still consistent with progressive disclosure: it's the collapsed header's preview of what's inside ([Budiu 2015](https://www.nngroup.com/articles/mobile-accordions/)). NN/g also found digits catch the eye in scanning ([Nielsen 2007](https://www.nngroup.com/articles/web-writing-show-numbers-as-numerals/)).

### Status without relying on colour

- **WCAG 1.4.1.** Colour must not be "the only visual means of conveying information" ([Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)). On the board, a tile's state (attended vs made up vs to make up vs coming up) is carried by fill and border only: the tile text is just the event name and date. The legend doesn't fix this, since matching tile to key is still by colour. Only the Strike dot has an `aria-label`, and that helps screen readers, not sighted colour-blind users.
- **WCAG 1.4.11.** State indicators and graphics needed to understand content need 3:1 against adjacent colours, unless text carries the same information ([Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)). If every row says its status in words, the colour becomes decoration and this constraint relaxes.
- **Apple.** "Avoid relying solely on color" ([HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color)); offer "distinct shapes or icons, in addition to color" for state changes ([HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)).
- **Icons need words.** NN/g: a text label "must be present alongside an icon" to fix its meaning; only a handful of icons are universally understood ([Harley 2014](https://www.nngroup.com/articles/icon-usability/)). A check mark plus "Attended" is fine; a check mark alone, or a coloured dot for Strike, is not.
- **Tags are for status, sparingly.** GOV.UK tags show status, should use adjectives, must not use "colour alone", and keep the same colour wherever the same tag appears ([GOV.UK tag](https://design-system.service.gov.uk/components/tag/)). Tags aren't buttons, so the "Make up event" action should look like a button, not a tag.
- **No legend needed.** Once every row states its status in words, a key is redundant. That's also one less thing on a phone screen.

### List vs grid on a phone

- **Lists suit text.** Apple: "Prefer displaying text in a list or table"; the row format is "especially well suited" to scanning ([HIG: Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)). Material 3 describes lists as "continuous, vertical indexes of text and images" ([M3 Lists](https://m3.material.io/components/lists/guidelines)). NN/g: list view is "space efficient"; card/grid views are "visually engaging" ([NN/g video: Card vs list](https://www.nngroup.com/videos/card-view-vs-list-view/)). NN/g's mobile comparisons favour grids only when images carry the difference between items (products), and text lists otherwise ([Mobile navigation: image grids or text lists](https://www.nngroup.com/articles/image-vs-list-mobile-navigation/)). Core Events are text (a name and a date), so a list fits.
- **Chronological order.** A vertical list keeps one reading order (oldest to newest, or newest first). The board's `auto-fill, minmax(104px, 1fr)` grid reflows to 2–3 tiles per row on a phone, so tiles in the same month wrap unpredictably and the month labels stop lining up.
- **Target size.** WCAG 2.5.8 needs at least 24×24 CSS px or enough spacing ([Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). Apple's default is 44×44 pt ([HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). Material 3 recommends at least 48×48 dp ([M3 Accessibility: structure](https://m3.material.io/foundations/designing/structure)). The board tiles are large enough, but the whole point of tapping them (revealing a detail line) disappears if the row already says everything. A list where only "Make up event" and the disclosure summary are tappable has fewer targets, each easy to hit at 44–48 px tall.

### Action next to the item

- **Proximity.** Items close together are seen as one group; users with task "tunnel vision" miss things placed far from the content they relate to ([NN/g: Proximity](https://www.nngroup.com/articles/gestalt-proximity/)). Indicators should sit "in close proximity" to the element they describe ([NN/g: Indicators](https://www.nngroup.com/articles/indicators-validations-notifications/)).
- **The same misses appear twice today.** An open miss is a tile at the top (its button only shows after tapping it), and a card with a "Make up event" button at the bottom, below the whole Tier 2 grid. Putting the button on the miss's own row at the top removes both the tap and the scroll.
- **Row actions.** GOV.UK's summary list puts each row's action at the end of that row, with visually hidden text naming what it acts on (e.g. "Change name") ([GOV.UK summary list](https://design-system.service.gov.uk/components/summary-list/)). The same applies to "Make up event": screen reader users need "Make up event: GBM, Sep 12", not five identical button names.
- **Empty states.** NN/g: say what the status is in the content area, give in-context help, and link to the next task ([NN/g: Empty states](https://www.nngroup.com/articles/empty-state-interface-design/)). A blank Tier 1 section would read as "loading" or "broken". "Nothing to make up. You're all caught up." states the status. Adding the next Core Event gives a direct pathway.

### Past, complete items

- **Collapse them.** GOV.UK Details is for information "only some users will need", and must not hide what "the majority of your users will need" ([GOV.UK details](https://design-system.service.gov.uk/components/details/)). The attended-events history fits: useful to check, not needed on every visit. Open misses must never be inside it.
- **Label the disclosure with its content.** Apple: labels should say what's hidden ([HIG: Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls)); NN/g: headers act as a preview so users "see the big picture" before opening ([Budiu 2015](https://www.nngroup.com/articles/mobile-accordions/)). "12 of 14 attended" as the summary text does both.
- **Accessible mechanics.** A native `<details>`/`<summary>` gives the WAI-ARIA disclosure behaviour (a button with expanded/collapsed state, toggled by Enter and Space) without custom code ([WAI-ARIA APG: Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)). Opening it shouldn't jump the scroll, and long open sections should be easy to close ([Budiu 2015](https://www.nngroup.com/articles/mobile-accordions/)).
- **Only one.** Apple: "Use no more than one disclosure button in a single view" ([HIG: Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls)). One "all Core Events" disclosure for Tier 1 is enough; don't nest per-month disclosures.

## How the two options score

**Current year board (variant D)**
- Strengths: the whole year at a glance; the month grouping shows when misses happened.
- Risks: status is colour-only on the tiles (1.4.1), so it needs a five-item legend. Done items are the most saturated, so they compete with the misses. The action is hidden behind a tap and a detail line. Grid wrapping on a phone breaks the month rows. It grows linearly with the year: 25 tiles by April. Misses are shown twice on the page.

**To-do list (variant B)**
- Strengths: leads with what's owed, one row per open Missed Event with the action on the row, a clear "all caught up" state, and completed items folded into `<details>` with a count in the summary. Every status is words, so no legend. Grows only with misses, not with the calendar.
- Risks: the Member loses the at-a-glance year; B's "Done so far" splits Core Events, Semester Requirements and Make-ups into three disclosures, which is more than Tier 1 needs. B also leaves upcoming Core Events as a sentence, which is fine.

## Recommendation for Tier 1

Replace the year board with a variant-B-style list. Keep one place for misses (the top), and move the full year behind a single disclosure.

1. **Heading and summary line.** "Tier 1: Core Events", then one sentence: "2 Missed Events to make up · 1 Strike" or, when clear, "All caught up · 12 of 14 attended so far" (the 2 remaining being "made up" still counts as caught up). Keep the existing Strike slots only once three or more are near (`atRisk`), with the "You'll meet with E-Board…" line. Otherwise the Strike count in the sentence is enough.
2. **Shown by default: open Missed Events only**, oldest first, one row each: event name, "Missed Sep 12", a "Strike" tag when it carries one (text tag, the warm colour, never a dot alone), and a "Make up event" button at the row's end (min 44 px tall; accessible name "Make up event: GBM, Sep 12"). If a Point Request already names it, replace the button with the plain text "Make-up pending review". One hint line above the list: "Any Additional Event makes up the oldest one with a Strike first."
3. **Empty state.** No open misses: "Nothing to make up. You're all caught up." plus the next Core Event ("Next: Cabinet Thursday, Oct 2"). No Core Events coded yet: "No Core Events yet this year."
4. **Coming up.** One line, not tiles: "Next: GBM on Oct 2". If HLHM isn't done: "Go to one HLHM event by Oct 15."
5. **Collapsed by default: one `<details>`** with the summary "All Core Events this year · 12 of 14 attended". Inside, a plain chronological list (month subheads are fine) where each row states its status in words, with an icon only as a helper: "Attended", "Made up by Tabling, Oct 3" (and "cleared its Strike" when true), "Missed, nothing to make up" (E-Board closed it), "Missed, to make up" (it also appears above), "Coming up". Completed rows are plain text with no coloured fill, following GOV.UK. No legend anywhere.
6. **Surplus.** Keep the "is an extra event, it will make up your next miss" line directly under the to-make-up list, since it relates to it.
7. **Remove** the tile board, the five-item key, the tapped-tile detail line, and the bottom "To make up" section (its content moves to step 2).
8. **Mobile.** Single column, full-width rows, button on the same row when it fits and wrapped under the name below ~360 px; nothing requires a tap to reveal status. Opening the disclosure must not jump the scroll.

Judgment calls, not proven by the sources: whether "12 of 14 attended" should count made-up misses as attended (I'd say no, and keep "made up" separate inside the disclosure), and whether upcoming events are worth a line at all. Both are quick to test with two or three Cabinet Members.

## Sources

- W3C, WCAG 2.2 Understanding 1.4.1 Use of Color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- W3C, WCAG 2.2 Understanding 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- W3C, WCAG 2.2 Understanding 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C WAI-ARIA Authoring Practices, Disclosure (Show/Hide) pattern: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- Nielsen, J. (2006). Progressive Disclosure. NN/g: https://www.nngroup.com/articles/progressive-disclosure/
- Nielsen, J. (2007). Show Numbers as Numerals. NN/g: https://www.nngroup.com/articles/web-writing-show-numbers-as-numerals/
- Whitenton, K. (2013). Minimize Cognitive Load. NN/g: https://www.nngroup.com/articles/minimize-cognitive-load/
- Budiu, R. (2015). Accordions on Mobile. NN/g: https://www.nngroup.com/articles/mobile-accordions/
- Harley, A. (2014). Icon Usability. NN/g: https://www.nngroup.com/articles/icon-usability/
- NN/g, Proximity Principle in Visual Design: https://www.nngroup.com/articles/gestalt-proximity/
- NN/g, Indicators, Validations, and Notifications: https://www.nngroup.com/articles/indicators-validations-notifications/
- NN/g, Designing Empty States in Complex Applications: https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g, Card View vs. List View (video): https://www.nngroup.com/videos/card-view-vs-list-view/
- NN/g, Mobile Navigation: Image Grids or Text Lists?: https://www.nngroup.com/articles/image-vs-list-mobile-navigation/
- Apple Human Interface Guidelines, Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple Human Interface Guidelines, Color: https://developer.apple.com/design/human-interface-guidelines/color
- Apple Human Interface Guidelines, Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Apple Human Interface Guidelines, Disclosure controls: https://developer.apple.com/design/human-interface-guidelines/disclosure-controls
- Apple Human Interface Guidelines, Lists and tables: https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
- Material Design 3, Lists guidelines: https://m3.material.io/components/lists/guidelines
- Material Design 3, Accessibility designing (structure, touch targets): https://m3.material.io/foundations/designing/structure
- GOV.UK Design System, Task list: https://design-system.service.gov.uk/components/task-list/
- GOV.UK Design System, Complete multiple tasks: https://design-system.service.gov.uk/patterns/complete-multiple-tasks/
- GOV.UK Design System, Tag: https://design-system.service.gov.uk/components/tag/
- GOV.UK Design System, Summary list: https://design-system.service.gov.uk/components/summary-list/
- GOV.UK Design System, Details: https://design-system.service.gov.uk/components/details/
- Material 3 pages render client-side, so their two claims were taken from search-indexed page text rather than a direct fetch.
