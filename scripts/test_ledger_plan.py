"""Tests for scripts/ledger_plan.py, the pure half of migrate_to_ledger.py.

    python -m unittest scripts/test_ledger_plan.py
"""
import unittest

import ledger_plan as plan

RUBRIC = {"gbm", "hsa-programming", "hlhm", "affiliate-org", "cabinet-thursday", "cabinet-retreat",
          "cabinet-orientation", "opa-general", "opa-solidarity-session", "mlp-open", "tabling",
          "external-social", "internal-social"}
PER_HOUR = {"tabling"}


class SuggestEventType(unittest.TestCase):
    def test_maps_old_categories(self):
        self.assertEqual(plan.suggest_event_type("GBM", "GBM #1: LA COPA HSA"), "gbm")
        self.assertEqual(plan.suggest_event_type("Programming", "Walk and Unwind"), "hsa-programming")
        self.assertEqual(plan.suggest_event_type("Affiliate Org Event", "SALSA Mixer"), "affiliate-org")
        self.assertEqual(plan.suggest_event_type("Affiliate Org GBM", "UEPA GBM"), "affiliate-org")
        self.assertEqual(plan.suggest_event_type("MLP Fall", "MLP Social"), "mlp-open")
        self.assertEqual(plan.suggest_event_type("Tabling", "Turlington"), "tabling")

    def test_the_hlhm_codes_are_the_hlhm_event(self):
        self.assertEqual(plan.suggest_event_type("Affiliate Org Event", "HLHM Opening Ceremony"), "hlhm")
        self.assertEqual(plan.suggest_event_type("Affiliate Org Event", "HLHM Movie Night"), "hlhm")

    def test_reads_opa_and_cabinet_codes_by_name(self):
        self.assertEqual(plan.suggest_event_type("OPA", "Solidarity Session #1"), "opa-solidarity-session")
        self.assertEqual(plan.suggest_event_type("OPA", "Know Your Rights"), "opa-general")
        self.assertEqual(plan.suggest_event_type("Cabinet", "HSA Cabinet 09/10"), "cabinet-thursday")
        self.assertEqual(plan.suggest_event_type("Cabinet", "Cabinet Retreat"), "cabinet-retreat")
        self.assertEqual(plan.suggest_event_type("Cabinet", "Cabinet Orientation"), "cabinet-orientation")

    def test_open_house_is_an_external_social(self):
        self.assertEqual(plan.suggest_event_type("Other", "Open House Social"), "external-social")

    def test_leaves_what_it_cannot_tell_blank(self):
        self.assertEqual(plan.suggest_event_type("Other", "Familia Friday"), "")
        self.assertEqual(plan.suggest_event_type(None, "Mystery"), "")


class SuggestRequest(unittest.TestCase):
    CODES = [
        {"id": "GOLAZO", "eventDate": "2026-09-03", "eventTypeId": "gbm"},
        {"id": "TIGRE", "eventDate": "2026-09-17", "eventTypeId": "cabinet-thursday"},
    ]

    def test_folds_a_request_for_a_coded_event_into_the_code(self):
        request = {"activityName": "GBM", "date": "2026-09-03"}
        self.assertEqual(plan.suggest_request(request, self.CODES), {"codeId": "GOLAZO", "eventTypeId": "gbm"})

    def test_a_committee_meeting_is_that_days_cabinet_thursday(self):
        request = {"activityName": "Committee Meeting", "date": "2026-09-17"}
        self.assertEqual(plan.suggest_request(request, self.CODES),
                         {"codeId": "TIGRE", "eventTypeId": "cabinet-thursday"})

    def test_without_a_code_that_day_suggests_only_an_event_type(self):
        self.assertEqual(plan.suggest_request({"activityName": "GBM", "date": "2026-09-20"}, self.CODES),
                         {"codeId": "", "eventTypeId": "gbm"})
        self.assertEqual(plan.suggest_request({"activityName": "Affiliated Organization Event",
                                               "date": "2026-09-02"}, self.CODES),
                         {"codeId": "", "eventTypeId": "affiliate-org"})
        self.assertEqual(plan.suggest_request({"activityName": "Familia Friday", "date": "2026-09-18"},
                                              self.CODES),
                         {"codeId": "", "eventTypeId": ""})


