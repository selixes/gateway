import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Core Concepts & Primitives',
    description: 'Understand the design mechanics of Selixes: Sovereign neutral proxy, circuit breaker outages routing, concurrency controls, and telemetry traces.',
    keywords: [
      'Core Concepts',
      'Selixes Primitives',
      'Sovereign Neutral Proxy',
      'AI Circuit Breakers',
      'Cost Containment',
      'Swarm Budgets'
    ],
    alternates: {
      canonical: 'https://selixes.com/docs/core-concepts',
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
      "name": "Core Concepts",
      "item": "https://selixes.com/docs/core-concepts"
    }
  ]
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Core Concepts & Primitives",
  "description": "Understand the design mechanics of Selixes: Sovereign neutral proxy, circuit breaker outages routing, concurrency controls, and telemetry traces.",
  "inLanguage": "en",
  "author": {
    "@type": "Organization",
    "name": "Selixes"
  }
};

export default function CoreConceptsPage() {
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
          ARCHITECTURAL DESIGN
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: '0.25rem 0 0.5rem' }}>
          Core Primitives & Concepts
        </h1>
        <p style={{ color: '#8e8e9f', fontSize: '1rem', lineHeight: 1.5 }}>
          Understand the foundational design mechanics and security primitives that make Selixes an elite-grade, neutral reliability layer.
        </p>
      </div>

      {/* Sovereign Neutral Layer */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          🛡️ Sovereign Neutral Proxy Layer
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Selixes operates completely transparently. Because it implements the standard OpenAI REST API schema, there are **no custom SDKs or proprietary libraries** to install. You point your existing SDK base URL to the gateway.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, margin: 0 }}>
          This neutral positioning guarantees zero vendor lock-in, letting you coordinate OpenAI, Anthropic, Gemini, or local models concurrently underneath a single uniform API interface.
        </p>
      </section>

      {/* Continuity Engine & Circuit Breakers */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          🔌 The Continuity Engine & Local Backups
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Selixes deploys advanced circuit-breakers to intercept upstream outages in under 15ms. If OpenAI experiences a network timeout or a 5xx gateway error, the transaction is seamlessly routed to Anthropic or Gemini.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, margin: 0 }}>
          During complete cloud network blackouts, the gateway boots our **Zero-Cost Continuity Mode**, proxying critical requests to a sandboxed local-model node (running Llama-3 via Ollama) on your edge infrastructure. Your software stays functional offline at exactly **$0.00** in token fees.
        </p>
      </section>

      {/* Concurrency & Session Budgets */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          💵 Cost Containment & Swarm Budgets
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          Autonomous agent systems are susceptible to concurrency explosions and infinite tool-calling loops:
        </p>
        <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#a1a1b0' }}>
          <li>
            <strong>Session Budget Caps:</strong> Trip standard HTTP 429 locks the instant a multi-step agent run exceeds your session spending budget (e.g. $0.20 caps).
          </li>
          <li>
            <strong>Tool Loop Breaker:</strong> The Trajectory Instability Guard monitors messages on the fly. If a tool fails consecutively 3 times, the gateway terminates the thread instantly.
          </li>
          <li>
            <strong>Concurrency Bounds:</strong> Standard Node close listeners and exactly-once decrements guarantee active connection limits are cleaned up flawlessly even during timeout aborts.
          </li>
        </ul>
      </section>

      {/* Trace System */}
      <section style={{ marginBottom: '3.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          📊 Observability & Trace Auditing
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, margin: 0 }}>
          The gateway records strict metadata snapshots (prompt cost, latency, model hashes) for every transaction. These metrics populate our Postgres + Redis telemetry schemas, providing real-time Weekly Resiliency Reports ready for administrative review.
        </p>
      </section>

      {/* CTA Box */}
      <div style={{
        background: 'rgba(99,102,241,0.03)', border: '1px dashed rgba(99,102,241,0.2)',
        borderRadius: '10px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Next Up: API Header Specifications</h4>
          <p style={{ fontSize: '0.775rem', color: '#8e8e9f', margin: 0 }}>Review custom budget headers, endpoint schemas, and sample response payloads.</p>
        </div>
        <a href="/docs/api-reference" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '6px' }}>{"View API Reference ->"}</a>
      </div>

    </div>
    </>
  );
}
