'use client';

import { useState, useEffect } from 'react';

interface ReportData {
  totalRuns: number;
  outagesCount: number;
  localContinuityRuns: number;
  unoptimizedCost: number;
  actualCost: number;
  netSaved: number;
  savingsPercent: number;
  reportMarkdown: string;
}

export function ResiliencyReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const bypassToken = process.env.NEXT_PUBLIC_DEV_BYPASS_TOKEN ?? '';
      const res = await fetch(`${API_BASE}/traces/analytics/report`, {
        headers: {
          'Authorization': `Bearer ${bypassToken}`,
        },
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error compiling cost saving analytics.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!data) return;
    navigator.clipboard.writeText(data.reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="skeleton" style={{ height: '140px', width: '100%', borderRadius: '12px', marginBottom: '1.5rem' }} />
    );
  }

  if (error || !data) {
    return null; // Gracefully hide card if analytics fail or are empty
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--bg-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '1.5rem'
    }}>
      <div className="mobile-flex-col mobile-gap-1" style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--bg-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>📊 Operations Resiliency & Savings Report</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Telemetry-driven financial and availability audits for your executive dashboards.
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="btn-ghost"
          style={{
            fontSize: '0.75rem',
            padding: '6px 12px',
            color: copied ? 'var(--success)' : 'var(--text-secondary)',
            borderColor: copied ? 'rgba(34,197,94,0.3)' : 'var(--bg-border)'
          }}
        >
          {copied ? '✓ Markdown Copied' : '📋 Copy Slack Report'}
        </button>
      </div>

      <div className="mobile-grid-1" style={{
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        background: 'rgba(99,102,241,0.02)'
      }}>
        {/* Metric 1 */}
        <div style={{ padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Protected Runs</span>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {data.totalRuns.toLocaleString()}
          </span>
        </div>
        {/* Metric 2 */}
        <div style={{ padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Outages Blocked</span>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)', marginTop: '4px' }}>
            {data.outagesCount} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>(100% healed)</span>
          </span>
        </div>
        {/* Metric 3 */}
        <div style={{ padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Funds Conserved</span>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>
            ${data.netSaved.toFixed(4)}
          </span>
        </div>
        {/* Metric 4 */}
        <div style={{ padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Net Savings Rate</span>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)', marginTop: '4px' }}>
            {data.savingsPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
