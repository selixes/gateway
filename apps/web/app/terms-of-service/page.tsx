import React from 'react';
import { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | Selixes — Sovereign AI Gateway',
  description: 'Read the Selixes Terms of Service. Learn about acceptable use, self-hosted responsibilities, liability limits, and general compliance conditions.',
  keywords: ['Terms of Service', 'Acceptable Use', 'SaaS Agreement', 'Selixes'],
  alternates: {
    canonical: 'https://selixes.com/terms-of-service',
  },
};

export default function TermsOfServicePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#f2f2f7', position: 'relative', overflowX: 'hidden' }} className="noise-bg">
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '8rem 1.5rem 6rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>
            Legal Documents
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: '0.25rem 0 0.5rem' }}>
            Terms of Service
          </h1>
          <p style={{ color: '#8e8e9f', fontSize: '0.9rem' }}>
            Last updated: June 26, 2026
          </p>
        </div>

        <div style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.75', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          <p>
            Welcome to Selixes. By accessing or using our website, managed gateway endpoints, and self-hosted instances, you agree to comply with and be bound by the following Terms of Service.
          </p>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>1. Acceptance of Terms</h2>
            <p>
              By signing up for an account, deploying the Selixes Docker containers, or sending request traffic through the Selixes Managed Edge Gateway, you signify your agreement to these Terms of Service. If you do not agree to these terms, you must not access or use our services.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>2. Acceptable Use Policy</h2>
            <p style={{ marginBottom: '0.75rem' }}>
              You agree to use our services in compliance with all applicable laws and regulations. You must not:
            </p>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Interfere with or disrupt the integrity or performance of the managed gateway endpoints.</li>
              <li>Attempt to gain unauthorized access to our production systems or networks.</li>
              <li>Route requests containing malicious payloads, virus vectors, or exploit trajectories.</li>
              <li>Use the gateway to bypass upstream LLM provider terms of service or safety policies.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>3. Self-Hosted Responsibility</h2>
            <p>
              When running the self-hosted Community Edition, you assume full responsibility for provisioning, configuring, maintaining, and securing your own compute and database infrastructure. Selixes is not liable for data loss, resource leaks, or security compromises arising within your privately managed environments.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>4. Billing, Refunds, and Disputes</h2>
            <p>
              The Gateway Cloud operates on a metered usage basis. You are responsible for all charges incurred by API keys associated with your organization. 
              <br /><br />
              <strong>Refunds:</strong> We do not offer refunds for metered usage. However, in the event of a documented platform failure or infrastructure outage on our end that impacts your production traffic, we may issue service credits at our sole discretion. Please contact support within 7 days of the incident to dispute a charge or request a service credit.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>5. Disclaimer of Warranties and Limitation of Liability</h2>
            <p>
              Our services are provided on an "AS IS" and "AS AVAILABLE" basis. Selixes makes no warranties, express or implied, regarding the uptime, correctness, or reliability of upstream provider transitions. 
              <br /><br />
              <strong>Aggregate Liability Cap:</strong> Under no circumstances shall Selixes be liable for any indirect, incidental, special, consequential, or punitive damages. Selixes's total aggregate liability arising out of or related to these Terms shall not exceed the total fees actually paid by you to Selixes in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>6. Termination and Data Export</h2>
            <p>
              <strong>Termination for Cause:</strong> We reserve the right to immediately suspend or terminate your access to our managed Cloud Gateway without notice if you clearly violate this Acceptable Use Policy, abuse the system, or fail to pay outstanding invoices.
              <br /><br />
              <strong>Termination without Cause:</strong> For customers on paid tiers, we will provide a minimum of thirty (30) days' written notice prior to terminating your account without cause.
              <br /><br />
              <strong>Data Export:</strong> Upon termination of your account, you will have a thirty (30) day window to export your configuration, API keys, and observability logs before they are permanently deleted from our systems.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>7. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of New Delhi, India. 
              <br /><br />
              <strong>Dispute Resolution:</strong> Any disputes arising out of or in connection with these Terms shall be resolved by good-faith negotiation. If the dispute cannot be resolved informally, it shall be submitted to binding arbitration in New Delhi, India, under the Indian Arbitration and Conciliation Act.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
