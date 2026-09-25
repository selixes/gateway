"""
LeadForge Database & State Storage
Implementation: Locked 9-Table Schema (SQLite with WAL mode + Enforced Foreign Keys)
"""

import os
import sqlite3
import json
import time
from typing import Optional, List, Dict, Any, Tuple
from contextlib import contextmanager

PROD_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "leadforge.db")
DEFAULT_DB_PATH = os.environ.get("LEADFORGE_DB_PATH") or PROD_DB_PATH

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. ORGANISATIONS (Target accounts & domains)
CREATE TABLE IF NOT EXISTS organisations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    industry TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_org_domain ON organisations(domain);

-- 2. RECORDS (Prospect contact records)
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER,
    raw_address TEXT NOT NULL,
    clean_address TEXT NOT NULL,
    local_part TEXT NOT NULL,
    domain TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(org_id) REFERENCES organisations(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_records_clean_address ON records(clean_address);
CREATE INDEX IF NOT EXISTS idx_records_domain ON records(domain);

-- 3. FORMAT PROFILES (Learned address pattern distributions per domain)
CREATE TABLE IF NOT EXISTS format_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL,
    dominant_format TEXT NOT NULL,
    sample_count INTEGER DEFAULT 1,
    confidence REAL DEFAULT 0.5,
    formats_json TEXT DEFAULT '{}',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_format_profiles_domain ON format_profiles(domain);

-- 4. VERDICTS (Scoring results per evaluated record)
CREATE TABLE IF NOT EXISTS verdicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER,
    address TEXT NOT NULL,
    verdict TEXT NOT NULL,
    confidence REAL NOT NULL,
    signals_json TEXT DEFAULT '{}',
    provider TEXT NOT NULL,
    cost_cents REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(record_id) REFERENCES records(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_verdicts_address ON verdicts(address);
CREATE INDEX IF NOT EXISTS idx_verdicts_verdict ON verdicts(verdict);

-- 5. SUPPRESSION (Hard bounces, spam complaints, unsubscribes, GDPR blocks)
CREATE TABLE IF NOT EXISTS suppression (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT UNIQUE,
    domain TEXT,
    reason TEXT NOT NULL,
    source_event_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_suppression_address ON suppression(address);
CREATE INDEX IF NOT EXISTS idx_suppression_domain ON suppression(domain);

-- 6. DELIVERY EVENTS (Inbound webhook / ESP callbacks)
CREATE TABLE IF NOT EXISTS delivery_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    event_type TEXT NOT NULL,
    reason_code TEXT,
    message TEXT,
    payload_json TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_delivery_events_event_id ON delivery_events(event_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_address ON delivery_events(address);

-- 7. RUNS (Batch execution jobs & cost tracking)
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT UNIQUE NOT NULL,
    run_type TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    records_count INTEGER DEFAULT 0,
    spend_cents REAL DEFAULT 0.0,
    metadata_json TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_runs_run_id ON runs(run_id);

-- 8. AUDIT LOG (Cross-cutting execution traceability & idempotency)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL,
    idempotency_key TEXT,
    input_hash TEXT NOT NULL,
    output_summary TEXT,
    duration_ms REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_idempotency ON audit_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_log(tool_name);

-- 9. ERASURE REQUESTS (GDPR / Data subject erasure requests)
CREATE TABLE IF NOT EXISTS erasure_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    domain TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    processed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_erasure_address ON erasure_requests(address);
"""

class DatabaseManager:
    def __init__(self, db_path: Optional[str] = None):
        target = db_path or os.environ.get("LEADFORGE_DB_PATH") or PROD_DB_PATH
        # Safety guard: if LEADFORGE_TEST_MODE is set, NEVER allow connecting to PROD_DB_PATH
        if os.environ.get("LEADFORGE_TEST_MODE") == "1":
            if os.path.abspath(target) == os.path.abspath(PROD_DB_PATH):
                raise RuntimeError(
                    f"CRITICAL SAFETY VIOLATION: LEADFORGE_TEST_MODE=1 is active, but DatabaseManager "
                    f"attempted to initialize against production database: {target}"
                )
        self.db_path = target
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_schema()

    def switch_db(self, new_db_path: str):
        """Safely switch database path at runtime and reinitialize schema."""
        if os.environ.get("LEADFORGE_TEST_MODE") == "1":
            if os.path.abspath(new_db_path) == os.path.abspath(PROD_DB_PATH):
                raise RuntimeError(
                    f"CRITICAL SAFETY VIOLATION: LEADFORGE_TEST_MODE=1 is active, but switch_db "
                    f"attempted to point to production database: {new_db_path}"
                )
        self.db_path = new_db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_schema()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    @contextmanager
    def session(self):
        conn = self.get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_schema(self):
        with self.session() as conn:
            conn.executescript(SCHEMA_SQL)

    # ---------------------------------------------------------
    # SUPPRESSION STORE (Fast O(1) checks)
    # ---------------------------------------------------------
    def is_suppressed(self, address: str, domain: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        addr = address.lower().strip()
        dom = (domain or addr.split("@")[-1]).lower().strip() if "@" in addr else ""
        with self.session() as conn:
            cursor = conn.cursor()
            # 1. Exact address check
            cursor.execute("SELECT reason FROM suppression WHERE address = ? LIMIT 1", (addr,))
            row = cursor.fetchone()
            if row:
                return True, f"Address suppressed: {row['reason']}"
            # 2. Entire domain suppression check
            if dom:
                cursor.execute("SELECT reason FROM suppression WHERE domain = ? AND address IS NULL LIMIT 1", (dom,))
                row = cursor.fetchone()
                if row:
                    return True, f"Domain suppressed: {row['reason']}"
        return False, None

    def add_suppression(
        self,
        address: Optional[str],
        domain: Optional[str],
        reason: str,
        source_event_id: Optional[str] = None,
        conn: Optional[sqlite3.Connection] = None
    ) -> bool:
        addr = address.lower().strip() if address else None
        dom = domain.lower().strip() if domain else (addr.split("@")[-1] if addr and "@" in addr else None)
        
        def _execute(c):
            c.execute(
                "INSERT OR REPLACE INTO suppression (address, domain, reason, source_event_id) VALUES (?, ?, ?, ?)",
                (addr, dom, reason, source_event_id)
            )

        if conn is not None:
            _execute(conn)
            return True
        else:
            with self.session() as s_conn:
                _execute(s_conn)
                return True

    # ---------------------------------------------------------
    # AUDIT LOGGING & IDEMPOTENCY
    # ---------------------------------------------------------
    def record_audit(self, tool_name: str, input_hash: str, output_summary: str, duration_ms: float, idempotency_key: Optional[str] = None):
        with self.session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO audit_log (tool_name, idempotency_key, input_hash, output_summary, duration_ms)
                   VALUES (?, ?, ?, ?, ?)""",
                (tool_name, idempotency_key, input_hash, output_summary, duration_ms)
            )

    def check_idempotency(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        if not idempotency_key:
            return None
        with self.session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT output_summary, created_at FROM audit_log WHERE idempotency_key = ? ORDER BY id DESC LIMIT 1", (idempotency_key,))
            row = cursor.fetchone()
            if row:
                try:
                    return json.loads(row["output_summary"])
                except Exception:
                    return {"result": row["output_summary"], "cached": True}
        return None

    # ---------------------------------------------------------
    # DELIVERY EVENTS (Idempotent by event_id)
    # ---------------------------------------------------------
    def ingest_delivery_event(self, event_id: str, address: str, event_type: str, reason_code: Optional[str] = None, message: Optional[str] = None, payload: Optional[Dict] = None) -> Tuple[bool, str]:
        addr = address.lower().strip()
        payload_str = json.dumps(payload or {})
        with self.session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM delivery_events WHERE event_id = ?", (event_id,))
            if cursor.fetchone():
                return False, "duplicate_event_ignored"
            
            cursor.execute(
                """INSERT INTO delivery_events (event_id, address, event_type, reason_code, message, payload_json)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (event_id, addr, event_type, reason_code, message, payload_str)
            )

            # Auto-suppress on permanent failures or complaints
            if event_type in ("permanent_fail", "hard_bounce", "bounce", "complaint", "spam_report", "unsubscribe"):
                reason = f"{event_type}: {reason_code or message or 'ESP callback'}"
                self.add_suppression(addr, addr.split("@")[-1], reason, source_event_id=event_id, conn=conn)
                return True, "ingested_and_suppressed"

            return True, "ingested"

# Default shared singleton instance
db = DatabaseManager()
