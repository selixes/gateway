'use client';

import React, { useState, useEffect, useRef } from 'react';

type TabType = 'overview' | 'traces' | 'failover' | 'guardrails' | 'optimizer';

export default function DashboardSandboxShowcase({ isMobile }: { isMobile: boolean }) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Tab states
  const [outageActive, setOutageActive] = useState(false);
  const [outageLogs, setOutageLogs] = useState<string[]>([
    'System status: Nominal. Routing 100% traffic to OpenAI GPT-4o.',
  ]);
  const [piiScrubs, setPiiScrubs] = useState({ apiKey: true, creditCard: false, email: true });
  const [optimizerApplied, setOptimizerApplied] = useState(false);
  const [savingsAmount, setSavingsAmount] = useState(418.10);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  // Animate savings amount when optimizer is applied
  useEffect(() => {
    if (optimizerApplied) {
      let start = 418.10;
      const end = 566.50;
      const duration = 1000; // 1s
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quad
        const ease = progress * (2 - progress);
        const current = start + (end - start) * ease;
        setSavingsAmount(parseFloat(current.toFixed(2)));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    } else {
      setSavingsAmount(418.10);
    }
  }, [optimizerApplied]);

  // Outage logs simulator
  const handleOutageToggle = () => {
    const nextState = !outageActive;
    setOutageActive(nextState);
    if (nextState) {
      setOutageLogs([
        '📡 Sending payload to primary endpoint: OpenAI...',
        '⏳ OpenAI API response latency > 3000ms threshold...',
        '⚠️ outage detected (HTTP 502 Bad Gateway).',
        '🛡️ Selixes Failover Circuit Breaker TRIPPED.',
        '🔄 Rerouting traffic stream to Standby Tier: Anthropic Claude...',
        '✅ Anthropic responded successfully in 160ms.',
        'ℹ️ Active routing shifted. Outage intercepted without dropping request.',
      ]);
    } else {
      setOutageLogs([
        '🔄 Resetting circuit breaker...',
        '📡 Testing health endpoint for OpenAI: Healthy (200 OK).',
        '✅ Primary route restored. Routing 100% traffic to OpenAI GPT-4o.',
      ]);
    }
  };

  const getPiiResult = () => {
    let text = 'My password is secretkey123, card number is 4111-2222-3333-4444 and my email is dev@selixes.com';
    if (piiScrubs.apiKey) {
      text = text.replace('secretkey123', '[REDACTED_SECRET]');
    }
    if (piiScrubs.creditCard) {
      text = text.replace('4111-2222-3333-4444', '[REDACTED_PCI_CARD_16_DIGIT]');
    }
    if (piiScrubs.email) {
      text = text.replace('dev@selixes.com', '[REDACTED_EMAIL_ADDRESS]');
    }
    return text;
  };

  const tabs = [
    { id: 'overview', name: 'Overview Analytics', icon: '📊' },
    { id: 'traces', name: 'Traces & Logs', icon: '🔍' },
    { id: 'failover', name: 'Failover Policy', icon: '🔄' },
    { id: 'guardrails', name: 'Guardrails & PII', icon: '🛡️' },
    { id: 'optimizer', name: 'Cost Optimizer', icon: '💸' },
  ];

  return (
    <div style={{
      background: '#0d0d12',
      border: '1px solid #1f1f2c',
      borderRadius: '20px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight: '520px',
      boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
    }}>
      
      {/* Sidebar navigation */}
      <div 
        className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory border-b border-white/10"
        style={{
          width: isMobile ? '100%' : '240px',
          background: '#0a0a0f',
          borderRight: isMobile ? 'none' : '1px solid #1a1a26',
          borderBottom: isMobile ? '1px solid #1a1a26' : 'none',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          overflowX: isMobile ? 'auto' : 'visible',
          padding: isMobile ? '0.5rem' : '1.5rem 0',
          gap: '0.25rem',
        }}
      >
        {!isMobile && (
          <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '1px solid #14141d', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Dashboard Modules
            </span>
          </div>
        )}

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className="flex-shrink-0 snap-start"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: isMobile ? '0.5rem 1rem' : '0.8rem 1.5rem',
                background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                border: 'none',
                borderLeft: !isMobile && isActive ? '3px solid var(--accent)' : '3px solid transparent',
                borderBottom: isMobile && isActive ? '2px solid var(--accent)' : 'none',
                color: isActive ? '#fff' : '#8e8e9f',
                fontSize: '0.825rem',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                outline: 'none',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Panel Content Area */}
      <div style={{
        flex: 1,
        padding: isMobile ? '1.5rem' : '2.5rem',
        background: '#0d0d12',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        
        <div style={{ flex: 1 }}>
          {/* TAB 1: OVERVIEW ANALYTICS */}
          {activeTab === 'overview' && (
            <div style={{ animation: 'fade-in-showcase 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>Analytics Overview</h3>
                  <p style={{ color: '#8e8e9f', fontSize: '0.775rem', margin: '2px 0 0' }}>Real-time sovereign AI gateway statistics.</p>
                </div>
                {optimizerApplied && (
                  <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(52,211,153,0.08)', padding: '2px 10px', borderRadius: '4px', border: '1px solid rgba(52,211,153,0.2)' }}>
                    OPTIMIZED
                  </span>
                )}
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#131319', border: '1px solid #22222d', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                  <span style={{ fontSize: '0.65rem', color: '#8e8e9f', textTransform: 'uppercase', fontWeight: 600 }}>Guarded Uptime</span>
                  <strong style={{ fontSize: '1.5rem', color: '#22c55e', display: 'block', marginTop: '2px' }}>99.98%</strong>
                </div>
                <div style={{ background: '#131319', border: '1px solid #22222d', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                  <span style={{ fontSize: '0.65rem', color: '#8e8e9f', textTransform: 'uppercase', fontWeight: 600 }}>Total API Transits</span>
                  <strong style={{ fontSize: '1.5rem', color: '#3b82f6', display: 'block', marginTop: '2px' }}>14,842</strong>
                </div>
                <div style={{ background: '#131319', border: '1px solid #22222d', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                  <span style={{ fontSize: '0.65rem', color: '#8e8e9f', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Funds Saved</span>
                  <strong style={{ fontSize: '1.5rem', color: '#fb923c', display: 'block', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    ${savingsAmount.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Chart Visual */}
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#c3c3d5', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.75rem' }}>
                  AI Spend by Provider
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { provider: 'OpenAI GPT-4o', cost: 230.12, color: 'var(--accent)', percent: 55 },
                    { provider: 'Anthropic Claude', cost: 125.40, color: '#3b82f6', percent: 30 },
                    { provider: 'Google Gemini', cost: 41.80, color: '#a855f7', percent: 10 },
                    { provider: 'Local Ollama (Llama-3)', cost: 0.00, color: '#22c55e', percent: 5 },
                  ].map((item) => (
                    <div key={item.provider} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ width: '150px', fontSize: '0.775rem', color: '#8e8e9f', whiteSpace: 'nowrap' }}>{item.provider}</span>
                      <div style={{ flex: 1, height: '8px', background: '#181824', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          height: '100%',
                          width: `${item.percent}%`,
                          background: item.color,
                          borderRadius: '4px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ width: '60px', fontSize: '0.775rem', color: '#fff', fontWeight: 650, textAlign: 'right' }}>
                        ${item.cost.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRACES & LOGS */}
          {activeTab === 'traces' && (
            <div style={{ animation: 'fade-in-showcase 0.3s ease' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>Traces & Logs</h3>
                <p style={{ color: '#8e8e9f', fontSize: '0.775rem', margin: '2px 0 0' }}>Expand request log rows to inspect step-by-step gateway middleware spans.</p>
              </div>

              {/* Log stream list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { id: 1, path: 'POST /v1/chat/completions', status: '200 OK', time: '14ms', cost: '$0.000', provider: 'Semantic Cache Hit', color: '#22c55e' },
                  { id: 2, path: 'POST /v1/chat/completions', status: '200 OK', time: '1,280ms', cost: '$0.008', provider: 'OpenAI GPT-4o', color: 'var(--accent)' },
                  { id: 3, path: 'POST /v1/chat/completions', status: '200 OK', time: '180ms', cost: '$0.001', provider: 'Anthropic Claude (Failover)', color: '#3b82f6' },
                ].map((log, index) => {
                  const isExpanded = expandedLog === index;
                  return (
                    <div key={log.id} style={{
                      background: '#131319',
                      border: '1px solid #22222d',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}>
                      <div
                        onClick={() => setExpandedLog(isExpanded ? null : index)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.8fr 1fr 1fr 1.2fr',
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#c3c3d5',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.5rem', color: '#7a7a8f' }}>{isExpanded ? '▼' : '▶'}</span>
                          <span style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>{log.path}</span>
                        </div>
                        <span style={{ color: log.color, fontWeight: 700 }}>{log.status}</span>
                        <span style={{ color: '#8e8e9f' }}>{log.time}</span>
                        <span style={{ textAlign: 'right', fontWeight: 600, color: '#e2e8f0' }}>{log.provider}</span>
                      </div>

                      {/* Expandable Trace Span Details */}
                      {isExpanded && (
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: '#0a0a0f',
                          borderTop: '1px solid #22222d',
                          fontFamily: 'monospace',
                          fontSize: '0.725rem',
                          color: '#a1a1aa',
                          lineHeight: 1.6,
                        }}>
                          {log.id === 1 ? (
                            <>
                              <div style={{ color: '#22c55e', borderBottom: '1px dashed #222228', paddingBottom: '4px', marginBottom: '4px' }}>
                                📄 TRACE SPANS (CACHE ACCELERATION)
                              </div>
                              <div>├── gateway_ingress (0ms)</div>
                              <div>├── pii_sanitizer: <span style={{ color: '#34d399' }}>0 entities scrubbed</span> (1ms)</div>
                              <div>├── semantic_cache: <span style={{ color: '#34d399' }}>HIT (94.2% match vector)</span> (11ms)</div>
                              <div>└── response_egress: <span style={{ color: '#34d399' }}>returned saved payload</span> (2ms)</div>
                            </>
                          ) : log.id === 2 ? (
                            <>
                              <div style={{ color: 'var(--accent)', borderBottom: '1px dashed #222228', paddingBottom: '4px', marginBottom: '4px' }}>
                                📄 TRACE SPANS (STANDARD PASSTHROUGH)
                              </div>
                              <div>├── gateway_ingress (0ms)</div>
                              <div>├── pii_sanitizer: <span style={{ color: '#f59e0b' }}>Scrubbed SSN key</span> (2ms)</div>
                              <div>├── semantic_cache: <span style={{ color: '#f87171' }}>MISS</span> (3ms)</div>
                              <div>├── provider_router: <span style={{ color: '#fb923c' }}>OpenAI GPT-4o</span> (1271ms)</div>
                              <div>└── response_egress: <span style={{ color: '#34d399' }}>token counters audit</span> (4ms)</div>
                            </>
                          ) : (
                            <>
                              <div style={{ color: '#3b82f6', borderBottom: '1px dashed #222228', paddingBottom: '4px', marginBottom: '4px' }}>
                                📄 TRACE SPANS (AUTONOMIC RESILIENCY)
                              </div>
                              <div>├── gateway_ingress (0ms)</div>
                              <div>├── pii_sanitizer: nominal (1ms)</div>
                              <div>├── semantic_cache: <span style={{ color: '#f87171' }}>MISS</span> (2ms)</div>
                              <div>├── provider_router: <span style={{ color: '#f87171' }}>OpenAI GPT-4o (TIMEOUT 3000ms failed)</span> (3002ms)</div>
                              <div>├── circuit_breaker: <span style={{ color: '#fb923c' }}>TRIPPED (outage detected)</span> (1ms)</div>
                              <div>├── fallback_router: <span style={{ color: '#22c55e' }}>Rerouted to Anthropic Claude</span> (171ms)</div>
                              <div>└── response_egress (3ms)</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FAILOVER POLICY */}
          {activeTab === 'failover' && (
            <div style={{ animation: 'fade-in-showcase 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>Failover Circuit</h3>
                  <p style={{ color: '#8e8e9f', fontSize: '0.775rem', margin: '2px 0 0' }}>Simulate provider outages to check instant gateway failovers.</p>
                </div>
                <button
                  onClick={handleOutageToggle}
                  className="btn-primary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.725rem',
                    background: outageActive ? '#22c55e' : '#ef4444',
                    borderRadius: '6px',
                  }}
                >
                  {outageActive ? '🔄 Restore OpenAI' : '⚡ Simulate OpenAI Outage'}
                </button>
              </div>

              {/* Provider Topology Visualizer */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{
                  background: '#131319',
                  border: '1px solid',
                  borderColor: outageActive ? '#ef4444' : '#22c55e',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center',
                  transition: 'border-color 0.3s',
                }}>
                  <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#fff', display: 'block' }}>OpenAI GPT-4o</strong>
                  <span style={{ fontSize: '0.625rem', color: '#a1a1aa' }}>Primary Route</span>
                  <span style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    marginTop: '8px',
                    color: outageActive ? '#ef4444' : '#22c55e',
                  }}>
                    {outageActive ? '● DOWN (502 Outage)' : '● ACTIVE (Online)'}
                  </span>
                </div>

                <div style={{
                  background: '#131319',
                  border: '1px solid',
                  borderColor: outageActive ? '#22c55e' : '#22222d',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center',
                  transition: 'border-color 0.3s',
                }}>
                  <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#fff', display: 'block' }}>Anthropic Claude</strong>
                  <span style={{ fontSize: '0.625rem', color: '#a1a1aa' }}>Standby Tier 1</span>
                  <span style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    marginTop: '8px',
                    color: outageActive ? '#22c55e' : '#8e8e9f',
                  }}>
                    {outageActive ? '● FAILOVER ROUTED' : '○ STANDBY'}
                  </span>
                </div>

                <div style={{
                  background: '#131319',
                  border: '1px solid #22222d',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center',
                }}>
                  <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#fff', display: 'block' }}>Local Ollama</strong>
                  <span style={{ fontSize: '0.625rem', color: '#a1a1aa' }}>Standby Tier 2</span>
                  <span style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    marginTop: '8px',
                    color: '#8e8e9f',
                  }}>
                    ○ STANDBY
                  </span>
                </div>
              </div>

              {/* Event Logs */}
              <div style={{
                background: '#040406',
                borderRadius: '8px',
                border: '1px solid #1a1a26',
                padding: '0.85rem 1rem',
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                color: '#cbd5e1',
                height: '110px',
                overflowY: 'auto',
              }}>
                {outageLogs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '2px', lineHeight: 1.4, color: log.startsWith('✅') || log.startsWith('🛡️') ? '#34d399' : log.startsWith('⚠️') || log.startsWith('❌') ? '#f87171' : '#cbd5e1' }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: POLICY & GUARDRAILS */}
          {activeTab === 'guardrails' && (
            <div style={{ animation: 'fade-in-showcase 0.3s ease' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>Guardrails & PII Shield</h3>
                <p style={{ color: '#8e8e9f', fontSize: '0.775rem', margin: '2px 0 0' }}>Configure real-time PII redactions before data exits your sovereign server bounds.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '1.5rem' }}>
                {/* Left toggles */}
                <div style={{ background: '#131319', border: '1px solid #22222d', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #22222d', paddingBottom: '4px' }}>
                    Shield Rules
                  </span>
                  {[
                    { key: 'apiKey', label: 'Redact API Keys / Tokens' },
                    { key: 'creditCard', label: 'Mask PCI Credit Cards' },
                    { key: 'email', label: 'Scrub Email Addresses' },
                  ].map((rule) => (
                    <label key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#c3c3d5', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(piiScrubs as any)[rule.key]}
                        onChange={(e) => setPiiScrubs(prev => ({ ...prev, [rule.key]: e.target.checked }))}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {rule.label}
                    </label>
                  ))}
                </div>

                {/* Right payloads */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.625rem', color: '#8e8e9f', textTransform: 'uppercase', fontWeight: 650 }}>Raw Input Prompt</span>
                    <div style={{
                      background: '#181824',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      color: '#a1a1aa',
                      whiteSpace: 'normal',
                      wordBreak: 'break-all',
                      border: '1px solid #22222e',
                    }}>
                      My password is <span style={{ color: '#fff', background: '#3b3b4f', padding: '1px 3px', borderRadius: '3px' }}>secretkey123</span>, card number is <span style={{ color: '#fff', background: '#3b3b4f', padding: '1px 3px', borderRadius: '3px' }}>4111-2222-3333-4444</span> and my email is <span style={{ color: '#fff', background: '#3b3b4f', padding: '1px 3px', borderRadius: '3px' }}>dev@selixes.com</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.625rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 650 }}>Gateway Output (Sanitized)</span>
                    <div style={{
                      background: '#040406',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      color: '#34d399',
                      whiteSpace: 'normal',
                      wordBreak: 'break-all',
                      border: '1px solid #1a1a24',
                    }}>
                      {getPiiResult()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COST OPTIMIZER */}
          {activeTab === 'optimizer' && (
            <div style={{ animation: 'fade-in-showcase 0.3s ease' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>Cost Optimizer</h3>
                <p style={{ color: '#8e8e9f', fontSize: '0.775rem', margin: '2px 0 0' }}>Sovereign advisor analyzes token complexity to route around costly API rates.</p>
              </div>

              <div style={{
                background: 'rgba(251, 146, 60, 0.04)',
                border: '1px solid rgba(251, 146, 60, 0.2)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '1.25rem',
                alignItems: 'center',
              }}>
                <div style={{ fontSize: '2rem' }}>💡</div>
                <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
                  <strong style={{ fontSize: '0.825rem', color: '#ffedd5', display: 'block', marginBottom: '4px' }}>
                    Cost Arbitrage Optimization Detected
                  </strong>
                  <p style={{ color: '#ffedd5', fontSize: '0.775rem', margin: 0, opacity: 0.8, lineHeight: 1.4 }}>
                    Audit flagged 1,240 simple spam/routing requests directed to GPT-4o ($0.03/M tokens). 
                    Routing these simple tasks to **Local Ollama (Llama-3)** yields 100% cost avoidance without impact.
                  </p>
                </div>
                <button
                  onClick={() => setOptimizerApplied(!optimizerApplied)}
                  className="btn-primary"
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: optimizerApplied ? '#22c55e' : 'var(--accent)',
                  }}
                >
                  {optimizerApplied ? '✅ Applied' : 'Apply Optimization'}
                </button>
              </div>

              {optimizerApplied && (
                <div style={{
                  marginTop: '1.25rem',
                  fontSize: '0.725rem',
                  color: '#34d399',
                  background: 'rgba(52,211,153,0.08)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(52,211,153,0.2)',
                  textAlign: 'center',
                  animation: 'fade-in-showcase 0.25s ease',
                }}>
                  🎉 Optimization deployed! Annual run-rate savings updated. Funds Saved counter increased on Overview.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global CSS transition for fade */}
        <style>{`
          @keyframes fade-in-showcase {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

    </div>
  );
}
