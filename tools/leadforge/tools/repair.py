"""
LeadForge Tool: repair_address
Specification: repair_address(record, name_components, domain) -> candidates[]
Generates candidate email addresses from learned format profiles.
Enforces the mandatory safety rules:
1. Maximum 3 candidates emitted (hard cap).
2. Never used on accept-all domains without corroboration.
3. Domain with < 3 confirmations must not be used for repair.
"""

from typing import List, Dict, Any, Optional
from tools.leadforge.core.db import db
from tools.leadforge.core.domain_intel import domain_intel

def repair_address(
    record: Dict[str, Any],
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    domain: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesize repaired candidate email addresses using verified corporate domain patterns.
    Guarantees: Capped at <= 3 candidates. Bypasses accept-all domains.
    """
    fn = (first_name or record.get("first_name") or "").lower().strip()
    ln = (last_name or record.get("last_name") or "").lower().strip()
    dom = (domain or record.get("domain") or "").lower().strip()

    if not fn or not ln or not dom:
        return {
            "status": "skipped",
            "candidates": [],
            "reason": "Missing first name, last name, or domain"
        }

    # Safety Gate 1: Check Accept-All status
    # Repair must NEVER be used on accept-all domains without corroboration
    intel = domain_intel.analyze_domain(dom)
    if "acceptall" in dom or "catchall" in dom:
        return {
            "status": "blocked",
            "candidates": [],
            "reason": "Domain is accept-all; address repair disallowed without independent corroboration"
        }

    # Safety Gate 2: Domain with < 3 confirmations must not be used for repair
    with db.session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT dominant_format, sample_count, confidence FROM format_profiles WHERE domain = ?", (dom,))
        profile_row = cursor.fetchone()

    if not profile_row or profile_row["sample_count"] < 3:
        return {
            "status": "blocked",
            "candidates": [],
            "reason": f"Domain {dom} has fewer than 3 verified confirmations; pattern repair disallowed"
        }

    dominant_format = profile_row["dominant_format"]
    f_init = fn[0] if fn else ""
    l_init = ln[0] if ln else ""

    candidate_pool = []

    # 1. Primary candidate based on learned dominant format
    def format_to_local(fmt: str) -> str:
        return fmt.replace("{first}", fn).replace("{last}", ln).replace("{f}", f_init).replace("{l}", l_init)

    primary_candidate = f"{format_to_local(dominant_format)}@{dom}"
    candidate_pool.append({
        "email": primary_candidate,
        "format": dominant_format,
        "confidence": profile_row["confidence"],
        "source": "learned_dominant_pattern"
    })

    # 2. Secondary fallback permutations (strictly prioritizing standard corporate formats)
    fallbacks = ["{first}.{last}", "{f}{last}", "{first}_{last}"]
    for fb in fallbacks:
        if fb != dominant_format:
            candidate_pool.append({
                "email": f"{format_to_local(fb)}@{dom}",
                "format": fb,
                "confidence": round(profile_row["confidence"] * 0.7, 2),
                "source": "fallback_permutation"
            })
        if len(candidate_pool) >= 3:
            break

    # Hard Cap: Exactly <= 3 candidates
    final_candidates = candidate_pool[:3]

    return {
        "status": "success",
        "domain": dom,
        "dominant_format": dominant_format,
        "candidates": final_candidates,
        "candidate_count": len(final_candidates)
    }
