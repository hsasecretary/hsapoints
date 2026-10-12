# Where the next four features live: Leaderboard, Closet, Upcoming Events, Excuse Requests

Researched 2026-10-12 against `frontend/src/components/layout/navItems.ts`, `SiteHeader.tsx`, `frontend/src/pages/dashboard/Dashboard.tsx`, `pages/requirements/Requirements.tsx` and `CoreEvents.tsx`, `pages/requests/Requests.tsx` and `PointTabs.tsx`, `CONTEXT.md` ("Leaderboard", "Excuse Request"), and the two earlier notes `dashboard-navbar.md` and `general-member-points-view-ux.md`.

## The question

Four features land next week: a **Leaderboard** (Top Ranks, Your Standing, anonymized Neighboring Ranks), a **Closet** (browse and redeem HSA merch), **Upcoming Events** (a list or calendar of future events) and **Excuse Requests** (a Cabinet Member asks E-Board to excuse a future Core Event). The phone tab bar holds 3 items for General Members and 4 for Cabinet. A page per feature would push it to 6–7. Folding everything into the Dashboard makes a long scroll where features get missed. Where should each one go?

`dashboard-navbar.md` already settled the ceiling (3–5 visible tabs, no hamburger, bottom bar on phones, top bar ≥600px, one fixed order per WCAG 3.2.3). This note doesn't repeat that. It covers how to decide which features earn one of the remaining slots, and what to do with the rest.

## What the app does today

- **Tabs** (`navItems.ts`): Dashboard · Requirements (Cabinet view only) · Requests. E-Board tools sit in E-Board ▾ on desktop and inside Account ▾ on phones, so the tab bar never passes 4. That leaves **one free slot for General Members' 4th and Cabinet's 5th**, or two for General Members if they are allowed 5.
- **Dashboard, top to bottom**: greeting, the one-time new-system banner, a "My information" list (name, email, account type), the event-code box, the Total Points summary, Cabinet Points (Cabinet view), the "Points & events" / "How it works" bubbles, and the Make-up list (Cabinet view). On a phone that's already two to three screens before anything new is added.
- **Requirements** shows Core Events, including a "Next: {Core Event} on {date}" line, then the Semester grid. **Requests** is a two-tab page: Submit Request | My Requests.
- **Excuse Absence** already exists as an E-Board tool (`/eboard/excuse-absence`). The E-Board side of Excuse Requests has a natural home there.

## Findings

### What earns a top-level destination

