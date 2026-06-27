import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'System Architecture - Sovereign AI Reliability & Routing',
    description: 'Detailed technical analysis of Selixes gateway proxy pipelines, postgres/redis telemetry storage, edge sandboxing, circuit-breaker latencies, and reasoning budgets.',
    keywords: [
      'System Architecture',
      'Selixes Internals',
      'Postgres Telemetry Schema',
      'Redis Budget Cache',
      'Ollama Edge Sandboxing',
      'Operational Benchmarks'
    ],
    alternates: {
      canonical: 'https://selixes.com/docs/architecture',
    },
  };
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://selixes.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Docs",
      "item": "https://selixes.com/docs/getting-started"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "System Architecture",
      "item": "https://selixes.com/docs/architecture"
    }
  ]
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "System Architecture - Sovereign AI Reliability & Routing",
  "description": "Detailed technical analysis of Selixes gateway proxy pipelines, postgres/redis telemetry storage, edge sandboxing, circuit-breaker latencies, and reasoning budgets.",
  "inLanguage": "en",
  "author": {
    "@type": "Organization",
    "name": "Selixes"
  }
};

export default function SystemArchitecturePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      
      <div>
        {/* Page Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>
            INFRASTRUCTURE MAP
          </span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: '0.25rem 0 0.5rem' }}>
            System Architecture
          </h1>
          <p style={{ color: '#8e8e9f', fontSize: '1rem', lineHeight: 1.5 }}>
            Under the hood of Selixes: deep dive into the proxy pipeline, transaction telemetry, Redis token-locked budget gates, and edge continuity routing.
          </p>
        </div>

        {/* Section 1: Overview */}
        <section id="system-overview" style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
            🔍 Dynamic Proxy Pipeline Overview
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
            Selixes is containerized to deploy directly inside your secure cloud boundary (VPC) or local developer machine. It functions as an HTTP reverse-proxy layer sitting between your client application code and upstream model providers (OpenAI, Anthropic, Gemini).
          </p>
          <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
            When your SDK dispatches a prompt, Selixes intercepts the request socket, parses custom budget controls in the headers, checks active session caches, and coordinates connections. The transit latency overhead introduced by this middleware is under <strong>15 milliseconds</strong>.
          </p>
        </section>

        {/* Section 2: Data Flow Diagram */}
        <section id="architectural-diagram" style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
            🧬 Execution Flow & Telemetry
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
            Below is the lifecycle of an AI completion request routing through the sovereign gateway proxy:
          </p>
          
          <pre style={{
            background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
            padding: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
            lineHeight: 1.5, overflowX: 'auto', marginBottom: '1.5rem'
          }}>
{`+-----------------------+
|  Client Application   |
+-----------+-----------+
            |
            | (Standard HTTP POST to localhost:4000/v1)
            v
+-----------+-----------+      [Redis Check]
|  Selixes Gateway      +=========================> (Query Active Session Cost)
|  * Budget Validator   |<========================= (Return Current Spend)
|  * Circuit Breaker    |
+-----------+-----------+
            |
            +-------------[ Outage Tripped? ]-------------+
            | (No)                                        | (Yes)
            v                                             v
+-----------+-----------+                         +-------+-------+
| Upstream LLM Api      |                         | Standby Tier  |
| (OpenAI / Anthropic)  |                         | (Gemini / Edge|
+-----------+-----------+                         | Ollama Llama3)|
            |                                     +-------+-------+
            | (Completes Successfully)                    |
            +---------------------+-----------------------+
                                  |
                                  v
                        [Postgres Telemetry Ingest]
                        * Prompt Snapshots (Masked)
                        * Token Arbitrage Margin
                        * Exact Latency & Model Hashes`}
          </pre>
        </section>

        {/* Section 3: Telemetry Schema */}
        <section id="telemetry-schema" style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
            💾 Telemetry Storage Primitives (Postgres + Redis)
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
            To enforce session budget limits concurrently across multiple parallel agent worker nodes, Selixes implements a dual-database architecture:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6 }}>
            <li>
              <strong>Redis Cache Layer:</strong> Stores transient session keys, active concurrency counts, and sliding-window rate limit counters. When a request comes in, Redis decrements limits in under 1ms. If limits are breached, it returns HTTP 429 immediately without initiating external connections.
            </li>
            <li>
              <strong>Postgres Analytics Ingest:</strong> Stores detailed transaction traces, prompt token counts, cost allocations, and failover latency histories. These telemetry traces power the observability dashboards and compile weekly resiliency reports.
            </li>
          </ul>
        </section>

        {/* Section 4: Edge Sandboxing */}
        <section id="edge-continuity-mode" style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
            🔌 Edge Sandboxing & Ollama Backups
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
            In high-security enterprise environments or during catastrophic cloud failures, external connection calls can fail. To counter this, Selixes contains an integrated **Zero-Cost Continuity Engine**.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            If all cloud endpoints timeout or fail authentication, the gateway redirects socket flows to your local edge network. It boots a sandboxed local-model container (standardizing on Llama-3 via Ollama) running on your VPC hardware metal, ensuring absolute operational survival with zero data leaks outside the boundary.
          </p>
        </section>

        {/* Section 5: Technical Parameters */}
        <section id="technical-specifications" style={{ marginBottom: '3.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
            📐 Operational Benchmarks
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222230', color: '#fff', fontWeight: 700 }}>
                  <th style={{ padding: '8px' }}>Benchmark Metric</th>
                  <th style={{ padding: '8px' }}>Value</th>
                  <th style={{ padding: '8px' }}>Impact / Rationale</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { m: 'Middleware Latency', v: '< 15ms', d: 'Minimal transit delay added by header parsing and session token lookups.' },
                  { m: 'Failover Switch Time', v: '< 20ms', d: 'Autonomic swap from offline primary provider to standby endpoints.' },
                  { m: 'Redis Query Cost', v: '< 1.2ms', d: 'High-throughput sliding cost check before admitting prompt tokens.' },
                  { m: 'Memory Footprint', v: '180 MB', d: 'Docker container footprint under idle conditions, optimized for edge nodes.' },
                  { m: 'Supported Throughput', v: '12,500 req/sec', d: 'Sustained proxy completions per instance with active socket pooling.' },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1a1a24', color: '#a1a1b0' }}>
                    <td style={{ padding: '10px 8px', color: '#fff', fontWeight: 600 }}>{row.m}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--accent-hover)', fontFamily: 'monospace' }}>{row.v}</td>
                    <td style={{ padding: '10px 8px', lineHeight: 1.4 }}>{row.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA Box */}
        <div style={{
          background: 'rgba(99,102,241,0.03)', border: '1px dashed rgba(99,102,241,0.2)',
          borderRadius: '10px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Next Up: API Specifications</h4>
            <p style={{ fontSize: '0.775rem', color: '#8e8e9f', margin: 0 }}>Review custom headers, payload structures, and response schemas.</p>
          </div>
          <a href="/docs/api-reference" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '6px' }}>{"View API Reference ->"}</a>
        </div>

      </div>
    </>
  );
}
