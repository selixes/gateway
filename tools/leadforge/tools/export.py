"""
LeadForge Tool: export_list
Specification: export_list(records, run_id, format) -> file_path
Exports cleaned/scored/routed prospect records to CSV or JSON format.
"""

import os
import csv
import json
import time
from typing import List, Dict, Any, Optional
from tools.leadforge.core.db import db

DEFAULT_EXPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "exports")

def export_list(
    records: List[Dict[str, Any]],
    run_id: str,
    export_format: str = "csv",
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Export processed prospect lists to CSV or JSON format.
    """
    start_time = time.time()
    out_dir = output_dir or DEFAULT_EXPORTS_DIR
    os.makedirs(out_dir, exist_ok=True)

    export_format = export_format.lower().strip()
    filename = f"leadforge_export_{run_id}_{int(time.time())}.{export_format}"
    file_path = os.path.abspath(os.path.join(out_dir, filename))

    if export_format == "json":
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, default=str)
    else:
        # CSV Export
        if not records:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write("")
        else:
            # Flatten dict fields if needed
            flat_records = []
            all_keys = set()
            for r in records:
                flat = {}
                for k, v in r.items():
                    if isinstance(v, (dict, list)):
                        flat[k] = json.dumps(v)
                    else:
                        flat[k] = v
                    all_keys.add(k)
                flat_records.append(flat)

            # Sort key headers deterministically (important fields first)
            priority_headers = ["clean_address", "verdict", "confidence", "assigned_route", "status", "domain", "first_name", "last_name"]
            sorted_headers = [h for h in priority_headers if h in all_keys] + sorted(list(all_keys - set(priority_headers)))

            with open(file_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=sorted_headers)
                writer.writeheader()
                for row in flat_records:
                    writer.writerow(row)

    duration_ms = (time.time() - start_time) * 1000

    result = {
        "status": "success",
        "file_path": file_path,
        "format": export_format,
        "records_exported": len(records),
        "duration_ms": round(duration_ms, 2)
    }

    db.record_audit(
        tool_name="export_list",
        input_hash=str(run_id),
        output_summary=json.dumps({"file_path": file_path, "count": len(records)}),
        duration_ms=duration_ms
    )

    return result
