"""
LeadForge Normalization & Syntax Engine
Spec: RFC 5322 syntax validation, unicode sanitization, canonical deduplication, name parsing.
"""

import re
import unicodedata
from typing import Dict, Any, Optional, Tuple
from tools.leadforge.core.constants import (
    DOMAIN_TYPOS,
    DISPOSABLE_DOMAINS,
    GENERIC_ROLE_PREFIXES,
    Verdict
)

# Standard compliant RFC 5322 simplified email regex
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)

# Invisible / non-standard characters cleaner
ZERO_WIDTH_CHARS = re.compile(r"[\u200B-\u200D\uFEFF\u00A0\u200E\u200F\u202A-\u202E]")

def clean_raw_string(text: str) -> str:
    """Strip whitespace, zero-width chars, quotes, and mailto: tags."""
    if not text:
        return ""
    # Normalize unicode
    cleaned = unicodedata.normalize("NFKC", str(text))
    cleaned = ZERO_WIDTH_CHARS.sub("", cleaned).strip()
    # Strip mailto:
    if cleaned.lower().startswith("mailto:"):
        cleaned = cleaned[7:].strip()
    # Strip enclosing quotes or brackets
    cleaned = cleaned.strip("\"'<>[]{}()`,;:")
    return cleaned

def parse_name_from_email(local_part: str) -> Tuple[Optional[str], Optional[str]]:
    """Derive plausible first and last name from local-part if formatted as first.last or first_last."""
    clean_local = re.sub(r"\+.*$", "", local_part) # strip +tags
    clean_local = re.sub(r"\d+", "", clean_local)   # strip trailing numbers
    
    parts = re.split(r"[._\-]", clean_local)
    parts = [p.capitalize() for p in parts if len(p) >= 2]
    
    if len(parts) == 2:
        return parts[0], parts[1]
    elif len(parts) == 1:
        return parts[0], None
    return None, None

def normalize_address(raw_email: str) -> Dict[str, Any]:
    """
    Sanitize, parse, and validate an email address record.
    Returns structured normalization details and initial verdict flags.
    """
    cleaned = clean_raw_string(raw_email).lower()
    
    if not cleaned:
        return {
            "valid": False,
            "raw": raw_email,
            "clean": "",
            "error": "empty_input",
            "verdict": Verdict.PERMANENT_FAIL.value
        }

    # Verify basic email structure
    if "@" not in cleaned:
        return {
            "valid": False,
            "raw": raw_email,
            "clean": cleaned,
            "error": "missing_at_symbol",
            "verdict": Verdict.PERMANENT_FAIL.value
        }

    parts = cleaned.split("@")
    if len(parts) != 2:
        return {
            "valid": False,
            "raw": raw_email,
            "clean": cleaned,
            "error": "multiple_at_symbols",
            "verdict": Verdict.PERMANENT_FAIL.value
        }

    local_part, domain = parts[0], parts[1]

    # Clean domain
    domain = domain.strip(".")
    # Correct known domain typos (e.g., gmial.com -> gmail.com)
    corrected_domain = DOMAIN_TYPOS.get(domain, domain)
    domain_was_corrected = (corrected_domain != domain)
    domain = corrected_domain

    canonical_address = f"{local_part}@{domain}"

    # Length constraints per RFC specifications
    if len(local_part) == 0 or len(local_part) > 64:
        return {
            "valid": False,
            "raw": raw_email,
            "clean": canonical_address,
            "error": "invalid_local_part_length",
            "verdict": Verdict.PERMANENT_FAIL.value
        }

    # RFC 5322: dots cannot be leading, trailing, or consecutive in local-part
    if ".." in local_part or local_part.startswith(".") or local_part.endswith("."):
        return {
            "valid": False,
            "raw": raw_email,
            "clean": canonical_address,
            "error": "invalid_dot_placement",
            "verdict": Verdict.PERMANENT_FAIL.value
        }

    if len(domain) == 0 or len(domain) > 255 or len(canonical_address) > 254:
        return {
            "valid": False,
            "raw": raw_email,
            "clean": canonical_address,
            "error": "invalid_domain_length",
            "verdict": Verdict.PERMANENT_FAIL.value
        }

    # RFC 5322 regex validation
    if not EMAIL_REGEX.match(canonical_address):
        return {
            "valid": False,
            "raw": raw_email,
            "clean": canonical_address,
            "error": "regex_syntax_mismatch",
            "verdict": Verdict.PERMANENT_FAIL.value
        }

    # Check for disposable / temp domains
    is_disposable = domain in DISPOSABLE_DOMAINS

    # Check for generic role accounts (info, sales, support)
    base_local = re.sub(r"\+.*$", "", local_part)
    is_generic = base_local in GENERIC_ROLE_PREFIXES

    first_name, last_name = parse_name_from_email(local_part)

    # Initial tentative verdict classification based on syntax
    initial_verdict = None
    if is_disposable:
        initial_verdict = Verdict.RISKY.value
    elif is_generic:
        initial_verdict = Verdict.GENERIC.value

    return {
        "valid": True,
        "raw": raw_email,
        "clean": canonical_address,
        "local_part": local_part,
        "domain": domain,
        "domain_corrected": domain_was_corrected,
        "is_disposable": is_disposable,
        "is_generic": is_generic,
        "first_name": first_name,
        "last_name": last_name,
        "initial_verdict": initial_verdict
    }
