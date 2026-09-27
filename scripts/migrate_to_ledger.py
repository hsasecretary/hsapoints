"""
Re-scoring migration (#77, planned in #44): moves this year's points onto the
Attendance ledger (docs/adr/0002-attendance-ledger-calculated-on-read.md)
alongside the old counters, which it never touches.

Everything it reads and writes lives in scripts/migration/ (git-ignored:
member data, never commit it):

    forms/orientation, forms/retreat, forms/cabinet-0827, forms/open-house
        The Google Form exports (.csv or .xlsx) from
        docs/migration/cabinet-attendance-records.md. Needed only for the
        first dry run, which copies them into the review sheet.
    review.xlsx   the review sheet the Secretary checks and signs
    diff.xlsx     old fallPoints against the new numbers, per Member
    backup-*.json users, codes, pointRequests and attendances, before --apply

Dry run (the default; writes nothing to Firestore):
    python scripts/migrate_to_ledger.py

    The first run writes review.xlsx with a suggested Event Type for every
    code without one and for the retroactive codes, a suggested code or Event
    Type for every approved pre-rubric Point Request, every form response
    matched to a Member (by email ignoring case, then by name), an Unmatched
    tab, the Cabinet Members absent from each cabinet form, and the Members
    whose `eboard` and `involvement` disagree. Later runs keep the sheet and
    read its decisions, so the diff shows what the Secretary settled. Pass
    --new-sheet to start the sheet over.

Apply (reads only the signed review sheet):
    python scripts/migrate_to_ledger.py --apply

    Types the codes, creates the retroactive codes, writes every Attendance
    (old eventCodes, approved requests, form responses), backfills
    heldToCabinetRules / mlpCohort / webTeam, and closes each unconfirmed
    pre-code absence with a missedEventOverride. Every ID is deterministic
    and nothing that exists is overwritten, so re-applying writes only what
    is new (e.g. codes redeemed since).

Options: --today YYYY-MM-DD (default: today) for Missed Events and Strikes.
With FIRESTORE_EMULATOR_HOST set it runs against the local emulator instead.

The new numbers come from lib/computeStanding.ts, run in Node through
frontend/scripts/migration-standings.ts, so the script and the app agree.
Needs `npm install` in frontend/.
"""
import argparse
import datetime as dt
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import pandas as pd

import ledger_plan as plan

BASE = Path(__file__).resolve().parent
OUT = BASE / "migration"
FORMS = OUT / "forms"
REVIEW = OUT / "review.xlsx"
DIFF = OUT / "diff.xlsx"
FRONTEND = BASE.parent / "frontend"

# Events before the site had codes for them: each gets a retroactive code and
# its form responses become Attendance under that code's ID. PRIMERO is the
# code the Aug 27 form asked for.
RETRO_CODES = [
    {"id": "ORIENT0730", "event": "Cabinet Orientation", "eventDate": "2026-07-30",
     "eventTypeId": "cabinet-orientation", "form": "orientation", "cabinet": True},
    {"id": "RETREAT0822", "event": "Cabinet Retreat", "eventDate": "2026-08-22",
     "eventTypeId": "cabinet-retreat", "form": "retreat", "cabinet": True},
    {"id": "PRIMERO", "event": "HSA Cabinet 08/27", "eventDate": "2026-08-27",
     "eventTypeId": "cabinet-thursday", "form": "cabinet-0827", "cabinet": True},
    {"id": "OPENHOUSE0828", "event": "Open House Social", "eventDate": "2026-08-28",
     "eventTypeId": "external-social", "form": "open-house", "cabinet": False},
]
ADJUSTMENT = "adjustment"
BATCH_SIZE = 400


# ---------------------------------------------------------------- helpers

def iso(value):
    """A Firestore date (string, datetime or Timestamp) as 'YYYY-MM-DD'."""
    if value is None or value == "":
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()[:10]
    return str(value)[:10]


