"""
LeadForge Tool: learn_pattern
Specification: learn_pattern(domain) -> pattern_profile
Analyzes confirmed-good records to infer corporate email address conventions.
Enforces the mandatory rule: Needs >= 3 confirmations per domain before activation.
"""

import json
import time
from typing import Dict, Any, Optional, List
from collections import Counter
from tools.leadforge.core.db import db

PATTERN_TEMPLATES = [
    "{first}.{last}",
    "{f}{last}",
    "{first}",
    "{first}_{last}",
    "{last}.{first}",
    "{first}{last}",
    "{f}.{last}"
]

def detect_pattern(local_part: str, first_name: Optional[str], last_name: Optional[str]) -> Optional[str]:
    """Match a known email local-part against first/last name permutations."""
    if not first_name or not last_name:
        return None
    
    lp = local_part.lower()
    fn = first_name.lower()
    ln = last_name.lower()
    f_initial = fn[0] if fn else ""
    l_initial = ln[0] if ln else ""

    if lp == f"{fn}.{ln}":
        return "{first}.{last}"
    elif lp == f"{f_initial}{ln}":
        return "{f}{last}"
    elif lp == f"{fn}_{ln}":
        return "{first}_{last}"
    elif lp == f"{fn}{ln}":
        return "{first}{last}"
    elif lp == f"{f_initial}.{ln}":
        return "{f}.{last}"
    elif lp == fn:
        return "{first}"
    elif lp == ln:
        return "{last}"

    return None

def learn_pattern(domain: str) -> Dict[str, Any]:
    """
    Derive learned corporate email formatting profile for a domain.
    Gated by acceptance threshold: Minimum 3 confirmations required.
    """
    start_time = time.time()
    dom = domain.lower().strip()

    # Query confirmed records for this domain with known first and last names
    with db.session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT r.local_part, r.first_name, r.last_name
               FROM records r
               JOIN verdicts v ON r.clean_address = v.address
               WHERE r.domain = ? AND v.verdict = 'confirmed' AND r.first_name IS NOT NULL AND r.last_name IS NOT NULL""",
            (dom,)
        )
        rows = cursor.fetchall()

    if len(rows) < 3:
        return {
            "status": "insufficient_data",
            "domain": dom,
            "sample_count": len(rows),
            "dominant_format": None,
            "confidence": 0.0,
            "message": "Fewer than 3 confirmations. Pattern learning inactive per safety rules."
        }

    detected_patterns = []
    for r in rows:
        pat = detect_pattern(r["local_part"], r["first_name"], r["last_name"])
        if pat:
            detected_patterns.append(pat)

    if not detected_patterns:
        return {
            "status": "no_clear_pattern",
            "domain": dom,
            "sample_count": len(rows),
            "dominant_format": None,
            "confidence": 0.0
        }

    counts = Counter(detected_patterns)
    dominant_format, top_count = counts.most_common(1)[0]
    confidence = round(top_count / len(detected_patterns), 2)

    # Save to format_profiles table
    with db.session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO format_profiles (domain, dominant_format, sample_count, confidence, formats_json)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(domain) DO UPDATE SET
               dominant_format = excluded.dominant_format,
               sample_count = excluded.sample_count,
               confidence = excluded.confidence,
               formats_json = excluded.formats_json,
               last_updated = CURRENT_TIMESTAMP""",
            (dom, dominant_format, len(rows), confidence, json.dumps(counts))
        )

    duration_ms = (time.time() - start_time) * 1000

    profile = {
        "status": "success",
        "domain": dom,
        "sample_count": len(rows),
        "dominant_format": dominant_format,
        "confidence": confidence,
        "distribution": dict(counts),
        "duration_ms": round(duration_ms, 2)
    }

    db.record_audit(
        tool_name="learn_pattern",
        input_hash=dom,
        output_summary=json.dumps(profile),
        duration_ms=duration_ms
    )

    return profile
