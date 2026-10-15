"""
Refresh the Leaderboard snapshot, leaderboard/current (#115,
docs/adr/0004-leaderboard-reads-an-eboard-written-snapshot.md), from the
command line. The app does this itself whenever an E-Board member opens an
E-Board page and the snapshot is over an hour old, or presses "Refresh now";
this is the fallback for when nobody on E-Board can.

Dry run (the default; writes nothing, prints the snapshot):
    python scripts/refresh_leaderboard.py

Apply (gives every Member without one a leaderboardToken, writes the snapshot):
    python scripts/refresh_leaderboard.py --apply

Options: --today YYYY-MM-DD (default: today) picks the school year.
With FIRESTORE_EMULATOR_HOST set it runs against the local emulator instead.

The snapshot comes from lib/leaderboard.ts, run in Node through
frontend/scripts/leaderboard-snapshot.ts, so the script and the app agree.
Needs `npm install` in frontend/.
"""
import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

BASE = Path(__file__).resolve().parent
FRONTEND = BASE.parent / "frontend"
BATCH_SIZE = 400
REFRESHED_BY = "scripts/refresh_leaderboard.py"


def plain(value):
    """Firestore values as JSON-safe data."""
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [plain(v) for v in value]
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def academic_year(today):
    """The school year holding `today`, June 1 to May 31, as 'YYYY-MM-DD' bounds."""
    year = today.year if today.month >= 6 else today.year - 1
    return f"{year}-06-01", f"{year + 1}-05-31"


def build_snapshot(refresh_input):
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp) / "in.json", Path(tmp) / "out.json"
        src.write_text(json.dumps(refresh_input), encoding="utf-8")
        cmd = ["node", str(FRONTEND / "node_modules" / "vite-node" / "vite-node.mjs"),
               "scripts/leaderboard-snapshot.ts", "snapshot", str(src), str(out)]
        result = subprocess.run(cmd, cwd=FRONTEND, capture_output=True, text=True, encoding="utf-8")
        if result.returncode != 0:
            sys.exit(f"leaderboard-snapshot.ts failed:\n{result.stderr}")
        return json.loads(out.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[1], formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write tokens and the snapshot to Firestore")
    parser.add_argument("--today", type=dt.date.fromisoformat, default=dt.date.today())
    args = parser.parse_args()

    import firebase_admin
    from firebase_admin import credentials, firestore
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        # Local emulator (npm run emulator in frontend/): never the live project.
        from google.auth.credentials import AnonymousCredentials
        from google.cloud import firestore as cloud_firestore
        db = cloud_firestore.Client(project="demo-hsapoints", credentials=AnonymousCredentials())
        server_timestamp = cloud_firestore.SERVER_TIMESTAMP
    else:
        key = BASE / "serviceAccountKey.json"
        if not key.exists():
            sys.exit(f"Missing {key}")
        firebase_admin.initialize_app(credentials.Certificate(str(key)))
        db = firestore.client()
        server_timestamp = firestore.SERVER_TIMESTAMP

    start, end = academic_year(args.today)
    users = {d.id: d.to_dict() or {} for d in db.collection("users").stream()}
    by_email = {}
    for d in db.collection("attendances").stream():
        data = d.to_dict() or {}
        if start <= str(data.get("eventDate", "")) <= end:
            by_email.setdefault(str(data.get("email", "")).lower(), []).append({"id": d.id, **plain(data)})

    # E-Board are never ranked, so they never need a token.
    new_tokens = {email: str(uuid.uuid4()) for email, user in users.items()
                  if not user.get("leaderboardToken") and user.get("eboard") is not True}
    tokens = {**{email: user["leaderboardToken"] for email, user in users.items() if user.get("leaderboardToken")},
              **new_tokens}

    snapshot = build_snapshot({
        "today": args.today.isoformat(),
        "members": [{"token": tokens[email], "member": plain(users[email]), "attendances": by_email.get(email.lower(), [])}
                    for email in sorted(tokens)],
    })

    print(f"MODE: {'APPLY (writing to Firestore)' if args.apply else 'DRY RUN (no writes -- pass --apply)'}")
    print(f"Read {len(users)} users and {sum(len(rows) for rows in by_email.values())} attendances for {start} to {end}.")
    print(f"{len(new_tokens)} Members need a token. Snapshot ({snapshot['members']} ranked):")
    print(json.dumps(snapshot, indent=2))

    if not args.apply:
        return
    emails = list(new_tokens)
    for i in range(0, len(emails), BATCH_SIZE):
        batch = db.batch()
        for email in emails[i:i + BATCH_SIZE]:
            batch.update(db.collection("users").document(email), {"leaderboardToken": new_tokens[email]})
        batch.commit()
    db.collection("leaderboard").document("current").set(
        {**snapshot, "refreshedAt": server_timestamp, "refreshedBy": REFRESHED_BY})
    print(f"Gave {len(new_tokens)} Members a token and wrote leaderboard/current.")


if __name__ == "__main__":
    main()
