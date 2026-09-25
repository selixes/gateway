"""
LeadForge Generation Engine V2: Zero-Hallucination & Verified Outreach
Specification: Strict Pre-Flight DNS Gate, Headcount & Platform Intelligence, and Suppression Enforcement.
Guarantees: Zero synthetic/hallucinated domains (-labs.ai), zero dead domains, and zero duplicate/suppressed dispatch.
"""

import re
from typing import Dict, Any, List, Optional
from tools.leadforge.core.preflight_gate import preflight_dns_gate
from tools.leadforge.core.pattern_engine import pattern_engine
from tools.leadforge.core.suppression_gate import suppression_gate
from tools.leadforge.core.normalize import normalize_address

class ZeroHallucinationLeadGenerator:
    def __init__(self):
        self.preflight_gate = preflight_dns_gate
        self.pattern_engine = pattern_engine
        self.suppression_gate = suppression_gate

    def process_raw_lead(self, raw_lead: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes and validates a candidate lead through the 4 core LeadForge gates:
        1. RFC Syntax & Structure
        2. Zero-Hallucination Domain Invariant
        3. Live DNS MX Pre-Flight Gate
        4. Native Suppression Blacklist
        5. Headcount & Pattern Confidence Scoring
        """
        company = raw_lead.get("Company") or raw_lead.get("company") or ""
        domain = (raw_lead.get("Domain") or raw_lead.get("domain") or "").lower().strip()
        contact_name = raw_lead.get("Contact_Name") or raw_lead.get("contact_name") or raw_lead.get("name") or ""
        role = raw_lead.get("Role") or raw_lead.get("role") or ""
        email = (raw_lead.get("Email") or raw_lead.get("email") or "").lower().strip()
        valuation = raw_lead.get("Valuation") or raw_lead.get("valuation") or ""
        headcount = int(raw_lead.get("Headcount") or raw_lead.get("headcount") or 0)
        sector = raw_lead.get("Sector") or raw_lead.get("sector") or ""
        pitch_angle = raw_lead.get("Pitch_Angle") or raw_lead.get("pitch_angle") or ""

        flags = []

        # GATE 1: RFC Syntax Normalization
        norm = normalize_address(email)
        if not norm["valid"] or not domain:
            return {
                **raw_lead,
                "clean_email": email,
                "verdict": "INVALID_SYNTAX",
                "confidence": 0.0,
                "mail_platform": "None",
                "mx_host": "None",
                "flags": ["Invalid email syntax or format"]
            }

        # GATE 2: Zero-Hallucination Invariant Check
        # Hard block on fabricated suffix patterns that broke the previous generator
        if domain.endswith("-labs.ai") or domain.endswith("-core.ai"):
            return {
                **raw_lead,
                "clean_email": email,
                "verdict": "REJECTED_HALLUCINATED_DOMAIN",
                "confidence": 0.0,
                "mail_platform": "None",
                "mx_host": "None",
                "flags": ["Synthetic domain pattern detected (-labs.ai / -core.ai forbidden)"]
            }

        # GATE 3: Suppression Store Check
        is_suppressed, supp_reason = self.suppression_gate.check(email, domain)
        if is_suppressed:
            return {
                **raw_lead,
                "clean_email": email,
                "verdict": "SUPPRESSED",
                "confidence": 0.0,
                "mail_platform": "None",
                "mx_host": "None",
                "flags": [supp_reason]
            }

        # GATE 4: Live DNS MX Pre-Flight Gate
        dns_res = self.preflight_gate.verify_domain(domain)
        if not dns_res["valid"]:
            return {
                **raw_lead,
                "clean_email": email,
                "verdict": "DEAD_DOMAIN",
                "confidence": 0.0,
                "mail_platform": "None",
                "mx_host": "None",
                "flags": [f"Pre-flight DNS failed: {dns_res['error']}"]
            }

        mail_platform = dns_res["platform"]
        primary_mx = dns_res["mx_hosts"][0] if dns_res["mx_hosts"] else "None"

        # GATE 5: Pattern Intelligence & Headcount Risk Scoring
        eval_res = self.pattern_engine.evaluate_candidate(
            email=email,
            full_name=contact_name,
            domain=domain,
            headcount=headcount,
            platform=mail_platform
        )

        all_flags = [f"MX verified on {mail_platform}"] + eval_res["flags"]

        return {
            **raw_lead,
            "clean_email": email,
            "verdict": eval_res["verdict"],
            "confidence": eval_res["confidence"],
            "mail_platform": mail_platform,
            "mx_host": primary_mx,
            "pattern_type": eval_res["pattern"],
            "flags": all_flags
        }

    def process_batch(self, raw_leads: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process a list of candidate leads through all gates."""
        results = []
        counts = {
            "total": len(raw_leads),
            "verified_confirmed": 0,
            "review_recommended": 0,
            "dead_domain": 0,
            "suppressed": 0,
            "invalid_syntax": 0,
            "hallucinated": 0
        }

        for r in raw_leads:
            res = self.process_raw_lead(r)
            v = res["verdict"]
            if v == "VERIFIED_CONFIRMED": counts["verified_confirmed"] += 1
            elif v == "REVIEW_RECOMMENDED": counts["review_recommended"] += 1
            elif v == "DEAD_DOMAIN": counts["dead_domain"] += 1
            elif v == "SUPPRESSED": counts["suppressed"] += 1
            elif v == "INVALID_SYNTAX": counts["invalid_syntax"] += 1
            elif v == "REJECTED_HALLUCINATED_DOMAIN": counts["hallucinated"] += 1
            results.append(res)

        return {
            "counts": counts,
            "records": results
        }

# Singleton instance
lead_generator_v2 = ZeroHallucinationLeadGenerator()