def plain(value):
    """Firestore values as JSON-safe data."""
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [plain(v) for v in value]
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def run_node(*args):
    cmd = ["node", str(FRONTEND / "node_modules" / "vite-node" / "vite-node.mjs"),
           "scripts/migration-standings.ts", *args]
    result = subprocess.run(cmd, cwd=FRONTEND, capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        sys.exit(f"migration-standings.ts failed:\n{result.stderr}")
    return result.stdout


def academic_year_start(today):
    year = today.year if today.month >= 6 else today.year - 1
    return f"{year}-06-01"


# ------------------------------------------------------------------ loading

def load_firestore(db):
    def stream(name):
        return {d.id: d.to_dict() or {} for d in db.collection(name).stream()}
    return {name: stream(name) for name in ("users", "codes", "pointRequests", "attendances")}


def read_form(name):
    for suffix in (".csv", ".xlsx"):
        path = FORMS / f"{name}{suffix}"
        if path.exists():
            frame = (pd.read_csv(path, dtype=str, keep_default_na=False) if suffix == ".csv"
                     else pd.read_excel(path, dtype=str, keep_default_na=False))
            return frame
    return None


def form_rows(frame):
    """The rows of one Google Form export as {row, timestamp, email, name, answer, attended}."""
    cols = {c.lower().strip(): c for c in frame.columns}

    def col(*needles):
        return next((orig for low, orig in cols.items() if all(n in low for n in needles)), None)

    email_col, stamp_col = col("email"), col("timestamp")
    full_col, first_col, last_col = col("first and last"), col("first name"), col("last name")
    answer_col = col("did you attend")
    rows = []
    for i, r in frame.iterrows():
        name = r[full_col] if full_col else f"{r[first_col] if first_col else ''} {r[last_col] if last_col else ''}"
        answer = r[answer_col].strip() if answer_col else ""
        rows.append({"row": int(i) + 2, "timestamp": r[stamp_col] if stamp_col else "",
                     "email": r[email_col].strip() if email_col else "", "name": " ".join(str(name).split()),
                     "answer": answer, "attended": "No" if answer.lower().startswith("n") else "Yes"})
    return rows


# ------------------------------------------------------------ review sheet

def untyped_codes(codes):
    return {cid: c for cid, c in codes.items() if not c.get("eventTypeId")}


def pending_requests(requests):
    """Approved on the old review page: no Attendance or Adjustment yet."""
    return {rid: r for rid, r in requests.items()
            if r.get("status") == "approved" and not r.get("attendanceIds") and not r.get("adjustment")}


def build_review(data, rubric, year_start):
    users, codes = data["users"], data["codes"]
    code_rows = []
    for cid, c in sorted(untyped_codes(codes).items()):
        suggested = plan.suggest_event_type(c.get("category"), c.get("event"))
        code_rows.append({"codeId": cid, "event": c.get("event", ""), "eventDate": iso(c.get("eventDate")),
                          "source": "existing code", "oldCategory": c.get("category", ""),
                          "oldPoints": c.get("points", ""), "suggestedEventTypeId": suggested,
                          "eventTypeId": suggested})
    for retro in RETRO_CODES:
        code_rows.append({"codeId": retro["id"], "event": retro["event"], "eventDate": retro["eventDate"],
                          "source": f"retroactive (forms/{retro['form']})", "oldCategory": "", "oldPoints": "",
                          "suggestedEventTypeId": retro["eventTypeId"], "eventTypeId": retro["eventTypeId"]})

    typed = [{"id": cid, "eventDate": iso(c.get("eventDate")), "eventTypeId": c.get("eventTypeId") or
              plan.suggest_event_type(c.get("category"), c.get("event"))} for cid, c in codes.items()]
    request_rows = []
    for rid, r in sorted(pending_requests(data["pointRequests"]).items()):
        date = iso(r.get("date"))
        if date < year_start:
            continue
        suggested = plan.suggest_request({"activityName": r.get("activityName"), "date": date}, typed)
        request_rows.append({"requestId": rid, "userEmail": str(r.get("userEmail", "")).lower(),
                             "activityName": r.get("activityName", ""), "date": date,
                             "description": r.get("description", ""), "oldPoints": r.get("pointsRequested", ""),
                             "hours": r.get("hours", ""), "suggestedCodeId": suggested["codeId"],
                             "suggestedEventTypeId": suggested["eventTypeId"], "codeId": suggested["codeId"],
                             "eventTypeId": suggested["eventTypeId"]})

    response_rows, missing_forms = [], []
    for retro in RETRO_CODES:
        frame = read_form(retro["form"])
        if frame is None:
            missing_forms.append(retro["form"])
            continue
        for m in plan.match_form_rows(form_rows(frame), users):
            response_rows.append({"codeId": retro["id"], "form": retro["form"], **m})
    unmatched_rows = [{"codeId": r["codeId"], "form": r["form"], "row": r["row"], "email": r["email"],
                       "name": r["name"], "attended": r["attended"], "memberEmail": ""}
                      for r in response_rows if r["matchedBy"] == "unmatched" and r["attended"] == "Yes"]

    held = held_members(users, {e: plan.backfill(e, u) for e, u in users.items()})
    attended = attended_by_code(response_rows, {})
    absentee_rows = []
    for retro in RETRO_CODES:
        if not retro["cabinet"]:
            continue
        for email in sorted(held):
            if email not in attended.get(retro["id"], set()):
                u = users[email]
                absentee_rows.append({"codeId": retro["id"], "event": retro["event"], "memberEmail": email,
                                      "name": f"{u.get('firstName', '')} {u.get('lastName', '')}".strip(),
                                      "cabinet": u.get("cabinet", ""), "confirmedMiss": ""})

    mismatch_rows = [{"email": e, "name": f"{u.get('firstName', '')} {u.get('lastName', '')}".strip(),
                      "eboard": u.get("eboard"), "involvement": u.get("involvement"),
                      "cabinet": u.get("cabinet"), "position": u.get("position")}
                     for e, u in sorted(users.items()) if plan.eboard_mismatch(u)]

    rubric_rows = [{"eventTypeId": t["id"], "label": t["label"], "tier": t["tier"],
                    "vePoints": t["vePoints"], "cabinetPoints": t["cabinetPoints"],
                    "cabinetOnly": t["cabinetOnly"]} for t in rubric]
    rubric_rows.append({"eventTypeId": ADJUSTMENT, "label": "Adjustment (requests only: fits no Event Type; "
                        "adds oldPoints to the Member's adjustments)", "tier": "", "vePoints": "",
                        "cabinetPoints": "", "cabinetOnly": ""})

    return {
        "Codes": pd.DataFrame(code_rows),
        "Requests": pd.DataFrame(request_rows, columns=[
            "requestId", "userEmail", "activityName", "date", "description", "oldPoints", "hours",
            "suggestedCodeId", "suggestedEventTypeId", "codeId", "eventTypeId"]),
        "Form responses": pd.DataFrame(response_rows, columns=[
            "codeId", "form", "row", "timestamp", "email", "name", "answer", "attended", "matchedBy",
            "memberEmail"]),
        "Unmatched": pd.DataFrame(unmatched_rows, columns=[
            "codeId", "form", "row", "email", "name", "attended", "memberEmail"]),
        "Absentees": pd.DataFrame(absentee_rows, columns=[
            "codeId", "event", "memberEmail", "name", "cabinet", "confirmedMiss"]),
        "Eboard mismatches": pd.DataFrame(mismatch_rows, columns=[
            "email", "name", "eboard", "involvement", "cabinet", "position"]),
        "Rubric": pd.DataFrame(rubric_rows),
    }, missing_forms


SIGN_OFF_NOTES = [
    "Check every tab, then sign below. --apply reads only this sheet, and only once it is signed.",
    "Codes: set eventTypeId (see the Rubric tab) for every row.",
    "Requests: set codeId to fold a request into that code's Attendance, or leave it blank and set eventTypeId "
    "(or 'adjustment' for one that fits no Event Type).",
    "Unmatched: type the Member's @ufl.edu email into memberEmail; rows left blank are skipped and logged.",
    "Absentees: write 'yes' in confirmedMiss for a real miss (a Missed Event); every other absence is closed "
    f"with a missedEventOverride (\"{plan.OVERRIDE_REASON}\").",
    "Eboard mismatches: fix these in Firestore; `eboard` decides E-Board status.",
]


def write_review(tabs):
    with pd.ExcelWriter(REVIEW, engine="openpyxl") as writer:
        sign = pd.DataFrame([["Reviewed by (Secretary)", ""], ["Date (YYYY-MM-DD)", ""], ["", ""]]
                            + [["", note] for note in SIGN_OFF_NOTES], columns=["Sign-off", "Value"])
        sign.to_excel(writer, sheet_name="Sign-off", index=False)
        for name, frame in tabs.items():
            frame.to_excel(writer, sheet_name=name, index=False)


def read_review():
    tabs = pd.read_excel(REVIEW, sheet_name=None, dtype=str, keep_default_na=False)
    sign = tabs["Sign-off"]
    reviewed_by = sign.iloc[0, 1].strip()
    signed_on = sign.iloc[1, 1].strip()[:10]
    return {name: frame.to_dict("records") for name, frame in tabs.items()}, reviewed_by, signed_on


# -------------------------------------------------------------- the plan

def held_members(users, patches=None):
    patches = patches or {}
    return {e for e, u in users.items() if {**u, **patches.get(e, {})}.get("heldToCabinetRules") is True}


def attended_by_code(response_rows, resolutions):
    """Member emails who attended each retroactive code, from the form rows
    (matched, or resolved on the Unmatched tab); a "No" never counts."""
    out = {}
    for r in response_rows:
        if r["attended"] != "Yes":
            continue
        member = r["memberEmail"] or resolutions.get((r["codeId"], str(r["row"])), "")
        if member:
            out.setdefault(r["codeId"], set()).add(member.lower())
    return out


def build_plan(data, sheet, rubric, signed_on, year_start):
    """Every write the migration would make, and the problems stopping --apply."""
    users, existing = data["users"], data["attendances"]
    type_ids = {t["id"] for t in rubric}
    per_hour = {t["id"] for t in rubric if t.get("perHour")}
    problems, skipped = [], []

    # Codes: the confirmed Event Type for each untyped code, and the retroactive codes.
    codes = {cid: {"eventDate": iso(c.get("eventDate")), "eventTypeId": c.get("eventTypeId") or "",
                   "event": c.get("event", "")} for cid, c in data["codes"].items()}
    code_types, new_codes = {}, {}
    for row in sheet["Codes"]:
        cid, type_id = row["codeId"].strip().upper(), row["eventTypeId"].strip()
        if type_id not in type_ids:
            problems.append(f"Codes: {cid} needs an Event Type (got {type_id!r}).")
            continue
        retro = next((r for r in RETRO_CODES if r["id"] == cid), None)
        if retro:
            if cid in data["codes"] and iso(data["codes"][cid].get("eventDate")) != retro["eventDate"]:
                problems.append(f"Codes: {cid} already exists as a different code.")
                continue
            new_codes[cid] = {"event": retro["event"], "eventDate": retro["eventDate"], "eventTypeId": type_id}
            codes[cid] = dict(new_codes[cid])
        elif cid in codes and not codes[cid]["eventTypeId"]:
            code_types[cid] = type_id
            codes[cid]["eventTypeId"] = type_id

    # Users: the backfilled facts.
    patches = {}
    for email, u in users.items():
        patch = plan.backfill(email, u)
        if patch:
            patches[email] = patch

    attendances = {}

    def add(pairs):
        for aid, doc in pairs:
            if aid not in existing and aid not in attendances:
                attendances[aid] = doc

    for email, u in sorted(users.items()):
        add(plan.code_attendances(email, u, codes))

    # Requests: fold into a code, a request Attendance, or an Adjustment.
    request_updates, adjustments = {}, {}
    for row in sheet["Requests"]:
        rid, email = row["requestId"], row["userEmail"].strip().lower()
        request = data["pointRequests"].get(rid)
        if not request or request.get("attendanceIds") or request.get("adjustment"):
            continue
        code_id, type_id = row["codeId"].strip().upper(), row["eventTypeId"].strip()
        if code_id and not codes.get(code_id, {}).get("eventTypeId"):
            problems.append(f"Requests: {rid} names {code_id}, which is not a typed code.")
            continue
        if not code_id and type_id == ADJUSTMENT:
            try:
                points = int(float(row["oldPoints"]))
            except ValueError:
                problems.append(f"Requests: {rid} has no oldPoints to adjust by.")
                continue
            adjustments.setdefault(email, []).append({"points": points, "note": row["activityName"],
                                                       "date": row["date"], "requestId": rid})
            request_updates[rid] = {"adjustment": {"points": points, "note": row["activityName"]}}
            continue
        if not code_id and type_id not in type_ids:
            problems.append(f"Requests: {rid} needs a codeId or an Event Type (got {type_id!r}).")
            continue
        pairs = plan.request_attendances({"id": rid, "userEmail": email, "date": row["date"],
                                          "hours": row.get("hours")},
                                         {"codeId": code_id, "eventTypeId": type_id}, codes, per_hour)
        add(pairs)
        request_updates[rid] = {"eventTypeId": pairs[0][1]["eventTypeId"], "codeId": code_id or None,
                                "attendanceIds": [aid for aid, _ in pairs]}

    # Form responses: Attendance under each retroactive code.
    resolutions = {}
    for row in sheet["Unmatched"]:
        member = row["memberEmail"].strip().lower()
        key = (row["codeId"], str(row["row"]))
        if member in users:
            resolutions[key] = member
        else:
            skipped.append(f"Unmatched: {row['form']} row {row['row']} ({row['name']}) "
                           + (f"-- {member} is not a Member" if member else "left unresolved"))
    attended = attended_by_code(sheet["Form responses"], resolutions)
    for cid in sorted(attended):
        if cid in new_codes:
            add(plan.form_attendance(email, cid, codes[cid]) for email in sorted(attended[cid]))

    # Absences from the cabinet forms: a missedEventOverride unless confirmed.
    confirmed = {}
    for row in sheet["Absentees"]:
        if row["confirmedMiss"].strip().lower() in ("yes", "y", "true", "x"):
            confirmed.setdefault(row["codeId"], set()).add(row["memberEmail"].strip().lower())
    held = held_members(users, patches)
    overrides = {}
    for retro in RETRO_CODES:
        if retro["cabinet"] and retro["id"] in new_codes:
            for email, entry in plan.absentee_overrides(retro["id"], held, attended.get(retro["id"], set()),
                                                        confirmed.get(retro["id"], set()), signed_on).items():
                overrides.setdefault(email, []).append(entry)
    for email, entries in overrides.items():
        patch = plan.override_patch(users[email], entries)
        if patch:
            patches.setdefault(email, {}).update(patch)
    for email, entries in adjustments.items():
        if email not in users:
            problems.append(f"Requests: {email} has no users doc.")
            continue
        have = users[email].get("adjustments") or []
        new = [a for a in entries if not any(h.get("requestId") == a["requestId"] for h in have)]
        if new:
            patches.setdefault(email, {})["adjustments"] = have + new

    for aid, doc in attendances.items():
        if doc["email"] not in users:
            problems.append(f"Attendance {aid}: {doc['email']} has no users doc.")

    attendee_counts = {}
    for aid, doc in list(existing.items()) + list(attendances.items()):
        if doc.get("codeId") in new_codes:
            attendee_counts[doc["codeId"]] = attendee_counts.get(doc["codeId"], 0) + 1
    for cid, code in new_codes.items():
        code["attendeeCount"] = attendee_counts.get(cid, 0)

    return {"codes": codes, "codeTypes": code_types, "newCodes": new_codes, "attendances": attendances,
            "patches": patches, "requestUpdates": request_updates, "problems": problems, "skipped": skipped}


# ------------------------------------------------------------------ diff

def build_diff(data, the_plan, rubric, today, year_start):
    users = data["users"]
    labels = {t["id"]: t["label"] for t in rubric}
    all_attendance = {aid: d for aid, d in {**data["attendances"], **the_plan["attendances"]}.items()
                      if iso(d.get("eventDate")) >= year_start}
    by_member = {}
    for aid, d in sorted(all_attendance.items()):
        entry = {"id": aid, "eventTypeId": d.get("eventTypeId"), "eventDate": iso(d.get("eventDate")),
                 "source": d.get("source")}
        for key in ("codeId", "requestId", "makeupFor"):
            if d.get(key):
                entry[key] = d[key]
        by_member.setdefault(str(d.get("email", "")).lower(), []).append(entry)

    fields = ("involvement", "cabinet", "eboard", "approved", "heldToCabinetRules", "webTeam", "mlpCohort",
              "excusals", "strikeRemovals", "missedEventOverrides", "adjustments")
    members = []
    for email, u in sorted(users.items()):
        merged = {**u, **the_plan["patches"].get(email, {})}
        members.append({"email": email, "member": plain({k: merged[k] for k in fields if k in merged}),
                        "attendances": by_member.get(email, [])})
    codes = [{"id": cid, "eventTypeId": c["eventTypeId"], "eventDate": c["eventDate"], "event": c.get("event", "")}
             for cid, c in sorted(the_plan["codes"].items()) if c["eventTypeId"] and c["eventDate"] >= year_start]

    OUT.mkdir(exist_ok=True)
    src, dst = OUT / "standings-in.json", OUT / "standings-out.json"
    src.write_text(json.dumps({"today": today.isoformat(), "codes": codes, "members": members}), encoding="utf-8")
    run_node("standings", str(src), str(dst))
    standings = json.loads(dst.read_text(encoding="utf-8"))
    src.unlink()
    dst.unlink()

    rows = []
    for email, u in sorted(users.items()):
        new = standings[email]
        merged = {**u, **the_plan["patches"].get(email, {})}
        old_fall = u.get("fallPoints") or 0
        rows.append({
            "email": email, "name": f"{u.get('firstName', '')} {u.get('lastName', '')}".strip(),
            "cabinet": u.get("cabinet", ""), "heldToCabinetRules": merged.get("heldToCabinetRules"),
            "old fallPoints": old_fall, "old otherPoints": u.get("otherPoints") or 0,
            "old cabinetPoints": u.get("cabinetPoints") or 0, "old strikes": u.get("strikes") or 0,
            "new VE Points": new["vePoints"], "VE change": new["vePoints"] - old_fall,
            "new Cabinet Points": new["cabinetPoints"], "Missed Events": ", ".join(new["missedEvents"]),
            "Open Strikes": new["openStrikes"], "reason": plan.diff_reason(u, new, labels),
        })
    return pd.DataFrame(rows)


def fingerprint(frames):
    """A hash of every cell, so two dry runs can be compared (xlsx files carry save times)."""
    payload = {name: frame.astype(str).values.tolist() for name, frame in frames.items()}
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]


