import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: 'AI Gateway Comparison 2026: Selixes vs LiteLLM, Portkey, Helicone & Cloudflare',
  description: 'An objective architectural comparison of the top AI Gateways and LLM Proxies for 2026. Compare self-hosted sovereignty, failover latency, semantic vector caching, and autonomous agent guardrails.',
  keywords: [
    'AI Gateway Comparison',
    'LiteLLM Alternative',
    'Portkey Alternative',
    'Helicone Alternative',
    'Cloudflare AI Gateway Alternative',
    'Self-Hosted AI Gateway',
    'Open Source LLM Proxy',
    'AI Agent Gateway',
    'LLM Failover Comparison'
  ],
  alternates: {
    canonical: 'https://selixes.com/compare',
  },
};

const comparisonMatrix = [
  {
    category: 'Architecture & Deployment',
    features: [
      {
        name: 'Deployment Model',
        selixes: '100% Self-Hosted in your VPC / Bare Metal',
        litellm: 'Self-Hosted (Docker / Python SDK)',
        portkey: 'SaaS First (Enterprise VPC available)',
        helicone: 'SaaS Proxy (Maintenance Mode)',
        cloudflare: 'SaaS (Cloudflare Edge Network)',
      },
      {
        name: 'Data Sovereignty (Zero Prompt Exposure)',
        selixes: '✅ Guaranteed (Never leaves your VPC)',
        litellm: '✅ Guaranteed (When self-hosted)',
        portkey: '⚠️ SaaS passes data through cloud',
        helicone: '❌ Data routed via Helicone servers',
        cloudflare: '⚠️ Passes through Cloudflare edge',
      },
      {
        name: 'OpenAI SDK Drop-in (2-Line baseURL swap)',
        selixes: '✅ Native (Zero new libraries needed)',
        litellm: '✅ Native',
        portkey: '⚠️ Requires Portkey SDK or headers',
        helicone: '⚠️ Requires header wrapping',
        cloudflare: '✅ BaseURL swap',
      },
    ],
  },
  {
    category: 'Reliability & Failover Performance',
    features: [
      {
        name: 'Circuit-Breaker Switching Latency',
        selixes: '⚡ ~16ms (Median 32ms total cloud swap)',
        litellm: '40ms - 90ms (Python process loop)',
        portkey: '50ms - 120ms (Cloud round-trip)',
        helicone: 'Client-side retry dependent',
        cloudflare: 'Edge retry (~40ms)',
      },
      {
        name: 'Persistent TCP Connection Pools',
        selixes: '✅ Yes (Instant standby socket handover)',
        litellm: '⚠️ Standard HTTP client pools',
        portkey: '✅ Cloud managed pools',
        helicone: '❌ No',
        cloudflare: '✅ Cloudflare edge pools',
      },
      {
        name: 'Local Offline Continuity (Cloud Blackout Recovery)',
        selixes: '✅ Native BYOC Ollama Llama-3 edge sandbox',
        litellm: '⚠️ Requires manual secondary config',
        portkey: '❌ No offline recovery if cloud fails',
        helicone: '❌ No offline recovery',
        cloudflare: '❌ Cloudflare edge only',
      },
    ],
  },
  {
    category: 'Cost Optimization & Caching',
    features: [
      {
        name: 'Semantic Caching Engine',
        selixes: '✅ Vector DB (Pinecone / Qdrant, 64% savings)',
        litellm: '⚠️ Redis exact string & basic cache',
        portkey: '✅ Semantic cache (Enterprise cloud)',
        helicone: '⚠️ Exact string match only',
        cloudflare: '⚠️ Exact URL/hash match',
      },
      {
        name: 'Hardware-Enforced Session Budget Caps',
        selixes: '✅ Via `x-selixes-max-session-cost` header',
        litellm: '⚠️ User/key level budget controls',
        portkey: '✅ Organization budget limits',
        helicone: '⚠️ Read-only cost alerts',
        cloudflare: '❌ Rate limit only, no token caps',
      },
    ],
  },
  {
    category: 'Autonomous Agent Stack Guardrails',
    features: [
      {
        name: 'Runaway Tool-Call Loop Interceptor',
        selixes: '✅ Automated semantic cycle breaker',
        litellm: '❌ No agent loop detection',
        portkey: '⚠️ Manual guardrails configuration',
        helicone: '❌ Observability only',
        cloudflare: '❌ No agent awareness',
      },
      {
        name: 'Mid-Plan Agent Step Failover',
        selixes: '✅ Transparent socket failover mid-run',
        litellm: '⚠️ Requires application-level handler',
        portkey: '✅ Supported via virtual keys',
        helicone: '❌ Fails whole agent run',
        cloudflare: '⚠️ Simple retry only',
      },
      {
        name: 'Agent Framework Support (LangGraph, CrewAI, AutoGen)',
        selixes: '✅ First-class, verified 2-line config',
        litellm: '✅ Supported via OpenAI format',
        portkey: '✅ Supported via integrations',
        helicone: '⚠️ Partial tracing only',
        cloudflare: '⚠️ Basic OpenAI format',
      },
    ],
  },
];

const compareSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "AI Gateway & Proxy Comparison 2026: Selixes vs LiteLLM, Portkey, Helicone",
  "description": "Comprehensive feature-by-feature matrix comparing Selixes with LiteLLM, Portkey, Helicone, and Cloudflare AI Gateway.",
  "publisher": {
    "@type": "Organization",
    "name": "Selixes",
    "url": "https://selixes.com"
  }
};

export default function ComparePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080809', color: '#f2f2f7', position: 'relative' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(compareSchema) }}
      />
      <Navbar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '7rem 1.5rem 5rem' }}>
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#71717a', marginBottom: '1.5rem' }}>
          <Link href="/" style={{ color: '#9494a8', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <span style={{ color: '#cbd5e1' }}>Compare</span>
        </div>

        {/* Hero Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '999px',
            padding: '6px 16px',
            marginBottom: '1rem',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Competitive Intelligence
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(32px, 5vw, 54px)',
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#f2f2f7',
            letterSpacing: '-0.025em',
            margin: '0 0 1.25rem',
          }}>
            Selixes vs. The Field:{' '}
            <span style={{
              background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              2026 AI Gateway Matrix
            </span>
          </h1>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '17px',
            lineHeight: 1.6,
            color: '#9494a8',
            maxWidth: '740px',
            margin: '0 auto',
          }}>
            Choosing the right AI Gateway is foundational to your application's reliability, compliance, and token unit economics. Here is how Selixes compares against LiteLLM, Portkey, Helicone, and Cloudflare AI Gateway.
          </p>
        </div>

        {/* Quick-Nav Cards for Deep-Dive Comparison Pages */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '4rem',
        }}>
          {[
            {
              title: 'Selixes vs. LiteLLM',
              badge: 'Self-Hosted Face-off',
              desc: 'Why teams needing hardware-grade sub-16ms failover, vector semantic caching, and local Ollama continuity choose Selixes over LiteLLM.',
              href: '/compare/selixes-vs-litellm',
              btn: 'Read LiteLLM Deep-Dive →',
            },
            {
              title: 'Selixes vs. Portkey',
              badge: 'Sovereign vs. SaaS',
              desc: 'Compare self-hosted VPC data sovereignty and runaway agent loop protection against managed cloud SaaS subscription fees.',
              href: '/compare/selixes-vs-portkey',
              btn: 'Read Portkey Deep-Dive →',
            },
            {
              title: 'Migrating from Helicone',
              badge: 'Maintenance Mode Alternative',
              desc: 'Helicone has entered maintenance mode. Learn why engineering teams are adopting Selixes as their sovereign, actively developed AI reliability layer.',
              href: '/compare/helicone-alternative',
              btn: 'Read Migration Guide →',
            },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                background: 'rgba(11,11,16,0.7)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backdropFilter: 'blur(20px)',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
              }}
            >
              <div>
                <div style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#818cf8',
                  background: 'rgba(99,102,241,0.1)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  marginBottom: '12px',
                }}>
                  {card.badge}
                </div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 8px' }}>
                  {card.title}
                </h2>
                <p style={{ color: '#9494a8', fontSize: '14px', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                  {card.desc}
                </p>
              </div>

              <Link
                href={card.href}
                style={{
                  color: '#a5b4fc',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {card.btn}
              </Link>
            </div>
          ))}
        </div>

        {/* Full Feature Matrix Table */}
        <div style={{
          background: 'rgba(11,11,16,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          marginBottom: '4rem',
        }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, color: '#f2f2f7', margin: 0 }}>
              Master Feature Comparison Matrix (2026)
            </h2>
            <p style={{ color: '#8e8e9f', fontSize: '13px', margin: '4px 0 0' }}>
              All benchmarks and capabilities verified through public documentation and continuous load-test telemetry.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '16px 20px', color: '#cbd5e1', fontWeight: 700, width: '28%' }}>Feature / Capability</th>
                  <th style={{ padding: '16px 20px', color: '#818cf8', fontWeight: 800, background: 'rgba(99,102,241,0.08)', borderLeft: '1px solid rgba(99,102,241,0.2)', borderRight: '1px solid rgba(99,102,241,0.2)', width: '24%' }}>
                    Selixes (Sovereign)
                  </th>
                  <th style={{ padding: '16px 16px', color: '#9494a8', fontWeight: 600, width: '16%' }}>LiteLLM</th>
                  <th style={{ padding: '16px 16px', color: '#9494a8', fontWeight: 600, width: '16%' }}>Portkey</th>
                  <th style={{ padding: '16px 16px', color: '#9494a8', fontWeight: 600, width: '16%' }}>Cloudflare</th>
                </tr>
              </thead>
              <tbody>
                {comparisonMatrix.map((section, sIdx) => (
                  <React.Fragment key={section.category}>
                    <tr style={{ background: 'rgba(255,255,255,0.015)', borderTop: sIdx > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <td colSpan={5} style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1' }}>
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feat) => (
                      <tr key={feat.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '14px 20px', color: '#e2e8f0', fontWeight: 600 }}>{feat.name}</td>
                        <td style={{ padding: '14px 20px', color: '#f2f2f7', fontWeight: 600, background: 'rgba(99,102,241,0.04)', borderLeft: '1px solid rgba(99,102,241,0.15)', borderRight: '1px solid rgba(99,102,241,0.15)' }}>
                          {feat.selixes}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#9494a8' }}>{feat.litellm}</td>
                        <td style={{ padding: '14px 16px', color: '#9494a8' }}>{feat.portkey}</td>
                        <td style={{ padding: '14px 16px', color: '#9494a8' }}>{feat.cloudflare}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Why Selixes Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(13,13,20,0.8) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: '#f2f2f7', margin: '0 0 1rem' }}>
            Ready to Protect Your Production Agent Stack?
          </h2>
          <p style={{ color: '#9494a8', fontSize: '15px', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
            Deploy Selixes inside your own VPC in under 5 minutes with Docker. Catch outages in 16ms, contain token spend, and never worry about cloud API downtime breaking your autonomous agents.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/docs/getting-started"
              style={{
                background: '#6366f1',
                color: '#fff',
                padding: '12px 26px',
                borderRadius: '8px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: '0 0 20px rgba(99,102,241,0.4)',
              }}
            >
              Get Started with Docker →
            </Link>
            <a
              href="https://github.com/selixes/gateway"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '12px 26px',
                borderRadius: '8px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Star on GitHub
            </a>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
