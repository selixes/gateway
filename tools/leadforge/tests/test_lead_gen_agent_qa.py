"""
QA Test Suite: LeadForge Lead Generation Engine V2 & Anti-Hallucination Architecture
Verifies all 5 safety gates:
1. Zero-Hallucination Invariant Gate
2. Pre-Flight Live DNS MX Gate
3. Native SQLite Suppression Gate
4. Headcount & Catch-All Pattern Calibration
5. RFC Syntax Sanitation
6. Batch Pipeline End-to-End Performance
"""

import unittest
import os
import sys

# Ensure repo root is on sys.path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from tools.leadforge.core.preflight_gate import PreFlightDNSGate
from tools.leadforge.core.pattern_engine import PatternIntelligenceEngine
from tools.leadforge.core.suppression_gate import SuppressionGate
from tools.leadforge.tools.generator_v2 import ZeroHallucinationLeadGenerator

class TestLeadGenAgentQA(unittest.TestCase):

    def setUp(self):
        self.generator = ZeroHallucinationLeadGenerator()
        self.preflight = PreFlightDNSGate()
        self.pattern_engine = PatternIntelligenceEngine()
        self.suppression = SuppressionGate()

    # -------------------------------------------------------------
    # TEST 1: Zero-Hallucination Invariant
    # -------------------------------------------------------------
    def test_gate1_zero_hallucination_invariant(self):
        """Synthetic domain patterns (-labs.ai / -core.ai) must be unconditionally rejected."""
        fake_lead = {
            "Company": "Tavily Core Labs",
            "Domain": "tavily-labs.ai",
            "Contact_Name": "Sarah Smith",
            "Email": "sarah@tavily-labs.ai",
            "Headcount": 50
        }
        res = self.generator.process_raw_lead(fake_lead)
        self.assertEqual(res["verdict"], "REJECTED_HALLUCINATED_DOMAIN")
        self.assertEqual(res["confidence"], 0.0)
        self.assertIn("Synthetic domain pattern detected", res["flags"][0])

    # -------------------------------------------------------------
    # TEST 2: Pre-Flight Live DNS MX Gate
    # -------------------------------------------------------------
    def test_gate2_preflight_dns_real_domains(self):
        """Real domains with active MX must resolve and classify platform correctly."""
        # 1. Google Workspace test
        res_google = self.preflight.verify_domain("tabnine.com")
        self.assertTrue(res_google["valid"])
        self.assertEqual(res_google["platform"], "Google Workspace")
        self.assertGreater(len(res_google["mx_hosts"]), 0)

        # 2. Runway ML test
        res_runway = self.preflight.verify_domain("runwayml.com")
        self.assertTrue(res_runway["valid"])
        self.assertEqual(res_runway["platform"], "Google Workspace")

    def test_gate2_preflight_dns_dead_domains(self):
        """Non-existent domains must fail live DNS and be quarantined."""
        res_dead = self.preflight.verify_domain("this-company-does-not-exist-xyz98741.com")
        self.assertFalse(res_dead["valid"])
        self.assertIn("NO_MX_RECORDS", res_dead["error"])

    # -------------------------------------------------------------
    # TEST 3: Native Suppression Blacklist Gate
    # -------------------------------------------------------------
    def test_gate3_suppression_enforcement(self):
        """Known hard bounces from historical runs must be permanently quarantined."""
        known_bounces = [
            ("anurag@usebraintrust.com", "usebraintrust.com"),
            ("scott@augmentcode.com", "augmentcode.com"),
            ("zayd@cresta.com", "cresta.com")
        ]
        for email, domain in known_bounces:
            is_supp, reason = self.suppression.check(email, domain)
            self.assertTrue(is_supp, f"Expected {email} to be suppressed!")
            
            # Check generator integration
            res = self.generator.process_raw_lead({
                "Company": "Test Org",
                "Domain": domain,
                "Contact_Name": "Founder",
                "Email": email,
                "Headcount": 50
            })
            self.assertEqual(res["verdict"], "SUPPRESSED")
            self.assertEqual(res["confidence"], 0.0)

    # -------------------------------------------------------------
    # TEST 4: Headcount & Catch-All Pattern Calibration
    # -------------------------------------------------------------
    def test_gate4_pattern_calibration(self):
        """Pattern engine must safely separate early startups from high-risk scaleup catch-alls."""
        # Scenario A: Early startup founder (<30 headcount) with single name -> Confirmed Safe
        res_startup = self.pattern_engine.evaluate_candidate(
            email="kevin@sweep.dev",
            full_name="Kevin Lu",
            domain="sweep.dev",
            headcount=18,
            platform="Google Workspace"
        )
        self.assertEqual(res_startup["verdict"], "VERIFIED_CONFIRMED")
        self.assertGreaterEqual(res_startup["confidence"], 0.85)

        # Scenario B: Scaleup (>75 headcount) with single-name on Google -> Flagged for Canary Review
        res_scaleup = self.pattern_engine.evaluate_candidate(
            email="lukas@wandb.com",
            full_name="Lukas Biewald",
            domain="wandb.com",
            headcount=250,
            platform="Google Workspace"
        )
        self.assertEqual(res_scaleup["verdict"], "REVIEW_RECOMMENDED")
        self.assertLess(res_scaleup["confidence"], 0.85)
        self.assertIn("Catch-All vulnerability", res_scaleup["flags"][0])

        # Scenario C: Scaleup (>75 headcount) with standard first.last -> Confirmed Safe
        res_enterprise_fmt = self.pattern_engine.evaluate_candidate(
            email="lukas.biewald@wandb.com",
            full_name="Lukas Biewald",
            domain="wandb.com",
            headcount=250,
            platform="Google Workspace"
        )
        self.assertEqual(res_enterprise_fmt["verdict"], "VERIFIED_CONFIRMED")
        self.assertGreaterEqual(res_enterprise_fmt["confidence"], 0.90)

    # -------------------------------------------------------------
    # TEST 5: RFC Syntax Sanitation
    # -------------------------------------------------------------
    def test_gate5_syntax_sanitation(self):
        """Malformed syntax must be rejected before DNS or DB checks."""
        malformed = [
            "bad..dots@domain.com",
            "no-at-sign.com",
            "spaces in@domain.com",
            "@missing-user.com"
        ]
        for bad in malformed:
            res = self.generator.process_raw_lead({
                "Company": "Test",
                "Domain": "domain.com",
                "Contact_Name": "Test User",
                "Email": bad,
                "Headcount": 10
            })
            self.assertEqual(res["verdict"], "INVALID_SYNTAX")
            self.assertEqual(res["confidence"], 0.0)

    # -------------------------------------------------------------
    # TEST 6: Batch Pipeline Performance & Integrity
    # -------------------------------------------------------------
    def test_gate6_batch_pipeline_end_to_end(self):
        """End-to-end batch processing correctly isolates all tiers."""
        test_batch = [
            # 1. Real safe lead
            {"Company": "Tabnine", "Domain": "tabnine.com", "Contact_Name": "Dror Weiss", "Email": "dror@tabnine.com", "Headcount": 25},
            # 2. Hallucinated lead
            {"Company": "Fake Labs", "Domain": "fake-labs.ai", "Contact_Name": "Alex Chen", "Email": "alex@fake-labs.ai", "Headcount": 40},
            # 3. Suppressed lead
            {"Company": "Braintrust", "Domain": "usebraintrust.com", "Contact_Name": "Anurag Goel", "Email": "anurag@usebraintrust.com", "Headcount": 35},
            # 4. Dead domain lead
            {"Company": "Dead Co", "Domain": "nonexistent-dead-domain-9999.com", "Contact_Name": "John Doe", "Email": "john@nonexistent-dead-domain-9999.com", "Headcount": 20},
            # 5. Scaleup Catch-All review lead
            {"Company": "Weights & Biases", "Domain": "wandb.com", "Contact_Name": "Lukas Biewald", "Email": "lukas@wandb.com", "Headcount": 250},
        ]

        batch_res = self.generator.process_batch(test_batch)
        counts = batch_res["counts"]

        self.assertEqual(counts["total"], 5)
        self.assertEqual(counts["verified_confirmed"], 1) # Tabnine
        self.assertEqual(counts["hallucinated"], 1)         # Fake Labs
        self.assertEqual(counts["suppressed"], 1)           # Braintrust
        self.assertEqual(counts["dead_domain"], 1)          # Dead Co
        self.assertEqual(counts["review_recommended"], 1)   # W&B single-name scaleup

if __name__ == "__main__":
    unittest.main()
