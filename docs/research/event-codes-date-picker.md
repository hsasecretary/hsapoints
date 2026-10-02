# Event Codes page: replacing the native date picker

Researched 2026-09-26 against `frontend/src/pages/eboard/eventCodes/DateField.tsx`, `QuickAdd.tsx`, `CodeRow.tsx`, the `.event-codes-page` block in `frontend/src/styles/eboard.css`, and `frontend/package.json` (React 18.3, no date library). This revisits recommendation 3 of `event-codes-select-and-date-ui.md` ("keep native"), whose section 2 covers what the native input can and can't style.

## Recommendation

1. **Use React Aria Components' `DatePicker`** (`react-aria-components`, Adobe). It is the only candidate that ships the whole thing: a typeable segmented field, a calendar grid, a positioned popover with focus management, and open/close animation hooks. You style it with plain CSS through `react-aria-*` classes and `data-*` state attributes, so it fits our token CSS. Values convert to and from our `YYYY-MM-DD` strings through `parseDate()` / `.toString()`.
2. **Use the custom picker on phones too**, with 44px day cells under `(pointer: coarse)`. The reason is the shortcut chips (Today, Tomorrow, the last-used date), which the OS picker can't show. Keep native as a one-line fallback if real-device testing goes badly.
3. **Popover: use RAC's own `Popover`.** It handles bottom placement, flipping, Escape and outside-click dismissal. Our own native `popover` plus anchor positioning would still need JS positioning in Chrome and Firefox. The `popover` attribute works in Chrome 114+, Safari 17+ and Firefox 125+ ([caniuse](https://caniuse.com/mdn-api_htmlelement_popover)), but anchor positioning is only fully supported in Safari 27; Chrome and Firefox support is partial ([caniuse](https://caniuse.com/css-anchor-positioning)).
4. **Bundle cost:** `react-aria-components` is 274 kB gzip as a whole package, which is the upper bound. `@internationalized/date` is 11.1 kB gzip. The tree-shaken DatePicker subset was not measured (bundlephobia rate-limited). **Measure it with `npm run build` on a branch before merging.** If it's far above about 60 kB, fall back to the runner-up.
5. **Runner-up: react-day-picker v10** in a native `popover`. It's 19.3 kB gzip, but it's only the grid. We would build the field, the typing, and the popover focus handling ourselves.

## 1. react-day-picker (v10, `@daypicker/react`)

