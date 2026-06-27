import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Failover Policy & Circuit Breaker Mechanics - Selixes',
    description: 'Understand the circuit breaker failover mechanics, retries, backoffs, and standby routing algorithms inside Selixes.',
    keywords: ['Failover Policy', 'Circuit Breaker', 'Standby Provider Routing', 'Retry Backoff'],
  };
}

export default function FailoverPolicyPage() {
  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
        Failover Policy & Circuit Breaker Mechanics
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Selixes employs a dual-stage circuit breaker architecture designed to handle upstream outages, rate limits, and latency spikes without failing back to the calling client application.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        How the Circuit Breaker Works
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        Every upstream request is monitored for status codes (5xx, 429) and execution duration. If the rolling error rate exceeds the trip threshold within a configured sliding window, the circuit transitions from <strong>Closed</strong> to <strong>Open</strong>.
      </p>
      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
        <li><strong>Trip Threshold:</strong> Default is 40% error rate over a rolling 10-second window.</li>
        <li><strong>Recovery Period:</strong> After 30 seconds of outage isolation, the circuit goes <strong>Half-Open</strong>, dispatching a single probe request to check upstream recovery.</li>
      </ul>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Configuring Custom Failover Headers
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        Control the failover behavior and retry policy on a per-request basis using standard gateway headers:
      </p>
      <pre style={{ background: '#0e0e13', border: '1px solid #1a1a24', padding: '1.25rem', borderRadius: '8px', color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6, overflowX: 'auto', marginBottom: '1.5rem' }}>
{`# 1. Enable circuit breaker and standby routing
x-selixes-failover-policy: failover-to-standby

# 2. Configure max retries for the primary provider
x-selixes-max-retries: 3

# 3. Configure connection timeouts in milliseconds
x-selixes-timeout-ms: 8000`}
      </pre>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Standby Provider Fallbacks
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        When the primary provider (e.g. OpenAI GPT-4o) fails, Selixes seamlessly translates request bodies and paths to standby providers, checking targets in priority order:
      </p>
      <ol style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
        <li><strong>Primary Target:</strong> OpenAI <code>gpt-4o</code></li>
        <li><strong>Standby Target A:</strong> Anthropic <code>claude-3-5-sonnet-latest</code></li>
        <li><strong>Standby Target B:</strong> Google Gemini <code>gemini-1.5-pro</code></li>
        <li><strong>Emergency Fallback:</strong> Local continuity node (Ollama <code>llama3.1:8b</code>)</li>
      </ol>
    </div>
  );
}
