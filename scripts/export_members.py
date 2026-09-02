import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# 1. Locate credentials and initialize Firebase Admin SDK
BASE_DIR = Path(__file__).resolve().parent
KEY_PATH = BASE_DIR / "serviceAccountKey.json"

if not KEY_PATH.exists():
    raise FileNotFoundError(f"Could not find serviceAccountKey.json at: {KEY_PATH}")

cred = credentials.Certificate(str(KEY_PATH))
firebase_admin.initialize_app(cred)

db = firestore.client()

# 2. Query all documents from the 'users' collection
print("Fetching users from Firestore...")
users_ref = db.collection("users")
docs = users_ref.stream()

user_list = []

for doc in docs:
    data = doc.to_dict() or {}
    
    # Firestore uses the user's @ufl.edu email as document ID
    email = data.get("email") or doc.id
    first_name = data.get("firstName", "")
    last_name = data.get("lastName", "")
    cabinet = data.get("cabinet", "")
    position = data.get("position", "")
    fall_points = data.get("fallPoints", 0)
    spring_points = data.get("springPoints", 0)

    user_list.append({
        "FirstName": first_name,
        "LastName": last_name,
        "Email": email,
        "Cabinet": cabinet,
        "Position": position,
        "Fall points": fall_points,
        "Spring points": spring_points
    })

# 3. Format and export to Excel
df = pd.DataFrame(user_list)
columns_order = [
    "FirstName",
    "LastName",
    "Email",
    "Cabinet",
    "Position",
    "Fall points",
    "Spring points"
]
df = df[columns_order]
df.sort_values(by=["LastName", "FirstName"], inplace=True)

output_filename = BASE_DIR / "hsa_users.xlsx"
df.to_excel(output_filename, index=False, engine="openpyxl")

print(f"Exported {len(user_list)} users to '{output_filename.name}'.")