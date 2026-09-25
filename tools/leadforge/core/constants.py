"""
LeadForge Core Constants & Locked Verdict Vocabulary
Specification: Version 1.0 (LeadForge Full Implementation Plan)
"""

from enum import Enum
from typing import Set, Dict, List

# -------------------------------------------------------------
# 1. LOCKED VERDICT VOCABULARY (Day 0 Lock)
# -------------------------------------------------------------
class Verdict(str, Enum):
    CONFIRMED = "confirmed"              # Deliverable, non-accept-all domain
    PERMANENT_FAIL = "permanent_fail"    # Unambiguous permanent failure (e.g., 550 User unknown)
    ACCEPT_ALL = "accept_all"            # Domain accepts all recipients; mailbox unconfirmable
    RISKY = "risky"                      # Over quota, disabled, disposable provider, spam trap match
    GENERIC = "generic"                  # Deliverable, but shared/functional role mailbox
    INDETERMINATE = "indeterminate"      # Check blocked, throttled, timeout, or policy/reputation reject

# -------------------------------------------------------------
# 2. MAIL PLATFORM CLASSIFICATION
# -------------------------------------------------------------
class MailPlatform(str, Enum):
    DOMINANT_A = "dominant_a"            # Google Workspace / Gmail
    DOMINANT_B = "dominant_b"            # Microsoft 365 / Exchange Online
    SECURITY_GATEWAY = "security_gateway"# Mimecast, Proofpoint, Barracuda, Cisco IronPort, etc.
    SELF_MANAGED = "self_managed"        # Postfix, Exim, cPanel, private mail servers
    UNKNOWN = "unknown"                  # Unresolved or unclassified MX

# -------------------------------------------------------------
# 3. SEND ROUTING POLICIES
# -------------------------------------------------------------
class SendRoute(str, Enum):
    PRIMARY = "primary"                  # Send via primary warmed domain (highest reputation)
    SECONDARY = "secondary"              # Send via secondary/catch-all warmed domain
    HOLD = "hold"                        # Hold for manual review or further corroboration
    SUPPRESS = "suppress"                # Never send; suppressed to protect sender reputation

# -------------------------------------------------------------
# 4. FUNCTIONAL / GENERIC ROLE MAILBOX PREFIXES
# -------------------------------------------------------------
GENERIC_ROLE_PREFIXES: Set[str] = {
    "info", "sales", "support", "admin", "contact", "hello", "team", "help",
    "billing", "marketing", "jobs", "careers", "press", "media", "office",
    "enquiries", "inquiries", "general", "compliance", "legal", "security",
    "privacy", "postmaster", "webmaster", "hostmaster", "abuse", "noc",
    "operations", "hr", "accounting", "finance", "feedback"
}

# -------------------------------------------------------------
# 5. KNOWN DISPOSABLE & TEMPORARY EMAIL DOMAINS
# -------------------------------------------------------------
DISPOSABLE_DOMAINS: Set[str] = {
    "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
    "sharklasers.com", "throwawaymail.com", "trashmail.com", "getairmail.com",
    "yopmail.com", "dispostable.com", "fakeinbox.com", "temp-mail.org",
    "generator.email", "tempail.com", "burnermail.io", "maildrop.cc"
}

# -------------------------------------------------------------
# 6. COMMON DOMAIN TYPO CORRECTIONS
# -------------------------------------------------------------
DOMAIN_TYPOS: Dict[str, str] = {
    "gmial.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "hotmial.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "outloo.com": "outlook.com",
    "yaho.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "icldou.com": "icloud.com",
    "protonmial.com": "protonmail.com"
}

# -------------------------------------------------------------
# 7. SECURITY GATEWAY MX SIGNATURE PATTERNS
# -------------------------------------------------------------
SECURITY_GATEWAY_PATTERNS: List[str] = [
    "pphosted.com",      # Proofpoint
    "mimecast.com",      # Mimecast
    "barracudanetworks", # Barracuda
    "barracuda.com",     # Barracuda
    "iphmx.com",         # Cisco IronPort
    "symantec.com",      # Symantec/Broadcom
    "messagelabs.com",   # Symantec MessageLabs
    "trendmicro.com",    # Trend Micro
    "sophos.com",        # Sophos
    "spamexperts.com",   # SpamExperts
    "hornetsecurity",    # Hornetsecurity
    "fireeye.com",       # FireEye/Trellix
    "cisco.com"          # Cisco Email Security
]

# -------------------------------------------------------------
# 8. DEFAULT CONFIDENCE SCORING WEIGHTS
# -------------------------------------------------------------
DEFAULT_SCORING_WEIGHTS = {
    "mx_valid": 0.20,
    "smtp_deliverable": 0.40,
    "pattern_match": 0.15,
    "domain_age_pass": 0.10,
    "non_disposable": 0.10,
    "syntax_valid": 0.05
}

# Routing confidence thresholds
PRIMARY_SEND_MIN_CONFIDENCE = 0.85
SECONDARY_SEND_MIN_CONFIDENCE = 0.60
HOLD_MIN_CONFIDENCE = 0.40
