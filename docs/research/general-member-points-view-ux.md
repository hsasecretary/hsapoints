# General Member points view: what UX research says (#59)

Researched 2026-09-25 against the three prototypes in `frontend/src/pages/dashboard/generalPrototype/` (A "Big number + dropdowns", B "Split bar + filter chips", C "Punch card + ledger").

## The question

A General Member, mostly on a phone, opens Overview under a big event-code box. What should the points summary and the "Points & events" panel look like? The summary needs Total Points toward 15 (8 for MLP Spring), points by category with the events behind each group, and Events Attended. Which of A, B or C does design research favour, and what should change?

## Findings

### Progress toward a goal

- **Length and position are read most accurately; colour does not carry quantity.** Cleveland and McGill ranked elementary perceptual tasks: position on a common scale first, then length, then angle, then area, with colour lower still ([Cleveland & McGill 1984](https://doi.org/10.1080/01621459.1984.10478080)). NN/g applies this to dashboards and says colour is not seen as ordered, so it should only be a "secondary grouping cue" ([Laubheimer 2017](https://www.nngroup.com/articles/dashboards-preattentive/)). A single bar from 0 to 15 is the most accurate way to show "how far along am I".
- **Stacked segments are harder to compare.** In a stacked bar, only the first segment sits on the common baseline. Every other segment has to be judged by length on an unaligned baseline, which ranks lower in the same study ([Cleveland & McGill 1984](https://doi.org/10.1080/01621459.1984.10478080)). B's bar is still fine for "how much in total", but it doesn't help people compare categories unless the numbers are printed.
- **Motivation rises near the goal.** Coffee-card customers bought more often the closer they got to the free coffee. A 12-stamp card that started with 2 bonus stamps was completed faster than a plain 10-stamp card, and purchase rates dropped back after the reward ([Kivetz, Urminsky & Zheng 2006](https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf)). Nunes and Drèze found the same "endowed progress" effect with car-wash cards ([2006](https://academic.oup.com/jcr/article-abstract/32/4/504/1787425)). This supports making the distance to the goal very clear ("6 more"). It does **not** show that circles beat a bar: both studies used stamp cards, and neither compared card formats. Pre-stamping is not an option here, because VE Points decide real voting rights.

### Showing the key number

- **Numerals catch the eye.** NN/g's eyetracking found that digits "often stop the wandering eye and attract fixations" ([Nielsen 2007](https://www.nngroup.com/articles/web-writing-show-numbers-as-numerals/)). A large "9" and a sentence that starts with a digit ("6 more to be voter eligible") work with how people scan.

### Cognitive load and progressive disclosure

- NN/g defines cognitive load as the mental resources needed to use a system. Extraneous load (clutter, decoding) is the kind to cut ([Whitenton 2013](https://www.nngroup.com/articles/minimize-cognitive-load/)). Working memory holds about four chunks ([Cowan 2001](https://doi.org/10.1017/S0140525X01003922); the older "7±2" is from [Miller 1956](https://doi.org/10.1037/h0043158)). A legend of up to 10 colour-to-name pairs is more than that, so people end up looking back and forth between the bar and the legend.
- Progressive disclosure means showing the few most important things first and the rest on request. The key is to put "everything that users frequently need" up front ([Nielsen 2006](https://www.nngroup.com/articles/progressive-disclosure/)). The frequent question is "how many points, how many to go". "Which category" is the secondary one.

### Accordions, toggles and chips on mobile

- NN/g says accordions suit mobile because they give "the big picture before focusing on details". Opening one shouldn't jump the scroll position, and long open sections are a risk ([Budiu 2015](https://www.nngroup.com/articles/mobile-accordions/)). Use them when people need only a few pieces of the content, and avoid them when people need most of it ([Wang 2023](https://www.nngroup.com/articles/accordions-on-desktop/)).
- Tabs and segmented toggles work when users "don't need to simultaneously see" both views ([Sunwall 2024](https://www.nngroup.com/articles/tabs-used-right/)). Material 3 segmented buttons are for 2–5 options and point to filter chips when there are more than five ([Flutter/Material SegmentedButton](https://api.flutter.dev/flutter/material/SegmentedButton-class.html)). Filter chips "clearly delineate and display options in a compact area", and a checkmark shows the selected one ([Material Components Chip](https://github.com/material-components/material-components-android/blob/master/docs/components/Chip.md)). So A's 2-option toggle and B's 11 chips (All plus 10 groups) both follow Material's own guidance. Eleven chips will wrap to two or three rows on a phone, though.
- Targets must be at least 24×24 CSS px, or spaced out to make up for it ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). All three prototypes' controls clear this.

### Colour for up to 10 categories

- **Seven is about the ceiling.** Healey found "seven isoluminant colours is the maximum" that still allow rapid, accurate identification. In his nine-colour study, error rose to 8.1% on average and about 14% for some targets ([Healey 1996](https://vis.cs.brown.edu/docs/pdf/Healey-1996-CEC.pdf)). Ten category colours is past that, even for people with typical colour vision.
- **Colour-vision deficiency.** It affects up to 8% of men and 0.5% of women ([Laubheimer 2017](https://www.nngroup.com/articles/dashboards-preattentive/)). I simulated the prototype's `GROUPS` palette (Machado deuteranopia and protanopia matrices, CIELAB ΔE). Several pairs collapse to ΔE ≈ 6–12, which is hard to tell apart in small marks: Operations and the pending amber, Service and OPA, Programming and Socials, Tabling and Socials, and GBMs and MLP (protan).
- **WCAG 1.4.1 Use of Color.** Colour can't be the only means of conveying information. Text or pattern must carry it too ([Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)). Apple says the same: "avoid relying solely on color" and use text labels or glyph shapes ([HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color)). B's legend prints each group's points, so it technically passes. In practice, matching a segment to its legend entry still depends on colour alone.
- **WCAG 1.4.11 Non-text Contrast.** Graphics needed to understand content must reach 3:1 against adjacent colours. The exception is when text labels and values carry the same information ([Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)). I measured the palette against the `#f1f5f9` track. Five of the ten group colours fall below 3:1: Programming 1.69, Operations 1.78, Affiliates 1.86, Socials 2.34, Tabling 2.53. The pending amber stripes are 1.50. B and C only pass through the text-equivalent exception. A's teal fill is 7.2:1. The same criterion requires 3:1 for selected-state indicators on toggles and chips.

## How the variants score

**A: Big number + dropdowns**
- Strengths: one number, one single-hue bar (the most accurate encoding) and a "6 more" sentence. That's the minimum load and exactly the frequent need. The panel uses a 2-option toggle and accordions with the points sum on each closed header, which is progressive disclosure done by the book. No accessibility issues from colour.
- Risks: nothing about categories or Events Attended is visible until the panel is opened. The ticket lists Events Attended, but its count only appears inside the toggle label. The bar is continuous, so "6 more" has to be read rather than seen. The pending stripes rely on the adjacent text for contrast.

**B: Split bar + filter chips**
- Strengths: shows the category mix at a glance. A single filtered list is a clean panel, and chips fit more than 5 options.
- Risks: 10 colours is past Healey's ceiling, and several pairs collide under CVD. Five colours fail 3:1. The legend adds up to 10 colour-name pairs to an above-the-fold summary. Stacked segments are the weakest bar encoding for comparing categories. The user's "information overload" instinct matches the evidence.

**C: Punch card + ledger**
- Strengths: countable units fit the loyalty-card framing the goal-gradient studies used. The running total and the "Reached 15" line make the goal moment explicit.
- Risks: it has the same 10-colour problem as B, per circle. 15+ circles wrap on a phone and grow past the goal. The panel stacks two full sections (groups and ledger), which means long scrolling. The motivational advantage over a bar isn't demonstrated. It's an inference from stamp-card studies.

## Recommendation

**Pick A.** The evidence supports Miguel's lean. A single-hue bar with a big numeral answers the frequent question most accurately, at the lowest load, and needs no colour decoding. B's appeal (the category mix) is the secondary question, and it costs the most in load, CVD safety and contrast. A isn't perfect, so ship it with these changes:

1. **Surface Events Attended on the summary**, e.g. "9 of 15 Total Points · 8 events attended". It's a ticket requirement and shouldn't sit only inside a panel label.
2. **Add 15 (or 8) faint notches to A's bar**, still one colour. This borrows C's countability ("6 more" becomes visible as six empty steps) without C's colours or wrapping. It's a judgment call: the research shows people speed up near the goal, not that notches work better than a smooth bar. Quick to test.
3. **Keep category colour off the summary.** In the panel, the group name and points text already carry the information. If colour is wanted, use it only as a small swatch next to text, never as the only cue. Cut the palette to ≤7 distinct hues by letting Socials (0 points) and small groups share a neutral grey.
4. **Optionally, add a one-line text breakdown under the bar** ("GBMs 4 · Fundraising 2 · Service 1 · +3 more"). It gives B's at-a-glance mix as text, which is accurate, needs no legend and passes 1.4.1 and 1.4.11. Drop it if it crowds the phone viewport.
5. **Pending points:** keep the stripes (a non-colour cue), but give the pending segment a darker edge so it reaches 3:1, or rely on the existing text line that states the points. After 15, keep the "voter eligible" state and the total visible. Kivetz saw motivation drop after the reward, so the post-goal view shouldn't feel finished if continued attendance matters.

Also consider bringing C's "Reached 15: voter eligible" divider into A's "Events attended" list. It marks the goal moment at almost no cost.

## Sources

- W3C, WCAG 2.2 Understanding 1.4.1 Use of Color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- W3C, WCAG 2.2 Understanding 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- W3C, WCAG 2.2 Understanding 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Nielsen, J. (2006). Progressive Disclosure. NN/g: https://www.nngroup.com/articles/progressive-disclosure/
- Nielsen, J. (2007). Show Numbers as Numerals. NN/g: https://www.nngroup.com/articles/web-writing-show-numbers-as-numerals/
- Whitenton, K. (2013). Minimize Cognitive Load. NN/g: https://www.nngroup.com/articles/minimize-cognitive-load/
- Budiu, R. (2015). Accordions on Mobile. NN/g: https://www.nngroup.com/articles/mobile-accordions/
- Wang, H. (2023). Accordions on Desktop. NN/g: https://www.nngroup.com/articles/accordions-on-desktop/
- Sunwall, E. (2024). Tabs, Used Right. NN/g: https://www.nngroup.com/articles/tabs-used-right/
- Laubheimer, P. (2017). Dashboards: Making Charts and Graphs Easier to Understand. NN/g: https://www.nngroup.com/articles/dashboards-preattentive/
- Material (Flutter API), SegmentedButton: https://api.flutter.dev/flutter/material/SegmentedButton-class.html
- Material Components for Android, Chip: https://github.com/material-components/material-components-android/blob/master/docs/components/Chip.md
- Apple Human Interface Guidelines, Color: https://developer.apple.com/design/human-interface-guidelines/color
- Cleveland, W. S. & McGill, R. (1984). Graphical Perception. JASA 79(387): https://doi.org/10.1080/01621459.1984.10478080
- Healey, C. G. (1996). Choosing Effective Colours for Data Visualization. IEEE Visualization '96: https://vis.cs.brown.edu/docs/pdf/Healey-1996-CEC.pdf
- Kivetz, R., Urminsky, O. & Zheng, Y. (2006). The Goal-Gradient Hypothesis Resurrected. JMR 43(1): https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf
- Nunes, J. C. & Drèze, X. (2006). The Endowed Progress Effect. JCR 32(4): https://academic.oup.com/jcr/article-abstract/32/4/504/1787425
- Cowan, N. (2001). The magical number 4 in short-term memory. BBS 24(1): https://doi.org/10.1017/S0140525X01003922
- Miller, G. A. (1956). The magical number seven, plus or minus two. Psych. Review 63(2): https://doi.org/10.1037/h0043158
- Contrast and CVD figures for the prototype palette: computed locally from `generalData.ts` `GROUPS` (WCAG relative-luminance formula; Machado et al. 2009 simulation matrices).
