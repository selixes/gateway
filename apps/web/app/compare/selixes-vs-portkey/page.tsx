import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Selixes vs. Portkey: Sovereign Self-Hosted vs. SaaS AI Gateway (2026)',
  description: 'Compare Selixes and Portkey. Discover why privacy-first engineering teams and enterprise agent developers choose sovereign self-hosted Selixes over managed SaaS AI proxies.',
  keywords: [
    'Portkey Alternative',
    'Selixes vs Portkey',
    'Self-Hosted Portkey',
    'Portkey Open Source Alternative',
    'Sovereign AI Control Plane',
    'Enterprise AI Gateway',
    'Zero SaaS AI Proxy'
  ],
  alternates: {
    canonical: 'https://selixes.com/compare/selixes-vs-portkey',
  },
};

const headToHead = [
  {
    feature: 'Data Plane Privacy',
    selixes: '100% Sovereign (Runs inside your private VPC; zero prompts leave)',
    portkey: 'SaaS Proxy (Data passes through Portkey cloud servers)',
    verdict: 'Selixes eliminates 3rd-party SaaS compliance risk',
  },
  {
    feature: 'Pricing Model',
    selixes: 'Free & Open Sovereign Core (Zero SaaS markups or seat tiers)',
    portkey: 'SaaS subscription tiers + per-request pricing',
    verdict: 'Selixes has no SaaS tax as token volumes scale',
  },
  {
    feature: 'Failover Switching Latency',
    selixes: '~16ms circuit-breaker switching (In-VPC persistent sockets)',
    portkey: '50ms - 120ms (Cloud proxy transit overhead)',
    verdict: 'Selixes is significantly faster at the edge',
  },
  {
    feature: 'Autonomous Agent Loop Interceptor',
    selixes: 'Native recursive tool-call anomaly detection',
    portkey: 'Requires custom rule-based guardrail configuration',
    verdict: 'Selixes protects multi-agent stacks out of the box',
  },
  {
    feature: 'Offline Edge Recovery (Ollama)',
    selixes: 'Automatic failover to local Llama-3 sandbox during cloud blackout',
    portkey: 'No local continuity (Relies on cloud API reachability)',
    verdict: 'Selixes keeps operating during global cloud outages',
  },
  {
    feature: 'Drop-in Setup',
    selixes: '2 lines of code (Standard OpenAI SDK baseURL swap)',
    portkey: '2 lines (Portkey SDK or headers)',
    verdict: 'Tie',
  },
];

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Selixes vs. Portkey: Architectural Comparison for Enterprise AI Infrastructure",
  "description": "Comprehensive comparison between sovereign self-hosted Selixes and managed SaaS Portkey for enterprise teams building agent stacks.",
  "author": {
    "@type": "Organization",
    "name": "Selixes Engineering"
  }
};

