const TEMPLATES = [
  {
    id: 'lead-qualification',
    name: 'Lead Qualification Pipeline',
    category: 'Lead Gen',
    description: 'Score and route inbound leads using AI. Integrates with CRM to auto-update deal stages.',
    provider: 'n8n',
    triggers: ['Webhook', 'Form'],
    ai: ['GPT-4o'],
    color: '#6366f1',
    tags: ['CRM', 'Lead Gen', 'Classification'],
    status: 'ready',
  },
  {
    id: 'gmail-assistant',
    name: 'Gmail AI Assistant',
    category: 'Email',
    description: 'Draft replies, classify priority, and summarize email threads using Claude or GPT.',
    provider: 'n8n',
    triggers: ['Gmail'],
    ai: ['Claude 3.5', 'GPT-4o'],
    color: '#3b82f6',
    tags: ['Email', 'Drafting', 'Summarization'],
    status: 'ready',
  },
  {
    id: 'crm-updater',
    name: 'CRM Auto-Updater',
    category: 'CRM',
    description: 'Automatically sync call notes, emails, and meeting summaries to HubSpot or Salesforce.',
    provider: 'n8n',
    triggers: ['Webhook', 'Schedule'],
    ai: ['GPT-4o-mini'],
    color: '#8b5cf6',
    tags: ['CRM', 'HubSpot', 'Salesforce'],
    status: 'ready',
  },
  {
    id: 'support-router',
    name: 'AI Customer Support Router',
    category: 'Support',
    description: 'Classify and route support tickets. Auto-draft responses for common issues.',
    provider: 'n8n',
    triggers: ['Webhook', 'Email'],
    ai: ['GPT-4o-mini'],
    color: '#22c55e',
    tags: ['Support', 'Routing', 'Zendesk'],
    status: 'ready',
  },
  {
    id: 'linkedin-outreach',
    name: 'LinkedIn Outreach Assistant',
    category: 'Lead Gen',
    description: 'Personalize connection messages and follow-ups at scale using prospect data.',
    provider: 'n8n',
    triggers: ['Schedule', 'Webhook'],
    ai: ['Claude 3.5 Haiku'],
    color: '#f59e0b',
    tags: ['LinkedIn', 'Outreach', 'Personalization'],
    status: 'ready',
  },
  {
    id: 'meeting-summarizer',
    name: 'Meeting Summarizer',
    category: 'Productivity',
    description: 'Transcribe and summarize Zoom/Google Meet calls. Extract action items and send to Notion.',
    provider: 'n8n',
    triggers: ['Webhook', 'Zapier'],
    ai: ['Whisper', 'GPT-4o'],
    color: '#ec4899',
    tags: ['Meetings', 'Notion', 'Transcription'],
    status: 'ready',
  },
  {
    id: 'recruitment-screening',
    name: 'Recruitment Screening Pipeline',
    category: 'Recruitment',
    description: 'Screen CVs, score candidates against job descriptions, and draft shortlist summaries.',
    provider: 'n8n',
    triggers: ['Email', 'Webhook'],
    ai: ['GPT-4o'],
    color: '#14b8a6',
    tags: ['HR', 'Screening', 'CV'],
    status: 'ready',
  },
  {
    id: 'review-analyzer',
    name: 'Ecommerce Review Analyzer',
    category: 'Ecommerce',
    description: 'Aggregate and analyze product reviews. Generate trend reports and respond to negative reviews.',
    provider: 'n8n',
    triggers: ['Schedule', 'Webhook'],
    ai: ['GPT-4o-mini'],
    color: '#f97316',
    tags: ['Reviews', 'Sentiment', 'Ecommerce'],
    status: 'ready',
  },
];

const CATEGORIES = ['All', 'Lead Gen', 'Email', 'CRM', 'Support', 'Productivity', 'Recruitment', 'Ecommerce'];

export default function TemplatesPage() {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Workflow Templates
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          8 production-ready automation templates with observability built in.
        </p>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {CATEGORIES.map((cat, i) => (
          <span key={cat} style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: i === 0 ? 600 : 400,
            background: i === 0 ? 'var(--accent)' : 'var(--bg-elevated)',
            color: i === 0 ? '#fff' : 'var(--text-secondary)',
            border: '1px solid',
            borderColor: i === 0 ? 'var(--accent)' : 'var(--bg-border)',
            cursor: 'pointer',
          }}>
            {cat}
          </span>
        ))}
      </div>

      {/* Template Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
        {TEMPLATES.map(t => (
          <div key={t.id} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'border-color 0.2s',
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px', height: '38px',
                  background: `${t.color}14`,
                  border: `1px solid ${t.color}28`,
                  borderRadius: '9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem',
                }}>⬡</div>
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{t.name}</p>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    color: t.color,
                    background: `${t.color}10`,
                    border: `1px solid ${t.color}20`,
                    borderRadius: '999px', padding: '1px 8px',
                    letterSpacing: '0.04em',
                  }}>{t.category}</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.7rem', color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                borderRadius: '4px', padding: '2px 8px', fontFamily: 'monospace',
              }}>{t.provider}</span>
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{t.description}</p>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {t.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: '0.7rem', color: 'var(--text-muted)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: '4px', padding: '2px 8px',
                }}>{tag}</span>
              ))}
            </div>

            {/* Footer row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--bg-border)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Triggers:</span>
                  {t.triggers.map(tr => (
                    <span key={tr} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: '3px', padding: '1px 6px', fontFamily: 'monospace' }}>{tr}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="status-dot status-success" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Observability included</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
