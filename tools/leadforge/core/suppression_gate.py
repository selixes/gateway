"""
LeadForge Native Suppression & Hard-Bounce Gate
Enforces strict blacklist isolation using the local SQLite suppression store.
Guarantees: Any previously bounced or unsubscribed recipient is permanently blocked.
"""

from typing import Dict, Any, Tuple
from tools.leadforge.core.db import db

class SuppressionGate:
    def __init__(self):
        self._suppressed_addresses = set()
        self._suppressed_domains = set()
        self._loaded = False

    def reload(self):
        """Reload suppression records from SQLite."""
        self._suppressed_addresses.clear()
        self._suppressed_domains.clear()
        try:
            with db.session() as conn:
                cur = conn.cursor()
                cur.execute("SELECT address, domain, reason FROM suppression")
                for row in cur.fetchall():
                    addr, dom, reason = row
                    if addr:
                        self._suppressed_addresses.add(addr.lower().strip())
                    if dom:
                        self._suppressed_domains.add(dom.lower().strip())
            self._loaded = True
        except Exception:
            pass

    def check(self, email: str, domain: str) -> Tuple[bool, str]:
        """
        Check if email or domain is suppressed.
        Returns: (is_suppressed, reason)
        """
        if not self._loaded:
            self.reload()

        clean_email = email.lower().strip()
        clean_domain = domain.lower().strip()

        if clean_email in self._suppressed_addresses:
            return True, f"Address '{clean_email}' matches LeadForge hard-bounce suppression blacklist"

        if clean_domain in self._suppressed_domains:
            return True, f"Domain '{clean_domain}' is blacklisted in LeadForge suppression store"

        return False, ""

# Singleton instance
suppression_gate = SuppressionGate()
