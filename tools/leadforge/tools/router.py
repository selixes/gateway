"""
LeadForge Tool: route_for_send
Specification: route_for_send(scored_records, policy_version) -> routing_plan
Routes scored records to primary domain, secondary domain, hold queue, or suppression,
with enforced per-domain daily volume caps.
"""

import time
import json
import hashlib
from typing import List, Dict, Any, Optional
from collections import defaultdict
from tools.leadforge.core.constants import (
    Verdict,
    SendRoute,
    PRIMARY_SEND_MIN_CONFIDENCE,
    SECONDARY_SEND_MIN_CONFIDENCE,
    HOLD_MIN_CONFIDENCE
)
from tools.leadforge.core.db import db

DEFAULT_MAX_PER_DOMAIN_DAILY = 5

def route_for_send(
    scored_records: List[Dict[str, Any]],
    policy_version: str = "v1.0",
    max_per_domain_daily: int = DEFAULT_MAX_PER_DOMAIN_DAILY,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate an optimal, deliverability-preserving send routing plan.
    Enforces per-domain volume caps to prevent anti-spam rate limiting.
    """
    start_time = time.time()
    
    if idempotency_key:
        cached = db.check_idempotency(idempotency_key)
        if cached:
            return cached

    domain_send_counts = defaultdict(int)
    routed_buckets = {
        SendRoute.PRIMARY.value: [],
        SendRoute.SECONDARY.value: [],
        SendRoute.HOLD.value: [],
        SendRoute.SUPPRESS.value: []
    }

    for rec in scored_records:
        verdict = rec.get("verdict", "")
        conf = float(rec.get("confidence", 0.0))
        domain = rec.get("domain", "").lower()

        # 1. Automatic Suppression
        if verdict in (Verdict.PERMANENT_FAIL.value, Verdict.RISKY.value) or rec.get("status") == "suppressed":
            routed_buckets[SendRoute.SUPPRESS.value].append({
                **rec,
                "assigned_route": SendRoute.SUPPRESS.value,
                "routing_reason": f"Verdict is {verdict}"
            })
            continue

        # 2. Check Per-Domain Daily Volume Cap
        if domain and domain_send_counts[domain] >= max_per_domain_daily:
            # Over daily cap: automatically hold to avoid domain burning
            routed_buckets[SendRoute.HOLD.value].append({
                **rec,
                "assigned_route": SendRoute.HOLD.value,
                "routing_reason": f"Per-domain daily cap of {max_per_domain_daily} reached for {domain}"
            })
            continue

        # 3. Route according to verified confidence and verdict type
        if verdict == Verdict.CONFIRMED.value and conf >= PRIMARY_SEND_MIN_CONFIDENCE:
            assigned_route = SendRoute.PRIMARY.value
            reason = "High confidence confirmed deliverable"
        elif verdict == Verdict.ACCEPT_ALL.value or conf >= SECONDARY_SEND_MIN_CONFIDENCE:
            assigned_route = SendRoute.SECONDARY.value
            reason = "Accept-all or moderate confidence: routed to secondary domain to protect primary reputation"
        elif conf >= HOLD_MIN_CONFIDENCE:
            assigned_route = SendRoute.HOLD.value
            reason = "Low confidence: held for manual verification or pattern corroboration"
        else:
            assigned_route = SendRoute.SUPPRESS.value
            reason = "Confidence below safety threshold"

        # If sending, increment domain volume counter
        if assigned_route in (SendRoute.PRIMARY.value, SendRoute.SECONDARY.value):
            domain_send_counts[domain] += 1

        routed_buckets[assigned_route].append({
            **rec,
            "assigned_route": assigned_route,
            "routing_reason": reason
        })

    duration_ms = (time.time() - start_time) * 1000

    plan_summary = {
        "policy_version": policy_version,
        "total_records": len(scored_records),
        "primary_sends": len(routed_buckets[SendRoute.PRIMARY.value]),
        "secondary_sends": len(routed_buckets[SendRoute.SECONDARY.value]),
        "held": len(routed_buckets[SendRoute.HOLD.value]),
        "suppressed": len(routed_buckets[SendRoute.SUPPRESS.value]),
        "unique_domains_targeted": len(domain_send_counts),
        "max_per_domain_daily": max_per_domain_daily
    }

    result = {
        "status": "success",
        "summary": plan_summary,
        "duration_ms": round(duration_ms, 2),
        "routing_plan": routed_buckets
    }

    # Audit log
    input_hash = hashlib.sha256(json.dumps(scored_records, default=str).encode("utf-8")).hexdigest()
    summary_str = json.dumps(plan_summary)
    db.record_audit(
        tool_name="route_for_send",
        input_hash=input_hash,
        output_summary=summary_str,
        duration_ms=duration_ms,
        idempotency_key=idempotency_key
    )

    return result