# ----------------------------------------------------------------- apply

def backup(data):
    stamp = dt.datetime.now().strftime("%Y%m%dT%H%M%S")
    path = OUT / f"backup-{stamp}.json"
    path.write_text(json.dumps(plain(data), indent=1, sort_keys=True), encoding="utf-8")
    return path


def apply_plan(db, the_plan):
    writes = []
    for cid, type_id in sorted(the_plan["codeTypes"].items()):
        writes.append(("update", db.collection("codes").document(cid), {"eventTypeId": type_id}))
    for cid, code in sorted(the_plan["newCodes"].items()):
        writes.append(("set", db.collection("codes").document(cid), code))
    for aid, doc in sorted(the_plan["attendances"].items()):
        writes.append(("create", db.collection("attendances").document(aid), doc))
    for email, patch in sorted(the_plan["patches"].items()):
        writes.append(("update", db.collection("users").document(email), patch))
    for rid, patch in sorted(the_plan["requestUpdates"].items()):
        writes.append(("update", db.collection("pointRequests").document(rid), patch))

    for start in range(0, len(writes), BATCH_SIZE):
        batch = db.batch()
        for kind, ref, payload in writes[start:start + BATCH_SIZE]:
            getattr(batch, kind)(ref, payload)
        batch.commit()
    return len(writes)


