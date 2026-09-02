import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore, auth

# 1. Resolve Service Account Key
BASE_DIR = Path(__file__).resolve().parent
KEY_PATH = BASE_DIR / "serviceAccountKey.json"

if not KEY_PATH.exists():
    raise FileNotFoundError(f"Missing serviceAccountKey.json at {KEY_PATH}")

cred = credentials.Certificate(str(KEY_PATH))
firebase_admin.initialize_app(cred)
db = firestore.client()

# 2. Configuration & Preserved Accounts
# Add any specific admin/E-Board emails you want to PRESERVE from deletion:
PRESERVE_EMAILS = {
    # "president@ufl.edu",
    # "secretary@ufl.edu",
    # "miguelcarrasco@ufl.edu",
}

def clean_firestore_users():
    print("--- 1. Deleting Firestore 'users' collection ---")
    users_ref = db.collection("users")
    docs = list(users_ref.stream())
    
    total_docs = len(docs)
    print(f"Found {total_docs} user documents.")
    
    batch = db.batch()
    count = 0
    deleted_count = 0
    
    for doc in docs:
        data = doc.to_dict() or {}
        raw_email = data.get("email") or doc.id
        doc_email = str(raw_email).lower().strip()
        
        if doc_email in PRESERVE_EMAILS:
            print(f"Skipping preserved Firestore user: {doc_email}")
            continue
            
        batch.delete(doc.reference)
        count += 1
        deleted_count += 1
        
        # Firestore batch limit is 500 operations
        if count == 500:
            batch.commit()
            print("Committed batch of 500 Firestore deletes...")
            batch = db.batch()
            count = 0
            
    if count > 0:
        batch.commit()
        print(f"Committed final batch of {count} Firestore deletes.")
        
    print(f"Successfully deleted {deleted_count} Firestore user records.\n")


def clean_firebase_auth_users():
    print("--- 2. Deleting Firebase Authentication Users ---")
    uids_to_delete = []
    
    # Iterate through all auth users (paginated in chunks of 1000)
    page = auth.list_users()
    while page:
        for user in page.users:
            user_email = (user.email or "").lower().strip()
            if user_email in PRESERVE_EMAILS:
                print(f"Skipping preserved Auth user: {user_email}")
                continue
            uids_to_delete.append(user.uid)
        page = page.get_next_page()
        
    total_auth = len(uids_to_delete)
    print(f"Found {total_auth} Auth users to delete.")
    
    # Batch delete Auth users (max 1,000 per call)
    chunk_size = 1000
    for i in range(0, len(uids_to_delete), chunk_size):
        chunk = uids_to_delete[i:i + chunk_size]
        result = auth.delete_users(chunk)
        print(f"Deleted {result.success_count} Auth users (Failures: {result.failure_count}).")
        
    print("Firebase Auth cleanup complete.\n")


def clean_related_collections():
    print("--- 3. Cleaning Up Stale Point Requests & Old Codes ---")
    for col_name in ["pointRequests", "codes"]:
        col_ref = db.collection(col_name)
        docs = list(col_ref.stream())
        if not docs:
            print(f"No documents found in '{col_name}'.")
            continue
            
        batch = db.batch()
        c = 0
        for doc in docs:
            batch.delete(doc.reference)
            c += 1
            if c == 500:
                batch.commit()
                batch = db.batch()
                c = 0
        if c > 0:
            batch.commit()
        print(f"Deleted {len(docs)} documents from '{col_name}'.")


if __name__ == "__main__":
    confirm = input("⚠️ WARNING: This will permanently delete users and auth accounts. Type 'CONFIRM_RESET' to proceed: ")
    if confirm == "CONFIRM_RESET":
        clean_firestore_users()
        clean_firebase_auth_users()
        clean_related_collections()
        print("🎉 Cleanup completed successfully! Portal is ready for the new academic year.")
    else:
        print("Operation cancelled. No data was modified.")