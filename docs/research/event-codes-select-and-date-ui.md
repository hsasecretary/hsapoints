# Event Codes page: styling the select and date fields, and phone density

Researched 2026-09-26 against `frontend/src/pages/eboard/eventCodes/EventTypeSelect.tsx`, `QuickAdd.tsx`, `CodeRow.tsx`, `Facets.tsx`, the `.event-codes-page` block in `frontend/src/styles/eboard.css`, and `frontend/src/styles/tokens.css`.

## Recommendations

1. **Keep the native `<select>`. Style the closed control now, and add `appearance: base-select` inside `@supports` as an extra layer.** Browsers without support ignore it and show today's native select ([WebKit: golden rule](https://webkit.org/blog/18117/the-golden-rule-of-customizable-select/)). Don't build a JS combobox.
2. **Don't split "GBM" and "1 Cab / 2 VE" into `<span>`s yet.** Base-select allows markup inside options, but React 18.3 (our version) logs DOM-nesting warnings for it ([react#33038](https://github.com/facebook/react/issues/33038)). The plain text label already works everywhere. Revisit after a React 19 upgrade.
3. **Keep native `<input type="date">`.** Restyle only the field box and set `color-scheme`. Don't build a custom date picker.
4. **Treat the white rectangle as an emulation artifact.** Check it on a real phone before acting on it. Base-select removes it anyway in Chrome.
5. **Raise every field on the page to `font-size: 16px`.** At the current 14px, iOS Safari zooms in when a field is focused.
6. **Bring small tap targets up to about 44px on phones:** the link buttons and the facet rows. Put Code and Date side by side in the quick-add band.

## 1. The Event Type select

**Customizable select.** You opt in with `select, ::picker(select) { appearance: base-select; }`. That unlocks:
- `::picker(select)`, the dropdown panel, a popover in the top layer
- `::picker-icon`, the chevron
- `option::checkmark`
- `option:checked`
- `<selectedcontent>`, which mirrors the chosen option inside the button

