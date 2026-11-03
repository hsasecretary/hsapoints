"""Tests for scripts/evidence_plan.py, the pure half of
move_photos_to_evidence.py.

    python -m unittest scripts/test_evidence_plan.py
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import evidence_plan as plan  # noqa: E402

PHOTO = "data:image/jpeg;base64,abc"
OTHER_PHOTO = "data:image/jpeg;base64,xyz"


def request(**fields):
    """A pointRequests doc, with the fields the plan reads."""
    return {"userEmail": "cara@ufl.edu", "status": "pending", **fields}


class PhotoOf(unittest.TestCase):
    def test_reads_the_data_url(self):
        self.assertEqual(plan.photo_of(request(imageData=PHOTO)), PHOTO)

    def test_an_empty_or_missing_field_is_no_photo(self):
        self.assertEqual(plan.photo_of(request(imageData="")), "")
        self.assertEqual(plan.photo_of(request()), "")

    def test_a_non_string_is_no_photo(self):
        self.assertEqual(plan.photo_of(request(imageData=None)), "")
        self.assertEqual(plan.photo_of(request(imageData={"url": PHOTO})), "")


class LegacyPhoto(unittest.TestCase):
    def test_finds_a_photo_under_any_of_its_old_names(self):
        for field in ("imageData", "imageUrl", "photoUrl", "photoURL", "imageURL", "image"):
            self.assertEqual(plan.legacy_photo(request(**{field: PHOTO})), PHOTO, field)

    def test_prefers_imageData_the_way_the_review_page_does(self):
        self.assertEqual(plan.legacy_photo(request(imageData=PHOTO, imageUrl=OTHER_PHOTO)), PHOTO)

    def test_no_photo_at_all(self):
        self.assertEqual(plan.legacy_photo(request(imageData="", imageUrl="")), "")


class PlanMoves(unittest.TestCase):
    def test_moves_a_photo_off_the_request(self):
        result = plan.plan_moves({"req-1": request(imageData=PHOTO)})
        self.assertEqual(result["moves"], [
            {"id": "req-1", "userEmail": "cara@ufl.edu", "photo": PHOTO, "bytes": len(PHOTO)},
        ])
        self.assertEqual(result["problems"], [])

    def test_lowercases_the_email_the_photo_doc_is_read_by(self):
        result = plan.plan_moves({"req-1": request(userEmail="  Cara@UFL.edu ", imageData=PHOTO)})
        self.assertEqual(result["moves"][0]["userEmail"], "cara@ufl.edu")

    def test_takes_the_requests_oldest_id_first(self):
        requests = {"req-b": request(imageData=PHOTO), "req-a": request(imageData=PHOTO)}
        self.assertEqual([row["id"] for row in plan.plan_moves(requests)["moves"]], ["req-a", "req-b"])

    def test_leaves_a_request_already_moved_alone(self):
        result = plan.plan_moves(
            {"req-1": request(hasPhoto=True)},
            {"req-1": {"imageData": PHOTO, "userEmail": "cara@ufl.edu"}},
        )
        self.assertEqual(result["moves"], [])
        self.assertEqual(result["done"], ["req-1"])

    def test_finishes_a_move_that_was_cut_short(self):
        # The photo document was written but the request not yet cleared.
        result = plan.plan_moves(
            {"req-1": request(imageData=PHOTO)},
            {"req-1": {"imageData": PHOTO, "userEmail": "cara@ufl.edu"}},
        )
        self.assertEqual([row["id"] for row in result["moves"]], ["req-1"])
        self.assertEqual(result["problems"], [])

    def test_counts_a_request_with_no_photo(self):
        result = plan.plan_moves({"req-1": request(imageData=""), "req-2": request()})
        self.assertEqual(result["no_photo"], ["req-1", "req-2"])
        self.assertEqual(result["moves"], [])

    def test_leaves_a_photo_url_in_its_old_field(self):
        result = plan.plan_moves({"req-1": request(imageUrl="https://example.org/proof.jpg")})
        self.assertEqual(result["elsewhere"], ["req-1"])
        self.assertEqual(result["moves"], [])

    def test_refuses_a_request_with_a_photo_but_no_member(self):
        for email in (None, "", "   "):
            result = plan.plan_moves({"req-1": {"imageData": PHOTO, "userEmail": email}})
            self.assertEqual(result["moves"], [])
            self.assertEqual(len(result["problems"]), 1, email)
            self.assertIn("no userEmail", result["problems"][0])

    def test_refuses_a_photo_that_is_not_a_string(self):
        result = plan.plan_moves({"req-1": request(imageData={"url": PHOTO})})
        self.assertEqual(result["moves"], [])
        self.assertIn("not a string", result["problems"][0])

    def test_refuses_a_photo_too_big_for_a_document(self):
        result = plan.plan_moves({"req-1": request(imageData="x" * (plan.MAX_PHOTO_BYTES + 1))})
        self.assertEqual(result["moves"], [])
        self.assertIn("over Firestore's 1MB document limit", result["problems"][0])

    def test_refuses_to_overwrite_a_different_photo(self):
        result = plan.plan_moves(
            {"req-1": request(imageData=PHOTO)},
            {"req-1": {"imageData": OTHER_PHOTO, "userEmail": "cara@ufl.edu"}},
        )
        self.assertEqual(result["moves"], [])
        self.assertIn("a different photo is already saved", result["problems"][0])

    def test_one_bad_request_does_not_hold_up_the_count_of_the_rest(self):
        result = plan.plan_moves({
            "req-1": request(imageData=PHOTO),
            "req-2": {"imageData": PHOTO},
            "req-3": request(),
        })
        self.assertEqual([row["id"] for row in result["moves"]], ["req-1"])
        self.assertEqual(result["no_photo"], ["req-3"])
        self.assertEqual(len(result["problems"]), 1)

    def test_measures_a_photo_in_bytes_not_characters(self):
        # A data URL is ASCII, but a hand-edited field may not be.
        result = plan.plan_moves({"req-1": request(imageData="ñ" * 10)})
        self.assertEqual(result["moves"][0]["bytes"], 20)

    def test_summary_counts_every_bucket(self):
        result = plan.plan_moves({
            "req-1": request(imageData=PHOTO),
            "req-2": request(),
            "req-3": request(imageUrl="https://example.org/proof.jpg"),
        })
        self.assertEqual(plan.summary(result),
                         {"moves": 1, "done": 0, "elsewhere": 1, "no_photo": 1, "problems": 0})

    def test_a_missing_doc_body_is_treated_as_empty(self):
        self.assertEqual(plan.plan_moves({"req-1": None})["no_photo"], ["req-1"])


if __name__ == "__main__":
    unittest.main()
