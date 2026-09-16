import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Selixes vs. LiteLLM: Which Self-Hosted AI Gateway is Best in 2026?',
  description: 'In-depth architectural comparison between Selixes and LiteLLM. Discover why teams choose Selixes for sub-16ms failover switching, vector DB semantic caching, and offline local Ollama continuity.',
  keywords: [
    'LiteLLM Alternative',
    'Selixes vs LiteLLM',
    'LiteLLM comparison',
    'Self-hosted LLM Proxy',
    'Open source AI Gateway',
    'Fastest LLM Failover',
    'Semantic Caching vs LiteLLM'
  ],
  alternates: {
    canonical: 'https://selixes.com/compare/selixes-vs-litellm',
  },
};

const headToHead = [
  {
    feature: 'Circuit-Breaker Latency',
    selixes: '~16ms autonomic routing overhead',
    litellm: '40ms - 90ms (Python runtime dependent)',
    verdict: 'Selixes is ~3x faster on switching',
  },
  {
    feature: 'Failover Architecture',
    selixes: 'Persistent TCP connection pools to standby models',
    litellm: 'Standard HTTP client retry loops',
    verdict: 'Selixes prevents dropped client sockets',
  },
  {
    feature: 'Semantic Caching Engine',
    selixes: 'Native Pinecone/Qdrant vector embeddings (up to 64% token savings)',
    litellm: 'Redis exact string match or simple cache plugins',
    verdict: 'Selixes matches prompt meaning, not just exact syntax',
  },
  {
    feature: 'Offline Cloud Outage Continuity',
    selixes: 'Native BYOC failover to local edge Ollama Llama-3 sandbox',
    litellm: 'Can configure Ollama as custom model route',
    verdict: 'Selixes provides automated zero-downtime offline recovery',
  },
  {
    feature: 'Autonomous Agent Protection',
    selixes: 'Runaway tool-call loop breaker & per-session cost caps',
    litellm: 'User & API key-level spend budgets',
    verdict: 'Selixes specifically safeguards recursive agent runs',
  },
  {
    feature: 'OpenAI SDK Compatibility',
    selixes: '100% Drop-in (2 lines: baseURL & API key)',
    litellm: '100% Drop-in',
    verdict: 'Tie (both excel at drop-in simplicity)',
  },
];

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Selixes vs. LiteLLM: 2026 Architectural Comparison for Self-Hosted AI Infrastructure",
  "description": "Comprehensive head-to-head comparison between Selixes and LiteLLM covering failover latency, semantic vector caching, and agent loop protection.",
  "author": {
    "@type": "Organization",
    "name": "Selixes Engineering"
  }
};

export default function SelixesVsLiteLLMPage() {
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
          <span style={{ color: '#cbd5e1' }}>Selixes vs. LiteLLM</span>
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
            HEAD-TO-HEAD BENCHMARK
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
            Selixes vs. LiteLLM:{' '}
            <span style={{
              background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Which Self-Hosted AI Gateway is Best?
            </span>
          </h1>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '17px',
            lineHeight: 1.6,
            color: '#9494a8',
          }}>
            LiteLLM is a popular open-source proxy for mapping 100+ LLMs into OpenAI format. But when production engineering teams scale mission-critical autonomous agents and require sub-16ms failover guarantees and vector semantic caching, Selixes introduces critical advantages.
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
              At a Glance: Key Architectural Differences
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '14px 18px', color: '#cbd5e1', textAlign: 'left', width: '25%' }}>Capability</th>
                  <th style={{ padding: '14px 18px', color: '#818cf8', textAlign: 'left', width: '35%', background: 'rgba(99,102,241,0.06)' }}>Selixes</th>
                  <th style={{ padding: '14px 18px', color: '#9494a8', textAlign: 'left', width: '40%' }}>LiteLLM</th>
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
                    <td style={{ padding: '14px 18px', color: '#9494a8' }}>{row.litellm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deep Dive Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', lineHeight: 1.7, fontSize: '15px', color: '#cbd5e1' }}>
          
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
              1. Failover Speed & Connection Pools: ~16ms vs 80ms
            </h2>
            <p>
              In autonomous multi-agent systems (e.g. LangGraph workflows or voice AI bots), latency budgets are extremely tight. If OpenAI returns an HTTP 504 or 429 error, typical proxy retry mechanisms incur 80ms+ of re-instantiation latency.
            </p>
            <p>
              Selixes maintains **persistent keep-alive connection pools** to standby providers (Anthropic Claude, Google Gemini). When a failure threshold is hit, the internal circuit breaker switches the request in ~16ms (median 32ms total failover), preserving the client’s open HTTP socket without dropped frames.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
              2. Vector Semantic Caching vs. Exact String Matches
            </h2>
            <p>
              LiteLLM offers standard Redis-based caching, which looks for exact string or JSON matches. However, real-world user queries and agent prompts rarely match character-for-character.
            </p>
            <p>
              Selixes embeds incoming prompts into a Pinecone or Qdrant vector space. If a semantically similar query was answered recently with a high similarity threshold (e.g. &gt;0.92 cosine similarity), Selixes serves the cached response directly. In repetitive workloads, our continuous benchmarks demonstrate up to **64.0% token cost reduction** (see <Link href="/docs/core-concepts" style={{ color: '#818cf8' }}>BENCHMARKS.md</Link>).
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
              3. Offline Continuity Mode (BYOC Edge Recovery)
            </h2>
            <p>
              What happens during a complete internet blackout or catastrophic regional cloud outage? LiteLLM fails when external API endpoints cannot be reached.
            </p>
            <p>
              Selixes features native **BYOC (Bring Your Own Compute) Continuity Mode**. When cloud providers are completely unreachable, critical prompts are routed to a sandboxed local edge Ollama node running Llama-3 or Mistral, providing graceful degraded service with 100% request recovery.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
              4. Guardrails for Autonomous Agents (Runaway Loop Prevention)
            </h2>
            <p>
              LiteLLM provides key-level budgets and rate limiting. However, it is not built to inspect agentic loops. When an autonomous agent enters a recursive loop calling tools with identical failing parameters, LiteLLM continues executing requests until the monthly quota is depleted.
            </p>
            <p>
              Selixes inspects semantic tool call arguments across the session lifecycle. If recursive repetitive calls are detected, Selixes halts the loop at cycle 3, saving thousands of dollars in wasted tokens.
            </p>
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
              The Verdict: When to Choose Which?
            </h3>
            <p style={{ margin: '0 0 1rem' }}>
              <strong>Choose LiteLLM if:</strong> You are building a general Python application needing a quick translation layer for 100+ obscure models and basic spend logging.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Choose Selixes if:</strong> You are running production autonomous agents or mission-critical enterprise systems requiring sub-16ms failover guarantees, vector semantic caching, runaway agent loop protection, and local offline continuity.
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
              Deploy Selixes in 5 Minutes →
            </Link>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