class MatchFormRows(unittest.TestCase):
    USERS = {
        "ana.perez@ufl.edu": {"firstName": "Ana", "lastName": "Pérez"},
        "luis@ufl.edu": {"firstName": "Luis", "lastName": "Gómez"},
        "luis2@ufl.edu": {"firstName": "Luis", "lastName": "Gómez"},
    }

    def test_matches_email_ignoring_case_then_name_ignoring_accents(self):
        rows = [
            {"email": "Ana.Perez@UFL.edu", "name": "Whoever"},
            {"email": "ana.p@gmail.com", "name": "  ana  perez "},
            {"email": "lg@gmail.com", "name": "Luis Gomez"},
            {"email": "x@gmail.com", "name": "Nobody Here"},
        ]
        self.assertEqual([(m["memberEmail"], m["matchedBy"]) for m in plan.match_form_rows(rows, self.USERS)], [
            ("ana.perez@ufl.edu", "email"),
            ("ana.perez@ufl.edu", "name"),
            ("", "unmatched"),  # two Members share the name: never guess
            ("", "unmatched"),
        ])


class Backfill(unittest.TestCase):
    def test_holds_approved_cabinet_members_not_on_eboard_to_cabinet_rules(self):
        self.assertEqual(plan.backfill("a@ufl.edu", {"cabinet": "programming", "approved": True, "eboard": False}),
                         {"heldToCabinetRules": True})
        self.assertEqual(plan.backfill("a@ufl.edu", {"cabinet": "programming", "approved": False}),
                         {"heldToCabinetRules": False})
        self.assertEqual(plan.backfill("a@ufl.edu", {"cabinet": "secretary", "approved": True, "eboard": True}),
                         {"heldToCabinetRules": False})
        self.assertEqual(plan.backfill("a@ufl.edu", {"cabinet": "none"}), {"heldToCabinetRules": False})

    def test_puts_current_mlp_members_in_the_fall_cohort(self):
        self.assertEqual(plan.backfill("a@ufl.edu", {"cabinet": "none", "involvement": "mlp"}),
                         {"heldToCabinetRules": False, "mlpCohort": "fall"})

    def test_marks_the_web_team(self):
        self.assertEqual(plan.backfill("CARRASCOM@ufl.edu", {"cabinet": "none", "eboard": True}),
                         {"heldToCabinetRules": True, "webTeam": True})

    def test_never_overwrites_what_eboard_already_set(self):
        self.assertEqual(plan.backfill("a@ufl.edu", {"cabinet": "programming", "approved": True,
                                                     "heldToCabinetRules": False, "involvement": "mlp",
                                                     "mlpCohort": "spring"}), {})
        self.assertEqual(plan.backfill("csalcedo@ufl.edu", {"webTeam": True, "heldToCabinetRules": True}), {})


class EboardMismatch(unittest.TestCase):
    def test_flags_eboard_and_involvement_disagreeing(self):
        self.assertTrue(plan.eboard_mismatch({"eboard": True, "involvement": "cabinet"}))
        self.assertTrue(plan.eboard_mismatch({"eboard": False, "involvement": "eboard"}))
        self.assertFalse(plan.eboard_mismatch({"eboard": True, "involvement": "eboard"}))
        self.assertFalse(plan.eboard_mismatch({"eboard": False, "involvement": "general"}))
        self.assertFalse(plan.eboard_mismatch({"eboard": True}))


