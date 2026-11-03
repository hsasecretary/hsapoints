"""
Move Point Request photo evidence out of the requests themselves. A request
used to carry its photo as a ~100KB data URL in `imageData`, and the Firebase
web SDK has no field mask, so every query over pointRequests -- E-Board's
review page, a Member's My Requests listener, the dashboard's standing --
transferred every photo it read. The photo now lives in
pointRequests/{id}/evidence/photo and the request keeps only `hasPhoto`
(frontend/src/lib/requestEvidence.ts).

For each request with an `imageData` photo this writes the photo document, then
sets `hasPhoto` on the request and clears `imageData`. It is safe to re-run: a
request already moved is left alone, and a run cut short finishes on the next
pass. Requests whose photo is a URL in an older field (`imageUrl` and the rest)
are left as they are -- the review page still reads those.

Dry run (the default; writes nothing, lists what it would move):
    python scripts/move_photos_to_evidence.py

Apply:
    python scripts/move_photos_to_evidence.py --apply

Options:
  --list  prints every request, not just the counts.
With FIRESTORE_EMULATOR_HOST set it runs against the local emulator instead of
the live project (which needs scripts/serviceAccountKey.json).

What it would move is worked out by scripts/evidence_plan.py, which is tested
by scripts/test_evidence_plan.py; --apply refuses if anything looks wrong.
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import evidence_plan  # noqa: E402

BASE = Path(__file__).resolve().parent
# Firestore allows 500 writes per batch and each move is two of them.
MOVES_PER_BATCH = 200


def load(db):
    """Every request, and any photo document already saved under one. The
    photos come back in one collection-group query rather than a get per
    request; on the first run there are none to read at all."""
    requests = {snapshot.id: snapshot.to_dict() or {}
                for snapshot in db.collection("pointRequests").stream()}
    evidence = {}
    try:
        for snapshot in db.collection_group(evidence_plan.EVIDENCE_COLLECTION).stream():
            request = snapshot.reference.parent.parent
            if snapshot.id == evidence_plan.PHOTO_DOC and request.parent.id == "pointRequests":
                evidence[request.id] = snapshot.to_dict() or {}
    except Exception as error:  # noqa: BLE001 - the query needs an index this project may not have
        print(f"  (collection-group query unavailable, reading each photo instead: {error})")
        for request_id in requests:
            photo = db.collection("pointRequests").document(request_id) \
                .collection(evidence_plan.EVIDENCE_COLLECTION).document(evidence_plan.PHOTO_DOC).get()
            if photo.exists:
                evidence[request_id] = photo.to_dict() or {}
    return requests, evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="move the photos in Firestore")
    parser.add_argument("--list", action="store_true", help="print every request, not just the counts")
    args = parser.parse_args()

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

    requests, evidence = load(db)
    plan = evidence_plan.plan_moves(requests, evidence)
    moves = plan["moves"]
    moved_bytes = sum(row["bytes"] for row in moves)

    print(f"MODE: {'APPLY (writing to Firestore)' if args.apply else 'DRY RUN (no writes -- pass --apply)'}")
    print(f"Read {len(requests)} requests; {len(evidence)} already have a photo document.")
    if args.list:
        for row in moves:
            print(f"  move    {row['id']} ({row['userEmail']}, {row['bytes'] / 1000:.0f}KB)")
        for request_id in plan["done"]:
            print(f"  done    {request_id} already moved")
        for request_id in plan["elsewhere"]:
            print(f"  skip    {request_id} photo is a URL in an older field")
        for request_id in plan["no_photo"]:
            print(f"  skip    {request_id} no photo")
    print(f"{len(moves)} photo(s) to move ({moved_bytes / 1_000_000:.2f}MB off the requests), "
          f"{len(plan['done'])} already moved, {len(plan['elsewhere'])} left in an older field, "
          f"{len(plan['no_photo'])} without a photo.")
    if plan["problems"]:
        for line in plan["problems"]:
            print(f"  PROBLEM  {line}")
        sys.exit(f"Not applying: {len(plan['problems'])} request(s) need a look by hand first.")

    if not args.apply or not moves:
        return
    for i in range(0, len(moves), MOVES_PER_BATCH):
        batch = db.batch()
        for row in moves[i:i + MOVES_PER_BATCH]:
            request = db.collection("pointRequests").document(row["id"])
            batch.set(request.collection(evidence_plan.EVIDENCE_COLLECTION).document(evidence_plan.PHOTO_DOC),
                      {"imageData": row["photo"], "userEmail": row["userEmail"]})
            batch.update(request, {"hasPhoto": True, "imageData": delete_field})
        batch.commit()
    print(f"Moved {len(moves)} photo(s) into pointRequests/{{id}}/evidence/photo.")


if __name__ == "__main__":
    main()
