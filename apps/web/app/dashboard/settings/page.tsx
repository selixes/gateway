import { ApiKeyManager } from '../../../components/ApiKeyManager';
import { ResiliencyReport } from '../../../components/ResiliencyReport';

export default function SettingsPage() {
  const webhookBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const webhooks = [
    { label: 'Start Execution', url: `${webhookBase}/webhooks/execution/start`, method: 'POST' },
    { label: 'Log Event',       url: `${webhookBase}/webhooks/execution/event`, method: 'POST' },
    { label: 'End Execution',   url: `${webhookBase}/webhooks/execution/end`,   method: 'POST' },
    { label: 'Ingest AI Trace', url: `${webhookBase}/webhooks/ai/trace`,        method: 'POST' },
    { label: 'Clerk Sync',      url: `${webhookBase}/webhooks/clerk`,           method: 'POST' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Platform configuration, secure gateway keys, webhook endpoints, and integration settings.
        </p>
      </div>

      {/* API Shield Gateways Key Manager */}
      <ApiKeyManager />

      {/* Operations Resiliency & Savings Report */}
      <ResiliencyReport />

      {/* Webhook URLs */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Webhook Endpoints</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Use these URLs in your n8n HTTP Request nodes or any automation tool.
          </p>
        </div>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <div style={{ minWidth: '550px' }}>
            {webhooks.map(wh => (
              <div key={wh.label} style={{
                display: 'grid', gridTemplateColumns: '160px 1fr 60px',
                alignItems: 'center', gap: '1rem',
                padding: '0.875rem 1.5rem',
                borderBottom: '1px solid var(--bg-border-muted)',
              }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{wh.label}</span>
                <code style={{
                  fontSize: '0.78rem', color: 'var(--text-secondary)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: '5px', padding: '4px 10px',
                  fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{wh.url}</code>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700,
                  color: '#22c55e', background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: '4px', padding: '2px 8px', textAlign: 'center',
                }}>{wh.method}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Environment info */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Environment</h2>
        </div>
        <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { key: 'API Base URL', val: webhookBase },
            { key: 'Auth Provider', val: 'Clerk (B2B)' },
            { key: 'Database', val: 'PostgreSQL + Prisma' },
            { key: 'Queue', val: 'BullMQ / Redis (ready)' },
          ].map(r => (
            <div key={r.key} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', width: '160px', flexShrink: 0 }}>{r.key}</span>
              <code style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{r.val}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
