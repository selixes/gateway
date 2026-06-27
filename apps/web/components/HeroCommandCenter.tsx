'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ── Live latency simulation hook ──────────────────────────────────────────────
function useLiveLatency(base: number, variance: number = 5) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const t = setInterval(() => {
      setVal(Math.max(base - variance, Math.round(base + (Math.random() * variance * 2 - variance))));
    }, 2000);
    return () => clearInterval(t);
  }, [base, variance]);
  return val;
}

// ── Animated scanline component ───────────────────────────────────────────────
function ScanLine() {
  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.25), transparent)',
        animation: 'scan-hero 5s linear infinite',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
function Sparkline({ color, healthy = true }: { color: string; healthy?: boolean }) {
  const pts = healthy
    ? '0,14 8,10 16,12 24,8 32,10 40,6 48,9 56,7 64,10 72,8 80,11 88,7 96,9 104,8 112,10'
    : '0,8 8,12 16,10 24,14 32,10 40,13 48,9 56,12 64,11 72,14 80,10 88,13 96,11 104,14 112,12';
  return (
    <svg width="56" height="20" viewBox="0 0 112 20" style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

// ── Provider row ──────────────────────────────────────────────────────────────
function ProviderRow({
  name, role, dotColor, latency, barWidth, roleColor,
  sparkColor, healthy, active
}: {
  name: string; role: string; dotColor: string; latency: number;
  barWidth: string; roleColor?: string; sparkColor: string;
  healthy?: boolean; active?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px',
      background: active ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '8px',
      opacity: active ? 1 : 0.75,
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: dotColor,
          boxShadow: active ? `0 0 8px ${dotColor}` : 'none',
          animation: active ? 'pulse-dot-hero 1.8s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '13px', fontWeight: 500, color: active ? '#f2f2f7' : '#9494a8',
          fontFamily: 'Inter, sans-serif',
        }}>{name}</span>
        <span style={{
          fontSize: '10px', fontFamily: "'JetBrains Mono', monospace",
          background: roleColor ? `${roleColor}18` : 'rgba(255,255,255,0.06)',
          color: roleColor ?? '#9494a8',
          border: `1px solid ${roleColor ? `${roleColor}30` : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '4px',
          padding: '2px 6px',
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>{role}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px', fontWeight: 700,
          color: healthy ? '#22c55e' : '#9494a8',
        }}>{latency}ms</span>
        <Sparkline color={sparkColor} healthy={healthy} />
      </div>
    </div>
  );
}

// ── Background animated grid ──────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(rgba(99,102,241,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,0.025) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)',
    }} />
  );
}

// ── Glow orbs ─────────────────────────────────────────────────────────────────
function GlowOrbs() {
  return (
    <>
      <div style={{
        position: 'absolute', top: '10%', right: '10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        animation: 'aura-float 18s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '5%',
        width: '350px', height: '350px',
        background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        animation: 'aura-float 24s ease-in-out infinite reverse',
      }} />
    </>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{
        fontSize: '22px', fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700, color: '#f2f2f7', lineHeight: 1,
      }}>{value}</span>
      <span style={{
        fontSize: '11px', fontFamily: 'Inter', color: '#6b6b80',
        fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>{label}</span>
    </div>
  );
}

// ── Main Hero Component ────────────────────────────────────────────────────────
export default function HeroCommandCenter() {
  const openaiLatency  = useLiveLatency(12, 4);
  const anthropicLatency = useLiveLatency(48, 8);
  const geminiLatency  = useLiveLatency(67, 10);

  const [failoverActive, setFailoverActive] = useState(true);
  const [tick, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 960);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Cycle failover state for drama
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (tick % 5 === 0 && tick > 0) setFailoverActive(f => !f);
  }, [tick]);

  return (
    <section style={{
      position: 'relative',
      minHeight: isMobile ? 'auto' : '100vh',
      background: '#080809',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      paddingTop: isMobile ? '90px' : '80px',
      paddingBottom: isMobile ? '3rem' : '0',
    }}>
      {/* CSS animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes scan-hero {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes pulse-dot-hero {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes aura-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.08); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
        }
        @keyframes fade-up-hero {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float-card {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes failover-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245,158,11,0.3); }
          50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
        .hero-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #6366f1;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
          text-decoration: none;
          letter-spacing: 0.01em;
        }
        .hero-cta-primary:hover {
          background: #818cf8;
          box-shadow: 0 0 24px rgba(99,102,241,0.4), 0 4px 16px rgba(0,0,0,0.4);
          transform: translateY(-2px);
        }
        .hero-cta-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: #9494a8;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
          text-decoration: none;
          letter-spacing: 0.01em;
        }
        .hero-cta-ghost:hover {
          border-color: rgba(99,102,241,0.4);
          color: #f2f2f7;
          background: rgba(99,102,241,0.05);
        }
        .provider-row-hover:hover {
          opacity: 1 !important;
        }
      `}</style>

      <GridBackground />
      <GlowOrbs />

      {/* Noise overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      }} />

      <div style={{
        maxWidth: '1260px', margin: '0 auto', width: '100%',
        padding: isMobile ? '0 16px' : '0 32px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)',
        gap: isMobile ? '24px' : '32px',
        alignItems: 'center',
        position: 'relative', zIndex: 10,
      }}>

        {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
        <div style={{
          gridColumn: isMobile ? 'span 12' : 'span 7',
          display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '28px',
          animation: 'fade-up-hero 0.8s ease both',
        }}>

          {/* Status badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '999px',
              padding: '6px 14px 6px 10px',
              flexWrap: 'wrap',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                animation: 'pulse-dot-hero 2s ease-in-out infinite',
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{
                fontSize: '11px', fontFamily: 'Inter', fontWeight: 700,
                color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>All Systems Operational</span>
              <span style={{
                fontSize: '10px', fontFamily: "'JetBrains Mono', monospace",
                color: '#3d6640', marginLeft: '4px',
              }}>• Resilient AI Routing</span>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: isMobile ? 'clamp(32px, 8vw, 42px)' : 'clamp(40px, 5vw, 66px)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
              color: '#f2f2f7',
              margin: 0,
            }}>
              The AI Gateway{' '}
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Designed for Failover
              </span>
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: isMobile ? '15px' : '18px',
              lineHeight: isMobile ? '24px' : '28px',
              color: '#6b6b80',
              maxWidth: '520px',
              margin: '20px 0 0',
            }}>
              Route every LLM call through a sovereign failover layer.
              Sub-15ms rerouting, designed to reduce request interruption, and built for resilient AI routing.
            </p>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
            <Link href="/docs/getting-started" className="hero-cta-primary">
              Start with OpenAI-compatible proxy
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          </div>

        {/* ── RIGHT COLUMN – LIVE INFRA PANEL ───────────────────────── */}
        <div style={{
          gridColumn: isMobile ? 'span 12' : 'span 5',
          position: 'relative',
          animation: 'slide-in-right 0.9s ease 0.2s both',
          marginTop: isMobile ? '1.5rem' : '0',
        }}>
          {/* Glow behind panel */}
          <div style={{
            position: 'absolute', inset: '-40px',
            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Main glass panel */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(11,11,16,0.72)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            <ScanLine />

            {/* Panel header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 20px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div>
                <div style={{
                  fontSize: '10px', fontFamily: 'Inter', color: '#44445a',
                  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>Live Infrastructure</div>
                <div style={{
                  fontSize: '15px', fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700, color: '#c7c4d7', marginTop: '2px',
                }}>Failover Monitor</div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '6px',
                padding: '5px 10px',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px rgba(34,197,94,0.7)',
                  animation: 'pulse-dot-hero 1.5s ease-in-out infinite',
                  display: 'inline-block',
                }} />
                <span style={{
                  fontSize: '11px', fontFamily: "'JetBrains Mono', monospace",
                  color: '#22c55e', fontWeight: 700, letterSpacing: '0.05em',
                }}>LIVE</span>
              </div>
            </div>

            {/* Provider routing list */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <ProviderRow
                name="OpenAI GPT-4o" role="PRIMARY"
                dotColor="#22c55e" latency={openaiLatency}
                barWidth="75%" roleColor="#22c55e" sparkColor="#22c55e"
                healthy={true} active={true}
              />
              <ProviderRow
                name="Anthropic Claude" role="STANDBY"
                dotColor="#f59e0b" latency={anthropicLatency}
                barWidth="50%" roleColor="#f59e0b" sparkColor="#f59e0b"
                healthy={true} active={false}
              />
              <ProviderRow
                name="Google Gemini" role="BACKUP"
                dotColor="#6366f1" latency={geminiLatency}
                barWidth="33%" sparkColor="#6366f1"
                healthy={true} active={false}
              />
            </div>

            {/* Mini telemetry chart */}
            <div style={{
              margin: '0 20px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '10px',
              padding: '12px 14px',
              height: '80px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '8px', left: '14px',
                fontSize: '10px', fontFamily: 'Inter', color: '#44445a',
                fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>Throughput</div>
              <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,40 C40,35 80,20 120,25 C160,30 200,15 240,18 C280,21 320,10 360,8 L360,60 L0,60 Z"
                  fill="url(#chartGrad)" />
                <path d="M0,40 C40,35 80,20 120,25 C160,30 200,15 240,18 C280,21 320,10 360,8"
                  fill="none" stroke="#6366f1" strokeWidth="1.5" />
              </svg>
              <div style={{
                position: 'absolute', bottom: '10px', right: '14px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '16px', fontWeight: 700, color: '#f2f2f7',
              }}>42.8k<span style={{ fontSize: '11px', color: '#22c55e', marginLeft: '4px', fontWeight: 500 }}>req/s</span></div>
            </div>

            {/* Failover alert banner */}
            <div style={{
              margin: '14px 20px 20px',
              background: failoverActive ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.06)',
              border: `1px solid ${failoverActive ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)'}`,
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: '10px',
              animation: failoverActive ? 'failover-pulse 2s ease-in-out infinite' : 'none',
              transition: 'all 0.5s ease',
            }}>
              <span style={{ fontSize: '16px' }}>{failoverActive ? '⚡' : '✓'}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '11px', fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700, letterSpacing: '0.06em',
                  color: failoverActive ? '#f59e0b' : '#22c55e',
                }}>
                  {failoverActive ? 'FAILOVER ACTIVATED — REROUTING VIA NODE-7' : 'ALL PROVIDERS NOMINAL'}
                </div>
                <div style={{
                  fontSize: '10px', fontFamily: 'Inter', color: '#44445a',
                  marginTop: '2px',
                }}>{failoverActive ? 'Primary latency spike detected — switching to Anthropic' : 'Primary route healthy — zero rerouting in progress'}</div>
              </div>
              <div style={{
                fontSize: '10px', fontFamily: "'JetBrains Mono', monospace",
                color: '#44445a',
              }}>14ms</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fade-to-black at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '120px',
        background: 'linear-gradient(to bottom, transparent, #080809)',
        pointerEvents: 'none', zIndex: 5,
      }} />
    </section>
  );
}
