"""
LeadForge Full Unit & Integration Test Suite
Automates all acceptance gates, negative tests, and performance limits specified in LeadForge Plan v1.0.
"""

import unittest
import os
import json
import tempfile
import time

# Enforce strict test DB isolation at module load time
_GLOBAL_TEST_TEMP_DIR = tempfile.TemporaryDirectory()
_GLOBAL_TEST_DB_PATH = os.path.join(_GLOBAL_TEST_TEMP_DIR.name, "isolated_test_leadforge.db")
os.environ["LEADFORGE_TEST_MODE"] = "1"
os.environ["LEADFORGE_DB_PATH"] = _GLOBAL_TEST_DB_PATH

from tools.leadforge.core.constants import Verdict, MailPlatform, SendRoute
from tools.leadforge.core.db import DatabaseManager, db, PROD_DB_PATH
from tools.leadforge.core.normalize import normalize_address, clean_raw_string
from tools.leadforge.core.domain_intel import DomainIntelligence
from tools.leadforge.core.provider import MockVerifierProvider, ProviderResult
from tools.leadforge.tools.clean import clean_addresses
from tools.leadforge.tools.score import score_addresses
from tools.leadforge.tools.router import route_for_send
from tools.leadforge.tools.failures import ingest_failures
from tools.leadforge.tools.export import export_list
from tools.leadforge.tools.patterns import learn_pattern
from tools.leadforge.tools.repair import repair_address
from tools.leadforge.tool_server import LeadForgeAssistantTools

