import type { RunStatus } from '../lib/types';

const config: Record<RunStatus, { label: string; color: string; bg: string; dotClass: string }> = {
  SUCCESS: { label: 'Success', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', dotClass: 'status-success' },
  FAILED:  { label: 'Failed',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  dotClass: 'status-failed'  },
  RUNNING: { label: 'Running', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', dotClass: 'status-running' },
  PENDING: { label: 'Pending', color: '#6b7280', bg: 'rgba(107,114,128,0.1)',dotClass: 'status-pending' },
  RETRYING:{ label: 'Retrying',color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dotClass: 'status-pending' },
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const badge = config[status] || config.PENDING;
  const label = badge?.label ?? 'Pending';
  const color = badge?.color ?? '#6b7280';
  const bg = badge?.bg ?? 'rgba(107,114,128,0.1)';
  const dotClass = badge?.dotClass ?? 'status-pending';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: bg,
      color,
      border: `1px solid ${color}22`,
      borderRadius: '999px',
      padding: '2px 10px',
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      <span className={`status-dot ${dotClass}`} />
      {label}
    </span>
  );
}

const wfConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: 'Active',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  INACTIVE: { label: 'Inactive', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  ERROR:    { label: 'Error',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export function WorkflowStatusBadge({ status }: { status: string }) {
  const badge = wfConfig[status] || wfConfig.INACTIVE;
  const label = badge?.label ?? 'Inactive';
  const color = badge?.color ?? '#6b7280';
  const bg = badge?.bg ?? 'rgba(107,114,128,0.1)';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: bg, color,
      border: `1px solid ${color}22`,
      borderRadius: '999px',
      padding: '2px 10px',
      fontSize: '0.75rem', fontWeight: 600,
    }}>
      {label}
    </span>
  );
}
