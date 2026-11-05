"""The pure half of move_photos_to_evidence.py: what the backfill would move,
worked out from plain dicts with no Firestore. Tested by
scripts/test_evidence_plan.py.

A Point Request used to carry its photo evidence as a ~100KB data URL in
`imageData`. The Firebase web SDK has no field mask, so every query over
pointRequests transferred every photo. The photo now lives in
pointRequests/{id}/evidence/photo and the request keeps only `hasPhoto`
(frontend/src/lib/requestEvidence.ts).

Moving one request means two writes: the photo document, then the request with
`hasPhoto` set and `imageData` cleared. The plan is idempotent -- a request
already moved is left alone, and a run interrupted halfway finishes the move on
the next pass.
"""

# The subcollection and document the photo moves into. Must match
# EVIDENCE_COLLECTION and PHOTO_DOC in frontend/src/lib/requestEvidence.ts.
EVIDENCE_COLLECTION = "evidence"
PHOTO_DOC = "photo"

# Where a photo may sit on the request, newest name first. Mirrors
# LEGACY_FIELDS in frontend/src/lib/requestEvidence.ts.
LEGACY_FIELDS = ("imageData", "imageUrl", "photoUrl", "photoURL", "imageURL", "image")

# The field the Submit Point Request form wrote, and the only one this moves:
# the others are URLs from before #71, small enough to leave where they are.
PHOTO_FIELD = "imageData"

# Firestore's limit is 1 MiB per document; a photo near it would not save.
MAX_PHOTO_BYTES = 1_000_000


def photo_of(request):
    """The data URL stored in `imageData`, or '' when there is none."""
    value = request.get(PHOTO_FIELD)
    return value if isinstance(value, str) else ""


def legacy_photo(request):
    """The photo the request still carries under any of its old names, or ''."""
    for field in LEGACY_FIELDS:
        value = request.get(field)
        if isinstance(value, str) and value:
            return value
    return ""


def plan_moves(requests, evidence=None):
    """What the backfill would do.

    `requests` maps a pointRequests ID to its data; `evidence` maps an ID to
    the pointRequests/{id}/evidence/photo document already there, if any.

    Returns:
      moves     -- [{'id', 'userEmail', 'photo', 'bytes'}] to write, oldest ID first
      done      -- IDs whose photo is already in the subcollection
      elsewhere -- IDs whose photo is a URL in an old field, left where it is
      no_photo  -- IDs with no photo evidence at all
      problems  -- one line per request the backfill will not touch; any at all
                   and --apply refuses, because each one needs a look by hand
    """
    evidence = evidence or {}
    moves, done, elsewhere, no_photo, problems = [], [], [], [], []

    for request_id in sorted(requests):
        request = requests[request_id] or {}
        raw = request.get(PHOTO_FIELD)
        stored = evidence.get(request_id) or {}
        stored_photo = stored.get(PHOTO_FIELD)

        if raw is not None and not isinstance(raw, str):
            problems.append(f"{request_id}: {PHOTO_FIELD} is {type(raw).__name__}, not a string")
            continue

        photo = photo_of(request)
        if not photo:
            # Nothing left on the request. Either the move already happened,
            # the photo is a URL in an old field, or there never was one.
            if stored_photo:
                done.append(request_id)
            elif legacy_photo(request):
                elsewhere.append(request_id)
            else:
                no_photo.append(request_id)
            continue

        email = request.get("userEmail")
        if not isinstance(email, str) or not email.strip():
            problems.append(f"{request_id}: has a photo but no userEmail, so the Member could not read it back")
            continue
        size = len(photo.encode("utf-8"))
        if size > MAX_PHOTO_BYTES:
            problems.append(f"{request_id}: photo is {size / 1_000_000:.2f}MB, over Firestore's 1MB document limit")
            continue
        if stored_photo and stored_photo != photo:
            problems.append(f"{request_id}: a different photo is already saved under it")
            continue

        moves.append({"id": request_id, "userEmail": email.strip().lower(), "photo": photo, "bytes": size})

    return {"moves": moves, "done": done, "elsewhere": elsewhere, "no_photo": no_photo, "problems": problems}


def summary(plan):
    """The counts, in the order the script prints them."""
    return {key: len(rows) for key, rows in plan.items()}