Options can contain markup. `<optgroup>` becomes a normal block container you can style (border, padding), and it can take a `<legend>` child for the heading ([MDN: Customizable select](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)). The picker is anchored to the select automatically, with fallback positions when it would overflow ([same](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)). Keyboard and existing JS behaviour stay the same ([Chrome for Developers](https://developer.chrome.com/blog/a-customizable-select)).

**Support (Sept 2026):** Chrome and Edge 135+, Chrome Android 152+, Safari and iOS 27+, Samsung Internet 29+. Firefox has it but turned off by default. About 72% of global usage ([caniuse](https://caniuse.com/mdn-css_properties_appearance_base-select)). Safari 27.0 shipped on 2026-09-17 ([WebKit: Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)), so many iPhones won't have it yet.

**Progressive enhancement.** WebKit's advice: "Wrap your enhancements in `@supports (appearance: base-select)` and keep plain text as your baseline". Any icons or badges must be *additions to* the option's text, never replacements ([WebKit: golden rule](https://webkit.org/blog/18117/the-golden-rule-of-customizable-select/)).

**Optgroups.** They keep working, and the `label` attribute still renders. MDN styles the group headings through a `<legend>` child. Keep `label=` as well, because browsers without support only read `label`.

**Points as a muted badge.** It's possible: `<option>GBM <span class="pts">1 Cab / 2 VE</span></option>`, with `.pts { margin-left: auto; color: var(--hsa-muted); }` inside `@supports`. Browsers without support read the option as plain text. The catch is that React 18 warns about `<span>` inside `<option>` and about `<button>`/`<selectedcontent>` inside `<select>` ([react#33038](https://github.com/facebook/react/issues/33038)). MDN also warns that frameworks may block these features ([MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)).

**The alternatives:**

| Approach | Gain | Cost |
|---|---|---|
| `appearance: none` plus a chevron as a `background-image` (what to do now) | Teal border, 6px radius and a custom chevron everywhere | The list itself stays OS-native and can't be styled ([MDN: appearance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/appearance)) |
| base-select under `@supports` (add next) | Themed picker, styled group headings, check mark | Only Chrome and Safari 27; Firefox and older iOS fall back to the row above |
| JS combobox or listbox (APG) | Looks exactly as designed in every browser | "A role is a promise": you must build all the keyboard handling yourself. APG says its examples need AT testing before production and that "some ARIA features are not supported in any mobile browser" ([APG: Read me first](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)). You also lose the native phone pickers. |

## 2. The date inputs

- **What you can style:** the field box (border, radius, padding, font). The date text parts and the calendar icon are Chromium/WebKit-only pseudo-elements (`::-webkit-datetime-edit*`, `::-webkit-calendar-picker-indicator`). They're defined in Blink's UA stylesheet, not in any spec ([Blink html.css](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/resources/html.css)), and MDN still doesn't document them ([mdn/content#6778](https://github.com/mdn/content/issues/6778)). Use them only for small tweaks. That same stylesheet draws the icon with `light-dark()`, so setting `color-scheme` switches it. `color-scheme` sets form-control and picker colours generally ([MDN: color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)).
- **What you can't style:** the popup calendar. "The appearance of the date picker input UI varies based on the browser and operating system" ([MDN: input date](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date)). The spec leaves pickers implementation-defined ([WHATWG](https://html.spec.whatwg.org/multipage/input.html#dom-input-showpicker)). `accent-color` only applies to checkbox, radio, range and progress ([MDN: accent-color](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/accent-color)).
- **`showPicker()`:** works in Chrome 99+, Firefox 101+ and Safari/iOS 16+ ([caniuse](https://caniuse.com/mdn-api_htmlinputelement_showpicker)). It needs a user gesture, and there is **no `hidePicker()`** ([MDN: showPicker](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/showPicker)). So there's no supported way to close the picker from code. Don't add a "tap again to close" toggle. In Chrome, Escape, choosing a date or clicking outside closes it. That's observed browser behaviour, not specified.
- **On real phones, the platform picker handles dismissal.** iOS's compact date style opens a modal calendar ([Apple: UIDatePickerStyle.compact](https://developer.apple.com/documentation/uikit/uidatepickerstyle/compact)). Android's Material date picker has positive and negative (OK/Cancel) buttons ([Material: DatePicker](https://github.com/material-components/material-components-android/blob/master/docs/components/DatePicker.md)). The desktop behaviour doesn't carry over to phones.
- **Custom picker: not worth it.** APG's date-picker dialog needs 19 keyboard behaviours. APG itself warns of "support gaps … especially for mobile/touch devices" and says the example isn't meant for production without testing ([APG datepicker dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)). The native input gives us that and the phone pickers for free.

## 3. The white rectangle in emulation

Without base-select, Chrome draws the native select popup as browser UI outside the page. Base-select is what makes the select "not render outside the browser pane or … trigger built-in mobile operating system components" ([MDN: appearance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/appearance)). DevTools device mode only emulates the page's viewport. Google calls it "a first-order approximation" and says to use a real device when in doubt ([Chrome DevTools: Device mode](https://developer.chrome.com/docs/devtools/device-mode)). Chromium has a known bug where, under device emulation with DPR 2–3, the select popup shows up in the wrong place and at the wrong size ([crbug 40849565](https://issues.chromium.org/issues/40849565)). So the rectangle is almost certainly the desktop popup drawn in desktop pixels over an emulated page. Real phones show the OS picker instead.

With base-select, the picker is an in-page popover positioned against the select ([MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)), so emulation and real phones render it the same way. The trade-off is that iOS 27 and Chrome Android 152+ users then get the in-page picker instead of the wheel or sheet.

## 4. Phone density

**Guidance:**
- WCAG 2.5.8 (AA): targets at least 24×24 CSS px, or spaced so a 24px circle doesn't overlap another target ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- WCAG 2.5.5 (AAA): 44×44 ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)).
- Apple: 44×44pt ([HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)). Android/Material: 48×48dp ([Android](https://developer.android.com/guide/topics/ui/accessibility/apps)).
- **iOS focus zoom:** when a field is focused, WebKit zooms to `16 / fontSize` (`webViewStandardFontSize = 16` in [WKWebViewIOS.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm)). Apple doesn't document this anywhere except the source.

**What the CSS does now (`eboard.css`, the `@media (max-width: 800px)` block):**
- Fields are `font-size: var(--hsa-text-sm)`, which is **14px** (`tokens.css`). **That triggers the iOS zoom**, by about 1.14×. With `padding: 10px 12px` and a 1.5px border they're about 40px tall.
- `.link-button` has `padding: 4px 6px` at 14px/1.5, so it's about 29px tall. That passes AA but is well under 44. This covers Show filters, Cancel, Keep it, Delete and More options.
- Facet labels have `padding: 2px 0`, so each row is about 25px. That's right at the AA edge.
- `.code-row__main` has `min-height: 48px`, which is good.
- The quick-add band stacks 5 full-width controls plus a toggle and a status line, about 300px of teal before the list starts.

**Verdict:** at 375px the page isn't cramped sideways; everything wraps cleanly. The real problems are the zoom on every field, the undersized link and facet targets, and a tall quick-add band. The changes to make:

```css
.event-codes-page :is(input:not([type="checkbox"], [type="radio"]), select) {
    font-size: 16px;           /* was var(--hsa-text-sm) = 14px: stops iOS focus zoom */
}
@media (max-width: 800px) {
    .event-codes-page :is(input:not([type="checkbox"], [type="radio"]), select) { min-height: 44px; padding: 11px 12px; }
    .event-codes-page .quick-add__code,
    .event-codes-page .quick-add__date { flex: 1 1 calc(50% - 4px); }   /* one row instead of two */
    .event-codes-page .quick-add__submit { min-height: 44px; }
    .event-codes-page .link-button { min-height: 44px; padding: 10px 8px; }
    .event-codes-page .code-facets label { min-height: 44px; padding: 0; }
    .event-codes-page .code-edit__save { min-height: 44px; }
}
```

These selectors are more specific than the `.event-codes-page button { min-height: 0 }` reset, so they win over it. Keep the 16px on desktop too.

## Sources

- MDN, Customizable select elements: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select
- MDN, appearance: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/appearance
- MDN, `<input type="date">`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date
- MDN, showPicker(): https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/showPicker
- MDN, color-scheme: https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
- MDN, accent-color: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/accent-color
- mdn/content issue #6778 (undocumented `-webkit-datetime-edit-*`): https://github.com/mdn/content/issues/6778
- caniuse, appearance: base-select: https://caniuse.com/mdn-css_properties_appearance_base-select
- caniuse, showPicker: https://caniuse.com/mdn-api_htmlinputelement_showpicker
- WHATWG HTML, input pickers: https://html.spec.whatwg.org/multipage/input.html#dom-input-showpicker
- Chrome for Developers, The select element can now be customized: https://developer.chrome.com/blog/a-customizable-select
- Chrome DevTools, Device mode: https://developer.chrome.com/docs/devtools/device-mode
- Chromium issue 40849565: https://issues.chromium.org/issues/40849565
- Blink UA stylesheet html.css: https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/resources/html.css
- WebKit, The golden rule of Customizable Select: https://webkit.org/blog/18117/the-golden-rule-of-customizable-select/
- WebKit, WebKit Features for Safari 27.0: https://webkit.org/blog/18325/webkit-features-for-safari-27-0/
- WebKit source, WKWebViewIOS.mm (`webViewStandardFontSize`): https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm
- React issue #33038: https://github.com/facebook/react/issues/33038
- W3C APG, Read Me First: https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
- W3C APG, Date Picker Dialog example: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
- W3C, Understanding 2.5.8 / 2.5.5: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
- Apple HIG, Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple, UIDatePickerStyle.compact: https://developer.apple.com/documentation/uikit/uidatepickerstyle/compact
- Android Developers, accessibility (48dp): https://developer.android.com/guide/topics/ui/accessibility/apps
- Material Components, DatePicker: https://github.com/material-components/material-components-android/blob/master/docs/components/DatePicker.md
