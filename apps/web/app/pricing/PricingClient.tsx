'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function PricingClient() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const srOnlyStyle: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };

  const renderCell = (val: string) => {
    if (val.startsWith('text:')) {
      const plainText = val.replace('text:', '').trim();
      return <span style={{ color: '#e2e8f0' }}>{plainText}</span>;
    }
    if (val === '-' || val === '—') {
      return (
        <>
          <span style={srOnlyStyle}>Not available</span>
          <span style={{ color: '#52526b', fontWeight: 800, fontSize: '1.1rem' }} aria-hidden="true">-</span>
        </>
      );
    }
    if (val.startsWith('✓')) {
      const text = val.replace('✓', '').trim();
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={srOnlyStyle}>Available: {text || 'Yes'}</span>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} aria-hidden="true" />
          <span style={{ color: '#e2e8f0' }}>{text}</span>
        </span>
      );
    }
    // Otherwise it is a partial feature
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <span style={srOnlyStyle}>Feature status: {val}</span>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1.5px solid #a1a1aa', display: 'inline-block', background: 'transparent' }} aria-hidden="true" />
        <span style={{ color: '#cbd5e1' }}>{val}</span>
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#f2f2f7', position: 'relative', overflowX: 'hidden' }} className="noise-bg">
      <Navbar />

      {/* Main Content */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
            TRANSPARENT LICENSING
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 850, letterSpacing: '-0.03em', color: '#fff', marginBottom: '1.25rem', lineHeight: 1.15 }}>
            Sovereign Pricing, Built for Scale
          </h1>
          <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
            Start for free on your own infrastructure or deploy in our secure, low-latency private cloud.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.75rem', marginBottom: isMobile ? '3rem' : '6rem', alignItems: 'stretch' }}>
          
          {/* Tier 1: Community */}
          <div style={{
            background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '16px',
            padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative'
          }} className="pricing-card">
            <div>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9494a8', textTransform: 'uppercase' }}>
                COMMUNITY (Sovereign)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '1rem 0 1.25rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>$0</span>
                <span style={{ fontSize: '0.85rem', color: '#52525b' }}>/ forever (Self-Hosted)</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#9494a8', lineHeight: 1.6, marginBottom: '2rem' }}>
                Run Selixes entirely inside your private boundary. Zero logs or tokens ever leave your VPC.
              </p>
              
              <ul style={{ padding: 0, margin: '0 0 2.5rem 0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'Self-hosted Docker / K8s',
                  'Up to 100k requests / month',
                  '3 seats included',
                  '7-day local log retention',
                  'Community support (GitHub)',
                  'Local Ollama Continuity fallback',
                  'Standard budget & loop breakers'
                ].map(feat => (
                  <li key={feat} style={{ fontSize: '0.825rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} /> {feat}
                  </li>
                ))}
              </ul>
            </div>
            
            <a href="/docs/getting-started" className="btn-ghost" style={{ justifyContent: 'center', width: '100%', padding: '0.75rem 0', borderRadius: '8px' }}>
              Deploy Community Edition
            </a>
          </div>

          {/* Tier 2: Cloud Gateway */}
          <div style={{
            background: 'linear-gradient(180deg, #12121c 0%, #0d0d12 100%)',
            border: '2px solid var(--accent)',
            borderRadius: '16px',
            padding: '2.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 20px 45px rgba(99, 102, 241, 0.22), 0 0 20px rgba(99, 102, 241, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            transform: isMobile ? 'none' : 'scale(1.03)',
            zIndex: 2,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }} className="pricing-card recommended-tier">
            <div style={{ position: 'absolute', top: '-12px', right: '20px', background: 'var(--accent)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 10px', borderRadius: '999px', letterSpacing: '0.04em' }}>
              RECOMMENDED
            </div>
            <div>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent-hover)', textTransform: 'uppercase' }}>
                GATEWAY CLOUD
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '1rem 0 1.25rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>$0.0006</span>
                <span style={{ fontSize: '0.85rem', color: '#52525b' }}>/ request (metered)</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#9494a8', lineHeight: 1.6, marginBottom: '2rem' }}>
                Fully managed, zero-maintenance global gateway hosting. Highly scalable Redis sliding rate limits.
              </p>
              
              <ul style={{ padding: 0, margin: '0 0 2.5rem 0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'Fully managed global SaaS edge',
                  'Up to 10M requests / month',
                  '10 seats included',
                  '30-day hosted log retention',
                  'Standard Business support SLA',
                  'Managed Redis budget locks',
                  'Real-time telemetry analytics'
                ].map(feat => (
                  <li key={feat} style={{ fontSize: '0.825rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', display: 'inline-block', boxShadow: '0 0 6px #818cf8' }} /> {feat}
                  </li>
                ))}
              </ul>
            </div>
            
            <Link href="/dashboard" className="btn-primary" style={{ justifyContent: 'center', width: '100%', padding: '0.75rem 0', borderRadius: '8px' }}>
              Deploy Cloud Gateway
            </Link>
          </div>

          {/* Tier 3: Enterprise */}
          <div style={{
            background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '16px',
            padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative'
          }} className="pricing-card">
            <div>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9494a8', textTransform: 'uppercase' }}>
                ENTERPRISE SHIELD
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '1rem 0 1.25rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>Custom</span>
                <span style={{ fontSize: '0.85rem', color: '#52525b' }}>/ annual contracts</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#9494a8', lineHeight: 1.6, marginBottom: '2rem' }}>
                Dedicated private deployment (single-tenant isolation scoped per contract) with dedicated technical SLAs and customized security models.
              </p>
              
              <ul style={{ padding: 0, margin: '0 0 2.5rem 0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'Dedicated private VPC deployment',
                  'Unlimited requests / month',
                  'Unlimited seats included',
                  'Custom log retention policy',
                  '24/7 dedicated Slack & phone support',
                  'Dedicated private deployment (single-tenant isolation scoped per contract)',
                  'Custom policy filters & PII auditing'
                ].map(feat => (
                  <li key={feat} style={{ fontSize: '0.825rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} /> {feat}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="btn-ghost" style={{ justifyContent: 'center', width: '100%', padding: '0.75rem 0', borderRadius: '8px', opacity: 0.5, cursor: 'not-allowed' }}>
              Coming Q4 2026
            </div>
          </div>

        </div>

        {/* Comparison Grid */}
        <section style={{ borderTop: '1px solid #1a1a24', paddingTop: '4.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '3rem' }}>
            Feature Comparison Matrix
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222230', textAlign: 'left' }}>
                  <th style={{ padding: '1rem', color: '#fff', fontWeight: 700 }}>Primitive Feature</th>
                  <th style={{ padding: '1rem', color: '#9494a8', fontWeight: 600 }}>Community</th>
                  <th style={{ padding: '1rem', color: '#9494a8', fontWeight: 600 }}>Gateway Cloud</th>
                  <th style={{ padding: '1rem', color: '#9494a8', fontWeight: 600 }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Self-Hosted VPC Deployment', c: '✓ (Docker)', s: '-', e: '✓ (Private VPC)' },
                  { name: 'Upstream Provider Failover', c: '✓ (15ms)', s: '✓ (Managed Edge)', e: '✓ (Isolated Edge)' },
                  { name: 'Zero-Dependency Fallback Cache', c: '✓ (In-Memory Map)', s: '✓ (Hosted Redis)', e: '✓ (Dedicated Redis)' },
                  { name: 'Tool Loop Trajectory Protection', c: '✓ (Cognitive Intercept with auto-recovery)', s: '✓ (Custom Headers)', e: '✓ (Custom Rules)' },
                  { name: 'Client Close Lock Cleanups', c: '✓ (Exactly-Once)', s: '✓ (Exactly-Once)', e: '✓ (Exactly-Once)' },
                  { name: 'Visual Telemetry Dashboards', c: 'Local Console Only', s: '✓ (Cloud Console)', e: '✓ (Dedicated Console)' },
                  { name: 'Dedicated Technical Support', c: 'GitHub Issues', s: '✓ (Business SLA)', e: '✓ (24/7 Slack & Phone)' },
                  
                  // Sub-header for Data Handling section
                  { name: 'Data Handling Disclosures', isSubHeader: true },
                  { 
                    name: 'Prompt Data Residency', 
                    c: 'text:Stays in customer VPC', 
                    s: 'text:Passes through Selixes-managed infrastructure', 
                    e: 'text:Dedicated private deployment',
                    hasBgTint: true 
                  },
                ].map((row, idx) => {
                  if ('isSubHeader' in row && row.isSubHeader) {
                    return (
                      <tr key={idx} style={{ background: 'rgba(99, 102, 241, 0.08)', borderBottom: '1px solid #222230' }}>
                        <td colSpan={4} style={{ padding: '0.75rem 1rem', color: 'var(--accent-hover)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {row.name}
                        </td>
                      </tr>
                    );
                  }
                  
                  const hasBgTint = 'hasBgTint' in row && row.hasBgTint;
                  return (
                    <tr key={idx} style={{ 
                      borderBottom: '1px solid #1a1a24',
                      background: hasBgTint ? 'rgba(255, 255, 255, 0.015)' : 'transparent'
                    }}>
                      <td style={{ padding: '1.125rem 1rem', color: '#fff', fontWeight: 500 }}>{row.name}</td>
                      <td style={{ padding: '1.125rem 1rem', color: '#cbd5e1' }}>{renderCell(row.c || '')}</td>
                      <td style={{ padding: '1.125rem 1rem', color: '#cbd5e1' }}>{renderCell(row.s || '')}</td>
                      <td style={{ padding: '1.125rem 1rem', color: '#cbd5e1' }}>{renderCell(row.e || '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
