'use client';

import React, { useState, useEffect } from 'react';

type VisualPhase = 'healthy' | 'outage' | 'failover' | 'recovered';

export default function HeroFailoverVisual() {
  const [phase, setPhase] = useState<VisualPhase>('healthy');
  const [timeText, setTimeText] = useState('00:00');
  const [timelineLogs, setTimelineLogs] = useState<string[]>([]);

  useEffect(() => {
    // 8-second visual narrative sequence loop
    const runSequence = () => {
      // Phase 1: Healthy
      setPhase('healthy');
      setTimeText('00:00');
      setTimelineLogs(['[00:00] PRIMARY_ROUTE_OK', 'Routing OpenAI GPT-4o (Active, healthy)']);

      // Phase 2: Outage
      const t1 = setTimeout(() => {
        setPhase('outage');
        setTimeText('00:03');
        setTimelineLogs(prev => [
          '[00:03] PRIMARY_OUTAGE_DETECTED (504)',
          'OpenAI API timeout threshold exceeded (3000ms)',
          ...prev
        ]);
      }, 3000);

      // Phase 3: Failover
      const t2 = setTimeout(() => {
        setPhase('failover');
        setTimeText('00:04');
        setTimelineLogs(prev => [
          '[00:04] CIRCUIT_BREAKER_OPENED',
          '[00:05] STANDBY_ROUTE_ENGAGED (15ms)',
          'Traffic rerouted: Anthropic Sonnet 3.5',
          ...prev
        ]);
      }, 4500);

      // Phase 4: Recovery / Stabilization
      const t3 = setTimeout(() => {
        setPhase('recovered');
        setTimeText('00:07');
        setTimelineLogs(prev => [
          '[00:07] RECOVERY_STABLE',
          'SLA recovered. Zero client sockets dropped.',
          ...prev
        ]);
      }, 6800);

      return [t1, t2, t3];
    };

    let timers = runSequence();

    const masterInterval = setInterval(() => {
      timers.forEach(t => clearTimeout(t));
      timers = runSequence();
    }, 8500);

    return () => {
      timers.forEach(t => clearTimeout(t));
      clearInterval(masterInterval);
    };
  }, []);

  return (
    <div 
      className="hero-visual-card relative w-full max-w-[800px] h-[260px] mx-auto rounded-xl overflow-hidden border border-[#1f1f2e] select-none"
      style={{
        background: 'rgba(11, 11, 15, 0.55)',
        backdropFilter: 'blur(16px)',
        boxShadow: phase === 'outage'
          ? '0 0 40px rgba(239, 68, 68, 0.08), inset 0 0 20px rgba(239, 68, 68, 0.03)'
          : phase === 'failover'
          ? '0 0 45px rgba(99, 102, 241, 0.12), inset 0 0 20px rgba(99, 102, 241, 0.04)'
          : '0 25px 50px rgba(0, 0, 0, 0.65)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* ── Grid Atmosphere & Sweeping Orbits ── */}
      <div 
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.04) 0%, transparent 80%)'
        }}
      />

      {/* Atmospheric Orbital telemetry sweep lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="w-full h-full opacity-[0.07]">
          <circle cx="400" cy="130" r="100" fill="none" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="4 8" />
          <circle cx="400" cy="130" r="130" fill="none" stroke="#8b5cf6" strokeWidth="0.5" />
        </svg>
      </div>

      {/* ── Visual Schematic Topology ── */}
      <svg className="absolute inset-0 w-full h-full block" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="primary-path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.2)" />
            <stop offset="50%" stopColor={phase === 'outage' || phase === 'failover' ? '#ef4444' : '#22c55e'} />
            <stop offset="100%" stopColor={phase === 'outage' || phase === 'failover' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.2)'} />
          </linearGradient>

          <linearGradient id="standby-path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.2)" />
            <stop offset="50%" stopColor={phase === 'failover' || phase === 'recovered' ? '#6366f1' : 'rgba(255, 255, 255, 0.04)'} />
            <stop offset="100%" stopColor={phase === 'failover' || phase === 'recovered' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)'} />
          </linearGradient>
        </defs>

        {/* Cable routes */}
        {/* Client to Gateway */}
        <path d="M 100 130 H 400" fill="none" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1.5" />
        
        {/* Gateway to OpenAI (US-East) */}
        <path 
          d="M 400 130 Q 480 80 560 80" 
          fill="none" 
          stroke="url(#primary-path-grad)" 
          strokeWidth="2" 
          strokeDasharray={phase === 'outage' || phase === 'failover' ? '4 4' : ''} 
          style={{ transition: 'stroke 0.4s' }}
        />

        {/* Gateway to Anthropic (Standby) */}
        <path 
          d="M 400 130 Q 480 180 560 180" 
          fill="none" 
          stroke="url(#standby-path-grad)" 
          strokeWidth="2" 
          strokeDasharray={phase !== 'failover' && phase !== 'recovered' ? '4 4' : ''}
          style={{ transition: 'stroke 0.4s' }}
        />

        {/* ── Active Flow Packets (Physical animation using easing calc) ── */}
        {/* Packet 1: Client -> Selixes */}
        {phase !== 'outage' && (
          <circle r="4" fill={phase === 'healthy' ? '#22c55e' : '#6366f1'} style={{ filter: 'drop-shadow(0 0 6px var(--accent))' }}>
            <animateMotion 
              dur="1.5s" 
              repeatCount="indefinite" 
              path="M 100 130 H 400" 
              calcMode="spline" 
              keyTimes="0; 1" 
              keySplines="0.25 0.1 0.25 1"
            />
          </circle>
        )}

        {/* Packet 2: Selixes -> Upstream */}
        {phase === 'healthy' && (
          <circle r="4" fill="#22c55e" style={{ filter: 'drop-shadow(0 0 6px #22c55e)' }}>
            <animateMotion 
              dur="1.4s" 
              repeatCount="indefinite" 
              path="M 400 130 Q 480 80 560 80" 
              calcMode="spline" 
              keyTimes="0; 1" 
              keySplines="0.1 0.8 0.25 1"
            />
          </circle>
        )}

        {/* Packet 3: Selixes -> Anthropic Failover */}
        {(phase === 'failover' || phase === 'recovered') && (
          <circle r="4" fill="#818cf8" style={{ filter: 'drop-shadow(0 0 6px #6366f1)' }}>
            <animateMotion 
              dur="1.2s" 
              repeatCount="indefinite" 
              path="M 400 130 Q 480 180 560 180" 
              calcMode="spline" 
              keyTimes="0; 1" 
              keySplines="0.1 0.8 0.25 1"
            />
          </circle>
        )}

        {/* ── Nodes ── */}
        {/* Client node */}
        <g transform="translate(100, 130)">
          <circle r="14" fill="#07070a" stroke="#1f1f2e" strokeWidth="2" />
          <circle r="5" fill="#fff" />
          <text y="-22" textAnchor="middle" fill="#8e8e9f" fontSize="9" fontWeight="700" letterSpacing="0.05em">CLIENT APP</text>
        </g>

        {/* Gateway center node (Selixes) */}
        <g transform="translate(400, 130)">
          {/* Heartbeat pulse rings */}
          <circle 
            r="28" 
            fill="none" 
            stroke="var(--accent)" 
            strokeWidth="1" 
            style={{
              animation: 'gateway-ping 1.8s ease-out infinite',
              transformOrigin: 'center',
              opacity: phase === 'outage' ? 0.8 : 0.4
            }} 
          />
          <circle 
            r="18" 
            fill="#09090d" 
            stroke={phase === 'outage' ? '#ef4444' : 'var(--accent)'} 
            strokeWidth="2.5" 
            style={{
              transition: 'all 0.3s',
              filter: phase === 'outage' ? 'drop-shadow(0 0 10px #ef4444)' : 'drop-shadow(0 0 8px rgba(99,102,241,0.4))'
            }} 
          />
          <circle r="11" fill={phase === 'outage' ? '#ef4444' : 'var(--accent-glow)'} style={{ transition: 'all 0.3s' }} />
          <text y="3.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="900">🛡️</text>
          <text y="-25" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800" letterSpacing="0.05em">SELIXES GATEWAY</text>
        </g>

        {/* Upstream Primary OpenAI Node */}
        <g transform="translate(560, 80)">
          <circle 
            r="15" 
            fill="#07070a" 
            stroke={phase === 'outage' || phase === 'failover' ? '#ef4444' : '#1f1f2e'} 
            strokeWidth="2"
            style={{
              transition: 'all 0.3s',
              filter: phase === 'outage' ? 'drop-shadow(0 0 8px #ef4444)' : 'none'
            }}
          />
          <circle r="5.5" fill={phase === 'outage' || phase === 'failover' ? '#ef4444' : '#22c55e'} style={{ transition: 'all 0.3s' }} />
          <text x="24" y="3" fill="#cbd5e1" fontSize="9" fontWeight="700">OpenAI GPT-4o</text>
          <text x="24" y="14" fill={phase === 'outage' || phase === 'failover' ? '#ef4444' : '#52526b'} fontSize="8" fontWeight="600" style={{ transition: 'all 0.3s' }}>
            {phase === 'outage' || phase === 'failover' ? '🛑 OFFLINE (504)' : '🟢 ONLINE (Healthy)'}
          </text>
        </g>

        {/* Upstream Standby Anthropic Node */}
        <g transform="translate(560, 180)">
          <circle 
            r="15" 
            fill="#07070a" 
            stroke={phase === 'failover' || phase === 'recovered' ? '#6366f1' : '#1f1f2e'} 
            strokeWidth="2"
            style={{
              transition: 'all 0.3s',
              filter: phase === 'failover' || phase === 'recovered' ? 'drop-shadow(0 0 8px #6366f1)' : 'none'
            }}
          />
          <circle r="5.5" fill={phase === 'failover' || phase === 'recovered' ? '#6366f1' : '#52526b'} style={{ transition: 'all 0.3s' }} />
          <text x="24" y="3" fill="#cbd5e1" fontSize="9" fontWeight="700">Anthropic Claude</text>
          <text x="24" y="14" fill={phase === 'failover' || phase === 'recovered' ? '#34d399' : '#52526b'} fontSize="8" fontWeight="600" style={{ transition: 'all 0.3s' }}>
            {phase === 'failover' || phase === 'recovered' ? '⚡ ACTIVE (FAILOVER)' : '💤 STANDBY'}
          </text>
        </g>
      </svg>

      {/* ── Active scan beam sweep (warning scan during loop) ── */}
      {phase === 'outage' && (
        <div 
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent pointer-events-none shadow-[0_0_10px_#ef4444]" 
          style={{
            animation: 'laser-scan 1.2s ease-in-out infinite'
          }}
        />
      )}

      {/* ── Micro-Timeline Overlay ── */}
      <div 
        className="absolute top-4 left-4 z-10 w-[240px] p-3 rounded-lg border border-[#1c1c2b]"
        style={{
          background: 'rgba(7, 7, 10, 0.8)',
          backdropFilter: 'blur(10px)',
          fontFamily: 'monospace'
        }}
      >
        <div className="flex justify-between items-center border-b border-[#1f1f2e] pb-2 mb-2">
          <span style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--accent-hover)', letterSpacing: '0.08em' }}>INCIDENT TIMELINE</span>
          <span style={{ fontSize: '0.65rem', color: '#c7d2fe', fontWeight: 700 }}>T+{timeText}s</span>
        </div>
        <div style={{ height: '70px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.65rem', lineHeight: '1.4' }}>
          {timelineLogs.map((log, i) => {
            const isHeader = log.startsWith('[');
            const isError = log.includes('OUTAGE') || log.includes('Timeout');
            const isAction = log.includes('CIRCUIT') || log.includes('STANDBY');
            
            let color = '#a1a1b0';
            if (isError) color = '#f87171';
            else if (isAction) color = '#a5b4fc';
            else if (isHeader) color = '#c7d2fe';
            
            return (
              <div key={i} style={{ color, opacity: i === 0 ? 1 : 0.45 - i * 0.1, transition: 'opacity 0.25s' }}>
                {log}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── State Info Box Overlay ── */}
      <div 
        className="absolute bottom-4 right-4 z-10 p-2 px-3 rounded-md border border-[#1c1c2b] text-[0.675rem] font-semibold flex items-center gap-2"
        style={{
          background: 'rgba(7, 7, 10, 0.85)',
          color: '#cbd5e1'
        }}
      >
        <span>STATUS:</span>
        <span style={{
          color: phase === 'healthy' ? '#22c55e' : phase === 'outage' ? '#ef4444' : '#818cf8',
          textTransform: 'uppercase',
          fontWeight: 800,
          letterSpacing: '0.05em'
        }}>
          {phase === 'healthy' ? 'Normal Routing' : phase === 'outage' ? 'Tripping circuit breaker' : phase === 'recovered' ? 'Stable via Standby' : 'Failover engaged'}
        </span>
      </div>

      <style jsx>{`
        @keyframes gateway-ping {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes laser-scan {
          0%, 100% { top: 10%; opacity: 0.1; }
          50% { top: 90%; opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
