'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function ContactClient() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [interest, setInterest] = useState('pilot');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#f2f2f7', position: 'relative', overflowX: 'hidden' }} className="noise-bg">
      <Navbar />

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
            GET IN TOUCH
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 850, letterSpacing: '-0.03em', color: '#fff', marginBottom: '1.25rem', lineHeight: 1.15 }}>
            Schedule an Architecture Walkthrough
          </h1>
          <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
            Book a dedicated technical session or request custom support with your high-pressure workloads.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '4.5rem' }}>
          
          <div style={{ background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📅</span>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Book a Demo</h3>
            <p style={{ fontSize: '0.75rem', color: '#8e8e9f', margin: '0 0 1rem 0', lineHeight: 1.4 }}>30-minute VPS/VPC technical deep-dive walkthrough.</p>
            <button style={{ background: '#191924', border: '1px solid #27273a', color: '#fff', fontSize: '0.725rem', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Calendly</button>
          </div>

          <div style={{ background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🚀</span>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Pilot Program</h3>
            <p style={{ fontSize: '0.75rem', color: '#8e8e9f', margin: '0 0 1rem 0', lineHeight: 1.4 }}>Deploy Selixes directly inside your live workload.</p>
            <button style={{ background: '#191924', border: '1px solid #27273a', color: '#fff', fontSize: '0.725rem', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Apply Now</button>
          </div>

          <div style={{ background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🔧</span>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Technical Support</h3>
            <p style={{ fontSize: '0.75rem', color: '#8e8e9f', margin: '0 0 1rem 0', lineHeight: 1.4 }}>Standard developer integration and bug assistance.</p>
            <button style={{ background: '#191924', border: '1px solid #27273a', color: '#fff', fontSize: '0.725rem', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Get Support</button>
          </div>

          <div style={{ background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🏢</span>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Enterprise</h3>
            <p style={{ fontSize: '0.75rem', color: '#8e8e9f', margin: '0 0 1rem 0', lineHeight: 1.4 }}>Custom deployment architecture coordination.</p>
            <button style={{ background: '#191924', border: '1px solid #27273a', color: '#fff', fontSize: '0.725rem', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Contact Sales</button>
          </div>

        </div>

        {/* Dynamic Pilot Form Chassis */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
          gap: isMobile ? '1.5rem' : '3rem',
          background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '16px',
          padding: isMobile ? '1.5rem' : '2.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          
          {/* Left Form */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
              Submit Pilot Request
            </h3>
            {submitted ? (
              <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '1.5rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>✅</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>Request Submitted</h4>
                <p style={{ fontSize: '0.8125rem', color: '#8e8e9f', margin: 0 }}>An engineering coordinator will contact you in under 2 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1b2', display: 'block', marginBottom: '4px' }}>Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', background: '#121217', border: '1px solid #222230', borderRadius: '6px', padding: '8px 12px', color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1b2', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', background: '#121217', border: '1px solid #222230', borderRadius: '6px', padding: '8px 12px', color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1b2', display: 'block', marginBottom: '4px' }}>Company</label>
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)} required style={{ width: '100%', background: '#121217', border: '1px solid #222230', borderRadius: '6px', padding: '8px 12px', color: '#fff', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1b2', display: 'block', marginBottom: '4px' }}>Primary Interest</label>
                  <select value={interest} onChange={e => setInterest(e.target.value)} style={{ width: '100%', background: '#121217', border: '1px solid #222230', borderRadius: '6px', padding: '8px 12px', color: '#fff', outline: 'none' }}>
                    <option value="pilot">Apply for Pilot Program</option>
                    <option value="demo">Schedule Architecture Review</option>
                    <option value="support">Technical Integration Help</option>
                    <option value="enterprise">Custom VPC Licensing</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1b2', display: 'block', marginBottom: '4px' }}>Message / Workload Details</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} style={{ width: '100%', background: '#121217', border: '1px solid #222230', borderRadius: '6px', padding: '8px 12px', color: '#fff', outline: 'none', resize: 'vertical' }} />
                </div>
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '0.75rem 0', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Submit Pilot Request
                </button>
              </form>
            )}
          </div>

          {/* Right Info Coordinates */}
          <div style={{
            borderLeft: isMobile ? 'none' : '1px solid #1f1f2c',
            borderTop: isMobile ? '1px solid #1f1f2c' : 'none',
            paddingLeft: isMobile ? 0 : '2.5rem',
            paddingTop: isMobile ? '1.5rem' : 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: isMobile ? '1.5rem' : 0
          }}>
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-hover)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
                Operational Coordinates
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.725rem', color: '#8e8e9f', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Technical Support email</span>
                  <a href="mailto:support@selixes.com" style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>support@selixes.com</a>
                </div>
                <div>
                  <span style={{ fontSize: '0.725rem', color: '#8e8e9f', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Sovereign office</span>
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: '2px 0 0 0', lineHeight: 1.4 }}>Delhi, India</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', padding: '1.25rem', background: 'rgba(99,102,241,0.03)', border: '1px dashed rgba(99,102,241,0.2)', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Pilot Qualification
              </span>
              <p style={{ fontSize: '0.775rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                B2B startups and SMBs routing at least **10,000 monthly transactions** qualify for direct custom setup pipelines and dedicated private Slack channels.
              </p>
              <p style={{ fontSize: '0.775rem', color: '#8e8e9f', marginTop: '8px', margin: 0, lineHeight: 1.5 }}>
                Running fewer than 10,000 monthly transactions? Start free with our <Link href="/pricing#community" style={{ color: 'var(--accent-hover)', textDecoration: 'underline' }}>Community Edition</Link>.
              </p>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
