from pathlib import Path
import pandas as pd

from firestore_client import connect

# 1. Connect to Firestore (firestore_client.py says how it signs in)
BASE_DIR = Path(__file__).resolve().parent
db = connect()

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