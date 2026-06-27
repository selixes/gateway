import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Model Registry & Provider Mapping - Selixes',
    description: 'Explore the supported models, priorities, capabilities, and automatic endpoint mappings of the Selixes Model Registry.',
    keywords: ['Model Registry', 'Provider Mapping', 'AI Model Routing'],
  };
}

export default function ModelRegistryPage() {
  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
        Model Registry & Provider Mapping
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        The Selixes Model Registry maintains standard abstract models and maps them dynamically to their respective provider endpoints. When you request a model, Selixes automatically checks capabilities, token limits, and cost profiles before routing the request.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Supported Models & Priority Matrix
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        Selixes categorizes models by tier to provide uniform fallbacks:
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1a1a24', textAlign: 'left' }}>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>Abstract Model Tier</th>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>Primary Provider Target</th>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>Secondary Fallback Target</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#cbd5e1' }}><code>gpt-4o</code> (Flagship)</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>OpenAI GPT-4o</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Anthropic Claude 3.5 Sonnet</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#cbd5e1' }}><code>gpt-4-turbo</code> (Advanced)</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>OpenAI GPT-4 Turbo</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Anthropic Claude 3 Opus</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#cbd5e1' }}><code>gpt-4o-mini</code> (Efficient)</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>OpenAI GPT-4o Mini</td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Anthropic Claude 3.5 Haiku</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Dynamic Payload Translators
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        When a request is failover-routed, the gateway automatically handles syntax and argument differences. For example:
      </p>
      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
        <li>Translating <code>max_tokens</code> (OpenAI) to <code>max_tokens_to_sample</code> or <code>max_tokens</code> (Anthropic).</li>
        <li>Wrapping system prompts correctly inside the Anthropic API top-level parameters rather than messages array.</li>
        <li>Converting streaming chunk objects so that client SDK parsers don't experience decoding errors.</li>
      </ul>
    </div>
  );
}
