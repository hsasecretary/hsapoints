"""
Mark (or unmark) Web-team Testers by setting `webTeam` and
`heldToCabinetRules` on their user docs.

A Web-team Tester follows the Cabinet rubric (Core Events, Strikes, Semester
Requirements), sees the Cabinet Member view by default, and may switch to the
General Member view from the Account menu. It grants no E-Board tools: someone
on E-Board for testing keeps their `eboard` flag, but is now held to the
Cabinet rules instead of the General ones.

With no emails it uses the web team below.

Dry run (prints what it would do, changes nothing):
    python scripts/grant_web_team.py
    python scripts/grant_web_team.py someone@ufl.edu

Apply:
    python scripts/grant_web_team.py --apply

Unmark (back to the default rule for their role):
    python scripts/grant_web_team.py someone@ufl.edu --revoke --apply
"""

import sys
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

WEB_TEAM = [
    "carrascom@ufl.edu",
    "saurezjimenez.jo@ufl.edu",
    "csalcedo@ufl.edu",
    "h.alvarez@ufl.edu",
]

# 1. Resolve Service Account Key
BASE_DIR = Path(__file__).resolve().parent
KEY_PATH = BASE_DIR / "serviceAccountKey.json"

if not KEY_PATH.exists():
    raise FileNotFoundError(f"Missing serviceAccountKey.json at {KEY_PATH}")

cred = credentials.Certificate(str(KEY_PATH))
firebase_admin.initialize_app(cred)
db = firestore.client()


def set_web_team(emails, value, apply_changes):
    changed, already, missing = [], [], []

    for email in emails:
        doc_id = email.lower().strip()
        doc_ref = db.collection("users").document(doc_id)
        snapshot = doc_ref.get()

        if not snapshot.exists:
            missing.append(doc_id)
            print(f"  MISSING  {doc_id} -- no user document (have they signed up?)")
            continue

        data = snapshot.to_dict() or {}
        if value:
            update = {"webTeam": True, "heldToCabinetRules": True}
        else:
            # Drop both so isHeldToCabinetRules falls back to their role.
            update = {"webTeam": firestore.DELETE_FIELD, "heldToCabinetRules": firestore.DELETE_FIELD}

        if value and data.get("webTeam") is True and data.get("heldToCabinetRules") is True:
            already.append(doc_id)
            print(f"  SKIP     {doc_id} -- already a Web-team Tester")
            continue
        if not value and "webTeam" not in data and "heldToCabinetRules" not in data:
            already.append(doc_id)
            print(f"  SKIP     {doc_id} -- not marked")
            continue

        name = f"{data.get('firstName', '')} {data.get('lastName', '')}".strip()
        detail = f"eboard={data.get('eboard', '?')}, cabinet={data.get('cabinet', '?')}"
        what = "webTeam + heldToCabinetRules" if value else "webTeam/heldToCabinetRules removed"
        if apply_changes:
            doc_ref.update(update)
            print(f"  SET      {doc_id} -> {what} -- {name} ({detail})")
        else:
            print(f"  WOULD    {doc_id} -> {what} -- {name} ({detail})")
        changed.append(doc_id)

    return changed, already, missing


if __name__ == "__main__":
    flags = {"--apply", "--revoke"}
    emails = [arg for arg in sys.argv[1:] if arg not in flags] or WEB_TEAM

    apply_changes = "--apply" in sys.argv
    value = "--revoke" not in sys.argv

    print(f"--- {'Marking' if value else 'Unmarking'} Web-team Testers ---")
    print("MODE: APPLY (writing to Firestore)" if apply_changes
          else "MODE: DRY RUN (no writes -- pass --apply to commit)")
    print()

    changed, already, missing = set_web_team(emails, value, apply_changes)

    print()
    print(f"{'Changed' if apply_changes else 'Would change'}: {len(changed)}, "
          f"already done: {len(already)}, missing: {len(missing)}")
