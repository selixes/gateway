'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function AboutClient() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const handleMouseMoveCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#f2f2f7', position: 'relative', overflowX: 'hidden' }} className="noise-bg">
      <Navbar />

      {/* Main Container */}
      <main style={{ maxWidth: '840px', margin: '0 auto', padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem' }}>
        
        {/* Mission Card */}
        <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
            ORGANIZATIONAL MISSION
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 850, letterSpacing: '-0.03em', color: '#fff', marginBottom: '1.5rem', lineHeight: 1.15 }}>
            Sovereign Reliability Layer <br />
            For Production AI Workloads
          </h1>
          <div style={{
            background: 'rgba(99,102,241,0.03)', border: '1px dashed rgba(99,102,241,0.2)',
            borderRadius: '12px', padding: '1.5rem 2.25rem', display: 'inline-block', maxWidth: '680px'
          }}>
            <p style={{ fontSize: '1.2rem', color: '#c7d2fe', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
              "Make AI applications reliable, observable, and cost predictable."
            </p>
          </div>
        </div>

        {/* Why we built Section */}
        <section style={{ marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', borderBottom: '1px solid #1a1a24', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            Why We Built Selixes
          </h2>
          <p style={{ fontSize: '0.975rem', color: '#a1a1b0', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            Upstream LLM providers are unstable. Connections timeout unexpectedly, rate limits trigger during concurrent spikes, and recursive agent loops can quietly burn thousands of dollars in tokens in a matter of minutes.
          </p>
          <p style={{ fontSize: '0.975rem', color: '#a1a1b0', lineHeight: 1.7, margin: 0 }}>
            Selixes acts as a private, neutral gateway proxy sitting directly inside your secure cloud boundary. It catches outages dynamically, handles millisecond failovers, isolates active concurrency burst pressures, and caps reasoning spend per session automatically—preserving 100% data sovereignty.
          </p>
        </section>

        {/* Core Principles Grid */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', borderBottom: '1px solid #1a1a24', paddingBottom: '0.75rem', marginBottom: '2rem' }}>
            Company Principles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem' }}>
            
            <div className="glow-card" onMouseMove={handleMouseMoveCard} style={{ background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }}>🛡️</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>1. Reliability First</h3>
              <p style={{ fontSize: '0.85rem', color: '#8e8e9f', lineHeight: 1.6, margin: 0 }}>
                Uptime is non-negotiable. Our autonomic gateway is engineered to fail-open gracefully, standardizing on exactly-once connection cleanup and 15ms circuit-breaker routing.
              </p>
            </div>

            <div className="glow-card" onMouseMove={handleMouseMoveCard} style={{ background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }}>🏗️</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>2. Infrastructure Over Hype</h3>
              <p style={{ fontSize: '0.85rem', color: '#8e8e9f', lineHeight: 1.6, margin: 0 }}>
                We build technical primitives, not marketing slogans. Developers deserve clean schemas, detailed trace indicators, and standard compatibility, not vendor lock-in.
              </p>
            </div>

            <div className="glow-card" onMouseMove={handleMouseMoveCard} style={{ background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }}>🌐</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>3. Sovereign Deployment</h3>
              <p style={{ fontSize: '0.85rem', color: '#8e8e9f', lineHeight: 1.6, margin: 0 }}>
                Your data should stay yours. Selixes is containerized for absolute private deployments, ensuring zero prompts or keys leak outside your secure cloud.
              </p>
            </div>

            <div className="glow-card" onMouseMove={handleMouseMoveCard} style={{ background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem' }}>📊</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>4. Transparent Operations</h3>
              <p style={{ fontSize: '0.85rem', color: '#8e8e9f', lineHeight: 1.6, margin: 0 }}>
                Every single routing decision is fully visible. Real-time cost analytics and trace histories provide complete observability and clear, actionable logs.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