class Attendances(unittest.TestCase):
    CODES = {
        "GOLAZO": {"eventDate": "2026-09-03", "eventTypeId": "gbm"},
        "OLD": {"eventDate": "2026-09-05"},  # left without an Event Type
    }

    def test_one_code_attendance_per_redeemed_code_keyed_by_email_and_code(self):
        user = {"eventCodes": ["golazo", "GOLAZO", "OLD", "GONE"]}
        self.assertEqual(plan.code_attendances("A@ufl.edu", user, self.CODES), [
            ("a@ufl.edu__GOLAZO", {"email": "a@ufl.edu", "eventTypeId": "gbm", "eventDate": "2026-09-03",
                                   "source": "code", "codeId": "GOLAZO"}),
        ])

    def test_skips_a_removed_check_in(self):
        user = {"eventCodes": ["GOLAZO"], "removedCheckIns": {"GOLAZO": {}}}
        self.assertEqual(plan.code_attendances("a@ufl.edu", user, self.CODES), [])

    def test_form_attendance_is_entered_by_eboard_under_the_codes_id(self):
        self.assertEqual(plan.form_attendance("a@ufl.edu", "PRIMERO", {"eventDate": "2026-08-27",
                                                                     "eventTypeId": "cabinet-thursday"}),
                         ("a@ufl.edu__PRIMERO", {"email": "a@ufl.edu", "eventTypeId": "cabinet-thursday",
                                                 "eventDate": "2026-08-27", "source": "eboard",
                                                 "codeId": "PRIMERO"}))

    def test_a_request_folded_into_a_code_shares_the_codes_attendance(self):
        request = {"id": "r1", "userEmail": "A@ufl.edu", "date": "2026-09-04"}
        self.assertEqual(plan.request_attendances(request, {"codeId": "golazo", "eventTypeId": ""},
                                                  self.CODES, PER_HOUR), [
            ("a@ufl.edu__GOLAZO", {"email": "a@ufl.edu", "eventTypeId": "gbm", "eventDate": "2026-09-03",
                                   "source": "request", "requestId": "r1", "codeId": "GOLAZO"}),
        ])

    def test_a_request_without_a_code_gets_its_own_attendance_one_per_tabling_hour(self):
        request = {"id": "r2", "userEmail": "a@ufl.edu", "date": "2026-09-02", "hours": 2.5}
        self.assertEqual(plan.request_attendances(request, {"codeId": "", "eventTypeId": "affiliate-org"},
                                                  self.CODES, PER_HOUR), [
            ("a@ufl.edu__req-r2", {"email": "a@ufl.edu", "eventTypeId": "affiliate-org",
                                   "eventDate": "2026-09-02", "source": "request", "requestId": "r2"}),
        ])
        self.assertEqual([i for i, _ in plan.request_attendances(
            request, {"codeId": "", "eventTypeId": "tabling"}, self.CODES, PER_HOUR)],
            ["a@ufl.edu__req-r2-h1", "a@ufl.edu__req-r2-h2"])


class Overrides(unittest.TestCase):
    def test_closes_every_absence_eboard_has_not_confirmed_as_a_real_miss(self):
        roster = ["a@ufl.edu", "b@ufl.edu", "c@ufl.edu"]
        entries = plan.absentee_overrides("ORIENT0730", roster, attended={"a@ufl.edu"},
                                          confirmed_misses={"c@ufl.edu"}, at="2026-09-30")
        self.assertEqual(entries, {"b@ufl.edu": {"codeId": "ORIENT0730", "reason": plan.OVERRIDE_REASON,
                                                 "by": "migration", "at": "2026-09-30"}})

    def test_adds_an_override_and_its_log_entry_once(self):
        entry = {"codeId": "ORIENT0730", "reason": plan.OVERRIDE_REASON, "by": "migration", "at": "2026-09-30"}
        patch = plan.override_patch({}, [entry])
        self.assertEqual(patch, {
            "missedEventOverrides": [entry],
            "absenceLog": [{"kind": "closed", "codeId": "ORIENT0730", "note": plan.OVERRIDE_REASON,
                            "by": "migration", "at": "2026-09-30"}],
        })
        self.assertEqual(plan.override_patch(patch, [entry]), {})


class DiffReason(unittest.TestCase):
    def test_explains_the_new_numbers_from_attendance_and_what_was_dropped(self):
        old = {"fallPoints": 5, "otherPoints": 2, "cabinetPoints": 0}
        new = {"vePoints": 4, "cabinetPoints": 3, "openStrikes": 0, "missedEvents": [],
               "attendance": {"gbm": 1, "cabinet-orientation": 1, "cabinet-retreat": 1}}
        self.assertEqual(plan.diff_reason(old, new, {"gbm": "GBM", "cabinet-orientation": "Cabinet Orientation",
                                                     "cabinet-retreat": "Cabinet Retreat"}),
                         "Attendance: 1 Cabinet Orientation, 1 Cabinet Retreat, 1 GBM; "
                         "hand-entered otherPoints 2 not carried over")

    def test_says_when_nothing_changed(self):
        self.assertEqual(plan.diff_reason({"fallPoints": 0}, {"vePoints": 0, "attendance": {}}, {}),
                         "No Attendance")


if __name__ == "__main__":
    unittest.main()
