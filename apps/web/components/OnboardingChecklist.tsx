'use client';

import Link from 'next/link';

const STEPS = [
  {
    id: 'clerk',
    icon: '🔑',
    title: 'Set up authentication',
    desc: 'Add your Clerk publishable key to get login and organization switching working.',
    cta: 'Open Clerk Dashboard',
    href: 'https://clerk.com',
    external: true,
  },
  {
    id: 'workflow',
    icon: '⬡',
    title: 'Register your first workflow',
    desc: 'Send a POST request to /workflows/register with your workflow name and provider.',
    cta: 'View Integration Guide',
    href: '/dashboard/integrations',
    external: false,
  },
  {
    id: 'webhook',
    icon: '⚡',
    title: 'Connect your automation tool',
    desc: 'Add the webhook URLs to n8n, Make, or your custom script to start pushing runs.',
    cta: 'Copy Webhook URLs',
    href: '/dashboard/settings',
    external: false,
  },
  {
    id: 'run',
    icon: '◈',
    title: 'Watch your first execution',
    desc: 'Trigger your workflow. The run, events, and AI traces will appear here automatically.',
    cta: 'View Runs',
    href: '/dashboard/runs',
    external: false,
  },
];

export function OnboardingChecklist({ completedSteps = 0 }: { completedSteps?: number }) {
  const remaining = STEPS.slice(completedSteps);
  if (!remaining.length) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)',
      border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 3px' }}>
            Get started with API Shield
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            {completedSteps} of {STEPS.length} steps complete
          </p>
        </div>
        {/* Progress bar */}
        <div style={{ width: '120px' }}>
          <div style={{ height: '4px', background: 'var(--bg-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(completedSteps / STEPS.length) * 100}%`,
              background: 'var(--accent)',
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '3px 0 0', textAlign: 'right' }}>
            {Math.round((completedSteps / STEPS.length) * 100)}%
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        {STEPS.map((step, i) => {
          const done = i < completedSteps;
          return (
            <div key={step.id} style={{
              background: done ? 'rgba(34,197,94,0.05)' : 'var(--bg-elevated)',
              border: `1px solid ${done ? 'rgba(34,197,94,0.15)' : 'var(--bg-border)'}`,
              borderRadius: '8px',
              padding: '0.875rem 1rem',
              opacity: done ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <span style={{ fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}>
                  {done ? '✓' : step.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: done ? 'var(--success)' : 'var(--text-primary)', margin: '0 0 2px' }}>
                    {step.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.625rem', lineHeight: 1.5 }}>{step.desc}</p>
                  {!done && (
                    step.external ? (
                      <a href={step.href} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
                      }}>
                        {step.cta} ↗
                      </a>
                    ) : (
                      <Link href={step.href} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                        {step.cta} →
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
