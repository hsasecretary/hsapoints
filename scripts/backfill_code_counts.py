from collections import Counter
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

# Dynamic path resolution
CURRENT_DIR = Path(__file__).resolve().parent
KEY_PATH = CURRENT_DIR / "serviceAccountKey.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(str(KEY_PATH))
    firebase_admin.initialize_app(cred)

db = firestore.client()

def backfill_attendee_counts():
    print("1. Counting code occurrences across all users...")
    users_ref = db.collection("users").stream()
    code_counter = Counter()

    for user in users_ref:
        user_data = user.to_dict() or {}
        event_codes = user_data.get("eventCodes", [])
        if isinstance(event_codes, list):
            for code in event_codes:
                code_counter[code] += 1

    print("2. Updating 'codes' collection in Firestore...")
    codes_ref = db.collection("codes").stream()
    batch = db.batch()
    updated_count = 0

    for code_doc in codes_ref:
        code_id = code_doc.id
        current_count = code_counter[code_id]
        
        doc_ref = db.collection("codes").document(code_id)
        batch.update(doc_ref, {"attendeeCount": current_count})
        updated_count += 1
        print(f" - {code_id}: {current_count} attendees")

    batch.commit()
    print(f"\nDone! Updated {updated_count} codes with the 'attendeeCount' field.")

if __name__ == "__main__":
    backfill_attendee_counts()