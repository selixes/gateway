'use client';

import React, { useRef, useEffect } from 'react';
import SectionCanvas from './SectionCanvas';
import InteractiveGlowCard from './InteractiveGlowCard';

export interface LogLine {
  text: string;
  type: 'info' | 'warn' | 'error' | 'success' | 'system';
  time: string;
}

export interface Preset {
  id: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii';
  name: string;
  desc: string;
  impactWithout: { downtime: string; lostRequests: string; cost: string };
  impactWith: { downtime: string; lostRequests: string; cost: string };
  scorecard: { recoveryTime: string; requestsProtected: string; costAvoided: string; status: string };
  codeConfig: { budgetCap: number; concurrencyLimit: number; fallbackRoute: 'anthropic' | 'gemini' | 'ollama' };
  steps: { text: string; type: 'info' | 'warn' | 'error' | 'success' | 'system' }[];
}

export const presets: Preset[] = [
  {
    id: 'outage',
    name: '📡 Production Outage',
    desc: 'Simulate OpenAI API downtime and track instantaneous 15ms failover routing.',
    impactWithout: { downtime: '4m 18s', lostRequests: '1,248', cost: '$82.40' },
    impactWith: { downtime: '15ms', lostRequests: '0', cost: '$0.85 (Standby)' },
    scorecard: { recoveryTime: '15ms', requestsProtected: '100% (0 Lost)', costAvoided: '$81.55', status: 'SECURED' },
    codeConfig: { budgetCap: 1.50, concurrencyLimit: 10, fallbackRoute: 'anthropic' },
    steps: [
      { text: '📡 Dispatching prompt payload to primary route: OpenAI GPT-4o...', type: 'info' },
      { text: '⏳ OpenAI US-East latency spiking past SLA thresholds (3000ms)...', type: 'warn' },
      { text: '❌ HTTP 504 GATEWAY TIMEOUT returned from OpenAI servers.', type: 'error' },
      { text: '🛡️ Selixes Circuit Breaker tripped. Engaging autonomic routing policy.', type: 'system' },
      { text: '🔄 Rerouting request traffic stream to Standby Tier: Anthropic Claude 3.5 Sonnet...', type: 'info' },
      { text: '✅ Anthropic answered successfully (status: 200, latency: 180ms).', type: 'success' },
      { text: '🛡️ Uptime preserved pre-TTFT. System survived.', type: 'success' }
    ]
  },
  {
    id: 'loop',
    name: '🔄 Runaway Agent Loop',
    desc: 'Simulate an autonomous agent trapped in a recursive tool loop draining your wallet.',
    impactWithout: { downtime: '12m 45s', lostRequests: 'Recursive Loop', cost: '$188.00' },
    impactWith: { downtime: '0s (Capped)', lostRequests: '0', cost: '$1.50 (Capped)' },
    scorecard: { recoveryTime: 'Under 1ms', requestsProtected: '100% (47 Blocked)', costAvoided: '$186.50', status: 'CAPPED' },
    codeConfig: { budgetCap: 1.50, concurrencyLimit: 5, fallbackRoute: 'anthropic' },
    steps: [
      { text: '🤖 Agent initial plan formulated: start web research workflow...', type: 'info' },
      { text: '📥 Step 1: Query Google Search API... (Cost: $0.30)', type: 'info' },
      { text: '📥 Step 2: Recursively scrape content... (Cost: $0.60)', type: 'info' },
      { text: '⚠️ Recursive tool loop detected: Agent invoking same tools iteratively.', type: 'warn' },
      { text: '📈 Wallet drainage warning: Cumulative session spend at $0.90...', type: 'warn' },
      { text: '📈 Cumulative session spend hits budget threshold at $1.50...', type: 'warn' },
      { text: '🛡️ BUDGET GATE TRIPPED: x-selixes-max-session-cost limit (1.50) exceeded.', type: 'system' },
      { text: '🚫 Intercepting runaway agent loop: Selixes deflecting active connections.', type: 'error' },
      { text: '✅ Request blocked with HTTP 429 runaway_agent_protection. Budget secured!', type: 'success' }
    ]
  },
  {
    id: 'meltdown',
    name: '💥 Provider Meltdown',
    desc: 'Simulate global cloud outages across both OpenAI and Anthropic simultaneously.',
    impactWithout: { downtime: '2h 14m', lostRequests: '8,410', cost: '$0.00' },
    impactWith: { downtime: '14ms', lostRequests: '0', cost: '$0.00 (Self-Hosted)' },
    scorecard: { recoveryTime: '14ms', requestsProtected: '100% (0 Lost)', costAvoided: 'Continuity Active', status: 'STANDALONE' },
    codeConfig: { budgetCap: 5.00, concurrencyLimit: 10, fallbackRoute: 'ollama' },
    steps: [
      { text: '📡 Dispatching batch analysis query to primary: OpenAI GPT-4o...', type: 'info' },
      { text: '❌ Primary endpoint offline: OpenAI returned 502 Bad Gateway.', type: 'error' },
      { text: '🔄 Failover fallback initiated: Routing to Anthropic Claude...', type: 'system' },
      { text: '❌ Standby endpoint offline: Anthropic returned 503 Service Unavailable.', type: 'error' },
      { text: '⚠️ GLOBAL BLACKOUT DETECTED: All external cloud endpoints degraded.', type: 'warn' },
      { text: '🛡️ Engaging Local Continuity Engine: Proxying requests to sovereign Local Edge...', type: 'system' },
      { text: '🔌 Activating Ollama Llama-3 local VPC container node...', type: 'info' },
      { text: '✅ Local model processed prompt successfully (status: 200, latency: 14ms).', type: 'success' },
      { text: '🛡️ Zero downtime continuity maintained offline. Prompts preserved!', type: 'success' }
    ]
  },
  {
    id: 'cost',
    name: '💸 Cost Explosion',
    desc: 'Simulate a concurrent swarm of 100 agents flooding endpoints simultaneously.',
    impactWithout: { downtime: 'Server Collapse', lostRequests: '94 (Crashed)', cost: '$410.00' },
    impactWith: { downtime: '0s (Throttled)', lostRequests: '0 (Queued)', cost: '$12.00 (Throttled)' },
    scorecard: { recoveryTime: '0.8ms', requestsProtected: '100% (94 Throttled)', costAvoided: '$398.00', status: 'ISOLATED' },
    codeConfig: { budgetCap: 10.00, concurrencyLimit: 3, fallbackRoute: 'anthropic' },
    steps: [
      { text: '🌊 Swarm burst: Launching concurrent pipelines (100 parallel active agents)...', type: 'info' },
      { text: '📥 Concurrency load rising: Admitting Request #1, #2, #3...', type: 'info' },
      { text: '⚠️ Swarm ceiling warning: Concurrency limit reaching standard levels...', type: 'warn' },
      { text: '🛡️ CONCURRENCY CEILING TRIAGED: limit (x-selixes-max-concurrent-calls: 3) hit.', type: 'system' },
      { text: '🚫 Request #4: Blocked and isolated. Thrown 429 queue limit reached.', type: 'error' },
      { text: '🚫 Request #5: Blocked and isolated. Thrown 429 queue limit reached.', type: 'error' },
      { text: '📤 Request #1 completed successfully. Active slots open: 1', type: 'success' },
      { text: '📥 Admitting next queued worker (Request #6). Swarm flow modulated safely.', type: 'info' },
      { text: '🛡️ Swarm throttle confirmed. Sub-millisecond latency isolation verified.', type: 'success' }
    ]
  },
  {
    id: 'pii',
    name: '🔒 PII Leakage Attempt',
    desc: 'Detect and mask sensitive client information at the edge before LLM transport.',
    impactWithout: { downtime: 'Compliance Breach', lostRequests: '0 (Data Leaked)', cost: 'Legal Liability' },
    impactWith: { downtime: '4ms (Filter)', lostRequests: '0 (Redacted)', cost: 'Zero Liability' },
    scorecard: { recoveryTime: '4ms', requestsProtected: '100% (1 Leak Blocked)', costAvoided: 'Zero Audit Risk', status: 'ANONYMIZED' },
    codeConfig: { budgetCap: 10.00, concurrencyLimit: 10, fallbackRoute: 'gemini' },
    steps: [
      { text: '📡 Processing customer service request containing user prompt...', type: 'info' },
      { text: '🔍 Scanning prompt payload for sensitive parameters...', type: 'info' },
      { text: '⚠️ SECURITY ALERT: PII patterns detected (Customer SSN: ***-**-4912, OpenAI API Key).', type: 'warn' },
      { text: '🛡️ Edge Sanitization Engaged: x-selixes-pii-scrubbing active.', type: 'system' },
      { text: '✂️ Redaction applied: SSN masked to [REDACTED_SSN], API Key replaced with [REDACTED_TOKEN].', type: 'info' },
      { text: '📤 Releasing sanitized prompt payload securely to upstream provider...', type: 'info' },
      { text: '✅ Upstream provider answered safely without receiving sensitive raw customer data.', type: 'success' },
      { text: '🛡️ Edge compliance boundary secure. Data boundary preserved!', type: 'success' }
    ]
  }
];

