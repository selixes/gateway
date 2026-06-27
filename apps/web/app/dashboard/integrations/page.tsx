const API_BASE = 'https://your-api.akra.io'; // Replace with actual domain

const snippets = {
  register: `POST ${API_BASE}/workflows/register
Content-Type: application/json

{
  "name": "Lead Qualification Pipeline",
  "provider": "n8n",
  "externalWorkflowId": "your-n8n-workflow-id"
}`,
  start: `POST ${API_BASE}/webhooks/execution/start
Content-Type: application/json

{
  "workflowId": "WORKFLOW_ID_FROM_REGISTER",
  "triggerType": "WEBHOOK"
}
# Returns -> { "runId": "run-uuid" }`,
  event: `POST ${API_BASE}/webhooks/execution/event
Content-Type: application/json

{
  "runId": "run-uuid",
  "type": "NODE_EXECUTED",
  "message": "Lead data extracted from form"
}`,
  trace: `POST ${API_BASE}/webhooks/ai/trace
Content-Type: application/json

{
  "runId": "run-uuid",
  "provider": "openai",
  "model": "gpt-4o",
  "promptTokens": 312,
  "completionTokens": 128,
  "latency": 1204,
  "estimatedCost": 0.001344,
  "status": "success",
  "httpStatus": 200,
  "promptSnapshot": { "role": "user", "content": "Qualify this lead..." },
  "responseSnapshot": { "score": 87, "tier": "HOT" }
}`,
  end: `POST ${API_BASE}/webhooks/execution/end
Content-Type: application/json

{
  "runId": "run-uuid",
  "status": "SUCCESS"
}`,
};

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{
        width: '28px', height: '28px',
        background: 'var(--accent-glow)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)',
        flexShrink: 0,
      }}>{num}</div>
      <div>
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{title}</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

function CodePanel({ label, code }: { label: string; code: string }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>{label}</p>
      <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.78rem' }}>{code}</pre>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Integrations
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Connect any automation tool in 5 API calls. Works with n8n, Make, Zapier, or custom scripts.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Steps */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
        }}>
          <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Setup Guide</h2>
          <Step num="1" title="Register Workflow" desc="Call /workflows/register once to get your workflow ID." />
          <div style={{ width: '1.5px', height: '16px', background: 'var(--bg-border)', marginLeft: '13px' }} />
          <Step num="2" title="Start Run" desc="POST to /webhooks/execution/start when your automation triggers." />
          <div style={{ width: '1.5px', height: '16px', background: 'var(--bg-border)', marginLeft: '13px' }} />
          <Step num="3" title="Log Events" desc="Optional: emit node-level events for granular timelines." />
          <div style={{ width: '1.5px', height: '16px', background: 'var(--bg-border)', marginLeft: '13px' }} />
          <Step num="4" title="Push AI Trace" desc="After each LLM call, POST tokens, cost, and snapshot." />
          <div style={{ width: '1.5px', height: '16px', background: 'var(--bg-border)', marginLeft: '13px' }} />
          <Step num="5" title="End Run" desc="POST /webhooks/execution/end with SUCCESS or FAILED." />

          <div style={{
            marginTop: '0.5rem',
            padding: '1rem',
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span className="status-dot status-success" />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#22c55e' }}>n8n Compatible</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
              Use the HTTP Request node to push each webhook. No custom node required.
            </p>
          </div>
        </div>

        {/* Right: Code snippets */}
        <div>
          <CodePanel label="1. Register Workflow" code={snippets.register} />
          <CodePanel label="2. Start Execution" code={snippets.start} />
          <CodePanel label="3. Log Node Event (optional)" code={snippets.event} />
          <CodePanel label="4. Push AI Trace" code={snippets.trace} />
          <CodePanel label="5. End Execution" code={snippets.end} />

          {/* Status */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
          }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
              Supported Providers
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { name: 'n8n', status: 'Supported' },
                { name: 'Make.com', status: 'Supported' },
                { name: 'Zapier', status: 'Supported' },
                { name: 'Custom', status: 'Supported' },
              ].map(p => (
                <div key={p.name} style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: 'monospace' }}>{p.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span className="status-dot status-success" />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
