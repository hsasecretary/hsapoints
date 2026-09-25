# Member portal navbar: what UX research says

Researched 2026-09-25 against `frontend/src/components/layout/SiteHeader.tsx`, its styles in `frontend/src/styles/layout.css`, and `frontend/src/pages/eboard/eboardTools.ts`.

## The question

The Overview tab row scrolled sideways and lagged on older phones, so its pages are moving into the one top navbar. The decided pages are Dashboard (Overview), Requirements (Cabinet Members only), Requests and Guide ("How it works"), plus the E-Board tools in a dropdown. Leaderboard is dropped for now. "Points & events" and "How it works" also stay as bubbles on Overview. Audiences: General Members see about 4 items, Cabinet 5, and E-Board 5 plus the tools dropdown. Most users are students on phones.

This note covers how many items to show, top bar or bottom tab bar on phones, visible links or a hamburger, the active-state and accessibility requirements, and where Logout and the new **view switcher** go. The view switcher lets E-Board members and web-team testers flip between the General Member view and the Cabinet Member view, with a marker for which view is really theirs.

## What the header does today

- **Layout.** A sticky teal bar (`position: sticky; top: 0`) has the logo and title on the left, linking to `/dashboard`. Next come the nav links (UF HSA, an external link; Dashboard; Calendar, an external Google Calendar), then an **E-Board ▾** dropdown for E-Board, a temporary "Temp-Cabinet Points" link for Cabinet, and a Logout button on the right. Signed out, only the logo and title show, centred.
- **E-Board dropdown.** A click-activated `<button>` with `aria-expanded` and `aria-controls="eboard-menu"`. It lists the 5 tools from `EBOARD_TOOLS` (Event Codes, Point Request Review, User Lookup, Excuse Absence, E-Board Member Approval). The toggle gets `is-active` on any `/eboard/*` page. The menu closes on route change or a click outside the header.
- **Phone (≤900px).** The nav, the temp link and Logout are hidden, and a 42×42 icon-only hamburger (`aria-label="Toggle navigation"`) opens a stacked panel under the bar. The panel holds the same links, an "E-Board" heading with the tools listed flat underneath (no nested dropdown), the Cabinet link and Logout.
- **Active state.** Links are React Router `NavLink`s, which add `aria-current="page"` automatically ([React Router NavLink](https://reactrouter.com/api/components/NavLink)). They also get an `is-active` class, shown as a 2px white underline on desktop and a tinted background in the menus.
- **Gaps against the guidance below.** Escape doesn't close either menu, and focus isn't returned to the toggle. The hamburger has no visible "Menu" text. Desktop links have `padding: 4px 0` at 15px text, so they're only about 26px tall: over the 24px AA minimum, well under 44pt/48dp. Two of the three top-level links leave the app (UF HSA, Calendar).

## Findings

### How many top-level items

- **4–5 is the ceiling for always-visible nav on a phone.** NN/g recommends showing "4 or fewer" links visibly on mobile and hiding the rest only when needed ([Pernice & Budiu 2016](https://www.nngroup.com/articles/hamburger-menus/)). Their mobile primer says tab and navigation bars suit "relatively few navigation options", and with more than 5 it's hard to fit them "and still keep an optimum touch-target size" ([Budiu 2015](https://www.nngroup.com/articles/mobile-navigation-patterns/)).
- **Material 3's navigation bar takes 3 to 5 destinations**, and the component supports no more than 5 ([Material Components: Navigation bar](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md)). Apple: "it's generally easier to navigate among fewer tabs", and "avoid overflow tabs" (a "More" tab), because they hide content ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)).
- **Different roles can have different item counts.** WCAG 3.2.3 Consistent Navigation only requires repeated nav to keep the same *relative order*. "Items are considered to be in the same relative order even if other items are inserted or removed" ([Understanding 3.2.3](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html)). So Requirements can appear only for Cabinet, and E-Board only for E-Board, as long as the shared items keep one order. For a single user, though, Apple warns against items that come and go: "Don't disable or hide tab bar buttons, even when their content is unavailable" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)). A user's own role is stable, so this matters mainly for the view switcher (see below).

### Hamburger vs visible links

- **Hidden navigation measurably hurts.** In NN/g's study, hidden nav was used 27% of the time on desktop against 48–50% for visible nav, and 57% on mobile against 86% for "combo" nav (some links visible, the rest in a menu). Discoverability dropped by more than 20%. Tasks took at least 39% longer on desktop and 15% longer on mobile. Users rated hidden nav 21% harder ([Pernice & Budiu 2016](https://www.nngroup.com/articles/hamburger-menus/)).
- **Desktop: never hide it.** A hamburger "is not appropriate for desktop"; "out of sight means out of mind". On phones it's "a necessary evil" ([Laubheimer 2024, Menu-Design Checklist](https://www.nngroup.com/articles/menu-design/)).
- **If a menu button is used, make it findable.** Label it (for example "Menu") for information scent, keep it visually separate from the logo, make it big enough, and consider sticky nav ([Pernice & Budiu 2016b](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)).
- **Sideways-scrolling rows have their own problem.** NN/g lists poor discoverability of hidden items as a con of carousel-style nav bars ([Budiu 2015](https://www.nngroup.com/articles/mobile-navigation-patterns/)). This, and not only the lag, is a reason to drop the old tab row.
- **Trade-off:** visible links cost screen space on every page ([Budiu 2015](https://www.nngroup.com/articles/mobile-navigation-patterns/)). At 4–5 short items, the same sources say that's the right trade.

### Top bar vs bottom tab bar on phones

- **Platform conventions put persistent phone nav at the bottom.** Material's navigation bar "is positioned at the bottom of screens for convenient access" and is meant for compact windows ([Material Components: Navigation bar](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md)). Compact is width < 600dp, "99.96% of phones in portrait" ([Android: window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)). On iPhone, "a tab bar floats above content at the bottom of the screen" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)). Larger windows move to a navigation rail or top/side nav ([Material Components: Navigation rail](https://github.com/material-components/material-components-android/blob/master/docs/components/NavigationRail.md)).
- **Tab bars stay put; top nav bars often scroll away.** NN/g notes that tab bars are always visible, while top navigation bars typically disappear on scroll unless sticky ([Budiu 2015](https://www.nngroup.com/articles/mobile-navigation-patterns/)). Apple: keep the tab bar visible across sections, or "people can forget which area of the app they're in" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)).
- **Tab bars are for navigation only.** "Use a tab bar to support navigation, not to provide actions" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)). So Logout and the view switcher don't belong in it.
- **Caveat.** This is a mobile *website* running in a browser, not a native app. Material and Apple guidance is written for apps, and none of the sources above directly compares top and bottom nav on mobile web. Choosing a bottom bar here is a judgment call that follows platform conventions, not a tested result. A sticky or fixed bar also needs care so it doesn't hide focused elements (WCAG 2.4.11, below).

### Active state and accessibility

- **Show where the user is.** Missing a current-location indicator is "probably the single most common mistake" in website menus ([Laubheimer 2024](https://www.nngroup.com/articles/menu-design/)). Mark the current page in code with `aria-current="page"` ([WAI-ARIA 1.2 `aria-current`](https://www.w3.org/TR/wai-aria-1.2/#aria-current); [APG disclosure navigation example](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)). `NavLink` already does this. The parent **E-Board** toggle should look active on any `/eboard/*` page (it does today).
- **Don't show the active state with colour alone.** Use a shape cue too (underline, pill or weight), and give it 3:1 contrast. See WCAG 1.4.1 and 1.4.11, already covered in `general-member-points-view-ux.md`. Material's active indicator is a filled pill behind the icon, and labels should be shown ([Material Components: Navigation bar](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md)). Apple: "Include tab labels", "single words whenever possible" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)).
- **Target sizes.** WCAG 2.5.8 (AA) sets a minimum of 24×24 CSS px, or spacing that makes up for it ([Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). The platform defaults are larger: Apple's default is 44×44pt ([HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)) and Android recommends at least 48×48dp ([Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps)). NN/g: links that are too small or too close together are "a huge source of frustration" ([Laubheimer 2024](https://www.nngroup.com/articles/menu-design/)). Aim for at least 44px on phones.
- **The dropdown should use the disclosure pattern, not `role="menu"`.** Use a `<button>` with `aria-expanded` and `aria-controls`, and plain links inside. Tab/Shift+Tab moves through the items, Enter/Space toggles, and **Escape closes**. Arrow keys, Home and End are optional. APG explicitly avoids the ARIA `menu` role for site nav, because site navigation doesn't need menu keyboard behaviour ([APG disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)). Open it on click, not hover: hover is "not universally available" on touch or keyboard ([Laubheimer 2024](https://www.nngroup.com/articles/menu-design/)).
- **Sticky bars must not cover the focused element** (WCAG 2.4.11). Sticky headers and footers are the named cause, and CSS `scroll-padding` is a sufficient technique ([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)).
- **Labels.** Use plain words, not internal jargon ([Laubheimer 2024](https://www.nngroup.com/articles/menu-design/)). "Guide" and "Requests" are fine. "Dashboard" vs "Overview" should be one word everywhere.

### Logout and account placement

- Users look to the **top-right** for account tools such as log in and "My Account" ([Farrell 2015, Utility Navigation](https://www.nngroup.com/articles/utility-navigation/)). Logout is an action, not a destination, so it stays out of a tab bar ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)).

### The view switcher ("view as")

- **It is a mode, and modes need strong, redundant signals.** A mode is when "the same user action can have different results depending on the state of the system". Mode errors happen when users don't notice the active mode. NN/g's fix: "strong visual signals such as different backgrounds", with at least two indicators at once, and a clear label ([Laubheimer 2019, Modes](https://www.nngroup.com/articles/modes/)).
- **Admin tools use a top-of-page banner with one-click exit.** Sigma shows a yellow banner at the top that "identifies the user that you are impersonating", with a **Stop impersonation** button. Impersonation starts from Administration, not from the main nav ([Sigma docs](https://help.sigmacomputing.com/docs/impersonate-users)). Adobe Workfront shows "a notification ... at the top of the screen" while you're logged in as another user ([Workfront docs](https://experienceleague.adobe.com/docs/workfront/using/administration-and-setup/add-users/create-manage-users/log-in-as-another-user.html?lang=en)). No NN/g, Material or Apple guideline covers "view as" directly, so these vendor docs are the best primary evidence for the pattern.
- **Keep it out of the main nav.** It's a tool for a handful of testers, and a nav slot is scarce on phones (4–5 max). Switching views also changes which items exist (Requirements appears or disappears). Apple warns that items appearing and disappearing make an interface feel "unstable and unpredictable" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)). The banner is what explains that change.

## Recommendation

**Desktop and tablet (≥ 600px, one top bar):**

`[logo] Hispanic-Latine Student Association   Overview · Requirements* · Requests · Guide · E-Board ▾**        [Account ▾]`

- Visible text links, never a hamburger. General Members get 3 links, Cabinet 4, E-Board 5 including the dropdown. That's inside every limit above.
- Take UF HSA and Calendar out of the primary nav. They leave the app and use up slots. Put them in the footer or the account menu.
- **E-Board ▾** is a disclosure button. It lists the tools from `EBOARD_TOOLS`, closes on Escape and on an outside click, and returns focus to the button. It shows as active on `/eboard/*`.
- **Account ▾ at the top right** (name or initials) holds **View as…** (for eligible users only), UF HSA, Calendar and **Log out**.
- Active state: underline plus bold weight, with `aria-current="page"` (already provided by `NavLink`). Make link hit areas about 44px tall with padding, not the current ~26px.

**Phone (< 600px, two bars):**

- **Top bar:** logo and the account button only. The account button holds View as…, the external links and Log out. No hamburger is needed, since every destination is visible below.
- **Bottom tab bar** (fixed, not scrolling, so it avoids the lag of the old tab row): icon plus a one-word label, equal-width cells, at least 48px tall, and a pill active indicator.
  - General: **Overview · Requests · Guide**
  - Cabinet: **Overview · Requirements · Requests · Guide**
  - E-Board: the above plus **E-Board**, at most 5.
  - The E-Board tab opens an `/eboard` landing page that lists the tools, rather than a pop-up menu from a tab bar. A landing page is one of NN/g's standard mobile subnav patterns ([Budiu 2017](https://www.nngroup.com/articles/mobile-subnavigation/)).
  - Add `scroll-padding` for both sticky bars (WCAG 2.4.11), and pad the bottom bar for the phone's safe area.
- If the team would rather not have a bottom bar on a website (see the caveat above), the fallback is a **second top row of the same 3–5 equal-width items**. It never scrolls sideways and still shows every item. Don't use an icon-only hamburger. If a menu button is kept at all, label it "Menu".

**View switcher:**

- **Where:** "View as" goes in the account menu, shown only to E-Board and web-team testers. It's a two-option choice (General Member / Cabinet Member), with a "Yours" tag on the view that really belongs to the user: General for E-Board, Cabinet for testers.
- **Signal while viewing as the other role:** a full-width, differently coloured banner directly under the header, on every page: "Viewing as Cabinet Member. Not your view. [Back to my view]". Also put a small badge on the account button. That makes two indicators, per NN/g on modes.
- **Behaviour:** the preview should be client-only and session-scoped (no Firestore writes). Reset to the user's own view on sign-out.
- **Safety:** actions taken while previewing still run as the real user. The rules check real permissions, not the preview. So either block writes while previewing, or say in the banner that actions are real.

## Sources

- Pernice, K. & Budiu, R. (2016). Hamburger Menus and Hidden Navigation Hurt UX Metrics. NN/g: https://www.nngroup.com/articles/hamburger-menus/
- Pernice, K. & Budiu, R. (2016). How to Make Navigation (Even a Hamburger) Discoverable on Mobile. NN/g: https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- Budiu, R. (2015). Basic Patterns for Mobile Navigation: A Primer. NN/g: https://www.nngroup.com/articles/mobile-navigation-patterns/
- Budiu, R. (2017). Mobile Subnavigation. NN/g: https://www.nngroup.com/articles/mobile-subnavigation/
- Laubheimer, P. (2024). Menu-Design Checklist: 17 UX Guidelines. NN/g: https://www.nngroup.com/articles/menu-design/
- Laubheimer, P. (2019). Modes in User Interfaces. NN/g: https://www.nngroup.com/articles/modes/
- Farrell, S. (2015). Utility Navigation. NN/g: https://www.nngroup.com/articles/utility-navigation/
- Material Components, Navigation bar: https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md
- Material Components, Navigation rail: https://github.com/material-components/material-components-android/blob/master/docs/components/NavigationRail.md
- Android Developers, Window size classes: https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes
- Android Developers, Make apps more accessible (48dp targets): https://developer.android.com/guide/topics/ui/accessibility/apps
- Apple HIG, Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Apple HIG, Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- W3C WAI-ARIA APG, Disclosure Navigation Menu example: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
- W3C WAI-ARIA 1.2, aria-current: https://www.w3.org/TR/wai-aria-1.2/#aria-current
- W3C, WCAG 2.2 Understanding 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C, WCAG 2.2 Understanding 2.4.11 Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- W3C, WCAG 2.2 Understanding 3.2.3 Consistent Navigation: https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html
- React Router, NavLink: https://reactrouter.com/api/components/NavLink
- Sigma Computing, Impersonate users: https://help.sigmacomputing.com/docs/impersonate-users
- Adobe Workfront, Log in as another user: https://experienceleague.adobe.com/docs/workfront/using/administration-and-setup/add-users/create-manage-users/log-in-as-another-user.html?lang=en
