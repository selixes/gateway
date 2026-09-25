"""
LeadForge Tool: clean_addresses
Specification: clean_addresses(records) -> cleaned[]
Sanitizes, canonicalizes, deduplicates, and checks against suppression list.
"""

import time
import hashlib
import json
from typing import List, Dict, Any, Union, Optional
from tools.leadforge.core.normalize import normalize_address
from tools.leadforge.core.db import db
from tools.leadforge.core.constants import Verdict

def clean_addresses(
    records: List[Union[str, Dict[str, Any]]],
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Clean, validate, deduplicate, and cross-reference records against suppression store.
    Guarantees: Suppressed records are isolated before reaching any paid provider call.
    """
    start_time = time.time()
    
    # Check idempotency cache
    if idempotency_key:
        cached = db.check_idempotency(idempotency_key)
        if cached:
            return cached

    seen_canonical = set()
    cleaned_records = []
    
    counts = {
        "total": len(records),
        "valid": 0,
        "invalid": 0,
        "suppressed": 0,
        "duplicate": 0
    }

    for item in records:
        # Standardize record object
        if isinstance(item, str):
            raw_email = item
            extra = {}
        elif isinstance(item, dict):
            raw_email = item.get("email") or item.get("raw_address") or item.get("address") or ""
            extra = {k: v for k, v in item.items() if k not in ("email", "raw_address", "address")}
        else:
            continue

        norm = normalize_address(raw_email)
        
        # 1. Invalid Syntax / Non-RFC compliant
        if not norm["valid"]:
            counts["invalid"] += 1
            cleaned_records.append({
                "raw_address": raw_email,
                "clean_address": norm["clean"],
                "status": "invalid",
                "rejection_reason": norm["error"],
                "verdict": Verdict.PERMANENT_FAIL.value,
                "confidence": 0.0,
                **extra
            })
            continue

        clean_addr = norm["clean"]
        domain = norm["domain"]

        # 2. Canonical Deduplication Check
        if clean_addr in seen_canonical:
            counts["duplicate"] += 1
            cleaned_records.append({
                "raw_address": raw_email,
                "clean_address": clean_addr,
                "status": "duplicate",
                "rejection_reason": "duplicate_in_input_batch",
                **extra
            })
            continue
        
        seen_canonical.add(clean_addr)

        # 3. Suppression Store Cross-Reference (Zero Paid Calls on Suppressed)
        is_supp, reason = db.is_suppressed(clean_addr, domain)
        if is_supp:
            counts["suppressed"] += 1
            cleaned_records.append({
                "raw_address": raw_email,
                "clean_address": clean_addr,
                "status": "suppressed",
                "rejection_reason": reason,
                "verdict": Verdict.RISKY.value,
                "confidence": 0.0,
                **extra
            })
            continue

        # 4. Valid record approved for downstream scoring
        counts["valid"] += 1
        record_entry = {
            "raw_address": raw_email,
            "clean_address": clean_addr,
            "status": "valid",
            "local_part": norm["local_part"],
            "domain": norm["domain"],
            "domain_corrected": norm["domain_corrected"],
            "is_disposable": norm["is_disposable"],
            "is_generic": norm["is_generic"],
            "first_name": extra.get("first_name") or norm["first_name"],
            "last_name": extra.get("last_name") or norm["last_name"],
            "initial_verdict": norm["initial_verdict"],
            **extra
        }
        cleaned_records.append(record_entry)

    duration_ms = (time.time() - start_time) * 1000
    
    result = {
        "status": "success",
        "counts": counts,
        "duration_ms": round(duration_ms, 2),
        "cleaned": cleaned_records
    }

    # Record audit log
    input_hash = hashlib.sha256(json.dumps(records, default=str).encode("utf-8")).hexdigest()
    summary_str = json.dumps({"counts": counts, "status": "success"})
    db.record_audit(
        tool_name="clean_addresses",
        input_hash=input_hash,
        output_summary=summary_str,
        duration_ms=duration_ms,
        idempotency_key=idempotency_key
    )

    return result
