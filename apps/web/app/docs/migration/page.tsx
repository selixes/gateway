import React from 'react';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Legacy API Shield Migration - Selixes',
    description: 'Guidelines to migrate client applications from legacy API Shield headers and key prefixes to the updated Selixes standard.',
    keywords: ['Migration Guide', 'API Shield Compatibility', 'Selixes Upgrade'],
  };
}

export default function MigrationPage() {
  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
        Migration from Legacy Headers
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Following the rebranding pass, the default gateway headers and key prefixes have been updated from <code>apishield</code> to <code>selixes</code>. Although the gateway backend retains native backward compatibility to prevent breaking changes for live clients, we recommend updating all scripts and environment configurations to the new standard.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Header & API Key Reference Map
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Use the following mapping table to update your configuration schemas:
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1a1a24', textAlign: 'left' }}>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>Legacy Key / Header</th>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>New Selixes Standard (Recommended)</th>
            <th style={{ padding: '8px', color: '#818cf8', fontWeight: 600 }}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#cb7a7a' }}><code>apishield_live_...</code></td>
            <td style={{ padding: '8px', color: '#34d399' }}><code>selixes_live_...</code></td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Gateway Authorization Keys</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#cb7a7a' }}><code>x-apishield-max-session-cost</code></td>
            <td style={{ padding: '8px', color: '#34d399' }}><code>x-selixes-max-session-cost</code></td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Session Spend Capping (USD)</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#cb7a7a' }}><code>x-apishield-max-concurrent-calls</code></td>
            <td style={{ padding: '8px', color: '#34d399' }}><code>x-selixes-max-concurrent-calls</code></td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>Concurrency Rate Limiting</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #14141c' }}>
            <td style={{ padding: '8px', color: '#cb7a7a' }}><code>x-apishield-pii-scrubbing</code></td>
            <td style={{ padding: '8px', color: '#34d399' }}><code>x-selixes-pii-scrubbing</code></td>
            <td style={{ padding: '8px', color: '#94a3b8' }}>PII Masking at the Edge</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f2f2f7', marginTop: '2rem', marginBottom: '0.75rem' }}>
        Backward Compatibility Notice
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        To ensure uninterrupted runtime for legacy applications, the gateway interceptor checks for <code>x-apishield-*</code> parameters if the equivalent <code>x-selixes-*</code> header is not provided. <strong>Both systems operate in parallel on the gateway backend, and existing API keys prefixed with <code>apishield_live_</code> remain completely valid.</strong>
      </p>
    </div>
  );
}
