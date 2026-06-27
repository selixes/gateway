import { api } from '../../../lib/api';
import { TraceInspector } from '../../../components/TraceInspector';

export default async function TracesPage() {
  let costData: Awaited<ReturnType<typeof api.traces.costByOrg>> = [];
  try { costData = await api.traces.costByOrg(); } catch {}

  const totalCost = costData.reduce((acc, c) => acc + c.total_cost, 0);
  const totalTokens = costData.reduce((acc, c) => acc + c.total_tokens, 0);

  // Note: org-level trace listing requires a new endpoint.
  // For now, summary is shown; individual traces are inspectable via Run Detail.
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          AI Traces
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Token usage, cost, and latency across all AI interactions.
        </p>
      </div>

      {/* Summary Strip */}
      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Tokens', value: totalTokens.toLocaleString() },
          { label: 'Estimated Cost', value: `$${totalCost.toFixed(4)}` },
          { label: 'Providers', value: costData.length > 0 ? costData.map(c => c.provider).join(', ') : '—' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem', margin: '0 0 0.4rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Provider Breakdown */}
      {costData.length > 0 && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
            Cost by Provider
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {costData.map(c => {
              const pct = totalCost > 0 ? (c.total_cost / totalCost) * 100 : 0;
              return (
                <div key={c.provider}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{c.provider}</span>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{c.total_tokens.toLocaleString()} tokens</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>${c.total_cost.toFixed(4)}</span>
                    </div>
                  </div>
                  <div style={{ height: '5px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-primary)', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
          <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Trace Inspector
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Open any Run to inspect individual AI traces in detail.
          </p>
        </div>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Navigate to a <strong style={{ color: 'var(--text-secondary)' }}>Run</strong> to inspect its AI traces.
        </div>
      </div>
    </div>
  );
}
