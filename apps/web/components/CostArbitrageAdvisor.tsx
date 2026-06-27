'use client';

import { useState, useEffect } from 'react';

interface RouteLog {
  id: string;
  time: string;
  event: string;
  status: string;
  badgeColor: string;
}

export function CostArbitrageAdvisor() {
  const [logs, setLogs] = useState<RouteLog[]>([
    { id: '1', time: '04:10:12', event: 'OpenAI 504 Outage Detected', status: 'Failover Triggered', badgeColor: '#ef4444' },
    { id: '2', time: '04:10:13', event: 'Rerouting to Anthropic Standby', status: 'Standby Active', badgeColor: '#3b82f6' },
    { id: '3', time: '04:10:14', event: 'Cloud Blackout: Ollama Local Fallback', status: 'Continuity Active', badgeColor: '#f59e0b' },
  ]);

  // Gentle, realistic simulator to populate live telemetry for the demo
  useEffect(() => {
    const events = [
      { event: 'OpenAI Call Failed (504 Gateway Timeout)', status: 'Failover Initiated', color: '#ef4444' },
      { event: 'Anthropic Standby Model Rescued Request', status: 'Standby Success', color: '#3b82f6' },
      { event: 'Cloud Outage: Activating Local Llama-3 Node', status: 'Continuity Active', color: '#f59e0b' },
      { event: 'Local Ollama Completion Dispatched', status: 'Graceful Success', color: '#10b981' },
      { event: 'OpenAI Gateway Status Recovered', status: 'Primary Restored', color: '#10b981' },
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      const selected = events[index % events.length]!;
      index++;
      
      const newLog: RouteLog = {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        event: selected.event,
        status: selected.status,
        badgeColor: selected.color,
      };

      setLogs(prev => [newLog, ...prev.slice(0, 3)]);
    }, 6000); // Trigger every 6s for dynamic feel

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      background: 'rgba(15, 15, 18, 0.6)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.05)',
      position: 'relative',
    }}>
      {/* Badge indicating node execution environment */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{
          fontSize: '0.65rem',
          color: 'var(--accent)',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '2px 8px',
          borderRadius: '999px',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}>
          API SHIELD GATEWAY SHIELD ACTIVE
        </span>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: 0,
        }}>
          <span style={{ color: 'var(--accent)' }}>✦</span> API Shield Continuity & Failover Monitor
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.25rem', maxWidth: '600px' }}>
          Orchestrates production completions through primary (OpenAI) and standby (Anthropic) networks with graceful degraded Continuity Mode (local Llama-3 via Ollama) fail-safes.
        </p>
      </div>

      {/* Analytics Grid */}
      <div className="mobile-grid-1" style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 1.5fr',
        gap: '1.5rem',
        alignItems: 'stretch',
      }}>
        {/* Metric Column */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Guarded System Uptime
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.03em', marginTop: '4px' }}>
              99.99%
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
              Active outages intercepted: <span style={{ color: '#ef4444', fontWeight: 600 }}>18 incidents</span>
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: '0.875rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Typical Cost Savings</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>15-40%</span>
            </div>
          </div>
        </div>

        {/* Route Allocation Percentage Bars */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.75rem' }}>
              Operational Health
            </span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>OpenAI (Primary)</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>98.0%</span>
                </div>
                <div style={{ height: '3px', background: 'var(--bg-base)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: '98%', background: '#10b981', borderRadius: '2px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Anthropic (Standby Standby)</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>1.8%</span>
                </div>
                <div style={{ height: '3px', background: 'var(--bg-base)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: '15%', background: 'var(--accent)', borderRadius: '2px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Continuity Mode (Local Ollama)</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>0.2%</span>
                </div>
                <div style={{ height: '3px', background: 'var(--bg-base)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: '5%', background: '#f59e0b', borderRadius: '2px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Router Log Console */}
        <div style={{
          background: '#09090b',
          border: '1px solid var(--bg-border)',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Gateway Failover Ticker
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="status-dot status-running" style={{ width: '4px', height: '4px' }} />
                <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>LIVE</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>
              {logs.map(log => (
                <div key={log.id} style={{
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  paddingBottom: '2px',
                }}>
                  <span>
                    <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span>{' '}
                    {log.event}
                  </span>
                  <span style={{ color: log.badgeColor, fontWeight: 600 }}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" style={{
              fontSize: '0.75rem',
              padding: '0.4rem 0.875rem',
              borderRadius: '6px',
              width: '100%',
              justifyContent: 'center',
            }}>
              Configure Failover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
