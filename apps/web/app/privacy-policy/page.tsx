import React from 'react';
import { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Selixes — Sovereign AI Gateway',
  description: 'Read the Selixes Privacy Policy. Learn about our commitment to data sovereignty, self-hosted VPC deployments, and transparent data processing boundaries.',
  keywords: ['Privacy Policy', 'Data Sovereignty', 'GDPR compliance', 'CCPA compliance', 'Selixes'],
  alternates: {
    canonical: 'https://selixes.com/privacy-policy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#f2f2f7', position: 'relative', overflowX: 'hidden' }} className="noise-bg">
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '8rem 1.5rem 6rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>
            Legal Documents
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: '0.25rem 0 0.5rem' }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#8e8e9f', fontSize: '0.9rem' }}>
            Last updated: June 26, 2026
          </p>
        </div>

        <div style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.75', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          <p>
            At Selixes, we prioritize the privacy and security of your operational workflows and developer logs. This Privacy Policy describes how we collect, use, and handle data when you use the Selixes website, our managed Cloud Gateway services, and our self-hosted Community Edition.
          </p>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>1. Data Boundaries: Self-Hosted vs. Cloud</h2>
            <p style={{ marginBottom: '0.75rem' }}>
              We design our products around the principle of absolute sovereignty. How data is handled depends entirely on your deployment model:
            </p>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Community Edition (Self-Hosted):</strong> 100% of your prompt requests, response payloads, keys, and telemetry metrics stay within your own Virtual Private Cloud (VPC) or local machine. No data is ever transmitted to Selixes servers.
              </li>
              <li>
                <strong>Gateway Cloud (Managed):</strong> Upstream model requests are routed through our managed cloud gateway proxy. We transiently process requests in-memory to enable cost caps and circuit breakers. If you enable the Observability features in your dashboard, encrypted prompt and completion payloads are stored at rest for 30 days to power your trace history. If Observability is disabled, payloads are transiently processed and immediately discarded from memory without being written to disk.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>2. Data Collection, Usage, and Retention</h2>
            <p>
              When you create an account on our website, we collect basic account registration details such as name, email address, and organization name. For users of our managed Cloud Gateway, we log system-level operational indicators (such as request volumes, response latencies, and token usage). 
              <br /><br />
              <strong>Retention:</strong> All operational logs and observability traces are retained for a maximum of 30 days, after which they are permanently deleted from our servers.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>3. Sub-Processors</h2>
            <p>
              To deliver the Gateway Cloud service, we utilize the following trusted third-party sub-processors:
            </p>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Railway:</strong> Core compute infrastructure and PostgreSQL database hosting.</li>
              <li><strong>Upstash:</strong> Serverless Redis for quota management and rate limiting.</li>
              <li><strong>Clerk:</strong> Customer identity, authentication, and organization management.</li>
              <li><strong>Stripe:</strong> Payment processing and subscription management.</li>
              <li><strong>Vercel:</strong> Web dashboard hosting and edge delivery.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>4. Cookies and Analytics</h2>
            <p>
              We use strictly necessary cookies to maintain your authenticated session via Clerk. We do not use third-party tracking pixels, marketing cookies, or cross-site tracking technologies. Any website analytics we employ are privacy-first, anonymized, and do not use cookies.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>5. GDPR and CCPA Compliance & DPAs</h2>
            <p>
              Under European General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA), we act as a Data Processor for the operational data sent through our Managed Gateway, and a Data Controller for our customers' account information. 
              <br /><br />
              <strong>Data Processing Agreement (DPA):</strong> We offer a standard, signed DPA for all Gateway Cloud customers handling EU personal data. To execute a DPA, please contact us.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>6. Data Deletion and Export Requests</h2>
            <p>
              You may request a full export or permanent deletion of your account, telemetry data, and observability traces at any time. To exercise your rights under GDPR or CCPA, email us at <a href="mailto:support@selixes.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>support@selixes.com</a>. We guarantee a response and fulfillment of all valid data requests within 30 days.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>7. Contact Us</h2>
            <p>
              If you have any questions regarding this Privacy Policy or data handling procedures, contact us at:
              <br />
              Email: <a href="mailto:support@selixes.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>support@selixes.com</a>
              <br />
              Location: Delhi, India
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
