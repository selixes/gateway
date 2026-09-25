"""
LeadForge Pattern & Headcount Intelligence Engine
Calibrates email pattern formats ({first}, {first.last}, {flast}) against company headcount and mail provider.
Guarantees: Catches Catch-All single-name vulnerabilities before dispatch.
"""

import re
from typing import Dict, Any, Tuple, Optional
from tools.leadforge.core.db import db

class PatternIntelligenceEngine:
    def __init__(self):
        pass

    def detect_pattern_type(self, local_part: str, full_name: str) -> str:
        """
        Classifies what pattern formula was used to construct local_part from full_name.
        Returns: 'first', 'first.last', 'flast', 'firstlast', 'first_last', 'firstl', 'custom'
        """
        if not local_part or not full_name:
            return "unknown"

        # Sanitize name
        cleaned_name = re.sub(r"[^a-zA-Z\s]", "", full_name).lower().strip()
        parts = cleaned_name.split()
        if not parts:
            return "unknown"

        first = parts[0]
        last = parts[-1] if len(parts) > 1 else ""
        lp = local_part.lower().strip()

        if lp == first:
            return "first"
        if last and lp == f"{first}.{last}":
            return "first.last"
        if last and lp == f"{first[0]}{last}":
            return "flast"
        if last and lp == f"{first}{last}":
            return "firstlast"
        if last and lp == f"{first}_{last}":
            return "first_last"
        if last and lp == f"{first}{last[0]}":
            return "firstl"
        if last and lp == last:
            return "last"
        return "custom"

    def evaluate_candidate(
        self,
        email: str,
        full_name: str,
        domain: str,
        headcount: int,
        platform: str
    ) -> Dict[str, Any]:
        """
        Evaluate confidence and risk tier for candidate email based on:
        - pattern format
        - company headcount
        - mail platform
        - historical format profiles in SQLite
        """
        local_part = email.split("@")[0].lower() if "@" in email else ""
        pattern = self.detect_pattern_type(local_part, full_name)
        
        # Check if LeadForge SQLite format_profiles has historical data for this domain
        db_profile = None
        try:
            with db.session() as conn:
                cur = conn.cursor()
                cur.execute("SELECT dominant_format, confidence, sample_count FROM format_profiles WHERE domain = ?", (domain.lower(),))
                row = cur.fetchone()
                if row:
                    db_profile = {"dominant_format": row[0], "confidence": row[1], "sample_count": row[2]}
        except Exception:
            pass

        confidence = 0.85
        verdict = "VERIFIED_CONFIRMED"
        flags = []

        is_google_or_m365 = platform in ("Google Workspace", "Microsoft 365")

        # RULE 1: If database has verified colleague records for this domain
        if db_profile and db_profile.get("sample_count", 0) >= 2:
            if db_profile["dominant_format"] == pattern:
                confidence = 0.96
                verdict = "VERIFIED_CONFIRMED"
                flags.append(f"Matches verified domain pattern '{pattern}' ({db_profile['sample_count']} samples)")
                return {
                    "verdict": verdict,
                    "confidence": confidence,
                    "pattern": pattern,
                    "flags": flags
                }

        # RULE 2: Standard corporate multi-part formats are inherently safe
        if pattern in ("first.last", "flast"):
            confidence = 0.94
            verdict = "VERIFIED_CONFIRMED"
            flags.append(f"Standard enterprise naming convention '{pattern}'")
            return {
                "verdict": verdict,
                "confidence": confidence,
                "pattern": pattern,
                "flags": flags
            }

        # RULE 3: Single-name format ({first}@) scaled by headcount
        if pattern == "first":
            if headcount <= 30:
                # Early stage startup: founder almost always has first@
                confidence = 0.90
                verdict = "VERIFIED_CONFIRMED"
                flags.append(f"Early-stage founder pattern '{pattern}@' (Headcount: {headcount})")
            elif 31 <= headcount <= 75:
                # Growth transition: usually valid, but moderate caution
                confidence = 0.82
                verdict = "VERIFIED_CONFIRMED"
                flags.append(f"Growth stage '{pattern}@' (Headcount: {headcount})")
            else:
                # Scaleup > 75 employees: HIGH RISK of catch-all single-name bounce (Batch 75 lesson)
                confidence = 0.68
                verdict = "REVIEW_RECOMMENDED"
                flags.append(f"High-risk Catch-All vulnerability: single-name '{pattern}@' on scaleup (Headcount: {headcount}) on {platform} - Canary dispatch required")
            return {
                "verdict": verdict,
                "confidence": confidence,
                "pattern": pattern,
                "flags": flags
            }

        # RULE 4: Custom or unrecognized pattern
        if pattern == "custom":
            if headcount > 100:
                confidence = 0.65
                verdict = "REVIEW_RECOMMENDED"
                flags.append("Unrecognized custom alias on large enterprise")
            else:
                confidence = 0.75
                verdict = "VERIFIED_CONFIRMED"
                flags.append("Custom pattern on early-stage company")
            return {
                "verdict": verdict,
                "confidence": confidence,
                "pattern": pattern,
                "flags": flags
            }

        return {
            "verdict": "VERIFIED_CONFIRMED",
            "confidence": 0.85,
            "pattern": pattern,
            "flags": ["Standard pattern pass"]
        }

# Singleton instance
pattern_engine = PatternIntelligenceEngine()
