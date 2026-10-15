"""
Credits the 2026-27 Cabinet Additional Event Form (the Google Form members used
before the site) to event codes: creates a code for each event below that has
none, then writes an Attendance (source 'eboard') for every response that
matches a Member. Tabling and Affiliate-org responses are skipped: they go
through Point Requests. OPENHOUSE0828 already exists; its responses are only
reported.

Dry run (default; writes nothing):
    python scripts/import_additional_event_form.py <responses.xlsx>
Apply:
    python scripts/import_additional_event_form.py <responses.xlsx> --apply

Nothing that exists is overwritten, so re-running only adds what is new.
With FIRESTORE_EMULATOR_HOST set it runs against the local emulator.
"""
import argparse
import os
import re
import sys
from pathlib import Path

import pandas as pd
from google.cloud.firestore import Increment

import ledger_plan as plan

BASE = Path(__file__).resolve().parent

# pattern on the response's event name -> code. eventTypeId must be an id in
# frontend/src/lib/rubric.ts. HLSA is certain; the other two are the E-Board's call.
EVENTS = [
    {"id": "HLSA", "pattern": r"hlsa|hsla|nuestra luz", "event": "HLSA / Nuestra Luz Florece",
     "eventDate": "2026-08-26", "eventTypeId": "hlsa"},
    {"id": "LATINEPALOOZA", "pattern": r"latin", "event": "Latin-e-palooza",
     "eventDate": "2026-08-31", "eventTypeId": "hsa-programming"},
    {"id": "PASTELITO", "pattern": r"pastelito", "event": "Pastelitos in the Library",
     "eventDate": "2026-10-07", "eventTypeId": "hsa-programming"},
    {"id": "OPENHOUSE0828", "pattern": r"open ?house", "event": "Open House Social",
     "eventDate": "2026-08-28", "eventTypeId": "external-social", "existing": True},
]
SKIPPED_TYPES = {"tabling", "affiliate organization"}


def responses(path):
    frame = pd.read_excel(path, dtype=str, keep_default_na=False)
    for i, r in frame.iterrows():
        yield {"row": int(i) + 2, "email": r["Email Address"].strip(),
               "name": f"{r['First Name:']} {r['Last Name:']}", "event": r["Name of Event:"].strip(),
               "type": r["Type of Event:"].strip().lower(), "date": r["Date of Event:"][:10]}


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("xlsx", type=Path)
    parser.add_argument("--apply", action="store_true", help="write to Firestore")
    args = parser.parse_args()

    import firebase_admin
    from firebase_admin import credentials, firestore
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        from google.auth.credentials import AnonymousCredentials
        from google.cloud import firestore as cloud_firestore
        db = cloud_firestore.Client(project="demo-hsapoints", credentials=AnonymousCredentials())
    else:
        key = BASE / "serviceAccountKey.json"
        if not key.exists():
            sys.exit(f"Missing {key}")
        firebase_admin.initialize_app(credentials.Certificate(str(key)))
        db = firestore.client()

    users = {d.id: d.to_dict() or {} for d in db.collection("users").stream()}
    have_codes = {d.id for d in db.collection("codes").stream()}
    have_att = {d.id for d in db.collection("attendances").stream()}
    print(f"MODE: {'APPLY' if args.apply else 'DRY RUN (pass --apply to write)'}")

    by_code, skipped, unknown = {e["id"]: [] for e in EVENTS}, [], []
    for r in responses(args.xlsx):
        event = next((e for e in EVENTS if re.search(e["pattern"], r["event"], re.I)), None)
        if r["type"] in SKIPPED_TYPES or not event:
            (skipped if r["type"] in SKIPPED_TYPES else unknown).append(r)
        elif r["date"] != event["eventDate"]:
            unknown.append(r)
        else:
            by_code[event["id"]].append(r)

    batch = db.batch()
    ops = 0
    for e in EVENTS:
        matched = plan.match_form_rows(by_code[e["id"]], users)
        members = sorted({m["memberEmail"] for m in matched if m["memberEmail"]})
        fresh = [m for m in members if f"{m}__{e['id']}" not in have_att]
        lost = [m for m in matched if not m["memberEmail"]]
        print(f"\n{e['id']} ({e['eventTypeId']}): {len(by_code[e['id']])} responses, "
              f"{len(members)} Members, {len(fresh)} new Attendance"
              + ("" if e["id"] in have_codes else ", code will be created"))
        for m in lost:
            print(f"  unmatched: row {m['row']} {m['name']} <{m['email']}>")
        if e["id"] not in have_codes and not e.get("existing"):
            batch.set(db.collection("codes").document(e["id"]),
                      {"event": e["event"], "eventDate": e["eventDate"], "eventTypeId": e["eventTypeId"],
                       "attendeeCount": len(fresh)})
            ops += 1
        elif fresh:
            batch.update(db.collection("codes").document(e["id"]), {"attendeeCount": Increment(len(fresh))})
            ops += 1
        for email in fresh:
            aid, doc = plan.form_attendance(email, e["id"], e)
            batch.create(db.collection("attendances").document(aid), doc)
            ops += 1
    print(f"\nSkipped (Tabling / Affiliate -> Point Requests): {len(skipped)}")
    for r in unknown:
        print(f"  no code: row {r['row']} {r['event']!r} {r['date']} {r['type']}")
    if args.apply and ops <= 500:
        batch.commit()
        print(f"Wrote {ops} documents.")
    elif args.apply:
        sys.exit(f"{ops} writes exceed one batch; split the script.")


if __name__ == "__main__":
    main()
