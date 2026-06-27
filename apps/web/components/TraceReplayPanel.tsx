'use client';

import { useState } from 'react';

interface TraceEntry {
  id: string;
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  status: string;
  createdAt: string;
}

const MOCK_TRACES: TraceEntry[] = [
  { id: 'trc-a1b2c3', provider: 'openai', model: 'gpt-4o', latencyMs: 245, promptTokens: 142, completionTokens: 87, status: 'success', createdAt: '2026-05-29T02:45:12Z' },
  { id: 'trc-d4e5f6', provider: 'anthropic', model: 'claude-3-5-sonnet', latencyMs: 312, promptTokens: 156, completionTokens: 104, status: 'success', createdAt: '2026-05-29T02:44:08Z' },
  { id: 'trc-g7h8i9', provider: 'openai', model: 'gpt-4o', latencyMs: 1820, promptTokens: 198, completionTokens: 0, status: 'error', createdAt: '2026-05-29T02:43:55Z' },
  { id: 'trc-j0k1l2', provider: 'ollama', model: 'llama3-continuity', latencyMs: 890, promptTokens: 120, completionTokens: 45, status: 'success', createdAt: '2026-05-29T02:42:30Z' },
];

function DiffHighlight({ label, a, b, unit }: { label: string; a: number; b: number; unit: string }) {
  const delta = b - a;
  const isPositive = delta > 0;
  const color = label === 'Latency' ? (isPositive ? '#ef4444' : '#22c55e') : (isPositive ? '#22c55e' : '#ef4444');

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem 0',
      borderBottom: '1px solid rgba(99,102,241,0.06)',
    }}>
      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.8125rem', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
          {a}{unit}
        </span>
        <span style={{ fontSize: '0.6875rem', color: '#4b5563' }}>→</span>
        <span style={{ fontSize: '0.8125rem', color: '#e5e7eb', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {b}{unit}
        </span>
        {delta !== 0 && (
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color,
            background: `${color}15`,
            padding: '1px 6px',
            borderRadius: '4px',
          }}>
            {isPositive ? '+' : ''}{delta}{unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function TraceReplayPanel() {
  const [selectedA, setSelectedA] = useState<string>(MOCK_TRACES[0]!.id);
  const [selectedB, setSelectedB] = useState<string>(MOCK_TRACES[1]!.id);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const traceA = MOCK_TRACES.find(t => t.id === selectedA) ?? MOCK_TRACES[0]!;
  const traceB = MOCK_TRACES.find(t => t.id === selectedB) ?? MOCK_TRACES[1]!;

  const handleDecrypt = () => {
    setIsDecrypting(true);
    setTimeout(() => setIsDecrypting(false), 1200);
  };

  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(99, 102, 241, 0.15)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: '#f2f2f7',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Trace Replay Vault
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>
            AES-256-GCM encrypted • Side-by-side comparison
          </p>
        </div>
        <button
          onClick={handleDecrypt}
          disabled={isDecrypting}
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isDecrypting ? '#6b7280' : '#a78bfa',
            background: isDecrypting ? 'rgba(107,114,128,0.1)' : 'rgba(167,139,250,0.1)',
            border: `1px solid ${isDecrypting ? 'rgba(107,114,128,0.2)' : 'rgba(167,139,250,0.2)'}`,
            borderRadius: '8px',
            padding: '0.375rem 0.875rem',
            cursor: isDecrypting ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isDecrypting ? '🔓 Decrypting...' : '🔒 Decrypt & Compare'}
        </button>
      </div>

      {/* Selectors */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '1rem',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(99, 102, 241, 0.06)',
        alignItems: 'center',
      }}>
        <div>
          <label style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>
            Trace A
          </label>
          <select
            value={selectedA}
            onChange={e => setSelectedA(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(17, 24, 39, 0.9)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: '8px',
              color: '#e5e7eb',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8125rem',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              outline: 'none',
            }}
          >
            {MOCK_TRACES.map(t => (
              <option key={t.id} value={t.id}>
                {t.id} • {t.provider} • {t.latencyMs}ms
              </option>
            ))}
          </select>
        </div>

        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6366f1',
          fontSize: '0.875rem',
          fontWeight: 700,
          flexShrink: 0,
          marginTop: '1rem',
        }}>
          ⇄
        </div>

        <div>
          <label style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>
            Trace B
          </label>
          <select
            value={selectedB}
            onChange={e => setSelectedB(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(17, 24, 39, 0.9)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: '8px',
              color: '#e5e7eb',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8125rem',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              outline: 'none',
            }}
          >
            {MOCK_TRACES.map(t => (
              <option key={t.id} value={t.id}>
                {t.id} • {t.provider} • {t.latencyMs}ms
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Panel */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
        }}>
          {/* Trace A Card */}
          <div style={{
            background: 'rgba(11, 15, 25, 0.8)',
            border: '1px solid rgba(99, 102, 241, 0.12)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#818cf8' }}>
                {traceA.id}
              </span>
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: traceA.status === 'success' ? '#22c55e' : '#ef4444',
                background: traceA.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {traceA.status}
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
              <strong style={{ color: '#e5e7eb' }}>{traceA.provider}</strong> / {traceA.model}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {new Date(traceA.createdAt).toLocaleString()}
            </div>
          </div>

          {/* Trace B Card */}
          <div style={{
            background: 'rgba(11, 15, 25, 0.8)',
            border: '1px solid rgba(99, 102, 241, 0.12)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#a78bfa' }}>
                {traceB.id}
              </span>
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: traceB.status === 'success' ? '#22c55e' : '#ef4444',
                background: traceB.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {traceB.status}
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
              <strong style={{ color: '#e5e7eb' }}>{traceB.provider}</strong> / {traceB.model}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {new Date(traceB.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Delta Comparison */}
        <div style={{
          marginTop: '1.25rem',
          background: 'rgba(11, 15, 25, 0.5)',
          border: '1px solid rgba(99, 102, 241, 0.08)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
        }}>
          <h4 style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.75rem',
          }}>
            Delta Analysis
          </h4>
          <DiffHighlight label="Latency" a={traceA.latencyMs} b={traceB.latencyMs} unit="ms" />
          <DiffHighlight label="Prompt Tokens" a={traceA.promptTokens} b={traceB.promptTokens} unit="" />
          <DiffHighlight label="Completion Tokens" a={traceA.completionTokens} b={traceB.completionTokens} unit="" />
          <DiffHighlight label="Total Tokens" a={traceA.promptTokens + traceA.completionTokens} b={traceB.promptTokens + traceB.completionTokens} unit="" />

          {/* Cost estimate */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.625rem 0 0',
            marginTop: '0.25rem',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Est. Cost</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
                ${((traceA.promptTokens + traceA.completionTokens) * 0.00003).toFixed(5)}
              </span>
              <span style={{ fontSize: '0.6875rem', color: '#4b5563' }}>→</span>
              <span style={{ fontSize: '0.8125rem', color: '#e5e7eb', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                ${((traceB.promptTokens + traceB.completionTokens) * 0.00003).toFixed(5)}
              </span>
            </div>
          </div>
        </div>

        {/* Encryption badge */}
        <div style={{
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(34, 197, 94, 0.06)',
          border: '1px solid rgba(34, 197, 94, 0.12)',
          borderRadius: '8px',
        }}>
          <span style={{ fontSize: '0.875rem' }}>🔐</span>
          <span style={{ fontSize: '0.6875rem', color: '#22c55e', fontWeight: 600, letterSpacing: '0.03em' }}>
            Payload encrypted at rest • AES-256-GCM • Key Version: v1
          </span>
        </div>
      </div>
    </div>
  );
}
