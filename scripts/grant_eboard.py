"""
Grant (or revoke) E-Board access by setting the `eboard` flag on user docs.

src/App.js reads `users/<email>.eboard` to decide whether to show the E-Board
section, so this is how someone is given admin access. Sign up always writes
`eboard: false`, on purpose -- nobody can grant it to themselves.

Dry run (prints what it would do, changes nothing):
    python3 scripts/grant_eboard.py someone@ufl.edu another@ufl.edu

Apply:
    python3 scripts/grant_eboard.py someone@ufl.edu --apply

Take access away:
    python3 scripts/grant_eboard.py someone@ufl.edu --revoke --apply
"""

import sys
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

# 1. Resolve Service Account Key
BASE_DIR = Path(__file__).resolve().parent
KEY_PATH = BASE_DIR / "serviceAccountKey.json"

if not KEY_PATH.exists():
    raise FileNotFoundError(f"Missing serviceAccountKey.json at {KEY_PATH}")

cred = credentials.Certificate(str(KEY_PATH))
firebase_admin.initialize_app(cred)
db = firestore.client()


def set_eboard(emails, value, apply_changes):
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
        if bool(data.get("eboard")) is value:
            already.append(doc_id)
            print(f"  SKIP     {doc_id} -- eboard is already {value}")
            continue

        name = f"{data.get('firstName', '')} {data.get('lastName', '')}".strip()
        detail = f"cabinet={data.get('cabinet', '?')}, approved={data.get('approved', '?')}"
        if apply_changes:
            doc_ref.update({"eboard": value})
            print(f"  SET      {doc_id} -> eboard={value} -- {name} ({detail})")
        else:
            print(f"  WOULD    {doc_id} -> eboard={value} -- {name} ({detail})")
        changed.append(doc_id)

    return changed, already, missing


if __name__ == "__main__":
    flags = {"--apply", "--revoke"}
    emails = [arg for arg in sys.argv[1:] if arg not in flags]

    if not emails:
        print(__doc__)
        sys.exit(1)

    apply_changes = "--apply" in sys.argv
    value = "--revoke" not in sys.argv

    print(f"--- {'Granting' if value else 'Revoking'} E-Board access ---")
    print("MODE: APPLY (writing to Firestore)" if apply_changes
          else "MODE: DRY RUN (no writes -- pass --apply to commit)")
    print()

    changed, already, missing = set_eboard(emails, value, apply_changes)

    print()
    print(f"{'Changed' if apply_changes else 'Would change'}: {len(changed)}")
    print(f"Already set:  {len(already)}")
    print(f"No user doc:  {len(missing)}")
