from collections import Counter
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# Dynamic path resolution for serviceAccountKey.json and output file
CURRENT_DIR = Path(__file__).resolve().parent
KEY_PATH = CURRENT_DIR / "serviceAccountKey.json"
OUTPUT_FILE = CURRENT_DIR / "event_code_attendance.xlsx"

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate(str(KEY_PATH))
    firebase_admin.initialize_app(cred)

db = firestore.client()

def export_code_counts_to_excel():
    print("Fetching event codes and user attendance data from Firestore...")

    # 1. Fetch all codes from 'codes' collection
    codes_ref = db.collection("codes").stream()
    codes_data = {}
    for doc in codes_ref:
        data = doc.to_dict() or {}
        codes_data[doc.id] = {
            "Event Name": data.get("event", "N/A"),
            "Event Date": data.get("eventDate", "N/A"),
            "Category": data.get("category", "N/A"),
            "Points": data.get("points", 0),
            "Semester": data.get("semester", "N/A"),
            "Voter Eligible": data.get("voterEligible", False),
            "Cabinet Only": data.get("cabinetOnly", False),
        }

    # 2. Stream all users and tally redeemed codes
    users_ref = db.collection("users").stream()
    code_counter = Counter()

    for user in users_ref:
        user_data = user.to_dict() or {}
        event_codes = user_data.get("eventCodes", [])
        if isinstance(event_codes, list):
            for code in event_codes:
                code_counter[code] += 1

    # 3. Build data rows for DataFrame
    rows = []
    
    # Sort codes descending by number of attendees
    sorted_codes = sorted(
        codes_data.keys(),
        key=lambda c: code_counter[c],
        reverse=True
    )

    for code in sorted_codes:
        meta = codes_data[code]
        rows.append({
            "Code": code,
            "Attendee Count": code_counter[code],
            "Event Name": meta["Event Name"],
            "Event Date": meta["Event Date"],
            "Category": meta["Category"],
            "Points": meta["Points"],
            "Semester": meta["Semester"],
            "Voter Eligible": "Yes" if meta["Voter Eligible"] else "No",
            "Cabinet Only": "Yes" if meta["Cabinet Only"] else "No",
        })

    # Include any legacy/orphan codes redeemed by members not present in 'codes'
    untracked_codes = set(code_counter.keys()) - set(codes_data.keys())
    for code in sorted(untracked_codes):
        rows.append({
            "Code": code,
            "Attendee Count": code_counter[code],
            "Event Name": "(Legacy / Not in codes collection)",
            "Event Date": "N/A",
            "Category": "N/A",
            "Points": 0,
            "Semester": "N/A",
            "Voter Eligible": "N/A",
            "Cabinet Only": "N/A",
        })

    # 4. Create DataFrame and export to Excel
    df = pd.DataFrame(rows)

    with pd.ExcelWriter(OUTPUT_FILE, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Code Attendance")

        # Auto-adjust column widths for readability
        worksheet = writer.sheets["Code Attendance"]
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = col[0].column_letter
            worksheet.column_dimensions[col_letter].width = max(max_len + 3, 12)

    print(f"\nSuccessfully exported {len(rows)} event codes to:")
    print(f"-> {OUTPUT_FILE}")

if __name__ == "__main__":
    export_code_counts_to_excel()