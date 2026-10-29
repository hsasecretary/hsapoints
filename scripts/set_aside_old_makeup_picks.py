"""
Keep the standing of Point Requests approved before #121 shipped
(docs/adr/0005-make-up-pick-beats-requirement.md). The new rule lets a
Make-up pick win over filling a Semester Requirement or HLHM; the old one
ignored such a pick, so the event filled the requirement and the Missed Event
stayed owed. For each Attendance from a request approved before the cut-off
whose pick the old rule ignored, this moves `makeupFor` to `ignoredMakeupFor`:
the requirement stays filled, the miss stays owed, and the Member's pick is
kept for reference. Run it when the release deploys.

Dry run (the default; writes nothing, lists what it would set aside):
    python scripts/set_aside_old_makeup_picks.py

Apply:
    python scripts/set_aside_old_makeup_picks.py --apply

Options:
  --approved-before 2026-10-30T18:00 (default: now) only touches requests
      approved before this local time: use when the release went live, so a
      request approved under the new rule keeps its pick.
  --today YYYY-MM-DD (default: today) picks the school year.
With FIRESTORE_EMULATOR_HOST set it runs against the local emulator instead.

Both rules come from lib/computeStanding.ts, run in Node through
frontend/scripts/set-aside-makeup-picks.ts, which also checks that every
Member's standing comes out exactly as before; --apply refuses otherwise.
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
BATCH_SIZE = 400  # Firestore allows 500 writes per batch


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


def plan_set_aside(plan_input):
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp) / "in.json", Path(tmp) / "out.json"
        src.write_text(json.dumps(plan_input), encoding="utf-8")
        cmd = ["node", str(FRONTEND / "node_modules" / "vite-node" / "vite-node.mjs"),
               "scripts/set-aside-makeup-picks.ts", "plan", str(src), str(out)]
        result = subprocess.run(cmd, cwd=FRONTEND, capture_output=True, text=True, encoding="utf-8")
        if result.returncode != 0:
            sys.exit(f"set-aside-makeup-picks.ts failed:\n{result.stderr}")
        return json.loads(out.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="move the old picks aside in Firestore")
    parser.add_argument("--approved-before", type=dt.datetime.fromisoformat, default=dt.datetime.now(),
                        help="local date/time the release went live (default: now)")
    parser.add_argument("--today", type=dt.date.fromisoformat, default=dt.date.today())
    args = parser.parse_args()
    cutoff = args.approved_before.astimezone()  # a naive time is local

    import firebase_admin
    from firebase_admin import credentials, firestore
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        # Local emulator (npm run emulator in frontend/): never the live project.
        from google.auth.credentials import AnonymousCredentials
        from google.cloud import firestore as cloud_firestore
        db = cloud_firestore.Client(project="demo-hsapoints", credentials=AnonymousCredentials())
        delete_field = cloud_firestore.DELETE_FIELD
    else:
        key = BASE / "serviceAccountKey.json"
        if not key.exists():
            sys.exit(f"Missing {key}")
        firebase_admin.initialize_app(credentials.Certificate(str(key)))
        db = firestore.client()
        delete_field = firestore.DELETE_FIELD

    start, end = school_year(args.today)
    in_year = lambda row: start <= str(row.get("eventDate", "")) <= end  # noqa: E731
    users = {d.id: d.to_dict() or {} for d in db.collection("users").stream()}
    codes = [{"id": d.id, **plain(d.to_dict() or {})} for d in db.collection("codes").stream()]
    # Approved before the cut-off; one with no reviewedAt predates it (approved by the migration).
    approved_before = {
        d.id for d in db.collection("pointRequests").stream()
        if (data := d.to_dict() or {}).get("status") == "approved"
        and (data.get("reviewedAt") is None or data["reviewedAt"] < cutoff)
    }
    by_email, eligible = {}, []
    for d in db.collection("attendances").stream():
        data = d.to_dict() or {}
        if not in_year(data):
            continue
        by_email.setdefault(str(data.get("email", "")).lower(), []).append({"id": d.id, **plain(data)})
        if data.get("source") == "request" and data.get("requestId") in approved_before:
            eligible.append(d.id)

    plan = plan_set_aside({
        "today": args.today.isoformat(),
        "codes": [code for code in codes if in_year(code)],
        "members": [{"email": email, "member": plain(user), "attendances": by_email.get(email.lower(), [])}
                    for email, user in sorted(users.items())],
        "approvedBefore": eligible,
    })

    print(f"MODE: {'APPLY (writing to Firestore)' if args.apply else 'DRY RUN (no writes -- pass --apply)'}")
    print(f"Read {len(users)} users and {sum(len(rows) for rows in by_email.values())} attendances for {start} to {end};"
          f" {len(eligible)} from requests approved before {cutoff:%Y-%m-%d %H:%M %Z}.")
    for row in plan["setAside"]:
        print(f"  {row['email']}: {row['attendanceId']} kept its requirement; pick {row['makeupFor']} set aside")
    print(f"{len(plan['setAside'])} pick(s) to set aside.")
    if plan["mismatches"]:
        print("Standing would still change for: " + ", ".join(plan["mismatches"]))
        sys.exit("Not applying: check those Members by hand first.")

    if not args.apply or not plan["setAside"]:
        return
    rows = plan["setAside"]
    for i in range(0, len(rows), BATCH_SIZE):
        batch = db.batch()
        for row in rows[i:i + BATCH_SIZE]:
            batch.update(db.collection("attendances").document(row["attendanceId"]),
                         {"ignoredMakeupFor": row["makeupFor"], "makeupFor": delete_field})
        batch.commit()
    print(f"Set aside {len(rows)} pick(s).")


if __name__ == "__main__":
    main()