- **Frequency first, backed by observation.** Order and pick top-level items by "frequency of use"; done that way, "most people won't have to read through the entire menu" ([Whitenton 2015](https://www.nngroup.com/articles/ia-questions-navigation-menus/)). Progressive disclosure: "disclose everything that users frequently need up front", and use "frequency-of-use statistics" to prioritize, checked against usability testing because a high page count can be accidental ([Nielsen 2006](https://www.nngroup.com/articles/progressive-disclosure/)).
- **Weigh frequency against the cost of another tab.** Apple: "weigh the complexity of additional tabs against the need for people to frequently access each section", since "it's generally easier to navigate among fewer tabs" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)).
- **No more than two levels of disclosure.** "Designs that go beyond 2 disclosure levels typically have low usability" ([Nielsen 2006](https://www.nngroup.com/articles/progressive-disclosure/)). A feature under a hub under a tab is already at that limit.
- **Card sorting finds groupings, not the final scheme.** It reveals how users "naturally categorize information", but their category names "will not necessarily be your final labels"; pair it with tree testing to check that people can find things ([Tankala & Sherwin 2024](https://www.nngroup.com/articles/card-sorting-definition/)). I found no NN/g source that directly compares task-based and topic-based grouping outcomes.

### Fitting more features than tab slots

- **No overflow "More" tab.** "Avoid overflow tabs"; the More tab "makes it harder for people to reach and notice content on tabs that are hidden" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)). A deliberate hub page is different from an overflow list, but it pays the same discoverability cost if its label doesn't say what's inside.
- **Segmented controls only for closely related views.** "Consider a segmented control to switch between closely related subviews"; "for switching between completely separate sections of an app, use a tab bar instead". Keep it to about five segments on iPhone ([HIG: Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls)). Material splits the same way: primary tabs "display the main content destinations", secondary tabs sit "within a content area to further separate related content" ([Material Components: Tabs](https://github.com/material-components/material-components-android/blob/master/docs/components/Tabs.md)).
- **In-page tabs have a default-tab bias.** Use them only when users don't need both views at once; avoid them when the content is equally important, because the default tab gets the attention and the others should be supplemental. Don't mix in-page and navigation tabs in one control ([Sunwall 2024](https://www.nngroup.com/articles/tabs-used-right/)).
- **Hubs suit one-task visits.** A navigation hub "can work well in task-based websites and apps, especially when users tend to limit themselves to using only one branch ... during a single session". It "incurs an extra step (back to the hub)" each time and gives prime space to navigation instead of content ([Budiu 2015](https://www.nngroup.com/articles/mobile-navigation-patterns/)). A landing page that lists a section's pages is the standard mobile answer when a section has too many subpages for a menu ([Budiu 2017](https://www.nngroup.com/articles/mobile-subnavigation/)).
- **Contextual entry points carry features that don't get a tab.** Homepages can "provide links directly to the primary tasks that users come to the site to complete", and "in-line links ... can move users to supporting or related information" ([Schade 2015](https://www.nngroup.com/articles/support-mobile-navigation/)).
- **Actions don't go in the tab bar.** "Use a tab bar to support navigation, not to provide actions" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)). A FAB "represents the primary action of a screen" ([Material Components: FAB](https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingActionButton.md)), so it is one screen's main action, not a holder for extra features.
- **Badges are for critical news only.** A tab badge signals "new or updated information in the section that warrants a person's attention"; "reserve badges for critical information" ([HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)).
- **The Account menu is utility navigation.** It holds "secondary actions and tools, such as contact, subscribe, save, sign in, share" ([Farrell 2015](https://www.nngroup.com/articles/utility-navigation/)). It's a poor home for content features, and anything in it is hidden navigation, which `dashboard-navbar.md` shows is used far less.

### What belongs on the Dashboard

- **Attention falls off fast.** About 57% of viewing time is above the fold, 74% within the first two screenfuls, and 81% within three. Put high-priority content and main calls to action at the top and secondary information lower ([Fessenden 2018](https://www.nngroup.com/articles/scrolling-and-attention/)). Anything added below the Make-up list on a phone will be seen by few people.
- **A dashboard is one focused, single-screen view.** NN/g defines it as visualizations "presented in a single-page view" that impart "at-a-glance information on which users can act quickly"; "their goal is not to facilitate exploration" ([Laubheimer 2017](https://www.nngroup.com/articles/dashboards-preattentive/)). A Closet catalogue or a full calendar is exploration, so it belongs on its own page.
- **Summary cards that link out fit this.** A card is "a container for a few short, related pieces of information" and usually a linked entry point to details; make the whole card the tap target. Cards suit mixed content like dashboards. For homogeneous items (products, list rows) a plain list or grid works better ([Laubheimer 2016](https://www.nngroup.com/articles/cards-component/)). That argues for a card per feature on the Dashboard, and a grid on the Closet page itself.
- **Don't style cards like promos.** Users skip content that looks like an ad, such as colored boxes, image-heavy blocks, or anything near something ad-like ("Ads poison adjacent items"). On mobile, big contrasting graphics get scrolled past as "faux ads" ([Pernice 2018](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/)). A Closet card with a big merch photo is the most at risk.

### Leaderboards

- **The evidence says it works sometimes.** Hamari et al.'s review of 24 empirical studies found mostly positive effects of gamification, but "greatly dependent on the context ... as well as on the users" ([Hamari, Koivisto & Sarsa 2014](https://doi.org/10.1109/HICSS.2014.377)). In a controlled experiment, a leaderboard raised performance to the level of difficult or impossible assigned goals: people seemed to set their own goal near the top ([Landers, Bauer & Callan 2017](https://doi.org/10.1016/j.chb.2015.08.008)). Neither study says where in an app a leaderboard should sit.
- **Platform guidance favours small, relevant comparison groups.** Google Play Games supports social and public boards, plus daily, weekly and all-time versions, and can return "the scores adjacent to the player's" ([Play Games Services: Leaderboards](https://developer.android.com/games/pgs/leaderboards)). Apple notes that recurring boards "can increase engagement by giving players more chances to take the lead" ([HIG: Game Center](https://developer.apple.com/design/human-interface-guidelines/game-center)). The CONTEXT.md design (Top Ranks, plus Your Standing between Neighboring Ranks) is already this pattern. A per-Semester view would be the "recurring" version.
- **A first-party example.** Duolingo runs weekly leagues and matches learners "with people who have similar study habits", and its captions call it the "Leaderboards tab" ([Duolingo blog](https://blog.duolingo.com/duolingo-leagues-leaderboards/)). Duolingo's app is built around competition. HSA's isn't, so this is a reference point, not a template.

### Upcoming events

- I found no NN/g, Material, Apple or design-system guidance on where an events list should sit. The placement below is reasoned from frequency (above) and from the app's purpose: Members earn points by going to events, so "what's next" feeds the check-in task that the Dashboard is built around.

## Recommendation for this app

Rank by frequency × importance for a typical Member. Upcoming Events is high on both: weekly, and it drives the core task. Excuse Request is low-frequency, high-importance, and Cabinet only. Leaderboard is medium frequency and low importance (motivational). Closet is low frequency, a separate domain, and occasional. Only **Upcoming Events** clearly earns a tab. The others get Dashboard cards or contextual entry points.

**Per feature:**
- **Upcoming Events → its own tab, "Events" (`/events`)**, placed after Requirements and before Requests, the same order for everyone. Also add a compact "Next up" card on the Dashboard showing the next 2–3 events, with a "See all events" link. For Cabinet, mark Core Events in the list. Never show the check-in code in the list: `codes` are readable by any signed-in Member, so build the list from event name and date only.
- **Excuse Request → contextual, no tab.** Put a "Can't make it?" link on each future Core Event row: on Requirements (next to the existing "Next:" line) and on the Events page (Cabinet view). The link opens the form at `/requests?excuse={event}`, following the existing `?makeup=` pattern. Track the status in Requests → My Requests, with a type label or a Points | Excuses segmented control. Both are requests to E-Board, so they are "closely related subviews". E-Board reviews them next to the existing Excuse Absence tool. Optionally, badge the Requests tab when a request is decided; a denial with a reason qualifies as critical information under the HIG.
- **Leaderboard → a Dashboard card plus its own page (`/leaderboard`), no tab.** The card is a single line, "You're #12 · 2 points behind #11", and the whole card is the tap target. Put it below the Points summary, so standing comes before competition. The page holds Top Ranks / Your Standing / Neighboring Ranks.
- **Closet → its own page (`/closet`), reached from a plain Dashboard card** and from the desktop top bar if there's room. Show the items as a grid on the page. Keep the card text-led with at most a small thumbnail, so it isn't skipped as an ad. Open question: if items are redeemed **with points**, the Closet is a way to spend points and belongs closer to the Points summary and Leaderboard (see option B). If they're free or paid in cash, it's a separate service.
- **Make room on the Dashboard.** Move "My information" (name, email, account type) into the Account menu or a profile page. It's low-frequency and currently sits above the code box, using up the top screen. Proposed order: code box → Points summary (+ Cabinet goal) → Next up → Your rank → bubbles → Make-up list → Closet.

**Layout options:**

| Option | Phone tabs (General / Cabinet) | Leaderboard & Closet | Trade-offs |
|---|---|---|---|
| **A. Events tab (recommended)** | Dashboard · Events · Requests (3) / Dashboard · Requirements · Events · Requests (4) | Dashboard cards → own pages | Keeps one slot free for whatever usage shows is missed. Leaderboard and Closet have no persistent entry, so their discoverability depends on the cards staying near the top. |
| **B. Events + a 5th grouped tab** | … · Events · Requests · **Rewards** (4 / 5) | Rewards = Leaderboard \| Closet segmented control | Both get a persistent home. Cabinet hits the 5-tab cap, so nothing else can ever be added. The grouping only holds if the Closet spends points; otherwise the two aren't "closely related" (HIG), and whichever segment is the default takes most of the attention (Sunwall 2024). |
| **C. Dashboard as hub, no new tabs** | unchanged (3 / 4) | Cards for Events, Leaderboard, Closet | No nav change at all. But Events, a weekly task, now takes two taps plus a return trip (Budiu 2015). The Dashboard grows past the two screenfuls that get 74% of attention (Fessenden 2018). |

Whichever option is picked, run a quick tree test with 5–8 Members ("Where would you go to excuse yourself from Thursday's GBM?", "…to see your rank?") before building the nav. Card sorts and analytics alone won't confirm the labels ([Tankala & Sherwin 2024](https://www.nngroup.com/articles/card-sorting-definition/); [Nielsen 2006](https://www.nngroup.com/articles/progressive-disclosure/)).

## Sources

- Apple HIG, Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Apple HIG, Segmented controls: https://developer.apple.com/design/human-interface-guidelines/segmented-controls
- Apple HIG, Game Center: https://developer.apple.com/design/human-interface-guidelines/game-center
- Material Components for Android, Tabs: https://github.com/material-components/material-components-android/blob/master/docs/components/Tabs.md
- Material Components for Android, Floating action button: https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingActionButton.md
- Google Play Games Services, Leaderboards: https://developer.android.com/games/pgs/leaderboards
- Budiu, R. (2015). Basic Patterns for Mobile Navigation: A Primer. NN/g: https://www.nngroup.com/articles/mobile-navigation-patterns/
- Budiu, R. (2017). Mobile Subnavigation. NN/g: https://www.nngroup.com/articles/mobile-subnavigation/
- Farrell, S. (2015). Utility Navigation. NN/g: https://www.nngroup.com/articles/utility-navigation/
- Fessenden, T. (2018). Scrolling and Attention. NN/g: https://www.nngroup.com/articles/scrolling-and-attention/
- Laubheimer, P. (2016). Cards: UI-Component Definition. NN/g: https://www.nngroup.com/articles/cards-component/
- Laubheimer, P. (2017). Dashboards: Making Charts and Graphs Easier to Understand. NN/g: https://www.nngroup.com/articles/dashboards-preattentive/
- Nielsen, J. (2006). Progressive Disclosure. NN/g: https://www.nngroup.com/articles/progressive-disclosure/
- Pernice, K. (2018). Banner Blindness Revisited. NN/g: https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/
- Schade, A. (2015). Supporting Mobile Navigation in Spite of a Hamburger Menu. NN/g: https://www.nngroup.com/articles/support-mobile-navigation/
- Sunwall, E. (2024). Tabs, Used Right. NN/g: https://www.nngroup.com/articles/tabs-used-right/
- Tankala, S. & Sherwin, K. (2024). Card Sorting: Uncover Users' Mental Models. NN/g: https://www.nngroup.com/articles/card-sorting-definition/
- Whitenton, K. (2015). Top 3 IA Questions about Navigation Menus. NN/g: https://www.nngroup.com/articles/ia-questions-navigation-menus/
- Hamari, J., Koivisto, J. & Sarsa, H. (2014). Does Gamification Work? HICSS-47: https://doi.org/10.1109/HICSS.2014.377
- Landers, R. N., Bauer, K. N. & Callan, R. C. (2017). Gamification of task performance with leaderboards: A goal setting experiment. Computers in Human Behavior 71: https://doi.org/10.1016/j.chb.2015.08.008
- Duolingo, How Duolingo Leaderboards and Leagues Work: https://blog.duolingo.com/duolingo-leagues-leaderboards/