- **Version and package.** It's at 10.0.1. v10 prefers the scoped name `@daypicker/react`, and the old `react-day-picker` name still works ([upgrading](https://daypicker.dev/upgrading), [repo](https://github.com/gpbl/react-day-picker)). The peer dependency is `react >=16.8.0`. It depends on `date-fns ^4.1.0` and `@date-fns/tz` ([npm registry `latest`](https://registry.npmjs.org/react-day-picker/latest)).
- **Size.** 19.3 kB gzip, 67 kB minified, including the dependencies it bundles ([bundlephobia](https://bundlephobia.com/package/react-day-picker@10.0.1)).
- **Accessibility.** It claims WCAG 2.1 AA compliance ([home](https://daypicker.dev/)). It supports arrows, Shift+arrows, Page Up/Down, Home/End and Enter/Space, and follows APG. Its own guide says to "test your date picker regularly with a screen reader" and to add `aria-live` announcements yourself ([accessibility](https://daypicker.dev/guides/accessibility)).
- **Styling.** Override the `--rdp-*` CSS variables (for example `--rdp-accent-color`, `--rdp-day-height`), or replace the class names through `classNames` ([styling](https://daypicker.dev/docs/styling)). Month changes can animate with `animate` and `--rdp-animation_duration` ([navigation](https://daypicker.dev/docs/navigation)).
- **Popover.** It has none. The input-field guide uses a native `<dialog>` and suggests `role="application"` on the grid for NVDA ([input fields](https://daypicker.dev/guides/input-fields)). We'd write the trigger, typed entry, focus return and positioning, which are the parts APG says need 19 keyboard behaviours and AT testing ([APG datepicker dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)).

## 2. React Aria Components `DatePicker`

- **Version and dependencies.** It's at 1.21.1. The React peer range includes `^18.0.0`. It depends on `@internationalized/date`, not date-fns ([npm registry](https://registry.npmjs.org/react-aria-components/latest)).
- **Accessibility.** The field is made of "individually focusable segments for each date and time unit", each labelled (year, month, day). Adobe says they tested "across desktop and mobile devices" with mouse, touch, keyboard and VoiceOver, and added touch-screen-reader context plus hidden navigation buttons in the calendar ([Adobe blog](https://react-aria.adobe.com/blog/date-and-time-pickers-for-all)).
- **Styling.** Every part gets a default `react-aria-ComponentName` class. States come as data attributes ("like custom pseudo classes"), and `className` can also be a function of the component's state. Popovers expose `data-entering` / `data-exiting` for animations ([styling](https://react-aria.adobe.com/styling)). The picker exposes `[data-focus-within]` and `[data-focus-visible]` ([DatePicker](https://react-aria.adobe.com/DatePicker)). Calendar cells expose `data-pressed`, `data-disabled` and `data-unavailable`, and Adobe's example scales pressed cells to 0.9 ([Calendar](https://react-aria.adobe.com/Calendar)). Date segments expose `data-placeholder` and `data-type` ([DateField](https://react-aria.adobe.com/DateField)).
- **Popover.** It sits at the bottom by default, flips when there isn't room, and closes on Escape and on outside interaction. Adobe's example animation is 200ms opacity plus an 8px translate ([Popover](https://react-aria.adobe.com/Popover)). `shouldCloseOnSelect` controls whether picking a day closes it ([DatePicker](https://react-aria.adobe.com/DatePicker)).
- **Value type.** Values are `CalendarDate` objects, created with `parseDate()`, and forms submit them as ISO 8601 strings ([DatePicker](https://react-aria.adobe.com/DatePicker)), so they map 1:1 to our strings.
- **Cost.** This is the heaviest option (see Recommendation 4), and we'd be adding one of Adobe's libraries.

## 3. Ruled out

| Library | Why not |
|---|---|
| MUI X Date Pickers 9.14 | Peer dependencies `@mui/material`, `@mui/system`, `@emotion/react` and `@emotion/styled` ([npm](https://registry.npmjs.org/@mui/x-date-pickers/latest)). That brings in a whole second design system. |
| Mantine Dates 9.6 | Peer dependencies `react ^19.2.0` and `@mantine/core` ([npm](https://registry.npmjs.org/@mantine/dates/latest)). It won't install on React 18.3. |
| react-datepicker 9.1 | 45 kB gzip ([bundlephobia](https://bundlephobia.com/package/react-datepicker@9.1.0)), plus `@floating-ui/react` and date-fns. Open issues include NVDA announcing dates "in random order" inside a popover (#6295) and VoiceOver silences (#6293) ([issues](https://github.com/Hacker0x01/react-datepicker/issues?q=is%3Aissue+is%3Aopen+accessibility)). |
| Ark UI / Zag 5.39 | A headless state machine like RAC that also pulls in `@internationalized/date` ([npm](https://registry.npmjs.org/@ark-ui/react/latest)). It gives no advantage over RAC, and it's a less established date picker. |
| cally 0.9 | A 9.5 kB web component ([bundlephobia](https://bundlephobia.com/package/cally@0.9.2)). It's a calendar only: "not … a full date picker", no input or popover ([docs](https://wicky.nillia.ms/cally/)). It has the same gaps as DayPicker, plus custom-element events in React 18. |

## 4. Baseline: keep native, restyle, `showPicker()`

We can style the field box and the icon, but not the popup. There's no `hidePicker()`, and the popup is browser UI (see section 2 of the previous note, and [MDN showPicker](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/showPicker)). Calling `showPicker()` on click makes the whole field open the popup. It doesn't fix the mismatched look, the lack of motion, or the lack of shortcuts. Cost: 0 kB. It's worth doing only if we drop the replacement.

## 5. Phones: OS picker or custom?

- **Apple.** The compact style "opens a modal view" with a familiar calendar. Apple also says to avoid "switching views to show a picker": it "works well when displayed in context, below or in proximity to the field" ([HIG: Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers)).
- **Material.** The docked picker "appears inline within the layout", for compact layouts where a dialog "might feel intrusive" ([Android: Date pickers](https://developer.android.com/develop/ui/compose/components/datepickers)). It suits dates in "the near future or past" ([Material Components: DatePicker](https://github.com/material-components/material-components-android/blob/master/docs/components/DatePicker.md)).
- **Verdict.** Our picks are usually within a few weeks of today, which is the docked/in-context case. So a custom calendar under the field, with Today and Tomorrow chips, takes fewer taps than the OS modal plus OK. The custom version also looks the same on every device. The risk is touch screen-reader quality, which Adobe says they tested. **Verify on a real iPhone and Android before shipping.** If it fails, `DatePicker` can render `<input type="date">` when `matchMedia('(pointer: coarse)')` matches, without any API change.

## 6. What makes a picker feel responsive instead of "sticky"

- **Short open motion only.** Use about 150ms of opacity plus a 4–8px translate on `[data-entering]` (Adobe's example uses 200ms), and a faster exit. Apple: "aim for brevity and precision" and "avoid adding motion to UI interactions that occur frequently" ([HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)). Wrap all motion in `@media (prefers-reduced-motion: no-preference)`. Don't animate month changes.
- **Immediate feedback.** Show hover, pressed (`scale(.94)`) and focus-visible states on cells. Mark today with a teal outline ring, and fill the selected day solid teal-600. Material also differentiates today with a stroke ([Material Components](https://github.com/material-components/material-components-android/blob/master/docs/components/DatePicker.md)).
- **Close on select** (`shouldCloseOnSelect`, the default) and return focus to the field, so the next Tab goes to Event Type.
- **Shortcuts in the popover footer.** Show Today and Tomorrow, plus the date of the last code added this session, because codes batch on the same day. Also consider defaulting the quick-add date to that last-used date.
- **Typing stays first-class.** Officers can tab into the segments and type `10 03 2026` without ever opening the calendar.

## Component sketch

```tsx
// eventCodes/DatePicker.tsx, replacing DateField
type Props = {
    label: string;                 // visible or visually hidden (RAC <Label>)
    value: string;                 // 'YYYY-MM-DD' or ''
    onChange: (iso: string) => void;
    shortcuts?: { label: string; iso: string }[]; // Today / Tomorrow / last used
    className?: string;
};
// Internally: <DatePicker value={value ? parseDate(value) : null}
//   onChange={(d) => onChange(d ? d.toString() : '')}>
//   <Label/> <Group><DateInput>{s => <DateSegment segment={s}/>}</DateInput><Button>▾</Button></Group>
//   <Popover><Dialog><Calendar>…</Calendar><footer>{shortcut buttons}</footer></Dialog></Popover>
// </DatePicker>
```

The four call sites in `QuickAdd.tsx` and `CodeRow.tsx` change from `onChange={(e) => set(k, e.target.value)}` to `onChange={(iso) => set(k, iso)}`. `CodeRow`'s `id` + `<label htmlFor>` pairs become the `label` prop. Styles go under `.event-codes-page .react-aria-DatePicker` in `eboard.css`, using `--hsa-teal-*` and `--hsa-surface`, with 16px segments so iOS doesn't zoom.

## Accessibility checks to run

1. **Keyboard only:** Tab into the segments and type a date, using the arrows to change segments. Open the calendar from the button, move with arrows and Page Up/Down, press Enter to pick. Escape closes it and focus returns to the field.
2. **Screen readers:** NVDA + Chrome, VoiceOver on macOS Safari, VoiceOver on iOS and TalkBack on Android. Each segment should be announced by name, the month announced on navigation, and the selected date announced.
3. **Contrast:** the today ring and focus ring need at least 3:1 against the surface (WCAG 1.4.11). Selected-day text needs at least 4.5:1.
4. **Targets:** day cells at least 24px on desktop and 44px on coarse pointers, shortcut chips 44px on phones (see section 4 of the previous note).
5. **Layout:** at 200% zoom and 320px width, the popover should flip or fit without horizontal scroll. With reduced motion on, nothing should animate.
6. **Bundle:** compare `npm run build` output before and after.

## Sources

- DayPicker docs: https://daypicker.dev/, /upgrading, /guides/accessibility, /guides/input-fields, /docs/styling, /docs/navigation
- react-day-picker repo: https://github.com/gpbl/react-day-picker
- React Aria: https://react-aria.adobe.com/DatePicker, /Calendar, /DateField, /Popover, /styling, /blog/date-and-time-pickers-for-all
- npm registry package.json (`/latest`): react-day-picker, react-aria-components, @mui/x-date-pickers, @mantine/dates, @ark-ui/react, react-datepicker, cally, @internationalized/date
- bundlephobia (measurement): react-day-picker@10.0.1, react-aria-components@1.21.1, @internationalized/date@3.12.4, react-datepicker@9.1.0, cally@0.9.2
- react-datepicker open a11y issues: https://github.com/Hacker0x01/react-datepicker/issues?q=is%3Aissue+is%3Aopen+accessibility
- cally: https://wicky.nillia.ms/cally/
- W3C APG, Date Picker Dialog: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
- caniuse, popover / anchor positioning: https://caniuse.com/mdn-api_htmlelement_popover, https://caniuse.com/css-anchor-positioning
- MDN, showPicker(): https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/showPicker
- Apple HIG, Pickers: https://developer.apple.com/design/human-interface-guidelines/pickers
- Apple HIG, Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Android Developers, Date pickers: https://developer.android.com/develop/ui/compose/components/datepickers
- Material Components, DatePicker: https://github.com/material-components/material-components-android/blob/master/docs/components/DatePicker.md

## Measured on `feat/ps-event-codes-polish`

`npm run build`, gzip size of the lazy `EventCodesPage` chunk (members never download it):

| Build | EventCodesPage (gzip) |
|---|---|
| Native `<input type="date">` | 6.2 kB |
| React Aria `DatePicker`, all locales | 83.1 kB |
| React Aria `DatePicker`, `@react-aria/optimize-locales-plugin` with `en-US` only | 67.7 kB |

So the DatePicker subset costs about 61.5 kB gzip once the unused locales are stripped. That's at the threshold in Recommendation 4, not far above it.
