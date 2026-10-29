"""
List the Members whose standing changes when a Make-up pick starts beating a
requirement (#121, docs/adr/0005-make-up-pick-beats-requirement.md): mostly
already-approved Point Requests whose pick the old rule ignored because the
event filled a Semester Requirement or HLHM. Run it before deploying #121, so
E-Board can tell those Members a Missed Event is now made up and a
requirement reopened.

Read-only; there is nothing to apply (standing is calculated on read):
    python scripts/makeup_pick_dry_run.py

Options: --today YYYY-MM-DD (default: today) picks the school year and which
Core Events count as missed.
With FIRESTORE_EMULATOR_HOST set it runs against the local emulator instead.

Both rules come from lib/computeStanding.ts, run in Node through
frontend/scripts/makeup-pick-dry-run.ts, so the script and the app agree.
Needs `npm install` in frontend/.
"""
import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

BASE = Path(__file__).resolve().parent
FRONTEND = BASE.parent / "frontend"


def plain(value):
    """Firestore values as JSON-safe data."""
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [plain(v) for v in value]
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def school_year(today):
    """lib/semester.ts academicYear: June 1 to May 31."""
    year = today.year if today.month >= 6 else today.year - 1
    return f"{year}-06-01", f"{year + 1}-05-31"


def pick_rule_changes(dry_run_input):
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp) / "in.json", Path(tmp) / "out.json"
        src.write_text(json.dumps(dry_run_input), encoding="utf-8")
        cmd = ["node", str(FRONTEND / "node_modules" / "vite-node" / "vite-node.mjs"),
               "scripts/makeup-pick-dry-run.ts", "changes", str(src), str(out)]
        result = subprocess.run(cmd, cwd=FRONTEND, capture_output=True, text=True, encoding="utf-8")
        if result.returncode != 0:
            sys.exit(f"makeup-pick-dry-run.ts failed:\n{result.stderr}")
        return json.loads(out.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--today", type=dt.date.fromisoformat, default=dt.date.today())
    args = parser.parse_args()

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

    start, end = school_year(args.today)
    in_year = lambda row: start <= str(row.get("eventDate", "")) <= end  # noqa: E731
    users = {d.id: d.to_dict() or {} for d in db.collection("users").stream()}
    codes = [{"id": d.id, **plain(d.to_dict() or {})} for d in db.collection("codes").stream()]
    by_email = {}
    for d in db.collection("attendances").stream():
        data = d.to_dict() or {}
        if in_year(data):
            by_email.setdefault(str(data.get("email", "")).lower(), []).append({"id": d.id, **plain(data)})

    changes = pick_rule_changes({
        "today": args.today.isoformat(),
        "codes": [code for code in codes if in_year(code)],
        "members": [{"email": email, "member": plain(user), "attendances": by_email.get(email.lower(), [])}
                    for email, user in sorted(users.items())],
    })

    print(f"Read {len(users)} users and {sum(len(rows) for rows in by_email.values())} attendances for {start} to {end}.")
    if not changes:
        print("No Member's standing changes under the new rule.")
        return
    print(f"{len(changes)} Member(s) change under the new rule:\n")
    for change in changes:
        print(change["email"])
        for row in change["madeUp"]:
            print(f"  {row['codeId']}: made up by {row['before'] or 'nothing'} -> {row['after'] or 'nothing (owed)'}")
        for req in change["reopened"]:
            print(f"  {req['eventTypeId']} requirement reopened{' (' + req['semester'] + ')' if req['semester'] else ''}")
        strikes = change["openStrikes"]
        if strikes["before"] != strikes["after"]:
            print(f"  open Strikes: {strikes['before']} -> {strikes['after']}")


if __name__ == "__main__":
    main()
