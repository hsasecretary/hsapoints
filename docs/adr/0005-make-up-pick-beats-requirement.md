# A Member's Make-up pick beats filling a requirement

A Member who names a Missed Event for an Attendance (on a Point Request, or when redeeming a code) gets that Make-up even when the Attendance is the first of its Event Type and would otherwise fill a Semester Requirement or the yearly HLHM requirement; the requirement then waits for the next such event. Before this, `computeStanding` decided surplus first and honoured picks only among surplus Attendance, so a first HLHM picked to make up a Cabinet Retreat silently filled HLHM and left the Retreat owed — the opposite of what the "Make up" button promised.

**Considered Options**

- **Requirement first (the old behaviour).** Keeps requirements filled, but ignores an explicit choice without telling the Member, and the E-Board review shows "Fills the HLHM requirement" for a request sent to make something up.
- **Refuse the pick when the event would fill a requirement.** Honest, but leaves a Member who can't make the next Core Event with no way to clear the Strike now.
- **Pick wins (chosen).** The Member's explicit choice is the intent; the cost (an open requirement — for HLHM, possibly for the rest of the year, since it only runs Sept 15 – Oct 15) is shown as a notice on the request form, the E-Board review and the code box, but never blocks.

**Consequences**

- A pick only counts while its miss is still owed; if E-Board overrode it or another Attendance already made it up, the Attendance fills its requirement as if nothing were named.
- Standing is calculated on read (ADR-0002), so this re-scores already-approved requests whose pick was ignored: those Members see a Missed Event made up and a requirement reopened. A dry-run script lists who changes before release.
- Without a pick, a requirement-filling Attendance still fills the requirement; only the Member's explicit choice turns it into a Make-up.
