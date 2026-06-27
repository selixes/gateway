// <!-- DRAFT: Requires legal review before production launch -->
import React from 'react';
import { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: 'Security Registry | Selixes — Sovereign AI Gateway',
  description: 'Read the Selixes Security Registry. Learn about our encryption standard protocols, client access keys, and VPC deployment boundaries.',
  keywords: ['Security Registry', 'Encryption in Transit', 'VPC Data Boundary', 'Selixes'],
  alternates: {
    canonical: 'https://selixes.com/security-registry',
  },
};

export default function SecurityRegistryPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#f2f2f7', position: 'relative', overflowX: 'hidden' }} className="noise-bg">
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '8rem 1.5rem 6rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>
            Legal Documents
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: '0.25rem 0 0.5rem' }}>
            Security Registry
          </h1>
          <p style={{ color: '#8e8e9f', fontSize: '0.9rem' }}>
            Last updated: June 18, 2026
          </p>
        </div>

        <div style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.75', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          <p>
            At Selixes, security and transparency are central to our design. This Security Registry provides verifiable facts regarding how data is encrypted, processed, and isolated when utilizing different Selixes deployment options.
          </p>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>1. Encryption in Transit</h2>
            <p>
              All network traffic routed through our marketing endpoints and managed Cloud Gateway is encrypted in transit using industry-standard Transport Layer Security (TLS 1.3). This prevents interception of payloads, credentials, and telemetry streams as they traverse the public internet.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>2. Data Isolation and Storage Boundaries</h2>
            <p style={{ marginBottom: '0.75rem' }}>
              We offer different levels of logical and physical data isolation depending on the plan you select:
            </p>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Self-Hosted VPC Boundary:</strong> The self-hosted Community Edition is completely containerized. All prompt keys, weights, and logs reside inside your privately controlled virtual private cloud (VPC). Under this deployment, no keys or data payloads are ever transmitted to or stored by Selixes.
              </li>
              <li>
                <strong>Transient Gateway Cloud Transit:</strong> The managed edge gateway processes API payloads to evaluate active limits (such as session cost caps, timeout controls, and PII filters). Prompt and response payloads are parsed in transient memory only and are not stored in any persistent data volume.
              </li>
              <li>
                <strong>Dedicated Private Deployment:</strong> For custom enterprise configurations, Selixes instances run as a dedicated private deployment (single-tenant isolation scoped per contract) with private network access rules.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>3. Access Controls</h2>
            <p>
              API keys used to authenticate with the Selixes gateway are logically separated. If you are using our managed Cloud Gateway, your API keys are encrypted at rest using standard AES-256 encryption. We support role-based dashboard access, credential rotations, and immediate key revocation.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>4. Auditable Telemetry</h2>
            <p>
              Selixes provides complete visibility into your LLM request histories. You can review active provider routing pathways, circuit breaker events, and latency checks directly in the observability logs. For self-hosted instances, logs are stored within your own local postgres/redis infrastructure, providing you with full data access and retention control.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
