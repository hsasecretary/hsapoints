"""The pure half of migrate_to_ledger.py (#77): what the migration suggests
and writes, worked out from plain dicts with no Firestore. Tested by
scripts/test_ledger_plan.py.

IDs follow docs/adr/0002-attendance-ledger-calculated-on-read.md, so every
write is deterministic and a re-run lands on the same docs.
"""
import math
import re
import unicodedata

WEB_TEAM = ["carrascom@ufl.edu", "saurezjimenez.jo@ufl.edu", "csalcedo@ufl.edu", "h.alvarez@ufl.edu"]

OVERRIDE_REASON = "pre-code event, no roster confirmed"
MIGRATION_BY = "migration"

# Old codes.category -> Event Type (from #40, resolved in #44). OPA,
# Cabinet and Other are read by name in suggest_event_type.
_CATEGORY_TYPES = {
    "gbm": "gbm",
    "programming": "hsa-programming",
    "tabling": "tabling",
    "affiliate org gbm": "affiliate-org",
    "affiliate org event": "affiliate-org",
    "mlp fall": "mlp-open",
    "mlp spring": "mlp-open",
}

# Event names (or request activity names) that say their Event Type outright.
_NAME_TYPES = [
    (r"\bhlhm\b", "hlhm"),
    (r"\bhlsa\b", "hlsa"),
    (r"solidarity", "opa-solidarity-session"),
    (r"retreat", "cabinet-retreat"),
    (r"orientation", "cabinet-orientation"),
    (r"committee meeting|\bcabinet\b", "cabinet-thursday"),
    (r"open house", "external-social"),
    (r"\bgbm\b", "gbm"),
    (r"affiliat", "affiliate-org"),
    (r"tabling", "tabling"),
    (r"fundrais", "hsa-fundraising"),
    (r"\bopa\b", "opa-general"),
]


def _by_name(name):
    text = (name or "").lower()
    for pattern, type_id in _NAME_TYPES:
        if re.search(pattern, text):
            return type_id
    return ""


def suggest_event_type(category, event):
    """The Event Type a pre-rubric code most likely is, or '' for E-Board to pick."""
    named = _by_name(event)
    category = (category or "").strip().lower()
    if category == "cabinet":
        return named if named.startswith("cabinet-") else "cabinet-thursday"
    if category == "opa":
        return "opa-solidarity-session" if named == "opa-solidarity-session" else "opa-general"
    if category.startswith("affiliate org") and named == "hlhm":
        return "hlhm"
    return _CATEGORY_TYPES.get(category) or named


def suggest_request(request, codes):
    """For an approved pre-rubric request: a code that day of the Event Type its
    name suggests (so it folds into that code's Attendance), else just the type."""
    type_id = _by_name(request.get("activityName"))
    same_day = sorted((c for c in codes if c["eventDate"] == request.get("date")
                       and type_id and c.get("eventTypeId") == type_id), key=lambda c: c["id"])
    return {"codeId": same_day[0]["id"] if same_day else "", "eventTypeId": type_id}


def normalize_name(name):
    text = unicodedata.normalize("NFKD", str(name or "")).encode("ascii", "ignore").decode()
    return " ".join(text.lower().split())


def match_form_rows(rows, users):
    """Each form row with `memberEmail` and `matchedBy` (email | name | unmatched).
    A name shared by two Members is left unmatched: never guessed."""
    by_name = {}
    for email, user in users.items():
        key = normalize_name(f"{user.get('firstName', '')} {user.get('lastName', '')}")
        by_name.setdefault(key, []).append(email)
    matched = []
    for row in rows:
        email = str(row.get("email") or "").strip().lower()
        if email in users:
            member, how = email, "email"
        else:
            candidates = by_name.get(normalize_name(row.get("name")), [])
            member, how = (candidates[0], "name") if len(candidates) == 1 else ("", "unmatched")
        matched.append({**row, "memberEmail": member, "matchedBy": how})
    return matched


