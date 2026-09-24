# HSA Points

The internal member portal and points-tracking system for UF HSA: members earn points by attending events and submitting point requests; E-Board reviews requests and manages event codes, cabinet approval, and absences.

## Language

### Members

**Member**:
A person with a `users/{email}` document — general member, cabinet member, or e-board.
_Avoid_: User (that's the Firestore collection name, not the domain concept)

**General Member**:
A Member with no cabinet role and no e-board role (`isGeneralMember()`).

**Cabinet Member**:
A Member approved onto a cabinet. The roster is set at the start of the year and never grows mid-year, so every Core Event of the year applies to every Cabinet Member.

**MLP Member**:
A General Member taking part in MLP. Not the same as a Cabinet Member on the MLP Fall or MLP Spring cabinet, who runs MLP.
_Avoid_: MLP cabinet (for program members)

**MLP Cohort**:
Whether an MLP Member joined in the fall or the spring. MLP Spring members need only 8 Voter Eligible Points.

**MLP Program**:
MLP Fall or MLP Spring, each run by its own cabinet. An MLP Open event records which MLP Program hosted it; that changes no points or requirements.
_Avoid_: Cohort (for the program that hosted an event)

**E-Board**:
Members on the executive board. Exempt from Core Events, Semester Requirements and Strikes; they may still redeem codes to follow their own progress, but nothing is required of them.

### Events and points

**Event Type**:
A row of the point rubric (e.g. GBM, HSA Fundraiser, Tabling) that fixes an event's Cabinet Points, its Voter Eligible Points, and whether it is a Core Event, a Semester Requirement or an Additional Event. E-Board picks an Event Type for each event; nobody sets those values per event. There is one rubric for everyone: a GBM is worth 2 VE Points to a General Member and a Cabinet Member alike. The rubric holds for the whole year; if it ever changes, every past Attendance is re-scored under the new values.
_Avoid_: Category (the old free-form label), cabinet-required flag

**Cabinet-only Event Type**:
An Event Type only Cabinet Members can earn, by code or Point Request: Cabinet Thursday, Cabinet Retreat, Cabinet Orientation.

**Attendance**:
A Member's credit for one event, however it arrived: a redeemed code, an approved point request, or E-Board entering it directly. Every Attendance earns its Event Type's points, even when it is also used as a Make-up.
_Avoid_: Redemption (only one of the ways Attendance arrives)

**Point Request**:
A Member's claim, with photo proof, that they attended an event, usually one whose code they didn't redeem on the day. When the event had a code, the request names that event, and approving it counts exactly as redeeming its code. When a Semester Requirement or Additional Event has no code yet, the request gives the event's name and date instead; if E-Board later creates a code for that event, it may attach the request to it when approving, which then counts as redeeming that code. Once E-Board approves it and confirms its Event Type, it is an Attendance like any other. A request that fits no Event Type is denied or turned into an Adjustment.
_Avoid_: Manual points

**Adjustment**:
Points E-Board added by hand that don't trace back to any event, carried with a note of why.

**Cabinet Points**:
The points a Cabinet Member earns toward Graduating Cabinet — each Event Type's cabinet value (a GBM is worth 1 Cabinet Point).

**Voter Eligible Points** (VE Points):
The points that count toward voting and running in E-Board elections — each Event Type's voter value (a GBM is worth 2). Every Member needs 15, except MLP Spring members, who need 8. An event's Event Type alone decides whether it is voter-eligible; when its graphic was posted does not.
_Avoid_: Voter-eligibility points, eligible points

**Total Points**:
Another name for Voter Eligible Points — the label E-Board uses today, kept for now. Always the same number as VE Points, never Cabinet Points.
_Avoid_: Using it to mean Cabinet Points

**Graduating Cabinet**:
Reaching 20 Cabinet Points. Core Events and Semester Requirements are tracked but do not gate it.

### Cabinet requirements

**Core Events** (Tier 1):
The events a Cabinet Member attends every one of over the year: Cabinet Thursdays, GBMs, Cabinet Retreats, Cabinet Orientation, HLSA, and one HLHM event (any HLHM event counts).
_Avoid_: Required events, cabinet-required events

**Semester Requirements** (Tier 2):
One of each per semester: OPA General, OPA Solidarity Session, HSA Programming, HSA Operations, HSA Fundraising, HSA Service, Affiliate Org event (waived for Cabinet Members on the MLP Fall or MLP Spring cabinet; an HLHM event does not count, since HLHM is a program, not an affiliate), Tabling (1 hour; each hour tabled is its own Attendance), Internal Social, External Social. The two socials are separate requirements, shown together as Socials.
_Avoid_: Cabinet social (that's External Social)

**Additional Events** (Make-up Events):
Events whose job is to make up a Missed Event or clear a Strike: additional tabling hours, MLP open events, additional HSA fundraisers, additional OPA or programming events, additional affiliate org events, CRASH events.

**Missed Event**:
A Core Event that has happened and that the Cabinet Member didn't attend. Excused or not, it must be made up. Every Core Event gets a code; a Core Event E-Board never coded is not a Missed Event for anyone, so no Member is penalised for it.

**Excused Absence**:
A Missed Event E-Board marked excused. It still needs a Make-up, but earns no Strike. Only E-Board and the backend see the excused/unexcused split; Members just see Missed Events and their Strike count.

**Strike**:
The mark an unexcused Missed Event earns. A Member's Strike count is their open Strikes: it goes up with each unexcused Missed Event and down with each Make-up or removal, with no upper limit. At three or more open Strikes, a Cabinet Member is at risk of probation and must meet with the Chief of Staff. Cleared by a Make-up, or removed by E-Board with a recorded reason; removing a Strike does not close its Missed Event, which still needs a Make-up unless E-Board overrides the Missed Event itself.

**Surplus Attendance**:
An Attendance beyond what a requirement needs: any Additional Event, a Semester Requirement event after the first of that Semester (by event date), or an HLHM event after the first of the year. Other Core Event Attendance is never surplus. A surplus Attendance still earns its Cabinet and VE Points.

**Make-up**:
A Surplus Attendance credited against a Missed Event and, when that miss was unexcused, its Strike — one event covers both at once. Applied automatically, oldest unexcused Missed Event first, then the oldest excused one; a Surplus Attendance counts whether it happened before or after the Missed Event. A Member may name the Missed Event when submitting a Point Request (for a request covering several tabling hours, one per hour); an approved request's pick is honoured first. Only approved Attendance counts, never a pending request. The Member is shown which Missed Event and Strike each Make-up covered, never whether the miss was excused.

### Leaderboard

**Rank**:
A Member's numeric position on the Leaderboard, computed by sorting all Members by Total Points and using competition ranking: Members with equal Total Points share a Rank, and the next distinct Rank skips ahead by the size of that Tie Cluster (1, 1, 3, 4…).

**Tie Cluster**:
The set of Members who share the same Total Points value, and therefore the same Rank.

**Leaderboard**:
The anonymized, per-Member view of standing among all Members: shows Top Ranks by name, then Your Standing surrounded by its Neighboring Ranks, with Neighboring Ranks shown as position and score only, and every other Member's identity hidden.

**Top Ranks**:
Members whose Rank is 1 through 5. May include more than five Members when a Tie Cluster spans the Rank-5 boundary.
_Avoid_: Top 5 (imprecise once ties are involved)

**Your Standing**:
The viewing Member's own Rank and Tie Cluster size on the Leaderboard, always shown regardless of whether they're also in Top Ranks.

**Neighboring Ranks**:
The Ranks immediately above and below Your Standing on the Leaderboard — up to three in each direction, one per Rank. Their Rank numbers and Total Points are shown; the Members holding them are never named or counted. A Rank already in Top Ranks is never also a Neighboring Rank: it is on the Leaderboard by name, so there is nothing about it left to hide.
_Avoid_: Filler rows, nearby members
