'use client';

import React, { useState } from 'react';

export function GatewayEngineCards() {
  const [cacheMode, setCacheMode] = useState<'semantic' | 'exact'>('semantic');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

  const handlePurge = () => {
    setIsPurging(true);
    setTimeout(() => {
      setIsPurging(false);
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 2500);
    }, 700);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
      gap: '1rem',
      marginBottom: '2rem',
    }}>
      {/* Card 1: Semantic Edge Cache (Surface semantic-cache.service.ts) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 20, 34, 0.75) 0%, rgba(11, 16, 26, 0.85) 100%)',
        border: '1px solid rgba(0, 242, 255, 0.2)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle accent glow */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
          background: 'radial-gradient(circle, rgba(0, 242, 255, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1rem' }}>⚡</span>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>
                Edge Semantic Cache
              </h3>
              <span style={{
                fontSize: '0.625rem', fontWeight: 700, color: '#00f5a0',
                background: 'rgba(0, 245, 160, 0.1)', border: '1px solid rgba(0, 245, 160, 0.25)',
                padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase'
              }}>
                Active (Redis)
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Zero-latency cache for repeated and semantically equivalent agent prompts.
            </p>
          </div>

          <button
            onClick={handlePurge}
            disabled={isPurging}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--bg-border)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.6875rem',
              color: purgeSuccess ? '#00f5a0' : '#cbd5e1',
              cursor: isPurging ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            {isPurging ? 'Purging...' : (purgeSuccess ? '✓ Flushed' : 'Flush Cache')}
          </button>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 95px), 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(5, 7, 13, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.625rem 0.75rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>HIT RATIO</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00f5a0' }}>41.8%</span>
            <span style={{ fontSize: '0.625rem', color: '#10b981', display: 'block', marginTop: '2px' }}>+5.2% vs yesterday</span>
          </div>

          <div style={{ background: 'rgba(5, 7, 13, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.625rem 0.75rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>CACHED LATENCY</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00f2ff' }}>3.8ms</span>
            <span style={{ fontSize: '0.625rem', color: '#64748b', display: 'block', marginTop: '2px' }}>vs 1,420ms upstream</span>
          </div>

          <div style={{ background: 'rgba(5, 7, 13, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.625rem 0.75rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>SAVED TOKENS</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>1.24M</span>
            <span style={{ fontSize: '0.625rem', color: '#a78bfa', display: 'block', marginTop: '2px' }}>$39.68 saved</span>
          </div>
        </div>

        {/* Progress Bar of Cache Hits */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '4px' }}>
            <span>Cache Efficiency (Simulated rolling 10,000 queries)</span>
            <span style={{ color: '#00f5a0', fontWeight: 600 }}>4,180 Hits / 5,820 Misses</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: '41.8%', height: '100%', background: 'linear-gradient(90deg, #00f5a0, #00f2ff)', borderRadius: '3px' }} />
          </div>
        </div>
      </div>

      {/* Card 2: Quota Guard & Concurrency Throttling (Surface quota.guard.ts) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 20, 34, 0.75) 0%, rgba(11, 16, 26, 0.85) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.25)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle accent glow */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1rem' }}>🛡️</span>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>
                Rate Limiter & Quota Guard
              </h3>
              <span style={{
                fontSize: '0.625rem', fontWeight: 700, color: '#c084fc',
                background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)',
                padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase'
              }}>
                Anti-429 Defense
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Leaky-bucket queuing and Redis token reservations preventing provider rate-limit spikes.
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 95px), 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(5, 7, 13, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.625rem 0.75rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>CONCURRENCY</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>14 <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>/ 50</span></span>
            <span style={{ fontSize: '0.625rem', color: '#00f5a0', display: 'block', marginTop: '2px' }}>Within safe bounds</span>
          </div>

          <div style={{ background: 'rgba(5, 7, 13, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.625rem 0.75rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>SMOOTHING QUEUE</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc' }}>0 <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>dropped</span></span>
            <span style={{ fontSize: '0.625rem', color: '#64748b', display: 'block', marginTop: '2px' }}>14 in transit</span>
          </div>

          <div style={{ background: 'rgba(5, 7, 13, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.625rem 0.75rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>REDIS GUARD TIME</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00f2ff' }}>0.72ms</span>
            <span style={{ fontSize: '0.625rem', color: '#10b981', display: 'block', marginTop: '2px' }}>Atomic INCRBYFLOAT</span>
          </div>
        </div>

        {/* Concurrency Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '4px' }}>
            <span>Active Worker Capacity (28% consumed)</span>
            <span style={{ color: '#c084fc', fontWeight: 600 }}>Zero 429 Errors Recorded</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: '28%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #c084fc)', borderRadius: '3px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
