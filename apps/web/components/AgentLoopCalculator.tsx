'use client';

import React, { useState, useMemo } from 'react';

export default function AgentLoopCalculator() {
  const [dailyTrajectories, setDailyTrajectories] = useState<number>(5000);
  const [turnsPerTrajectory, setTurnsPerTrajectory] = useState<number>(8);
  const [loopIncidentRate, setLoopIncidentRate] = useState<number>(1.5); // % of runs that encounter duplicate tool loop

  // Calculations:
  // 1. Sync DB Logging: 215 ms (0.215 s) per turn
  // 2. In-Memory Guardrail: 0.0223 ms (0.0000223 s) per turn
  const totalTurnsPerDay = dailyTrajectories * turnsPerTrajectory;
  const dbLatencySecondsPerDay = totalTurnsPerDay * 0.215;
  const dbLatencyHoursPerMonth = (dbLatencySecondsPerDay * 30) / 3600;

  const inMemorySecondsPerDay = totalTurnsPerDay * 0.0000223;
  const inMemoryHoursPerMonth = (inMemorySecondsPerDay * 30) / 3600;

  const latencyHoursSavedPerMonth = Math.max(0, dbLatencyHoursPerMonth - inMemoryHoursPerMonth);

  // Runaway Loop Loss:
  // An unhandled loop generates ~40 redundant API calls before hard timeout (~$1.80 loss per runaway incident)
  const monthlyIncidents = (dailyTrajectories * 30) * (loopIncidentRate / 100);
  const estimatedTokenBleedPrevented = Math.round(monthlyIncidents * 1.80);

  return (
    <section style={{
      padding: '4rem 1.5rem',
      position: 'relative',
      background: 'radial-gradient(circle at 50% 30%, rgba(45, 17, 77, 0.4) 0%, rgba(14, 9, 28, 0.95) 70%, #080512 100%)',
      borderTop: '1px solid rgba(139, 92, 246, 0.15)',
      borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            marginBottom: '1rem'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF2E93', boxShadow: '0 0 10px #FF2E93' }} />
            <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#F472B6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Interactive Telemetry Simulator
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            margin: '0.5rem 0 1rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            Calculate Your Agent Guardrail Latency &amp; Cost Savings
          </h2>
          <p style={{
            color: '#A78BFA',
            fontSize: '17px',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Compare synchronous relational DB logging (<span style={{ color: '#F59E0B', fontWeight: 600 }}>~215 ms</span>) against our in-memory sliding window detector (<span style={{ color: '#10B981', fontWeight: 600 }}>22.3 µs</span>).
          </p>
        </div>

        {/* Interactive Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          background: 'rgba(18, 11, 36, 0.75)',
          borderRadius: '24px',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          padding: '2.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          {/* Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Slider 1: Daily Trajectories */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#E9D5FF' }}>Daily Agent Runs / Trajectories</label>
                <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, color: '#F472B6' }}>
                  {dailyTrajectories.toLocaleString()} / day
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="50000"
                step="500"
                value={dailyTrajectories}
                onChange={(e) => setDailyTrajectories(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#FF2E93', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                <span>500</span>
                <span>25,000</span>
                <span>50,000+</span>
              </div>
            </div>

            {/* Slider 2: Tool Turns per Trajectory */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#E9D5FF' }}>Avg Tool Turns Per Trajectory</label>
                <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, color: '#A855F7' }}>
                  {turnsPerTrajectory} turns
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="24"
                step="1"
                value={turnsPerTrajectory}
                onChange={(e) => setTurnsPerTrajectory(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#A855F7', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                <span>3 turns</span>
                <span>12 turns</span>
                <span>24 turns</span>
              </div>
            </div>

            {/* Slider 3: Loop Incident Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#E9D5FF' }}>Duplicate Tool Loop Rate</label>
                <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, color: '#EF4444' }}>
                  {loopIncidentRate}% of runs
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={loopIncidentRate}
                onChange={(e) => setLoopIncidentRate(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#EF4444', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                <span>0.5% (Rare)</span>
                <span>2.5% (Typical)</span>
                <span>5.0% (High risk)</span>
              </div>
            </div>

            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255, 46, 147, 0.08)',
              border: '1px solid rgba(255, 46, 147, 0.2)',
              fontSize: '13px',
              color: '#F472B6',
              lineHeight: 1.5
            }}>
              💡 <strong>Benchmark Rule:</strong> In-memory SHA-256 sliding window takes <strong>22.3 µs</strong> median. PostgreSQL round-trip takes <strong>~215 ms</strong>. Speedup factor: <strong>~9,600× faster</strong>.
            </div>
          </div>

          {/* Results Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center' }}>
            {/* Metric Card 1: Latency Saved */}
            <div style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#6EE7B7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Agent Transit Time Saved
              </div>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#10B981', margin: '4px 0', fontFamily: 'monospace' }}>
                {latencyHoursSavedPerMonth.toFixed(1)} hrs <span style={{ fontSize: '18px', color: '#6EE7B7', fontWeight: 600 }}>/ month</span>
              </div>
              <div style={{ fontSize: '13px', color: '#A7F3D0' }}>
                Eliminates {((totalTurnsPerDay * 0.215) / 60).toFixed(1)} minutes of artificial database lag per day.
              </div>
            </div>

            {/* Metric Card 2: Cost Bleed Prevented */}
            <div style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(139, 92, 246, 0.18) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#F472B6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Runaway Loop Invoices Intercepted
              </div>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#FF2E93', margin: '4px 0', fontFamily: 'monospace' }}>
                ${estimatedTokenBleedPrevented.toLocaleString()} <span style={{ fontSize: '18px', color: '#F472B6', fontWeight: 600 }}>/ month</span>
              </div>
              <div style={{ fontSize: '13px', color: '#E9D5FF' }}>
                Catches infinite tool hallucination loops before downstream LLM token billing triggers.
              </div>
            </div>

            {/* Direct CTA */}
            <a
              href="/docs/getting-started"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '14px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FF2E93 0%, #D946EF 50%, #8B5CF6 100%)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(236, 72, 153, 0.45)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                textAlign: 'center'
              }}
            >
              Deploy 2-Line Guardrail (5 Minutes) →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
