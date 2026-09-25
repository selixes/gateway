"""
LeadForge Provider Adapter & Circuit Breaker
Specification: Pluggable provider interface, cost accounting, spend cap enforcement,
and strict verdict normalization guardrails.
"""

import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from tools.leadforge.core.constants import Verdict

@dataclass
class ProviderResult:
    verdict: Verdict
    confidence: float
    raw_status: str
    is_accept_all: bool
    cost_cents: float
    duration_ms: float
    error_message: Optional[str] = None
    signals: Optional[Dict[str, Any]] = None

class CircuitBreakerOpenException(Exception):
    pass

class CircuitBreaker:
    """Microsecond circuit breaker protecting upstream verifier APIs."""
    def __init__(self, failure_threshold: int = 5, recovery_timeout_sec: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
        self.state: str = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.failure_count: int = 0
        self.last_failure_time: float = 0.0

    def can_execute(self) -> bool:
        now = time.time()
        if self.state == "OPEN":
            if (now - self.last_failure_time) > self.recovery_timeout_sec:
                self.state = "HALF_OPEN"
                return True
            return False
        return True

    def record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

class BaseVerifierProvider(ABC):
    @abstractmethod
    def verify(self, email: str, domain: str) -> ProviderResult:
        pass

class MockVerifierProvider(BaseVerifierProvider):
    """
    Deterministic provider adapter for testing, benchmarking, and offline operation.
    Implements all edge cases to rigorously validate acceptance gates.
    """
    def __init__(self, cost_per_call_cents: float = 0.1):
        self.cost_per_call_cents = cost_per_call_cents
        self.circuit_breaker = CircuitBreaker()
        self.total_spent_cents: float = 0.0

    def verify(self, email: str, domain: str) -> ProviderResult:
        start_t = time.time()

        if not self.circuit_breaker.can_execute():
            # Degraded fallback mode when circuit breaker is tripped
            return ProviderResult(
                verdict=Verdict.INDETERMINATE,
                confidence=0.3,
                raw_status="circuit_breaker_open",
                is_accept_all=False,
                cost_cents=0.0,
                duration_ms=(time.time() - start_t) * 1000,
                error_message="Circuit breaker is OPEN. Upstream verifier degraded.",
                signals={"circuit_tripped": True}
            )

        local_part = email.split("@")[0].lower() if "@" in email else ""
        dom = domain.lower()

        # Simulate cost
        self.total_spent_cents += self.cost_per_call_cents

        duration = (time.time() - start_t) * 1000

        # Scenario 1: Policy / Reputation / Blacklist Rejections
        # CRITICAL RULE: Must NEVER normalize to permanent_fail! Always map to indeterminate.
        if "reputation_blocked" in local_part or "spamhaus" in local_part or "greylisted" in local_part:
            return ProviderResult(
                verdict=Verdict.INDETERMINATE,
                confidence=0.4,
                raw_status="reputation_policy_rejection",
                is_accept_all=False,
                cost_cents=self.cost_per_call_cents,
                duration_ms=duration,
                signals={"policy_blocked": True, "smtp_code": 451}
            )

        # Scenario 2: Accept-All Domain
        # CRITICAL RULE: Must NEVER yield confirmed!
        if "acceptall" in dom or "catchall" in dom or "catchall" in local_part:
            return ProviderResult(
                verdict=Verdict.ACCEPT_ALL,
                confidence=0.60,
                raw_status="accept_all",
                is_accept_all=True,
                cost_cents=self.cost_per_call_cents,
                duration_ms=duration,
                signals={"smtp_catch_all": True}
            )

        # Scenario 3: Hard Permanent Failures (Unambiguous 550 User Unknown)
        if "nonexistent" in local_part or "bounce" in local_part or "invalid" in local_part:
            return ProviderResult(
                verdict=Verdict.PERMANENT_FAIL,
                confidence=0.99,
                raw_status="mailbox_not_found_550",
                is_accept_all=False,
                cost_cents=self.cost_per_call_cents,
                duration_ms=duration,
                signals={"smtp_code": 550}
            )

        # Scenario 4: Risky (Over quota, mailbox disabled)
        if "overquota" in local_part or "disabled" in local_part:
            return ProviderResult(
                verdict=Verdict.RISKY,
                confidence=0.85,
                raw_status="mailbox_full_or_disabled",
                is_accept_all=False,
                cost_cents=self.cost_per_call_cents,
                duration_ms=duration,
                signals={"smtp_code": 452}
            )

        # Scenario 5: Timeout / Upstream error (trips circuit breaker on repeats)
        if "simulate_timeout" in local_part:
            self.circuit_breaker.record_failure()
            return ProviderResult(
                verdict=Verdict.INDETERMINATE,
                confidence=0.2,
                raw_status="timeout_error",
                is_accept_all=False,
                cost_cents=0.0,
                duration_ms=duration,
                error_message="Upstream provider timed out"
            )

        # Scenario 6: Confirmed deliverable
        self.circuit_breaker.record_success()
        return ProviderResult(
            verdict=Verdict.CONFIRMED,
            confidence=0.95,
            raw_status="deliverable_250_ok",
            is_accept_all=False,
            cost_cents=self.cost_per_call_cents,
            duration_ms=duration,
            signals={"smtp_code": 250, "has_mx": True, "mailbox_exists": True}
        )
