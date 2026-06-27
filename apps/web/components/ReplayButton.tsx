'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReplayButton({ runId, status }: { runId: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  if (status === 'RUNNING' || status === 'PENDING') return null;

  async function handleReplay() {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${apiBase}/executions/${runId}/replay`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setReplayed(true);
        setTimeout(() => router.push(`/dashboard/runs/${data.runId}`), 800);
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (replayed) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '0.8125rem', fontWeight: 600, color: '#10b981',
        background: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '8px', padding: '0.5rem 1rem',
      }}>
        ✓ Replay created — redirecting…
      </span>
    );
  }

  if (confirming) {
    return (
      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Confirm replay?
        </span>
        <button
          onClick={handleReplay}
          disabled={loading}
          style={{
            background: '#6366f1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)',
            transition: 'all 0.15s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Replaying…' : 'Yes, Replay'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--bg-border)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: status === 'FAILED' ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)',
        color: status === 'FAILED' ? '#ef4444' : 'var(--text-secondary)',
        border: `1px solid ${status === 'FAILED' ? 'rgba(239,68,68,0.25)' : 'var(--bg-border)'}`,
        borderRadius: '8px',
        padding: '0.5rem 1rem',
        fontSize: '0.8125rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        if (status === 'FAILED') {
          e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
        } else {
          e.currentTarget.style.background = 'var(--bg-hover)';
        }
      }}
      onMouseLeave={e => {
        if (status === 'FAILED') {
          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
        } else {
          e.currentTarget.style.background = 'var(--bg-elevated)';
        }
      }}
    >
      ⟳ Replay Run
    </button>
  );
}