def new_code_writes(data, the_plan):
    """Drop retroactive codes that already exist unchanged, so a re-apply writes nothing."""
    for cid in list(the_plan["newCodes"]):
        current = data["codes"].get(cid)
        if current and all(current.get(k) == v for k, v in the_plan["newCodes"][cid].items()):
            del the_plan["newCodes"][cid]


# ------------------------------------------------------------------ main

def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[1], formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write to Firestore (needs the signed review sheet)")
    parser.add_argument("--new-sheet", action="store_true", help="rewrite review.xlsx from fresh suggestions")
    parser.add_argument("--today", type=dt.date.fromisoformat, default=dt.date.today())
    args = parser.parse_args()

    import os
    import firebase_admin
    from firebase_admin import credentials, firestore
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        # Local emulator (npm run emulator in frontend/): never the live project.
        from google.auth.credentials import AnonymousCredentials
        from google.cloud import firestore as cloud_firestore
        db = cloud_firestore.Client(project="demo-hsapoints", credentials=AnonymousCredentials())
    else:
        key = BASE / "serviceAccountKey.json"
        if not key.exists():
            sys.exit(f"Missing {key}")
        firebase_admin.initialize_app(credentials.Certificate(str(key)))
        db = firestore.client()

    OUT.mkdir(exist_ok=True)
    rubric = json.loads(run_node("rubric"))
    year_start = academic_year_start(args.today)
    data = load_firestore(db)
    print(f"MODE: {'APPLY (writing to Firestore)' if args.apply else 'DRY RUN (no writes -- pass --apply)'}")
    print(f"Read {len(data['users'])} users, {len(data['codes'])} codes, {len(data['pointRequests'])} requests, "
          f"{len(data['attendances'])} attendances.")

    if args.new_sheet or not REVIEW.exists():
        if args.apply:
            sys.exit(f"No review sheet at {REVIEW}. Run a dry run first and have the Secretary sign it.")
        tabs, missing_forms = build_review(data, rubric, year_start)
        write_review(tabs)
        print(f"Wrote {REVIEW.relative_to(BASE.parent)} -- the Secretary reviews and signs it.")
        for form in missing_forms:
            print(f"  WARNING  no forms/{form}.csv or .xlsx: nobody gets Attendance for it, "
                  "and every Cabinet Member's absence would be closed with an override.")
    else:
        print(f"Using the decisions in {REVIEW.relative_to(BASE.parent)} (pass --new-sheet to start over).")

    sheet, reviewed_by, signed_on = read_review()
    if args.apply and not (reviewed_by and signed_on):
        sys.exit("The review sheet is not signed (Sign-off: Reviewed by and Date). Nothing written.")
    the_plan = build_plan(data, sheet, rubric, signed_on or args.today.isoformat(), year_start)
    new_code_writes(data, the_plan)

    diff = build_diff(data, the_plan, rubric, args.today, year_start)
    with pd.ExcelWriter(DIFF, engine="openpyxl") as writer:
        diff.to_excel(writer, sheet_name="Per Member", index=False)
    print(f"Wrote {DIFF.relative_to(BASE.parent)}.")

    summary = {
        "codes to type": len(the_plan["codeTypes"]), "codes to create": len(the_plan["newCodes"]),
        "attendances to write": len(the_plan["attendances"]), "users to update": len(the_plan["patches"]),
        "requests to update": len(the_plan["requestUpdates"]),
    }
    for label, count in summary.items():
        print(f"  {label}: {count}")
    for line in the_plan["skipped"]:
        print(f"  SKIPPED  {line}")
    for line in the_plan["problems"]:
        print(f"  PROBLEM  {line}")
    print("Fingerprint:", fingerprint({"plan": pd.DataFrame([json.dumps(plain(
        {k: v for k, v in the_plan.items() if k not in ("codes",)}), sort_keys=True)]), "diff": diff}))

    if not args.apply:
        return
    if the_plan["problems"]:
        sys.exit("Fix the problems above in the review sheet. Nothing written.")
    print(f"Reviewed by {reviewed_by} on {signed_on}.")
    if not any(the_plan[k] for k in ("codeTypes", "newCodes", "attendances", "patches", "requestUpdates")):
        print("Nothing new to write.")
        return
    print(f"Backed up to {backup(data).relative_to(BASE.parent)}.")
    print(f"Wrote {apply_plan(db, the_plan)} docs.")


if __name__ == "__main__":
    main()