class TestLeadForgeAcceptanceGates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use isolated test database and bind singleton db to it
        cls.temp_dir = _GLOBAL_TEST_TEMP_DIR
        cls.test_db_path = _GLOBAL_TEST_DB_PATH
        db.switch_db(cls.test_db_path)
        cls.db = db

        # HARD SAFETY ASSERTION: Guarantee that tests never touch production DB
        assert os.path.abspath(db.db_path) != os.path.abspath(PROD_DB_PATH), (
            f"CRITICAL SAFETY VIOLATION: db is pointing to production database: {db.db_path}"
        )
        assert "isolated_test_leadforge.db" in db.db_path

        cls.domain_intel = DomainIntelligence()

        # Load fixtures
        fixtures_path = os.path.join(os.path.dirname(__file__), "..", "fixtures", "fixtures")
        with open(os.path.join(fixtures_path, "records_500.json"), "r", encoding="utf-8") as f:
            cls.fixtures_500 = json.load(f)
        with open(os.path.join(fixtures_path, "domains_300.json"), "r", encoding="utf-8") as f:
            cls.fixtures_300 = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    # ---------------------------------------------------------
    # GATE 1: PARSER & CLEANING ACCURACY (>= 98% on 500 records)
    # ---------------------------------------------------------
    def test_gate_1_parser_500_records_accuracy(self):
        correct = 0
        total = len(self.fixtures_500)

        for item in self.fixtures_500:
            raw = item["raw"]
            norm = normalize_address(raw)

            # Check validity match
            expected_valid = item.get("expected_valid", True)
            if norm["valid"] == expected_valid:
                # Check typo correction if specified
                if "expected_domain" in item:
                    if norm["domain"] == item["expected_domain"]:
                        correct += 1
                else:
                    correct += 1

        accuracy = (correct / total) * 100
        print(f"\n[GATE 1] Parser & Cleaning Accuracy: {accuracy:.2f}% (Target: >=98.0%)")
        self.assertGreaterEqual(accuracy, 98.0, "Parser accuracy below 98% acceptance threshold")

    # ---------------------------------------------------------
    # GATE 2: DOMAIN INTELLIGENCE ACCURACY (>= 95% on 300 domains)
    # ---------------------------------------------------------
    def test_gate_2_domain_intelligence_300_accuracy(self):
        correct = 0
        total = len(self.fixtures_300)

        for item in self.fixtures_300:
            platform = self.domain_intel.classify_platform(item["mx"])
            if platform.value == item["expected_platform"]:
                correct += 1

        accuracy = (correct / total) * 100
        print(f"[GATE 2] Domain Classification Accuracy: {accuracy:.2f}% (Target: >=95.0%)")
        self.assertGreaterEqual(accuracy, 95.0, "Domain classification accuracy below 95% threshold")

    # ---------------------------------------------------------
    # MANDATORY NEGATIVE TEST 1: Policy/reputation never permanent_fail
    # ---------------------------------------------------------
    def test_negative_1_policy_rejection_never_permanent_fail(self):
        provider = MockVerifierProvider()
        result = provider.verify("reputation_blocked_user@target-corp.com", "target-corp.com")
        
        self.assertNotEqual(
            result.verdict,
            Verdict.PERMANENT_FAIL,
            "CRITICAL VIOLATION: Supplier reputation block normalized to permanent_fail! Must map to indeterminate."
        )
        self.assertEqual(result.verdict, Verdict.INDETERMINATE)

    # ---------------------------------------------------------
    # MANDATORY NEGATIVE TEST 2: Accept-all never yields confirmed
    # ---------------------------------------------------------
    def test_negative_2_accept_all_never_confirmed(self):
        provider = MockVerifierProvider()
        result = provider.verify("any_name@acceptall-bank.com", "acceptall-bank.com")
        
        self.assertNotEqual(
            result.verdict,
            Verdict.CONFIRMED,
            "CRITICAL VIOLATION: Accept-all domain yielded confirmed! Must map to accept_all."
        )
        self.assertEqual(result.verdict, Verdict.ACCEPT_ALL)

    # ---------------------------------------------------------
    # MANDATORY NEGATIVE TEST 3: Suppressed record never reaches paid call or send
    # ---------------------------------------------------------
    def test_negative_3_suppressed_never_paid_call_or_send(self):
        suppressed_email = "victim@donotcontact.org"
        self.db.add_suppression(suppressed_email, "donotcontact.org", "Prior spam complaint")

        # 1. Clean tool isolates it
        clean_res = clean_addresses([suppressed_email])
        rec = clean_res["cleaned"][0]
        self.assertEqual(rec["status"], "suppressed")

        # 2. Score tool incurs $0 cost on suppressed record
        provider = MockVerifierProvider()
        initial_spend = provider.total_spent_cents
        score_res = score_addresses(clean_res["cleaned"], provider=provider)
        
        self.assertEqual(provider.total_spent_cents, initial_spend, "Paid call was made on suppressed email!")
        self.assertEqual(score_res["scored"][0]["cost_cents"], 0.0)

        # 3. Router suppresses it completely (never sends)
        route_res = route_for_send(score_res["scored"])
        self.assertEqual(len(route_res["routing_plan"]["primary"]), 0)
        self.assertEqual(len(route_res["routing_plan"]["secondary"]), 0)
        self.assertEqual(len(route_res["routing_plan"]["suppress"]), 1)

    # ---------------------------------------------------------
    # MANDATORY NEGATIVE TEST 4: Repair never emits more than 3 candidates
    # ---------------------------------------------------------
    def test_negative_4_repair_max_3_candidates(self):
        # Seed domain with >= 3 confirmations
        dom = "apple-style-tech.io"
        with self.db.session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO format_profiles (domain, dominant_format, sample_count, confidence)
                   VALUES (?, ?, 5, 0.9)""",
                (dom, "{f}{last}")
            )

        repair_res = repair_address({}, first_name="Timothy", last_name="Cook", domain=dom)
        candidates = repair_res["candidates"]
        
        self.assertLessEqual(
            len(candidates),
            3,
            f"CRITICAL VIOLATION: Address repair emitted {len(candidates)} candidates (Max allowed is 3)!"
        )
        self.assertGreater(len(candidates), 0)

    # ---------------------------------------------------------
    # MANDATORY NEGATIVE TEST 5: Domain with < 3 confirmations cannot be repaired
    # ---------------------------------------------------------
    def test_negative_5_repair_blocked_under_3_confirmations(self):
        dom = "unconfirmed-startup.xyz"
        # Seed with only 1 confirmation
        with self.db.session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO format_profiles (domain, dominant_format, sample_count, confidence)
                   VALUES (?, ?, 1, 0.5)""",
                (dom, "{first}.{last}")
            )

        repair_res = repair_address({}, first_name="Alice", last_name="Smith", domain=dom)
        self.assertEqual(repair_res["status"], "blocked")
        self.assertEqual(len(repair_res["candidates"]), 0)

    # ---------------------------------------------------------
    # SPEND CAP ENFORCEMENT TEST
    # ---------------------------------------------------------
    def test_spend_cap_enforcement(self):
        records = [
            {"clean_address": f"user{i}@testdomain.com", "domain": "testdomain.com", "status": "valid"}
            for i in range(1, 20)
        ]
        # Set tight budget cap of 0.35 cents (each call is 0.1 cents) -> max 3 calls allowed
        provider = MockVerifierProvider(cost_per_call_cents=0.1)
        score_res = score_addresses(records, budget_cap_cents=0.35, provider=provider)
        
        self.assertLessEqual(score_res["total_spent_cents"], 0.35)
        self.assertTrue(score_res["budget_exhausted"])
        print(f"[TEST PASS] Spend Cap strictly enforced at {score_res['total_spent_cents']} cents")

    # ---------------------------------------------------------
    # DELIVERY FAILURE INGESTION & IDEMPOTENCY
    # ---------------------------------------------------------
    def test_delivery_failure_ingestion_and_idempotency(self):
        event = {
            "event_id": "resend_evt_unique_12345",
            "address": "hard_bounced_lead@test.com",
            "event_type": "permanent_fail",
            "reason_code": "550_mailbox_not_found"
        }
        # Ingest 1st time
        res1 = ingest_failures([event])
        self.assertEqual(res1["summary"]["ingested"], 1)
        self.assertEqual(res1["summary"]["suppressions_added"], 1)

        # Ingest duplicate 2nd time
        res2 = ingest_failures([event])
        self.assertEqual(res2["summary"]["duplicates_skipped"], 1)

        # Address should now be suppressed
        is_supp, reason = self.db.is_suppressed("hard_bounced_lead@test.com")
        self.assertTrue(is_supp)

    # ---------------------------------------------------------
    # DAILY PER-DOMAIN SEND CAP
    # ---------------------------------------------------------
    def test_daily_per_domain_send_cap(self):
        records = [
            {"clean_address": f"exec{i}@targetcorp.com", "domain": "targetcorp.com", "verdict": "confirmed", "confidence": 0.95}
            for i in range(1, 10)
        ]
        # Enforce max 3 per domain daily
        route_res = route_for_send(records, max_per_domain_daily=3)
        self.assertEqual(route_res["summary"]["primary_sends"], 3)
        self.assertEqual(route_res["summary"]["held"], 6)

    # ---------------------------------------------------------
    # EXPORT LIST TEST (CSV & JSON)
    # ---------------------------------------------------------
    def test_export_list_csv_and_json(self):
        records = [
            {"clean_address": "ceo@startup.io", "verdict": "confirmed", "confidence": 0.92, "assigned_route": "primary"},
            {"clean_address": "cto@startup.io", "verdict": "confirmed", "confidence": 0.90, "assigned_route": "primary"}
        ]
        with tempfile.TemporaryDirectory() as exp_dir:
            csv_res = export_list(records, run_id="test_exp_csv", export_format="csv", output_dir=exp_dir)
            self.assertTrue(os.path.exists(csv_res["file_path"]))
            self.assertEqual(csv_res["records_exported"], 2)

            json_res = export_list(records, run_id="test_exp_json", export_format="json", output_dir=exp_dir)
            self.assertTrue(os.path.exists(json_res["file_path"]))
            self.assertEqual(json_res["records_exported"], 2)

    # ---------------------------------------------------------
    # PATTERN LEARNING WITH >= 3 CONFIRMATIONS
    # ---------------------------------------------------------
    def test_learn_pattern_success(self):
        dom = "stripe-scale-corp.com"
        # Seed 3 confirmed records
        with self.db.session() as conn:
            cursor = conn.cursor()
            for fn, ln in [("Patrick", "Collison"), ("John", "Collison"), ("Will", "Gaybrick")]:
                clean_addr = f"{fn.lower()}.{ln.lower()}@{dom}"
                cursor.execute(
                    "INSERT INTO records (raw_address, clean_address, local_part, domain, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
                    (clean_addr, clean_addr, f"{fn.lower()}.{ln.lower()}", dom, fn, ln)
                )
                rec_id = cursor.lastrowid
                cursor.execute(
                    "INSERT INTO verdicts (record_id, address, verdict, confidence, provider) VALUES (?, ?, 'confirmed', 0.95, 'mock')",
                    (rec_id, clean_addr)
                )

        profile = learn_pattern(dom)
        self.assertEqual(profile["status"], "success")
        self.assertEqual(profile["dominant_format"], "{first}.{last}")
        self.assertEqual(profile["sample_count"], 3)

    # ---------------------------------------------------------
    # FULL COMPOSITE PIPELINE EXECUTION
    # ---------------------------------------------------------
    def test_assistant_full_pipeline(self):
        raw = [
            "  john.doe@company.com  ",
            "mailto:alice.smith@enterprise.org",
            "invalid-syntax-email",
            "info@generalcorp.com"
        ]
        pipe_res = LeadForgeAssistantTools.run_full_pipeline(raw, run_id="unit_pipeline_test")
        self.assertEqual(pipe_res["status"], "completed")
        self.assertEqual(pipe_res["cleaning_summary"]["total"], 4)
        self.assertTrue(os.path.exists(pipe_res["export"]["file_path"]))

if __name__ == "__main__":
    unittest.main()
