"""
LeadForge Tool: ingest_failures
Specification: ingest_failures(events) -> summary
Idempotently processes delivery failures, bounces, and spam complaints from ESP webhooks,
auto-updating the central suppression database.
"""

import time
import json
import hashlib
from typing import List, Dict, Any, Optional
from tools.leadforge.core.db import db

def ingest_failures(
    events: List[Dict[str, Any]],
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ingest delivery failure callbacks. Idempotent by event_id.
    Auto-suppresses permanent failures, complaints, and unsubscriptions.
    """
    start_time = time.time()
    
    if idempotency_key:
        cached = db.check_idempotency(idempotency_key)
        if cached:
            return cached

    summary = {
        "total_events": len(events),
        "ingested": 0,
        "duplicates_skipped": 0,
        "suppressions_added": 0
    }

    for ev in events:
        event_id = str(ev.get("event_id") or ev.get("id") or hashlib.md5(json.dumps(ev, sort_keys=True).encode()).hexdigest())
        address = str(ev.get("address") or ev.get("email") or "").strip()
        event_type = str(ev.get("event_type") or ev.get("type") or "unknown").lower()
        reason_code = ev.get("reason_code") or ev.get("code")
        message = ev.get("message") or ev.get("description")

        if not address:
            continue

        success, status_msg = db.ingest_delivery_event(
            event_id=event_id,
            address=address,
            event_type=event_type,
            reason_code=reason_code,
            message=message,
            payload=ev
        )

        if not success:
            summary["duplicates_skipped"] += 1
        else:
            summary["ingested"] += 1
            if status_msg == "ingested_and_suppressed":
                summary["suppressions_added"] += 1

    duration_ms = (time.time() - start_time) * 1000

    result = {
        "status": "success",
        "summary": summary,
        "duration_ms": round(duration_ms, 2)
    }

    # Audit log
    input_hash = hashlib.sha256(json.dumps(events, default=str).encode("utf-8")).hexdigest()
    summary_str = json.dumps(summary)
    db.record_audit(
        tool_name="ingest_failures",
        input_hash=input_hash,
        output_summary=summary_str,
        duration_ms=duration_ms,
        idempotency_key=idempotency_key
    )

    return result
