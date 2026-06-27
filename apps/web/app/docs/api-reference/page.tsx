import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'API & Header Reference Specification',
    description: 'Detailed technical specification of Selixes HTTP headers, session cost budget caps, standby fallbacks, and success/error response payload formats.',
    keywords: [
      'API Reference',
      'Selixes Headers',
      'x-selixes-session-id',
      'x-selixes-max-session-cost',
      'x-selixes-timeout',
      'JSON response payloads'
    ],
    alternates: {
      canonical: 'https://selixes.com/docs/api-reference',
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
      "name": "API Reference",
      "item": "https://selixes.com/docs/api-reference"
    }
  ]
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "API & Header Reference Specification",
  "description": "Detailed technical specification of Selixes HTTP headers, session cost budget caps, standby fallbacks, and success/error response payload formats.",
  "inLanguage": "en",
  "author": {
    "@type": "Organization",
    "name": "Selixes"
  }
};

export default function ApiReferencePage() {
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
          TECHNICAL SPECIFICATIONS
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: '0.25rem 0 0.5rem' }}>
          API & Header Reference
        </h1>
        <p style={{ color: '#8e8e9f', fontSize: '1rem', lineHeight: 1.5 }}>
          Reference page detailing all supported headers, endpoint configurations, and standard JSON response payloads.
        </p>
      </div>

      {/* Authentication */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          🔑 Authentication
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1rem' }}>
          All requests dispatched through the Selixes gateway must include your secure API key in standard HTTP Authorization headers:
        </p>
        <pre style={{
          background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
          padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
          overflowX: 'auto', margin: '0 0 1rem 0'
        }}>
          <code>Authorization: Bearer selixes_live_prodkey982</code>
        </pre>
        <p style={{ fontSize: '0.8rem', color: '#8e8e9f', lineHeight: 1.5, margin: 0 }}>
          💡 <strong>Legacy Support:</strong> The gateway is fully backwards-compatible. You can continue to authenticate using your existing keys (prefixed with <code>apishield_live_</code>) during the migration phase.
        </p>
      </section>

      {/* Headers reference table */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          ⚙️ Custom Budget Headers
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Pass these optional parameters within your standard transit headers to activate active budget guards on the gateway layer:
        </p>
        
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222230', color: '#fff', fontWeight: 700 }}>
                <th style={{ padding: '8px' }}>HTTP Header</th>
                <th style={{ padding: '8px' }}>Type</th>
                <th style={{ padding: '8px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { h: 'x-selixes-session-id', t: 'String', d: 'Unique identifier mapping reasoning budgets across an active agent run. (Legacy fallback: x-apishield-session-id)' },
                { h: 'x-selixes-max-session-cost', t: 'Float', d: 'Cap cap spending cap (e.g. 0.15 for $0.15 limit). Blocks further calls if exceeded. (Legacy fallback: x-apishield-max-session-cost)' },
                { h: 'x-selixes-max-concurrent-calls', t: 'Integer', d: 'Concurrency connection caps (e.g. 3 active calls). Limits parallel agent swarm bursts. (Legacy fallback: x-apishield-max-concurrent-calls)' },
                { h: 'x-selixes-timeout', t: 'Integer', d: 'Upstream provider timeout threshold in milliseconds. Reroutes to Standby if exceeded. (Legacy fallback: x-apishield-timeout)' },
                { h: 'x-selixes-fallback-route', t: 'String', d: 'Override standby targets manually (values: "anthropic" | "gemini" | "ollama"). (Legacy fallback: x-apishield-fallback-route)' },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1a1a24', color: '#a1a1b0' }}>
                  <td style={{ padding: '10px 8px', color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>{row.h}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--accent-hover)', fontFamily: 'monospace' }}>{row.t}</td>
                  <td style={{ padding: '10px 8px', lineHeight: 1.4 }}>{row.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#8e8e9f', lineHeight: 1.5, margin: 0 }}>
          💡 <strong>Compatibility:</strong> You can continue to dispatch requests with your legacy <code>x-apishield-*</code> headers. The gateway translates them seamlessly to <code>x-selixes-*</code> primitives.
        </p>
      </section>

      {/* Response Payloads */}
      <section style={{ marginBottom: '3.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          📥 JSON Response Payloads
        </h3>
        
        {/* Success */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.825rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>1. Successful Completion Payload (with Custom Headers)</p>
          <pre style={{
            background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
            padding: '1rem 1.25rem', fontSize: '0.75rem', color: '#cbd5e1', fontFamily: 'monospace',
            overflowX: 'auto', margin: 0
          }}>
            <code>{`// HTTP Headers returned by gateway:
// x-cache: MISS (or HIT)
// x-provider-chain: openai:200
// x-selixes-runtime-mode: redis

{
  "id": "chatcmpl-982739",
  "object": "chat.completion",
  "created": 1780087476,
  "model": "gpt-4o",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Analysis completed successfully." },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 128, "completion_tokens": 64, "total_tokens": 192 }
}`}</code>
          </pre>
        </div>

        {/* Failed */}
        <div>
          <p style={{ fontSize: '0.825rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>2. Intercepted Budget Gate Payload (Standard HTTP 429 Error)</p>
          <pre style={{
            background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
            padding: '1rem 1.25rem', fontSize: '0.75rem', color: '#cbd5e1', fontFamily: 'monospace',
            overflowX: 'auto', margin: 0
          }}>
            <code>{`// HTTP Status returned: 429 Too Many Requests
{
  "statusCode": 429,
  "error": "runaway_agent_protection",
  "message": "Runaway Agent Intercepted: Session budget exceeded (MAX_COST_EXCEEDED).",
  "sessionId": "session_crm_batch_02",
  "terminationReason": "MAX_COST_EXCEEDED",
  "requestId": "fe2c2d5f-d148-4a1d-9079-efa5181b4cd2"
}`}</code>
          </pre>
        </div>
      </section>

    </div>
    </>
  );
}
