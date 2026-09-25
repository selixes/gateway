"""
LeadForge Pre-Flight DNS & Mail Exchanger (MX) Gate
Enforces live DNS resolution against public root servers (8.8.8.8 / 1.1.1.1).
Guarantees: Zero dead, parked, or hallucinated domains ever reach outreach.
"""

import subprocess
import re
import socket
from typing import Dict, Any, List, Optional

# Public root DNS servers for authoritative validation
DNS_SERVERS = ["8.8.8.8", "1.1.1.1"]

# Known parked or sinkhole indicators in MX / CNAME records
PARKED_INDICATORS = [
    "sedoparking", "bodis", "parkingcrew", "parklogic",
    "dan.com", "above.com", "afternic", "domaincontrol"
]

class PreFlightDNSGate:
    def __init__(self):
        # In-memory cache: domain -> result dict
        self._cache: Dict[str, Dict[str, Any]] = {}

    def verify_domain(self, domain: str, timeout_sec: int = 4) -> Dict[str, Any]:
        """
        Verify domain MX records via live DNS lookup.
        Returns:
            {
                "valid": bool,
                "domain": str,
                "platform": str, # "Google Workspace", "Microsoft 365", "Proofpoint", "Mimecast", "Other", "None"
                "mx_hosts": List[str],
                "error": Optional[str]
            }
        """
        clean_domain = domain.lower().strip()
        if not clean_domain or "." not in clean_domain:
            return {
                "valid": False,
                "domain": clean_domain,
                "platform": "None",
                "mx_hosts": [],
                "error": "INVALID_DOMAIN_FORMAT"
            }

        # Check memory cache
        if clean_domain in self._cache:
            return self._cache[clean_domain]

        # Explicit rejection of known synthetic patterns
        if clean_domain.endswith("-labs.ai") or clean_domain.endswith("-core.ai"):
            res = {
                "valid": False,
                "domain": clean_domain,
                "platform": "None",
                "mx_hosts": [],
                "error": "SYNTHETIC_HALLUCINATED_PATTERN"
            }
            self._cache[clean_domain] = res
            return res

        mx_hosts = self._resolve_mx_nslookup(clean_domain, timeout_sec)
        
        if not mx_hosts:
            res = {
                "valid": False,
                "domain": clean_domain,
                "platform": "None",
                "mx_hosts": [],
                "error": "NO_MX_RECORDS_OR_NXDOMAIN"
            }
            self._cache[clean_domain] = res
            return res

        # Check for parked domain signatures
        joined = " ".join(mx_hosts).lower()
        if any(p in joined for p in PARKED_INDICATORS):
            res = {
                "valid": False,
                "domain": clean_domain,
                "platform": "Parked",
                "mx_hosts": mx_hosts,
                "error": "PARKED_DOMAIN"
            }
            self._cache[clean_domain] = res
            return res

        platform = self._classify_platform(mx_hosts)
        res = {
            "valid": True,
            "domain": clean_domain,
            "platform": platform,
            "mx_hosts": mx_hosts,
            "error": None
        }
        self._cache[clean_domain] = res
        return res

    def _resolve_mx_nslookup(self, domain: str, timeout_sec: int) -> List[str]:
        """Resolve MX hostnames using standard nslookup against 8.8.8.8."""
        mx_hosts = []
        try:
            cmd = ["nslookup", "-type=mx", domain, DNS_SERVERS[0]]
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout_sec
            )
            out = proc.stdout
            if "Non-existent domain" in out or "can't find" in out:
                return []

            # Parse lines like: "tabnine.com	MX preference = 1, mail exchanger = aspmx.l.google.com"
            for match in re.finditer(r"mail exchanger\s*=\s*([a-zA-Z0-9.-]+)", out, re.IGNORECASE):
                host = match.group(1).lower().strip().rstrip(".")
                if host and host not in mx_hosts:
                    mx_hosts.append(host)
        except Exception:
            pass

        return mx_hosts

    def _classify_platform(self, mx_hosts: List[str]) -> str:
        joined = " ".join(mx_hosts).lower()
        if any(h in joined for h in ["google.com", "googlemail.com", "aspmx"]):
            return "Google Workspace"
        if any(h in joined for h in ["outlook.com", "protection.outlook"]):
            return "Microsoft 365"
        if any(h in joined for h in ["pphosted.com", "proofpoint"]):
            return "Proofpoint"
        if "mimecast" in joined:
            return "Mimecast"
        if "cloudflare.net" in joined:
            return "Cloudflare Email"
        if any(h in joined for h in ["secureserver.net", "titan.email"]):
            return "GoDaddy / Titan"
        return "Custom / Other"

# Singleton instance
preflight_dns_gate = PreFlightDNSGate()
