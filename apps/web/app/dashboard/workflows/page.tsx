import { api } from '../../../lib/api';
import Link from 'next/link';
import { WorkflowStatusBadge } from '../../../components/StatusBadge';

export default async function WorkflowsPage() {
  let workflows: Awaited<ReturnType<typeof api.workflows.list>> = [];
  try { workflows = await api.workflows.list(); } catch {}

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Workflows
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} registered.
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '10px', overflow: 'hidden', minWidth: '600px' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
            {['Name', 'Provider', 'Status', 'Registered'].map(h => (
              <span key={h} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          {workflows.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No workflows yet. Register via <code style={{ color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.1)', padding: '0 4px', borderRadius: '3px' }}>POST /workflows/register</code>
            </div>
          ) : (
            workflows.map(wf => (
              <Link key={wf.id} href={`/dashboard/workflows/${wf.id}`} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center',
                padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--bg-border)',
                textDecoration: 'none', transition: 'background 0.15s',
              }}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{wf.name}</p>
                  {wf.externalWorkflowId && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', margin: 0 }}>
                      ext: {wf.externalWorkflowId}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {wf.provider}
                </span>
                <WorkflowStatusBadge status={wf.status} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(wf.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
