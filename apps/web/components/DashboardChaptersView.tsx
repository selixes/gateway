'use client';

import React, { useState } from 'react';
import SectionCanvas from './SectionCanvas';

const consoleChapters = [
  {
    id: 'hero',
    name: '01. Overview Console & Cost Advisor',
    desc: 'Deep-dive organizational dashboard. Audits weekly transits, saved token fees, and provides active arbitrage recommendations.',
    image: '/demo/01_platform_hero.png',
    time: '0:00 - 0:20'
  },
  {
    id: 'timeline',
    name: '02. Resiliency & Outage Heal Stream',
    desc: 'Real-time telemetry showing live transits and autonomic circuit breakers rerouting timeout spikes in under 15ms.',
    image: '/demo/02_execution_timeline.png',
    time: '0:20 - 0:40'
  },
  {
    id: 'trace',
    name: '03. Multi-Model Trace Ingest Details',
    desc: 'Granular step-level audits. Tracks exact prompt snapshots, latencies, and token spending margins for all agent runs.',
    image: '/demo/03_provider_trace_stream.png',
    time: '0:40 - 1:00'
  },
  {
    id: 'continuity',
    name: '04. Continuity local Ollama Boot',
    desc: 'Visual trace details highlighting local Ollama edge recovery during global cloud blackout at $0.00 in token fees.',
    image: '/demo/04_continuity_recovery_trace.png',
    time: '1:00 - 1:20'
  }
];

export default function DashboardChaptersView({ isMobile }: { isMobile: boolean }) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const activeChapter = consoleChapters[currentChapterIndex] || consoleChapters[0]!;

  return (
    <SectionCanvas>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>
          DASHBOARD INTERFACE
        </span>
        <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem', color: '#fff' }}>
          Interactive Reliability Console
        </h2>
        <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
          Take a detailed look through the real-time cost, failover routing, and trace auditing interfaces.
        </p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: '2rem',
        background: '#0d0d11', border: '1px solid #1f1f2b', borderRadius: '18px',
        overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
      }}>
        
        {/* Chapters selector */}
        <div style={{ background: '#121217', padding: '2rem 1.25rem', borderRight: isMobile ? 'none' : '1px solid #1f1f2b', borderBottom: isMobile ? '1px solid #1f1f2b' : 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#52526b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', paddingLeft: '8px' }}>
            Console Chapters
          </span>
          {consoleChapters.map((chap, index) => (
            <button
              key={chap.id}
              onClick={() => setCurrentChapterIndex(index)}
              style={{
                textAlign: 'left', padding: '0.85rem 1rem',
                background: currentChapterIndex === index ? 'rgba(99,102,241,0.06)' : 'transparent',
                border: '1px solid',
                borderColor: currentChapterIndex === index ? 'rgba(99,102,241,0.25)' : 'transparent',
                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', color: currentChapterIndex === index ? 'var(--accent-hover)' : '#fff', marginBottom: '4px' }}>
                {chap.name}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#8e8e9e', lineHeight: 1.3, display: 'block' }}>
                {chap.desc.slice(0, 65)}...
              </span>
            </button>
          ))}
        </div>

        {/* Snapshot Frame */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#07070a', position: 'relative' }}>
          
          <div style={{ position: 'relative', flex: 1, minHeight: '460px', overflow: 'hidden' }}>
            <img
              src={activeChapter.image}
              alt={activeChapter.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#040406' }}
            />
            
            {/* Feature highlight overlay */}
            <div style={{
              position: 'absolute', bottom: '1.25rem', left: '1.25rem', right: '1.25rem',
              background: 'rgba(7,7,10,0.85)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px',
              padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
              gap: '1.5rem', alignItems: 'center'
            }}>
              <div>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{activeChapter.name}</h5>
                <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>{activeChapter.desc}</p>
              </div>
              <span style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)', color: '#a5b4fc', fontSize: '0.675rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace', width: 'fit-content' }}>
                {activeChapter.time}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
    </SectionCanvas>
  );
}
