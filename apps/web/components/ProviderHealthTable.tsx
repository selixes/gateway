'use client';

import { useState, useEffect } from 'react';

interface ProviderHealth {
  name: string;
  status: 'CLOSED' | 'OPEN' | 'HALF-OPEN';
  availability: number;
  avgLatencyMs: number;
  activeConcurrency: number;
  healthScore: number;
}

const MOCK_PROVIDERS: ProviderHealth[] = [
  { name: 'OpenAI', status: 'CLOSED', availability: 99.94, avgLatencyMs: 187, activeConcurrency: 12, healthScore: 96 },
  { name: 'Anthropic', status: 'CLOSED', availability: 99.87, avgLatencyMs: 234, activeConcurrency: 5, healthScore: 91 },
  { name: 'Gemini', status: 'HALF-OPEN', availability: 97.21, avgLatencyMs: 412, activeConcurrency: 1, healthScore: 64 },
  { name: 'Ollama (Local)', status: 'CLOSED', availability: 100, avgLatencyMs: 890, activeConcurrency: 0, healthScore: 82 },
];

function CircuitIndicator({ status }: { status: ProviderHealth['status'] }) {
  const config = {
    'CLOSED': {
      color: '#22c55e',
      shadow: '0 0 8px rgba(34,197,94,0.6), 0 0 20px rgba(34,197,94,0.2)',
      label: 'Healthy',
      animation: '',
    },
    'OPEN': {
      color: '#ef4444',
      shadow: '0 0 8px rgba(239,68,68,0.7), 0 0 24px rgba(239,68,68,0.3)',
      label: 'Circuit Open',
      animation: 'pulse-red',
    },
    'HALF-OPEN': {
      color: '#f59e0b',
      shadow: '0 0 8px rgba(245,158,11,0.6), 0 0 20px rgba(245,158,11,0.2)',
      label: 'Probing',
      animation: 'pulse-amber',
    },
  };

  const c = config[status];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span
        className={c.animation}
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: c.color,
          boxShadow: c.shadow,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: c.color,
        letterSpacing: '0.04em',
      }}>
        {c.label}
      </span>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 90) return '#22c55e';
    if (s >= 70) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%' }}>
      <div style={{
        flex: 1,
        height: '6px',
        background: 'rgba(34,34,60,0.5)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${score}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${getColor(score)}88, ${getColor(score)})`,
          borderRadius: '3px',
          transition: 'width 1s ease',
          boxShadow: `0 0 8px ${getColor(score)}44`,
        }} />
      </div>
      <span style={{
        fontSize: '0.8125rem',
        fontWeight: 700,
        color: getColor(score),
        fontVariantNumeric: 'tabular-nums',
        minWidth: '28px',
        textAlign: 'right',
      }}>
        {score}
      </span>
    </div>
  );
}

export function ProviderHealthTable() {
  const [providers, setProviders] = useState<ProviderHealth[]>(MOCK_PROVIDERS);
  const [tick, setTick] = useState(0);

  // Simulate live micro-changes for demo polish
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setProviders(prev => prev.map(p => ({
        ...p,
        activeConcurrency: Math.max(0, p.activeConcurrency + Math.floor(Math.random() * 5) - 2),
        avgLatencyMs: Math.max(50, p.avgLatencyMs + Math.floor(Math.random() * 40) - 20),
        healthScore: Math.min(100, Math.max(0, p.healthScore + Math.floor(Math.random() * 6) - 3)),
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
            Provider Health Grid
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>
            Circuit breaker state • Saturation pressure • Decay scoring
          </p>
        </div>
        <div style={{
          fontSize: '0.6875rem',
          color: '#6366f1',
          background: 'rgba(99, 102, 241, 0.08)',
          padding: '0.25rem 0.75rem',
          borderRadius: '6px',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}>
          LIVE
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
              {['Provider', 'Circuit', 'Availability', 'Avg Latency', 'Concurrency', 'Health Score'].map(h => (
                <th key={h} style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textAlign: h === 'Health Score' ? 'left' : 'left',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => (
              <tr
                key={p.name}
                style={{
                  borderBottom: i < providers.length - 1 ? '1px solid rgba(99, 102, 241, 0.06)' : 'none',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.875rem 1rem' }}>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#e5e7eb',
                  }}>
                    {p.name}
                  </span>
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <CircuitIndicator status={p.status} />
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: p.availability >= 99.5 ? '#22c55e' : p.availability >= 98 ? '#f59e0b' : '#ef4444',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {p.availability.toFixed(2)}%
                  </span>
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {p.avgLatencyMs}ms
                  </span>
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: p.activeConcurrency > 10 ? '#f59e0b' : '#9ca3af',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {p.activeConcurrency}
                    </span>
                    {p.activeConcurrency > 10 && (
                      <span style={{
                        fontSize: '0.5625rem',
                        background: 'rgba(245,158,11,0.15)',
                        color: '#f59e0b',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}>
                        HIGH
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '0.875rem 1rem', minWidth: '140px' }}>
                  <ScoreBar score={p.healthScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.7), 0 0 24px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 16px rgba(239,68,68,0.9), 0 0 40px rgba(239,68,68,0.5); }
        }
        @keyframes pulse-amber {
          0%, 100% { box-shadow: 0 0 8px rgba(245,158,11,0.6), 0 0 20px rgba(245,158,11,0.2); }
          50% { box-shadow: 0 0 14px rgba(245,158,11,0.8), 0 0 32px rgba(245,158,11,0.4); }
        }
        .pulse-red { animation: pulse-red 2s ease-in-out infinite; }
        .pulse-amber { animation: pulse-amber 2.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
