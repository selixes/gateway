import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Top Helicone Alternative for 2026: Migrating to Sovereign AI Reliability',
  description: 'With Helicone placed into maintenance mode, engineering teams are transitioning to Selixes for actively maintained, sovereign AI reliability, sub-16ms failover, and agent loop protection.',
  keywords: [
    'Helicone Alternative',
    'Helicone Migration',
    'Helicone Maintenance Mode',
    'Helicone Open Source',
    'Active LLM Gateway 2026',
    'LLM Observability and Failover',
    'Self-Hosted Helicone Alternative'
  ],
  alternates: {
    canonical: 'https://selixes.com/compare/helicone-alternative',
  },
};

const migrationSteps = [
  {
    step: '1',
    title: 'Swap your baseURL to Selixes',
    desc: 'Replace Helicone proxy URL (oai.helicone.ai) with your sovereign Selixes endpoint (http://localhost:4000/v1 or your VPC domain).',
    code: 'baseURL: "http://localhost:4000/v1"',
  },
  {
    step: '2',
    title: 'Replace Helicone-Auth with Selixes Key',
    desc: 'Provide your private Selixes API key instead of the Helicone Authorization header.',
    code: 'apiKey: process.env.SELIXES_API_KEY',
  },
  {
    step: '3',
    title: 'Enable Autonomous Failover & Loop Guard',
    desc: 'Upgrade from passive logging to active protection: add x-selixes-timeout, x-selixes-loop-guard, and x-selixes-max-session-cost.',
    code: 'headers: { "x-selixes-timeout": "5000", "x-selixes-loop-guard": "true" }',
  },
];

export default function HeliconeAlternativePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080809', color: '#f2f2f7', position: 'relative' }}>
      <Navbar />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '7rem 1.5rem 5rem' }}>
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#71717a', marginBottom: '1.5rem' }}>
          <Link href="/" style={{ color: '#9494a8', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <Link href="/compare" style={{ color: '#9494a8', textDecoration: 'none' }}>Compare</Link>
          <span>/</span>
          <span style={{ color: '#cbd5e1' }}>Helicone Alternative</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-block',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#f59e0b',
            background: 'rgba(245,158,11,0.1)',
            padding: '4px 10px',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}>
            MIGRATION & ALTERNATIVE GUIDE
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(32px, 4.5vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#f2f2f7',
            letterSpacing: '-0.02em',
            margin: '0 0 1rem',
          }}>
            The Top Helicone Alternative for 2026:{' '}
            <span style={{
              background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Active Sovereign AI Reliability
            </span>
          </h1>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '17px',
            lineHeight: 1.6,
            color: '#9494a8',
          }}>
            Helicone was a pioneer in LLM observability. However, with the platform placed into maintenance mode in 2026, engineering teams cannot rely on unmaintained infrastructure for mission-critical generative AI and autonomous agent systems.
          </p>
        </div>

        {/* Why Switch Section */}
        <div style={{
          background: 'rgba(11,11,16,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '3rem',
        }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 1rem' }}>
            Why Teams Are Moving from Helicone to Selixes
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e', marginBottom: '6px' }}>Active Development</div>
              <p style={{ fontSize: '13px', color: '#9494a8', margin: 0, lineHeight: 1.6 }}>
                Selixes is under continuous active development with production benchmarks, weekly improvements, and 100% open sovereign Docker deployment.
              </p>
            </div>

            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>Active vs. Passive</div>
              <p style={{ fontSize: '13px', color: '#9494a8', margin: 0, lineHeight: 1.6 }}>
                Helicone was passive (logged that a failure happened). Selixes is active: it intercepts 504 timeouts and 429 limits in ~16ms and automatically saves the transaction.
              </p>
            </div>

            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#a855f7', marginBottom: '6px' }}>Agentic Guardrails</div>
              <p style={{ fontSize: '13px', color: '#9494a8', margin: 0, lineHeight: 1.6 }}>
                Built-in protection against runaway recursive agent tool loops and per-agent session spend containment.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Step Migration Guide */}
        <div style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 1.5rem' }}>
            Migrate from Helicone in Under 3 Minutes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {migrationSteps.map((s) => (
              <div
                key={s.step}
                style={{
                  background: 'rgba(11,11,16,0.7)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}>
                    {s.step}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#f2f2f7' }}>
                    {s.title}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#9494a8', margin: '4px 0 8px 34px', lineHeight: 1.5 }}>
                  {s.desc}
                </p>
                <div style={{ marginLeft: '34px' }}>
                  <code style={{
                    display: 'inline-block',
                    background: '#07070a',
                    border: '1px solid #1a1a24',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    color: '#a5b4fc',
                  }}>
                    {s.code}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 10px' }}>
            Ready to Upgrade Your AI Observability & Reliability?
          </h3>
          <p style={{ color: '#9494a8', fontSize: '15px', margin: '0 auto 1.5rem', maxWidth: '550px' }}>
            Deploy the sovereign Selixes Docker stack in under 5 minutes and protect your applications from provider timeouts and runaway agent bills.
          </p>
          <Link
            href="/docs/getting-started"
            style={{
              background: '#6366f1',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '8px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              display: 'inline-block',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            }}
          >
            Start Migration Guide →
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  );
}