export default function SelixesVsPortkeyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080809', color: '#f2f2f7', position: 'relative' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Navbar />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '7rem 1.5rem 5rem' }}>
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#71717a', marginBottom: '1.5rem' }}>
          <Link href="/" style={{ color: '#9494a8', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <Link href="/compare" style={{ color: '#9494a8', textDecoration: 'none' }}>Compare</Link>
          <span>/</span>
          <span style={{ color: '#cbd5e1' }}>Selixes vs. Portkey</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-block',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#818cf8',
            background: 'rgba(99,102,241,0.1)',
            padding: '4px 10px',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}>
            SOVEREIGN VS. SAAS
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
            Selixes vs. Portkey:{' '}
            <span style={{
              background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Sovereignty vs. Managed SaaS
            </span>
          </h1>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '17px',
            lineHeight: 1.6,
            color: '#9494a8',
          }}>
            Portkey is a feature-rich managed SaaS control plane. However, for organizations dealing with sensitive PII, strict compliance (SOC2, HIPAA, GDPR), or high-volume autonomous agent workflows, sending prompts through a 3rd-party SaaS proxy introduces critical compliance barriers and unnecessary costs.
          </p>
        </div>

        {/* Head-to-Head Summary Table */}
        <div style={{
          background: 'rgba(11,11,16,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '3.5rem',
        }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: 700, margin: 0, color: '#f2f2f7' }}>
              Direct Comparison: Selixes vs. Portkey
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '14px 18px', color: '#cbd5e1', textAlign: 'left', width: '25%' }}>Capability</th>
                  <th style={{ padding: '14px 18px', color: '#818cf8', textAlign: 'left', width: '38%', background: 'rgba(99,102,241,0.06)' }}>Selixes (Sovereign)</th>
                  <th style={{ padding: '14px 18px', color: '#9494a8', textAlign: 'left', width: '37%' }}>Portkey (SaaS)</th>
                </tr>
              </thead>
              <tbody>
                {headToHead.map((row) => (
                  <tr key={row.feature} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '14px 18px', color: '#e2e8f0', fontWeight: 600 }}>{row.feature}</td>
                    <td style={{ padding: '14px 18px', color: '#f2f2f7', background: 'rgba(99,102,241,0.03)' }}>
                      <div>{row.selixes}</div>
                      <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '4px', fontWeight: 600 }}>{row.verdict}</div>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#9494a8' }}>{row.portkey}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deep Dive Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', lineHeight: 1.7, fontSize: '15px', color: '#cbd5e1' }}>
          
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
              1. The Middleman Vulnerability: Zero Data Exposure
            </h2>
            <p>
              When using a managed AI gateway like Portkey, your application sends raw user prompts, proprietary system instructions, and customer context to Portkey's cloud servers before Portkey proxies the request to OpenAI or Anthropic.
            </p>
            <p>
              If Portkey experiences an outage or a security breach, your entire AI infrastructure goes down or leaks data. Selixes runs **100% inside your own AWS, GCP, or bare-metal VPC**. The data plane never leaves your network. Prompts travel directly from your VPC to upstream LLM providers, encrypted end-to-end.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
              2. Latency: In-VPC Switching vs. Cloud Round-Trips
            </h2>
            <p>
              Every hop over the public internet adds latency. When an AI gateway is hosted in a SaaS cloud, an extra round-trip is added to every single LLM call and failover event.
            </p>
            <p>
              Selixes sits co-located next to your application microservices or agent runners. With in-memory circuit-breaking, failover rerouting takes **~16ms** (median 32ms total cloud swap), making it ideal for low-latency conversational agents and high-throughput background processing.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
              3. Built Specifically for Autonomous Agent Workflows
            </h2>
            <p>
              Portkey was built initially around standard LLM completions, prompt management, and tracing. Selixes is engineered for the **Agentic Era**:
            </p>
            <ul>
              <li><strong>Runaway Loop Breaker:</strong> Detects repetitive recursive tool calls across LangGraph, CrewAI, or AutoGen nodes and halts execution before wasting budget.</li>
              <li><strong>Hardware-Enforced Session Caps:</strong> Set exact dollar limits per agent execution via request headers (`x-selixes-max-session-cost: 0.15`).</li>
              <li><strong>Step-Level Resilience:</strong> If an agent's 7th step encounters an OpenAI 429 rate limit, Selixes silently redirects step 7 to Claude without resetting the agent’s memory or state.</li>
            </ul>
          </div>

          {/* Verdict Box */}
          <div style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '14px',
            padding: '2rem',
            marginTop: '1rem',
          }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 8px' }}>
              The Verdict
            </h3>
            <p style={{ margin: '0 0 1rem' }}>
              <strong>Choose Portkey if:</strong> You want a fully managed SaaS experience with hosted prompt management and are comfortable sending your prompt data through their cloud infrastructure.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Choose Selixes if:</strong> You require absolute data sovereignty inside your VPC, sub-16ms failover latency, runaway agent loop protection, and zero SaaS subscription markups on your token volume.
            </p>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
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
                boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                display: 'inline-block',
              }}
            >
              Deploy Selixes Sovereign Gateway →
            </Link>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
