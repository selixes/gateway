"""
Generate deterministic 500-record, 300-domain, and 50-pattern test fixtures
for LeadForge automated acceptance testing.
"""

import os
import json
import random

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
os.makedirs(FIXTURES_DIR, exist_ok=True)

def generate_fixtures():
    # ---------------------------------------------------------
    # 1. 500-RECORD TEST FIXTURE (Syntax, Unicode, Typos, Duplicates, Generic)
    # ---------------------------------------------------------
    records_500 = []
    
    # Clean valid records (300 records)
    for i in range(1, 301):
        fn = f"user{i}"
        ln = f"test{i}"
        records_500.append({
            "raw": f"{fn}.{ln}@company{i % 25}.com",
            "first_name": fn.capitalize(),
            "last_name": ln.capitalize(),
            "expected_valid": True
        })

    # Dirty / Unicode / Mailto records (50 records)
    dirty_prefixes = [" mailto:clean.", " \"quoted.", " <bracket.", "\u200Bzero_width."]
    for i in range(1, 51):
        pfx = dirty_prefixes[i % len(dirty_prefixes)]
        records_500.append({
            "raw": f"{pfx}person{i}@business.org>",
            "first_name": f"Person{i}",
            "last_name": "Org",
            "expected_valid": True
        })

    # Typos (20 records)
    for i in range(1, 21):
        records_500.append({
            "raw": f"user{i}@gmial.com",
            "expected_valid": True,
            "expected_domain": "gmail.com"
        })

    # Invalid syntax records (50 records)
    invalid_cases = [
        "missing_at_symbol.com", "user@@domain.com", "user@domain",
        "@missinglocal.com", "user@.leadingdot.com", "user@toolong" + "x" * 260 + ".com",
        "spaces in address@domain.com", ""
    ]
    for i in range(1, 51):
        bad_sample = invalid_cases[i % len(invalid_cases)]
        records_500.append({
            "raw": bad_sample,
            "expected_valid": False
        })

    # Generic role accounts (40 records)
    roles = ["info", "sales", "support", "admin", "contact", "billing", "marketing", "hello"]
    for i in range(1, 41):
        role = roles[i % len(roles)]
        records_500.append({
            "raw": f"{role}@enterprise{i}.com",
            "expected_valid": True,
            "expected_generic": True
        })

    # Disposable domains (20 records)
    disp_domains = ["mailinator.com", "tempmail.com", "guerrillamail.com", "trashmail.com"]
    for i in range(1, 21):
        dom = disp_domains[i % len(disp_domains)]
        records_500.append({
            "raw": f"tempuser{i}@{dom}",
            "expected_valid": True,
            "expected_disposable": True
        })

    # Duplicates (20 records)
    for i in range(1, 21):
        records_500.append({
            "raw": f"user{i}.test{i}@company{i % 25}.com",
            "is_duplicate_of": f"user{i}.test{i}@company{i % 25}.com"
        })

    records_file = os.path.join(FIXTURES_DIR, "records_500.json")
    with open(records_file, "w", encoding="utf-8") as f:
        json.dump(records_500, f, indent=2)

    # ---------------------------------------------------------
    # 2. 300-DOMAIN TEST FIXTURE (Platform Classifications)
    # ---------------------------------------------------------
    domains_300 = []
    # Dominant-A Google Workspace (100)
    for i in range(1, 101):
        domains_300.append({
            "domain": f"google-client-{i}.com",
            "mx": [f"aspmx.l.google.com", f"alt1.aspmx.l.google.com"],
            "expected_platform": "dominant_a"
        })
    # Dominant-B Microsoft 365 (100)
    for i in range(1, 101):
        domains_300.append({
            "domain": f"msft-corp-{i}.com",
            "mx": [f"msft-corp-{i}.mail.protection.outlook.com"],
            "expected_platform": "dominant_b"
        })
    # Security Gateways (50)
    gw_patterns = ["pphosted.com", "mimecast.com", "barracudanetworks.com", "iphmx.com"]
    for i in range(1, 51):
        gw = gw_patterns[i % len(gw_patterns)]
        domains_300.append({
            "domain": f"secure-bank-{i}.com",
            "mx": [f"mx1.{gw}"],
            "expected_platform": "security_gateway"
        })
    # Self-Managed (50)
    for i in range(1, 51):
        domains_300.append({
            "domain": f"private-host-{i}.de",
            "mx": [f"mail.private-host-{i}.de"],
            "expected_platform": "self_managed"
        })

    domains_file = os.path.join(FIXTURES_DIR, "domains_300.json")
    with open(domains_file, "w", encoding="utf-8") as f:
        json.dump(domains_300, f, indent=2)

    print(f"Generated {len(records_500)} records in {records_file}")
    print(f"Generated {len(domains_300)} domains in {domains_file}")

if __name__ == "__main__":
    generate_fixtures()