interface IncidentResponseSimulatorProps {
  isMobile: boolean;
  currentPreset: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii';
  simPhase: 'idle' | 'running' | 'completed';
  simProgress: number;
  simLogs: LogLine[];
  activeStepIdx: number;
  simBudgetSpent: number;
  maskedPIICount: number;
  activeRoutePath: 'openai' | 'anthropic' | 'ollama' | 'none';
  openaiStatus: 'healthy' | 'offline' | 'degraded';
  anthropicStatus: 'healthy' | 'offline' | 'degraded';
  scrambledSSN: string;
  scrambledKey: string;
  healthGrid: string[];
  executeSimulation: (presetId: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii') => void;
  replicateProtection: (presetId: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii') => void;
  selectPreset: (presetId: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii') => void;
}

export default function IncidentResponseSimulator({
  isMobile,
  currentPreset,
  simPhase,
  simLogs,
  activeStepIdx,
  simBudgetSpent,
  activeRoutePath,
  openaiStatus,
  anthropicStatus,
  scrambledSSN,
  scrambledKey,
  healthGrid,
  executeSimulation,
  replicateProtection,
  selectPreset
}: IncidentResponseSimulatorProps) {
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll simulated logs strictly inside the terminal container div without scrolling the page window
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [simLogs]);

  return (
    <SectionCanvas>
      <div style={{ maxWidth: '1160px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
      
      {/* Header Area with Flashing War Room Badge */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '6px 14px', borderRadius: '30px', marginBottom: '1.25rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentPreset === 'outage' && activeStepIdx >= 2 ? '#ef4444' : '#22c55e', display: 'inline-block', boxShadow: currentPreset === 'outage' && activeStepIdx >= 2 ? '0 0 8px #ef4444' : '0 0 8px #22c55e', animation: 'pulse-dot 1.5s infinite' }} />
          <span style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--accent-hover)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            WAR ROOM ACTIVE
          </span>
        </div>
        
        <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 2.85rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.85rem', color: '#fff' }}>
          Incident Response Simulator
        </h2>
        <p style={{ color: '#8e8e9f', fontSize: '1.075rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.6 }}>
          Select a critical runtime scenario, execute live chaos tests, and see how the gateway reacts as a single autonomic system.
        </p>
      </div>

      {/* Master Dashboard Grid */}
      <InteractiveGlowCard borderRadius="20px" style={{ boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: '2.5rem',
          padding: isMobile ? '1.5rem' : '2.5rem',
        }}>
        
        {/* Left Column: Preset Controller Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#52526b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '1rem' }}>
              Select Operational Scenario
            </span>
            
            {/* Scenario buttons */}
            <div className="flex flex-wrap gap-2 sm:gap-3" style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? '0.5rem' : '0.75rem' }}>
              {presets.map((preset) => {
                const isActive = currentPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset.id)}
                    disabled={simPhase === 'running'}
                    className={isActive ? "scenario-btn-mainframe active-cartridge flex-shrink-0 text-xs sm:text-sm" : "scenario-btn-mainframe flex-shrink-0 text-xs sm:text-sm"}
                    style={{
                      textAlign: 'left',
                      padding: isMobile ? '0.8rem 1rem' : '1.2rem',
                      borderRadius: '12px',
                      cursor: simPhase === 'running' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      opacity: simPhase === 'running' && !isActive ? 0.4 : 1,
                      flexGrow: isMobile ? 1 : 0,
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isActive ? '#fff' : '#c3c3d5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      {preset.name}
                      {isActive && <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIVE</span>}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: '#7a7a8f', lineHeight: 1.4 }}>
                      {preset.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div style={{ borderTop: '1px solid #1a1a26', paddingTop: '1.5rem' }}>
            {simPhase === 'completed' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => replicateProtection(currentPreset)}
                  className="btn-primary"
                  style={{ justifyContent: 'center', width: '100%', padding: '0.9rem', fontSize: '0.85rem' }}
                >
                  ⚙️ Replicate This Protection
                </button>
                <button
                  onClick={() => selectPreset(currentPreset)}
                  className="btn-ghost"
                  style={{ justifyContent: 'center', width: '100%', padding: '0.9rem', fontSize: '0.85rem' }}
                >
                  🔄 Reset Simulation
                </button>
              </div>
            ) : (
              <button
                onClick={() => executeSimulation(currentPreset)}
                disabled={simPhase === 'running'}
                className="btn-primary"
                style={{
                  justifyContent: 'center',
                  width: '100%',
                  padding: '1rem',
                  background: simPhase === 'running' ? '#181824' : 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: simPhase === 'running' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: simPhase === 'running' ? 'none' : '0 0 20px rgba(99,102,241,0.25)'
                }}
              >
                {simPhase === 'running' ? '⚡ RUNNING CHAOS TEST...' : '🚀 RUN INCIDENT SIMULATION'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Visual Workspace & Diagnostics Shell */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
          
          {/* Dynamic Uptime Health Telemetry Stream */}
          <div style={{ background: '#07070a', border: '1px solid #1a1a26', borderRadius: '10px', padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#8e8e9f', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentPreset === 'outage' && activeStepIdx >= 2 ? '#ef4444' : '#22c55e', display: 'inline-block' }} />
                API Gateway Telemetry Stream (15m window)
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-hover)', fontWeight: 700, fontFamily: 'monospace' }}>
                {currentPreset === 'outage' && activeStepIdx >= 2 ? 'DEGRADED / FAILOVER ROUTED' : 'Uptime 100.00%'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', alignItems: 'flex-end', height: '28px', paddingBottom: '2px' }}>
              {healthGrid.map((type, idx) => {
                let bg = '#22c55e';
                let title = 'Healthy (45ms)';
                if (type === 'error') { bg = '#ef4444'; title = 'Outage (Timeout)'; }
                else if (type === 'warning') { bg = '#fb923c'; title = 'Degraded (140ms)'; }
                else if (type === 'standby') { bg = '#818cf8'; title = 'Standby Failover (180ms)'; }
                
                return (
                  <div
                    key={idx}
                    title={title}
                    style={{
                      width: '6px',
                      height: '24px',
                      background: bg,
                      borderRadius: '1.5px',
                      boxShadow: `0 0 6px ${bg}22`,
                      transition: 'all 0.3s ease',
                      flexShrink: 0,
                      transformOrigin: 'bottom',
                      animation: simPhase === 'idle' ? 'bar-pulse 1.4s ease-in-out infinite' : 'none',
                      animationDelay: simPhase === 'idle' ? `${idx * 0.05}s` : '0s'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Main Visual Board Panel */}
          <div style={{
            background: '#040406', border: '1px solid #1a1a26', borderRadius: '12px',
            padding: '1.5rem', minHeight: '260px', position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
          }}>
            
            {/* ── Visual Component A: Global Outage Radar ── */}
            {((currentPreset === 'outage' || currentPreset === 'meltdown') || (simPhase === 'completed' && currentPreset === 'cost')) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%', height: '100%', zIndex: 1 }} className="fade-up">
                <div style={{ textAlign: 'center', fontSize: '0.725rem', fontWeight: 700, color: 'var(--accent-hover)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Global Outage Radar & Autonomic Router
                </div>
                
                <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="100%" height="160" viewBox="0 0 500 160" style={{ overflow: 'visible' }}>
                    {/* High-tech Neon filters and blueprint grid pattern */}
                    <defs>
                      <filter id="neon-glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="neon-glow-red" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <pattern id="svg-blueprint" width="16" height="16" patternUnits="userSpaceOnUse">
                        <rect width="16" height="16" fill="transparent" />
                        <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(99, 102, 241, 0.025)" strokeWidth="0.5"/>
                      </pattern>
                    </defs>

                    {/* Blueprint Background Grid */}
                    <rect width="100%" height="100%" fill="url(#svg-blueprint)" />

                    {/* Sonar rings behind the center shield node */}
                    <circle cx="250" cy="80" r="100" fill="none" stroke="rgba(99,102,241,0.03)" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="250" cy="80" r="70" fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
                    <circle cx="250" cy="80" r="40" fill="none" stroke="rgba(99,102,241,0.08)" strokeWidth="1" />
                    <circle cx="250" cy="80" r="10" fill="none" className="sonar-ripple-circle" stroke="var(--accent)" strokeWidth="1.5" />

                    {/* Sweeping Sonar Laser Line */}
                    <line x1="250" y1="80" x2="330" y2="30" className="radar-sweep-line" stroke="var(--accent)" strokeWidth="1.5" opacity="0.45" filter="url(#neon-glow-indigo)" />

                    {/* Connecting Paths */}
                    <path id="client-to-hub" d="M 40 80 Q 140 80 240 80" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="2" />
                    
                    <path id="hub-to-openai" d="M 260 70 Q 340 30 420 30" fill="none" stroke={openaiStatus === 'offline' ? '#ef4444' : openaiStatus === 'degraded' ? '#fb923c' : 'rgba(255, 255, 255, 0.04)'} strokeWidth="2" />
                    <path id="hub-to-anthropic" d="M 260 80 Q 340 80 420 80" fill="none" stroke={activeRoutePath === 'anthropic' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.04)'} strokeWidth="2" />
                    <path id="hub-to-ollama" d="M 260 90 Q 340 130 420 130" fill="none" stroke={activeRoutePath === 'ollama' ? '#3b82f6' : 'rgba(255, 255, 255, 0.04)'} strokeWidth="2" />

                    {/* Active moving flow packets */}
                    {simPhase === 'running' && activeRoutePath === 'openai' && openaiStatus === 'healthy' && (
                      <>
                        <circle r="4" fill="#22c55e" filter="url(#neon-glow-indigo)">
                          <animateMotion dur="1.8s" repeatCount="indefinite" path="M 40 80 Q 140 80 240 80" />
                        </circle>
                        <circle r="4" fill="#22c55e" filter="url(#neon-glow-indigo)">
                          <animateMotion dur="1.8s" repeatCount="indefinite" path="M 260 70 Q 340 30 420 30" />
                        </circle>
                      </>
                    )}
                    {simPhase === 'running' && activeRoutePath === 'openai' && openaiStatus === 'degraded' && (
                      <>
                        <circle r="4" fill="#fb923c" filter="url(#neon-glow-indigo)">
                          <animateMotion dur="3s" repeatCount="indefinite" path="M 40 80 Q 140 80 240 80" />
                        </circle>
                        <circle r="4" fill="#fb923c" filter="url(#neon-glow-indigo)">
                          <animateMotion dur="3s" repeatCount="indefinite" path="M 260 70 Q 340 30 420 30" />
                        </circle>
                      </>
                    )}
                    {simPhase === 'running' && activeRoutePath === 'anthropic' && (
                      <>
                        <circle r="4" fill="var(--accent)" filter="url(#neon-glow-indigo)">
                          <animateMotion dur="1.2s" repeatCount="indefinite" path="M 40 80 Q 140 80 240 80" />
                        </circle>
                        <circle r="4" fill="var(--accent)" filter="url(#neon-glow-indigo)">
                          <animateMotion dur="1.2s" repeatCount="indefinite" path="M 260 80 Q 340 80 420 80" />
                        </circle>
                      </>
                    )}
                    {simPhase === 'running' && activeRoutePath === 'ollama' && (
                      <>
                        <circle r="4" fill="#3b82f6" filter="url(#neon-glow-indigo)">
                          <animateMotion dur="1.4s" repeatCount="indefinite" path="M 40 80 Q 140 80 240 80" />
                        </circle>
                        <circle r="4" fill="#3b82f6" filter="url(#neon-glow-indigo)">
                          <animateMotion dur="1.4s" repeatCount="indefinite" path="M 260 90 Q 340 130 420 130" />
                        </circle>
                      </>
                    )}

                    {/* Nodes */}
                    {/* Client Node */}
                    <g transform="translate(40, 80)">
                      <circle r="14" fill="#0d0d12" stroke="#1f1f2c" strokeWidth="2" />
                      <circle r="6" fill="#fff" />
                      <text y="-20" textAnchor="middle" fill="#8e8e9f" fontSize="9" fontWeight="700">CLIENT APP</text>
                    </g>

                    {/* Selixes Gateway Node with glowing outer border */}
                    <g transform="translate(250, 80)" className="radar-node-pulse">
                      <circle r="22" fill="#0d0d12" stroke="var(--accent)" strokeWidth="2" filter="url(#neon-glow-indigo)" />
                      <circle r="16" fill="var(--accent-glow)" />
                      <text y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">🛡️</text>
                      <text y="-28" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800">SELIXES</text>
                      <text y="32" textAnchor="middle" fill="#52526b" fontSize="7" fontWeight="600">Zurich Neutral Router</text>
                    </g>

                    {/* Upstream OpenAI Node with custom filter on error */}
                    <g transform="translate(420, 30)">
                      <circle r="14" fill="#0d0d12" stroke={openaiStatus === 'offline' ? '#ef4444' : openaiStatus === 'degraded' ? '#fb923c' : '#1f1f2c'} strokeWidth="2" filter={openaiStatus === 'offline' ? 'url(#neon-glow-red)' : 'none'} />
                      <circle r="6" fill={openaiStatus === 'offline' ? '#ef4444' : openaiStatus === 'degraded' ? '#fb923c' : '#22c55e'} />
                      <text x="22" y="3" fill="#c3c3d5" fontSize="9" fontWeight="700">OpenAI (US-East)</text>
                      {openaiStatus === 'offline' && <text x="22" y="14" fill="#ef4444" fontSize="8" fontWeight="600">🛑 OFFLINE (504)</text>}
                      {openaiStatus === 'degraded' && <text x="22" y="14" fill="#fb923c" fontSize="8" fontWeight="600">⚠️ DEGRADED (3200ms)</text>}
                    </g>

                    {/* Upstream Anthropic Node */}
                    <g transform="translate(420, 80)">
                      <circle r="14" fill="#0d0d12" stroke={anthropicStatus === 'offline' ? '#ef4444' : activeRoutePath === 'anthropic' ? 'var(--accent)' : '#1f1f2c'} strokeWidth="2" filter={activeRoutePath === 'anthropic' ? 'url(#neon-glow-indigo)' : 'none'} />
                      <circle r="6" fill={anthropicStatus === 'offline' ? '#ef4444' : activeRoutePath === 'anthropic' ? 'var(--accent)' : '#a5b4fc'} />
                      <text x="22" y="3" fill="#c3c3d5" fontSize="9" fontWeight="700">Anthropic (US-West)</text>
                      {activeRoutePath === 'anthropic' && <text x="22" y="14" fill="#34d399" fontSize="8" fontWeight="600">🟢 ACTIVE (15ms failover)</text>}
                      {anthropicStatus === 'offline' && <text x="22" y="14" fill="#ef4444" fontSize="8" fontWeight="600">🛑 OFFLINE (503)</text>}
                    </g>

                    {/* Continuity Ollama local Node */}
                    <g transform="translate(420, 130)">
                      <circle r="14" fill="#0d0d12" stroke={activeRoutePath === 'ollama' ? '#3b82f6' : '#1f1f2c'} strokeWidth="2" filter={activeRoutePath === 'ollama' ? 'url(#neon-glow-indigo)' : 'none'} />
                      <circle r="6" fill={activeRoutePath === 'ollama' ? '#3b82f6' : '#52526b'} />
                      <text x="22" y="3" fill="#c3c3d5" fontSize="9" fontWeight="700">Ollama local node</text>
                      {activeRoutePath === 'ollama' && <text x="22" y="14" fill="#60a5fa" fontSize="8" fontWeight="600">🔒 CONTINUITY ENGAGED</text>}
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {/* ── Visual Component B: Autonomous Trajectory Explorer ── */}
            {((currentPreset === 'loop' || currentPreset === 'cost') && simPhase !== 'completed') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%', height: '100%', zIndex: 1 }} className="fade-up">
                <div style={{ textAlign: 'center', fontSize: '0.725rem', fontWeight: 700, color: 'var(--accent-hover)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {currentPreset === 'loop' ? 'Agent Trajectory Loop Analyzer' : 'Concurrency Swarm Modulator'}
                </div>

                <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <svg width="100%" height="160" viewBox="0 0 500 160" style={{ overflow: 'visible' }}>
                    {/* High-tech SVG Filters and Blueprint definitions */}
                    <defs>
                      <filter id="neon-glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="neon-glow-red" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <pattern id="svg-blueprint" width="16" height="16" patternUnits="userSpaceOnUse">
                        <rect width="16" height="16" fill="transparent" />
                        <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(99, 102, 241, 0.025)" strokeWidth="0.5"/>
                      </pattern>
                    </defs>

                    {/* Blueprint Background Grid */}
                    <rect width="100%" height="100%" fill="url(#svg-blueprint)" />

                     {/* Node Path lines */}
                    <path d="M 40 80 Q 90 80 140 80" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="2" />
                    
                    {/* Recursive Loop paths */}
                    <path id="agent-loop-path" d="M 180 80 C 180 20, 320 20, 320 80 C 320 140, 180 140, 180 80" fill="none" stroke={activeStepIdx >= 3 ? '#ef4444' : 'rgba(255, 255, 255, 0.04)'} strokeWidth="2" filter={activeStepIdx >= 3 ? 'url(#neon-glow-red)' : 'none'} />
                    
                    <path d="M 340 80 H 440" fill="none" stroke={activeStepIdx >= 6 ? '#22c55e' : 'rgba(255, 255, 255, 0.04)'} strokeWidth="2" />

                    {/* Concentric Multi-Agent Swarm concentric orbits (exclusive to Cost preset) */}
                    {currentPreset === 'cost' && (
                      <>
                        <circle cx="160" cy="80" r="28" fill="none" stroke="rgba(99, 102, 241, 0.06)" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx="160" cy="80" r="42" fill="none" stroke="rgba(99, 102, 241, 0.04)" strokeWidth="1" />
                        <circle cx="160" cy="80" r="56" fill="none" stroke="rgba(99, 102, 241, 0.02)" strokeWidth="1" strokeDasharray="4 4" />
                        
                        <g className="orbit-container-cw">
                          <circle cx="188" cy="80" r="3.5" fill="var(--accent)" filter="url(#neon-glow-indigo)" />
                        </g>
                        <g className="orbit-container-ccw">
                          <circle cx="118" cy="80" r="3" fill="#a5b4fc" filter="url(#neon-glow-indigo)" />
                        </g>
                        <g className="orbit-container-cw">
                          <circle cx="160" cy="136" r="3" fill="#22c55e" filter="url(#neon-glow-indigo)" />
                        </g>
                      </>
                    )}

                    {/* Looping flow animations */}
                    {simPhase === 'running' && activeStepIdx < 6 && (
                      <>
                        <path d="M 180 80 C 180 20, 320 20, 320 80 C 320 140, 180 140, 180 80" fill="none" stroke={activeStepIdx >= 3 ? '#ef4444' : 'var(--accent)'} strokeWidth="2.5" className="agent-loop-active" filter={activeStepIdx >= 3 ? 'url(#neon-glow-red)' : 'url(#neon-glow-indigo)'} />
                        <circle r="4.5" fill={activeStepIdx >= 3 ? '#ef4444' : 'var(--accent)'} filter={activeStepIdx >= 3 ? 'url(#neon-glow-red)' : 'url(#neon-glow-indigo)'}>
                          <animateMotion dur="1.2s" repeatCount="indefinite" path="M 180 80 C 180 20, 320 20, 320 80 C 320 140, 180 140, 180 80" />
                        </circle>
                      </>
                    )}

                    {simPhase === 'running' && activeStepIdx >= 6 && (
                      <path d="M 340 80 H 440" fill="none" stroke="#22c55e" strokeWidth="2.5" className="dash-flow-active" filter="url(#neon-glow-indigo)" />
                    )}

                    {/* Core nodes */}
                    <g transform="translate(40, 80)">
                      <circle r="12" fill="#0d0d12" stroke="#1f1f2c" strokeWidth="2" />
                      <circle r="4" fill="#a5b4fc" />
                      <text y="-18" textAnchor="middle" fill="#8e8e9f" fontSize="8" fontWeight="700">DISPATCH</text>
                    </g>

                    <g transform="translate(160, 80)">
                      <circle r="18" fill="#0d0d12" stroke={activeStepIdx >= 3 ? '#ef4444' : 'var(--accent)'} strokeWidth="2" filter={activeStepIdx >= 3 ? 'url(#neon-glow-red)' : 'none'} />
                      <circle r="12" fill="rgba(99,102,241,0.05)" />
                      <text y="3" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800">🤖</text>
                      <text y="-24" textAnchor="middle" fill="#c3c3d5" fontSize="8" fontWeight="700">Agent Core</text>
                    </g>

                    <g transform="translate(250, 40)">
                      <circle r="14" fill="#0d0d12" stroke="#1f1f2c" strokeWidth="1.5" />
                      <text y="3" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">🔍</text>
                      <text y="-20" textAnchor="middle" fill="#8e8e9f" fontSize="7" fontWeight="600">Search Tool</text>
                    </g>

                    <g transform="translate(320, 80)">
                      <circle r="14" fill="#0d0d12" stroke="#1f1f2c" strokeWidth="1.5" />
                      <text y="3" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">💾</text>
                      <text y="-20" textAnchor="middle" fill="#8e8e9f" fontSize="7" fontWeight="600">Memory Write</text>
                    </g>

                    <g transform="translate(440, 80)">
                      <circle r="14" fill="#0d0d12" stroke={activeStepIdx >= 6 ? '#22c55e' : '#1f1f2c'} strokeWidth="2" filter={activeStepIdx >= 6 ? 'url(#neon-glow-indigo)' : 'none'} />
                      <circle r="5" fill={activeStepIdx >= 6 ? '#22c55e' : '#1a1a24'} />
                      <text y="-20" textAnchor="middle" fill="#8e8e9f" fontSize="8" fontWeight="700">COMPLETED</text>
                    </g>

                    {/* Real-time Budget Counter box */}
                    <g transform="translate(250, 130)">
                      <rect x="-45" y="-12" width="90" height="24" rx="4" fill="#0d0d12" stroke="#1f1f2d" strokeWidth="1" />
                      <text textAnchor="middle" y="3" fill={simBudgetSpent >= 1.20 ? '#ef4444' : '#fff'} fontSize="9" fontWeight="800" fontFamily="monospace">
                        Spent: ${simBudgetSpent.toFixed(2)}
                      </text>
                    </g>
                  </svg>

                  {/* Glassmorphic Circuit Breaker Shield popup overlay */}
                  {simPhase === 'running' && activeStepIdx >= 6 && (
                    <div className="shield-glass-overlay" style={{
                      position: 'absolute', inset: '10px', borderRadius: '10px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      border: '1.5px solid var(--accent)'
                    }}>
                      <span style={{ fontSize: '1.75rem', marginBottom: '4px' }}>🛡️</span>
                      <span style={{
                        fontSize: '0.675rem', fontWeight: 900, color: '#ef4444',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        background: 'rgba(239,68,68,0.12)', padding: '4px 10px',
                        borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)',
                        marginBottom: '4px', boxShadow: '0 0 10px rgba(239,68,68,0.2)'
                      }}>
                        CIRCUIT BREAKER SHIELD ACTIVE
                      </span>
                      <span style={{ fontSize: '0.725rem', color: '#cbd5e1', fontWeight: 600 }}>
                        Capped runaway loop dynamically at budget threshold limit of $1.50!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Visual Component C: PII Leakage Scanner ── */}
            {(currentPreset === 'pii' && simPhase !== 'completed') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%', height: '100%', zIndex: 1 }} className="fade-up">
                <div style={{ textAlign: 'center', fontSize: '0.725rem', fontWeight: 700, color: 'var(--accent-hover)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  PII Scanning & Masking Engine
                </div>

                <div style={{ width: '100%', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {/* Matrix scanning grid pattern overlay */}
                  <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <rect width="100%" height="100%" fill="url(#svg-blueprint)" />
                  </svg>

                  <div style={{
                    background: '#0d0d12', border: '1px solid #1f1f2d', borderRadius: '8px',
                    width: isMobile ? '100%' : '380px', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.725rem',
                    position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                  }}>
                    {/* Scanning sweeping laser */}
                    {simPhase === 'running' && activeStepIdx >= 1 && activeStepIdx <= 3 && (
                      <div className="laser-scanning" />
                    )}

                    <div style={{ borderBottom: '1px solid #1a1a24', paddingBottom: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', color: '#52526b', fontSize: '0.625rem' }}>
                      <span>SCAN STATUS: {activeStepIdx >= 4 ? '🟢 SECURED' : activeStepIdx >= 2 ? '⚠️ THREAT DETECTED' : '📡 SCANNING'}</span>
                      <strong>RED ACTION LAYER</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ color: '#8e8e9f' }}>
                        &gt;_ POST /v1/chat/completions
                      </div>
                      <div style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '4px', border: '1px solid #14141d', lineHeight: 1.5 }}>
                        &quot;Process client record for user with SSN:{' '}
                        <strong style={{
                          color: activeStepIdx >= 4 ? '#22c55e' : activeStepIdx >= 2 ? '#ef4444' : '#e2e8f0',
                          background: activeStepIdx >= 4 ? 'rgba(34,197,94,0.1)' : activeStepIdx >= 2 ? 'rgba(239,68,68,0.1)' : 'transparent',
                          padding: '1px 4px', borderRadius: '2px', transition: 'all 0.1s', fontFamily: 'monospace'
                        }}>
                          {scrambledSSN}
                        </strong>
                        {' '}and invoke secure token{' '}
                        <strong style={{
                          color: activeStepIdx >= 4 ? '#22c55e' : activeStepIdx >= 2 ? '#ef4444' : '#e2e8f0',
                          background: activeStepIdx >= 4 ? 'rgba(34,197,94,0.1)' : activeStepIdx >= 2 ? 'rgba(239,68,68,0.1)' : 'transparent',
                          padding: '1px 4px', borderRadius: '2px', transition: 'all 0.1s', fontFamily: 'monospace'
                        }}>
                          {scrambledKey}
                        </strong>
                        .&quot;
                      </div>
                    </div>
                  </div>

                  {activeStepIdx >= 4 && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.675rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <span>🛡️</span> Data masked seamlessly at the Edge prior to LLM forward!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Visual Component D: Idle Prompt State ── */}
            {simPhase === 'idle' && (
              <div style={{ textAlign: 'center', color: '#52526b', padding: '2rem' }} className="fade-up">
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🕹️</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8e8e9f' }}>
                  Chaos Console Armed
                </span>
                <p style={{ fontSize: '0.75rem', maxWidth: '300px', margin: '6px auto 0', lineHeight: 1.4 }}>
                  Select any scenario on the left and click &apos;Run Incident Simulation&apos; to watch the infrastructure adapt.
                </p>
              </div>
            )}

            {/* ── Visual Component E: Scorecard & Business Impact Overlay ── */}
            {simPhase === 'completed' && (
              <div className="shield-glass-overlay scorecard-glowing-border fade-up" style={{
                position: 'absolute', inset: 0, borderRadius: '12px',
                padding: '1.5rem', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', zIndex: 10
              }}>
                
                {/* Scorecard top stats */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--accent-hover)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🛡️</span> Incident Report: SYSTEM SECURED
                    </span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 850, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(52,211,153,0.3)' }}>
                      {presets.find(p => p.id === currentPreset)?.scorecard.status}
                    </span>
                  </div>

                  {/* Scorecard metric rows */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.55rem', color: '#8e8e9f', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recovery Time</span>
                      <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block', marginTop: '2px' }}>
                        {presets.find(p => p.id === currentPreset)?.scorecard.recoveryTime}
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.55rem', color: '#8e8e9f', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requests Protected</span>
                      <strong style={{ fontSize: '0.9rem', color: '#34d399', display: 'block', marginTop: '2px' }}>
                        {presets.find(p => p.id === currentPreset)?.scorecard.requestsProtected}
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.55rem', color: '#8e8e9f', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cost Avoided</span>
                      <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block', marginTop: '2px', fontFamily: 'monospace' }}>
                        {presets.find(p => p.id === currentPreset)?.scorecard.costAvoided}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Why This Matters: Side-by-Side Business Impact */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1rem' }}>
                  {/* Without Selixes */}
                  <div style={{ borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)', paddingRight: '10px', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingBottom: isMobile ? '10px' : '0' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                      ⚠️ WITHOUT SELIXES
                    </span>
                    <div style={{ fontSize: '0.725rem', color: '#8e8e9f', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>Downtime: <strong style={{ color: '#fff' }}>{presets.find(p => p.id === currentPreset)?.impactWithout.downtime}</strong></div>
                      <div>Requests Lost: <strong style={{ color: '#fff' }}>{presets.find(p => p.id === currentPreset)?.impactWithout.lostRequests}</strong></div>
                      <div>Direct Cost: <strong style={{ color: '#fff' }}>{presets.find(p => p.id === currentPreset)?.impactWithout.cost}</strong></div>
                    </div>
                  </div>
                  
                  {/* With Selixes */}
                  <div style={{ paddingLeft: isMobile ? '0' : '4px', paddingTop: isMobile ? '6px' : '0' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                      🛡️ WITH SELIXES
                    </span>
                    <div style={{ fontSize: '0.725rem', color: '#8e8e9f', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>Downtime: <strong style={{ color: '#fff' }}>{presets.find(p => p.id === currentPreset)?.impactWith.downtime}</strong></div>
                      <div>Requests Lost: <strong style={{ color: '#fff' }}>{presets.find(p => p.id === currentPreset)?.impactWith.lostRequests}</strong></div>
                      <div>Direct Cost: <strong style={{ color: '#34d399' }}>{presets.find(p => p.id === currentPreset)?.impactWith.cost}</strong></div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Monospace Telemetry shell log view */}
          <div className="w-full max-w-full overflow-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#52526b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Gateway Live Telemetry Logs
            </span>
            <div ref={terminalContainerRef} className="w-full max-w-full overflow-hidden" style={{
              background: '#040406', padding: '1.25rem', borderRadius: '10px',
              fontFamily: 'monospace', fontSize: '0.775rem', color: '#cbd5e1',
              height: '140px', overflowY: 'auto', border: '1px solid #1f1f2a'
            }}>
              <div style={{ color: '#52525b', borderBottom: '1px dashed #27272a', paddingBottom: '4px', marginBottom: '8px' }}>
                SELIXES GATEWAY v1.0.4 - SOVEREIGN EDGE ONLINE
              </div>
              {simLogs.map((log, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '4px', lineHeight: 1.4 }}>
                  <span style={{ color: '#52525b' }}>[{log.time}]</span>
                  <span style={{
                    color: log.type === 'error' ? '#f87171' : log.type === 'warn' ? '#fbbf24' : log.type === 'success' ? '#34d399' : log.type === 'system' ? '#818cf8' : '#cbd5e1'
                  }}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        </div>
      </InteractiveGlowCard>

    </div>
    </SectionCanvas>
  );
}
