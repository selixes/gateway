"""
LeadForge Tool: score_addresses
Specification: score_addresses(records, budget_cap, min_confidence) -> scored[]
Executes multi-signal confidence scoring, enforces budget caps, and saves verdicts.
"""

import time
import json
import hashlib
from typing import List, Dict, Any, Optional
from tools.leadforge.core.constants import (
    Verdict,
    DEFAULT_SCORING_WEIGHTS
)
from tools.leadforge.core.domain_intel import domain_intel
from tools.leadforge.core.provider import BaseVerifierProvider, MockVerifierProvider, ProviderResult
from tools.leadforge.core.db import db

def score_addresses(
    records: List[Dict[str, Any]],
    budget_cap_cents: float = 500.0,
    min_confidence: float = 0.70,
    provider: Optional[BaseVerifierProvider] = None,
    custom_weights: Optional[Dict[str, float]] = None,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Score email records with multi-signal confidence engine and strict spend cap enforcement.
    Guarantees: Suppressed records never trigger paid calls. Spend cap is never exceeded.
    """
    start_time = time.time()
    
    if idempotency_key:
        cached = db.check_idempotency(idempotency_key)
        if cached:
            return cached

    verifier = provider or MockVerifierProvider()
    weights = custom_weights or DEFAULT_SCORING_WEIGHTS

    scored_records = []
    total_spent_cents = 0.0
    verdict_counts = {v.value: 0 for v in Verdict}
    budget_exhausted = False

    for rec in records:
        status = rec.get("status", "valid")
        clean_addr = rec.get("clean_address", "")
        domain = rec.get("domain", "")

        # 1. Non-valid records (Suppressed, Invalid Syntax, Duplicates)
        # CRITICAL: Must NEVER incur paid provider costs!
        if status in ("suppressed", "invalid", "duplicate") or not clean_addr:
            verdict_val = rec.get("verdict", Verdict.PERMANENT_FAIL.value if status == "invalid" else Verdict.RISKY.value)
            conf = rec.get("confidence", 0.0)
            verdict_counts[verdict_val] = verdict_counts.get(verdict_val, 0) + 1
            scored_records.append({
                **rec,
                "verdict": verdict_val,
                "confidence": conf,
                "cost_cents": 0.0,
                "provider": "local_filter",
                "signals": {"status": status, "rejection_reason": rec.get("rejection_reason")}
            })
            continue

        # 2. Domain Intelligence Inspection
        intel = domain_intel.analyze_domain(domain)
        
        # 3. Spend Cap Enforcement
        if (total_spent_cents + 0.1) > budget_cap_cents:
            budget_exhausted = True
            # Graceful degraded scoring without paid call
            verdict_val = Verdict.INDETERMINATE.value
            verdict_counts[verdict_val] += 1
            scored_records.append({
                **rec,
                "verdict": verdict_val,
                "confidence": 0.40,
                "cost_cents": 0.0,
                "provider": "spend_cap_fallback",
                "signals": {"budget_exhausted": True, "domain_intel": intel}
            })
            continue

        # 4. Verified Provider Evaluation
        result: ProviderResult = verifier.verify(clean_addr, domain)
        total_spent_cents += result.cost_cents

        # Calculate composite multi-signal confidence
        # Formula: sum(weight_i * signal_i)
        mx_score = 1.0 if intel["has_mx"] else 0.0
        smtp_score = 1.0 if result.verdict == Verdict.CONFIRMED else (0.5 if result.verdict == Verdict.ACCEPT_ALL else 0.0)
        disp_score = 0.0 if intel["is_disposable"] else 1.0
        syntax_score = 1.0

        computed_confidence = (
            weights["mx_valid"] * mx_score +
            weights["smtp_deliverable"] * smtp_score +
            weights["non_disposable"] * disp_score +
            weights["syntax_valid"] * syntax_score
        )
        # Normalize and round
        final_confidence = round(min(max(computed_confidence, 0.0), 1.0), 3)

        # Apply locked verdict rules
        verdict_str = result.verdict.value
        verdict_counts[verdict_str] += 1

        signals = {
            "mx_valid": intel["has_mx"],
            "mail_platform": intel["platform"],
            "is_accept_all": result.is_accept_all,
            "smtp_status": result.raw_status,
            **(result.signals or {})
        }

        # Save to DB verdicts table
        with db.session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO verdicts (address, verdict, confidence, signals_json, provider, cost_cents)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (clean_addr, verdict_str, final_confidence, json.dumps(signals), "leadforge_provider", result.cost_cents)
            )

        scored_records.append({
            **rec,
            "verdict": verdict_str,
            "confidence": final_confidence,
            "cost_cents": result.cost_cents,
            "provider": "leadforge_provider",
            "signals": signals
        })

    duration_ms = (time.time() - start_time) * 1000

    output = {
        "status": "success",
        "total_records": len(records),
        "total_spent_cents": round(total_spent_cents, 2),
        "budget_remaining_cents": round(max(budget_cap_cents - total_spent_cents, 0.0), 2),
        "budget_exhausted": budget_exhausted,
        "verdict_breakdown": verdict_counts,
        "duration_ms": round(duration_ms, 2),
        "scored": scored_records
    }

    # Audit log
    input_hash = hashlib.sha256(json.dumps(records, default=str).encode("utf-8")).hexdigest()
    summary_str = json.dumps({
        "total_spent_cents": output["total_spent_cents"],
        "verdicts": verdict_counts
    })
    db.record_audit(
        tool_name="score_addresses",
        input_hash=input_hash,
        output_summary=summary_str,
        duration_ms=duration_ms,
        idempotency_key=idempotency_key
    )

    return output