def backfill(email, user):
    """The new users/{email} facts to set (#44 step 6), leaving any E-Board already set."""
    patch = {}
    if email.lower() in WEB_TEAM:
        if user.get("webTeam") is not True:
            patch["webTeam"] = True
        if user.get("heldToCabinetRules") is not True:
            patch["heldToCabinetRules"] = True
    elif not isinstance(user.get("heldToCabinetRules"), bool):
        patch["heldToCabinetRules"] = bool((user.get("cabinet") or "none") != "none"
                                           and user.get("approved") is True and not user.get("eboard"))
    if user.get("involvement") == "mlp" and not user.get("mlpCohort"):
        patch["mlpCohort"] = "fall"
    return patch


def eboard_mismatch(user):
    """`eboard` decides E-Board status; flag Members whose sign-up involvement disagrees."""
    involvement = user.get("involvement")
    return bool(involvement) and (user.get("eboard") is True) != (involvement == "eboard")


def _attendance(email, code_id, code, source, **extra):
    return (f"{email}__{code_id}", {"email": email, "eventTypeId": code["eventTypeId"],
                                    "eventDate": code["eventDate"], "source": source, **extra,
                                    "codeId": code_id})


def code_attendances(email, user, codes):
    """An Attendance for every code in the Member's old eventCodes that now has an Event Type."""
    email = email.lower()
    removed = {k.upper() for k in (user.get("removedCheckIns") or {})}
    out = {}
    for redeemed in user.get("eventCodes") or []:
        code_id = str(redeemed).strip().upper()
        code = codes.get(code_id)
        if code and code.get("eventTypeId") and code_id not in removed:
            out[code_id] = _attendance(email, code_id, code, "code")
    return [out[k] for k in sorted(out)]


def form_attendance(email, code_id, code):
    """Attendance from a Google Form export, entered by E-Board under the retroactive code."""
    return _attendance(email.lower(), code_id, code, "eboard")


def request_attendances(request, decision, codes, per_hour_types):
    """What approving a pre-rubric request writes, as lib/requestReview.ts would."""
    email = request["userEmail"].lower()
    code_id = (decision.get("codeId") or "").strip().upper()
    if code_id:
        return [_attendance(email, code_id, codes[code_id], "request", requestId=request["id"])]
    type_id = decision["eventTypeId"]
    hours = 1
    if type_id in per_hour_types:
        try:
            hours = max(1, math.floor(float(request.get("hours") or 1)))
        except (TypeError, ValueError):
            hours = 1
    return [(f"{email}__req-{request['id']}" + (f"-h{n}" if hours > 1 else ""),
             {"email": email, "eventTypeId": type_id, "eventDate": request["date"], "source": "request",
              "requestId": request["id"]})
            for n in range(1, hours + 1)]


def absentee_overrides(code_id, roster, attended, confirmed_misses, at):
    """A missedEventOverride for every Member on the roster missing from the form,
    unless E-Board confirmed it was a real miss."""
    return {email: {"codeId": code_id, "reason": OVERRIDE_REASON, "by": MIGRATION_BY, "at": at}
            for email in sorted(roster) if email not in attended and email not in confirmed_misses}


def override_patch(user, entries):
    """The users/{email} update adding each override (and its absenceLog entry,
    as lib/excuseAbsence.ts does) that isn't there yet; {} if nothing is new."""
    overrides = list(user.get("missedEventOverrides") or [])
    log = list(user.get("absenceLog") or [])
    have = {o.get("codeId", "").upper() for o in overrides}
    new = [e for e in entries if e["codeId"].upper() not in have]
    if not new:
        return {}
    for e in new:
        overrides.append(e)
        log.append({"kind": "closed", "codeId": e["codeId"], "note": e["reason"], "by": e["by"], "at": e["at"]})
    return {"missedEventOverrides": overrides, "absenceLog": log}


def diff_reason(old, new, labels):
    """Why a Member's new numbers differ from their old fallPoints."""
    parts = []
    attendance = new.get("attendance") or {}
    if attendance:
        counts = sorted((labels.get(t, t), n) for t, n in attendance.items())
        parts.append("Attendance: " + ", ".join(f"{n} {label}" for label, n in counts))
    else:
        parts.append("No Attendance")
    if old.get("otherPoints"):
        parts.append(f"hand-entered otherPoints {old['otherPoints']} not carried over")
    if old.get("strikes"):
        parts.append(f"old strikes {old['strikes']} replaced by Missed Events")
    return "; ".join(parts)
