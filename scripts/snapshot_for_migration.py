"""Read-only snapshot of codes, approved point requests and hand-entered points, for planning the
point-system migration. Writes scripts/migration_snapshot.xlsx (git-ignored: contains member data)."""
from pathlib import Path
import json
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

BASE = Path(__file__).resolve().parent
firebase_admin.initialize_app(credentials.Certificate(str(BASE / "serviceAccountKey.json")))
db = firestore.client()

def s(v):
    return v.isoformat() if hasattr(v, "isoformat") else v

codes = []
for d in db.collection("codes").stream():
    x = d.to_dict() or {}
    codes.append({"docId": d.id, "event": x.get("event"), "category": x.get("category"), "points": x.get("points"),
                  "semester": x.get("semester"), "voterEligible": x.get("voterEligible"),
                  "cabinetRequired": x.get("cabinetRequired"), "cabinetOnly": x.get("cabinetOnly"),
                  "eventDate": s(x.get("eventDate")), "attendeeCount": x.get("attendeeCount")})

reqs = []
for d in db.collection("pointRequests").stream():
    x = d.to_dict() or {}
    if x.get("status") == "approved":
        reqs.append({"id": d.id, "userEmail": x.get("userEmail"), "activityName": x.get("activityName"),
                     "date": s(x.get("date")), "pointsRequested": x.get("pointsRequested"),
                     "description": x.get("description")})

users, hand, allu = [], [], []
for d in db.collection("users").stream():
    x = d.to_dict() or {}
    allu.append({"email": d.id, **{k: x.get(k) for k in ("cabinet", "position", "eboard", "approved", "involvement")}})
    row = {"email": d.id, "cabinet": x.get("cabinet"), "involvement": x.get("involvement"),
           "otherPoints": x.get("otherPoints", 0), "cabinetPoints": x.get("cabinetPoints", 0),
           "strikes": x.get("strikes"), "excusedEvents": x.get("excusedEvents"),
           "excusedReason": x.get("excusedReason"), "unexcusedEvents": x.get("unexcusedEvents"),
           "fallPoints": x.get("fallPoints", 0), "springPoints": x.get("springPoints", 0),
           "redeemedCodes": len(x.get("eventCodes") or [])}
    users.append(row)
    if row["otherPoints"] or row["cabinetPoints"] or row["strikes"] or row["excusedEvents"] or row["unexcusedEvents"]:
        hand.append(row)

with pd.ExcelWriter(BASE / "migration_snapshot.xlsx") as w:
    pd.DataFrame(codes).to_excel(w, sheet_name="codes", index=False)
    pd.DataFrame(reqs).to_excel(w, sheet_name="approvedRequests", index=False)
    pd.DataFrame(hand).to_excel(w, sheet_name="handEntered", index=False)
    pd.DataFrame(users).to_excel(w, sheet_name="allUsers", index=False)

# aggregate-only summary (no member data)
cd = pd.DataFrame(codes); au = pd.DataFrame(allu)
print(json.dumps({
  "codes": len(codes), "codes_no_category": int(cd.category.isna().sum()) if len(cd) else 0,
  "codes_mixed_case_ids": [c for c in cd.docId if c != c.upper()] if len(cd) else [],
  "codes_by_category": cd.category.value_counts(dropna=False).to_dict() if len(cd) else {},
  "codes_by_semester": cd.semester.value_counts(dropna=False).to_dict() if len(cd) else {},
  "duplicate_event_names": cd.event.value_counts()[lambda v: v > 1].to_dict() if len(cd) else {},
  "approved_requests": len(reqs), "users": len(users), "users_hand_entered": len(hand),
  "users_with_strikes": sum(1 for u in hand if u["strikes"]),
  "cabinet_values": au.cabinet.value_counts(dropna=False).to_dict(),
  "involvement": au.involvement.value_counts(dropna=False).to_dict(),
  "eboard": int(au.eboard.fillna(False).sum()),
}, indent=1, default=str))
