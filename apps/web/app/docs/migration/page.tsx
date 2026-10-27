import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'SDK Migration Guide - Selixes AI Gateway',
    description: 'Step-by-step instructions for migrating OpenAI, Anthropic, and multi-agent workflows to the self-hosted Selixes Gateway with a 2-line baseURL swap.',
    keywords: ['OpenAI SDK Migration', 'AI Gateway Proxy', 'Selixes Integration', 'LLM Resilience'],
  };
}

export default function MigrationPage() {
  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
        Migrating to Selixes Gateway
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Selixes is engineered as a wire-compatible drop-in proxy for the official OpenAI SDK. Migrating your existing applications requires only updating your client’s <code>baseURL</code> to point to your Selixes instance. No prompt schema or SDK wrapper rewrites are necessary.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        2-Line SDK Configuration Swap
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Update your client initialization in Node.js or Python to route transit through Selixes:
      </p>
      
      <div style={{ background: '#0e0e13', border: '1px solid #1a1a24', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
        <p style={{ color: '#818cf8', margin: '0 0 0.5rem 0', fontWeight: 600 }}>// Node.js (OpenAI SDK)</p>
        <pre style={{ margin: 0, color: '#cbd5e1', overflowX: 'auto' }}>
{`import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:4000/v1', // Point to your Selixes Gateway instance
  apiKey: process.env.OPENAI_API_KEY,  // Provider key passed directly
});`}
        </pre>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Custom Header Primitives
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Activate gateway resilience and budget guards by adding standard HTTP headers to your requests:
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1a1a24', textAlign: 'left' }}>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>HTTP Header</th>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>Value / Type</th>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#34d399', fontFamily: 'monospace' }}><code>x-selixes-session-id</code></td>
            <td style={{ padding: '8px', color: '#a1a1b0' }}>String (UUID/Slug)</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Tracks multi-turn trajectory and reasoning spend</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#34d399', fontFamily: 'monospace' }}><code>x-selixes-max-session-cost</code></td>
            <td style={{ padding: '8px', color: '#a1a1b0' }}>Float (e.g. 0.50)</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Hard USD spending cap across an agent run</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#34d399', fontFamily: 'monospace' }}><code>x-selixes-max-concurrent-calls</code></td>
            <td style={{ padding: '8px', color: '#a1a1b0' }}>Integer (e.g. 5)</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Limits parallel agent worker bursts</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#34d399', fontFamily: 'monospace' }}><code>x-selixes-timeout</code></td>
            <td style={{ padding: '8px', color: '#a1a1b0' }}>Integer (ms)</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Per-request timeout before failover standby trigger</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
