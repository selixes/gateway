import { api } from '../../../../lib/api';
import Link from 'next/link';
import { RunStatusBadge } from '../../../../components/StatusBadge';
import { ExecutionTimeline } from '../../../../components/ExecutionTimeline';
import { TraceInspector } from '../../../../components/TraceInspector';
import { ReplayButton } from '../../../../components/ReplayButton';
import { notFound } from 'next/navigation';

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--bg-border)' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', width: '120px', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const resolvedParams = await params;
  const runId = resolvedParams?.runId;
  let run: Awaited<ReturnType<typeof api.runs.detail>> | null = null;
  
  try { 
    run = await api.runs.detail(runId); 
  } catch (err) {
    console.error(`Failed to fetch run details for runId ${runId}:`, err);
  }
 
  if (!run) return notFound();
 
  const wf = (run as any).workflow;

  return (
    <div>
      {/* Back nav */}
      <Link href="/dashboard/runs" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.5rem' }}>
        ← All Runs
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              {wf?.name ?? 'Run Detail'}
            </h1>
            <RunStatusBadge status={run.status} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'monospace', margin: 0 }}>
            {run.id}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              {formatDuration(run.duration)}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>duration</p>
          </div>
          <ReplayButton runId={run.id} status={run.status} />
        </div>
      </div>

      {/* Metadata */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <MetaRow label="Workflow" value={wf?.name ?? run.workflowId} />
        <MetaRow label="Provider" value={wf?.provider ?? '—'} />
        <MetaRow label="Trigger" value={run.triggerType} />
        <MetaRow label="Started" value={new Date(run.startedAt).toLocaleString()} />
        <MetaRow label="Completed" value={run.completedAt ? new Date(run.completedAt).toLocaleString() : 'Still running...'} />
        {(run as any).sessionId && (
          <MetaRow label="Session ID" value={(run as any).sessionId} />
        )}
        {(run as any).terminationReason && (
          <MetaRow label="Termination Guard" value={
            <span style={{ 
              color: 'var(--accent-danger)', 
              background: 'rgba(239, 68, 68, 0.1)', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '4px', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              letterSpacing: '0.05em'
            }}>
              🛡️ {(run as any).terminationReason}
            </span>
          } />
        )}
        {run.errorMessage && (
          <MetaRow label="Error" value={<span style={{ color: 'var(--accent-danger)' }}>{run.errorMessage}</span>} />
        )}
      </div>

      {/* Two-column: Timeline + Traces */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
        {/* Execution Timeline */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
            <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Execution Timeline
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {run.events?.length ?? 0} events
            </p>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <ExecutionTimeline events={run.events ?? []} />
          </div>
        </div>

        {/* AI Trace Inspector */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
            <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              AI Traces
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {run.traces?.length ?? 0} AI calls — click to inspect
            </p>
          </div>
          <TraceInspector traces={run.traces ?? []} />
        </div>
      </div>
    </div>
  );
}
