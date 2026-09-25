"""
LeadForge Unified Tool Server & CLI
Exposes the 7 core tool interfaces specified in LeadForge Implementation Plan v1.0.
Every tool accepts idempotency keys, logs audit trails, and returns structured errors (never raises uncaught).
"""

import sys
import json
import time
import argparse
from typing import List, Dict, Any, Optional

from tools.leadforge.tools.clean import clean_addresses
from tools.leadforge.tools.score import score_addresses
from tools.leadforge.tools.router import route_for_send
from tools.leadforge.tools.failures import ingest_failures
from tools.leadforge.tools.export import export_list
from tools.leadforge.tools.patterns import learn_pattern
from tools.leadforge.tools.repair import repair_address
from tools.leadforge.core.db import db

class LeadForgeAssistantTools:
    """Assistant-facing composable tool server."""

    @staticmethod
    def clean(records: List[Any], idempotency_key: Optional[str] = None) -> Dict[str, Any]:
        return clean_addresses(records, idempotency_key=idempotency_key)

    @staticmethod
    def score(
        records: List[Dict[str, Any]],
        budget_cap_cents: float = 500.0,
        min_confidence: float = 0.70,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        return score_addresses(records, budget_cap_cents=budget_cap_cents, min_confidence=min_confidence, idempotency_key=idempotency_key)

    @staticmethod
    def repair(
        record: Dict[str, Any],
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        domain: Optional[str] = None
    ) -> Dict[str, Any]:
        return repair_address(record, first_name=first_name, last_name=last_name, domain=domain)

    @staticmethod
    def learn(domain: str) -> Dict[str, Any]:
        return learn_pattern(domain)

    @staticmethod
    def failures(events: List[Dict[str, Any]], idempotency_key: Optional[str] = None) -> Dict[str, Any]:
        return ingest_failures(events, idempotency_key=idempotency_key)

    @staticmethod
    def route(
        scored_records: List[Dict[str, Any]],
        policy_version: str = "v1.0",
        max_per_domain_daily: int = 5,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        return route_for_send(scored_records, policy_version=policy_version, max_per_domain_daily=max_per_domain_daily, idempotency_key=idempotency_key)

    @staticmethod
    def export(
        records: List[Dict[str, Any]],
        run_id: str,
        export_format: str = "csv",
        output_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        return export_list(records, run_id=run_id, export_format=export_format, output_dir=output_dir)

    @staticmethod
    def run_full_pipeline(
        raw_records: List[Any],
        run_id: Optional[str] = None,
        budget_cap_cents: float = 500.0,
        min_confidence: float = 0.70,
        policy_version: str = "v1.0",
        max_per_domain_daily: int = 5,
        export_format: str = "csv"
    ) -> Dict[str, Any]:
        """End-to-end composite pipeline: clean -> score -> route -> export."""
        rid = run_id or f"run_{int(time.time())}"
        
        # 1. Clean & Deduplicate
        clean_res = clean_addresses(raw_records, idempotency_key=f"{rid}_clean")
        
        # 2. Score Addresses
        score_res = score_addresses(clean_res["cleaned"], budget_cap_cents=budget_cap_cents, min_confidence=min_confidence, idempotency_key=f"{rid}_score")
        
        # 3. Route for Send
        route_res = route_for_send(score_res["scored"], policy_version=policy_version, max_per_domain_daily=max_per_domain_daily, idempotency_key=f"{rid}_route")
        
        # 4. Export Ready Records
        primary_and_secondary = (
            route_res["routing_plan"]["primary"] +
            route_res["routing_plan"]["secondary"]
        )
        export_res = export_list(primary_and_secondary, run_id=rid, export_format=export_format)

        return {
            "run_id": rid,
            "status": "completed",
            "cleaning_summary": clean_res["counts"],
            "scoring_summary": {
                "spent_cents": score_res["total_spent_cents"],
                "verdict_breakdown": score_res["verdict_breakdown"]
            },
            "routing_summary": route_res["summary"],
            "export": export_res
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LeadForge CLI Tool Runner")
    parser.add_argument("--action", choices=["clean", "score", "route", "pipeline"], default="pipeline")
    parser.add_argument("--input", help="Path to input JSON file with records")
    parser.add_argument("--budget", type=float, default=500.0, help="Budget cap in cents")
    args = parser.parse_args()

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            records = json.load(f)
    else:
        # Default demo records
        records = [
            {"email": "scott@augmentcode.com", "first_name": "Scott", "last_name": "Dietzen"},
            {"email": "mati@elevenlabs.io", "first_name": "Mati", "last_name": "Staniszewski"},
            {"email": "bounce_user@invalid-domain.com", "first_name": "Bad", "last_name": "User"},
            {"email": "info@company.com", "first_name": "General", "last_name": "Info"},
            {"email": "test@mailinator.com", "first_name": "Temp", "last_name": "User"}
        ]

    res = LeadForgeAssistantTools.run_full_pipeline(records, budget_cap_cents=args.budget)
    print(json.dumps(res, indent=2))
