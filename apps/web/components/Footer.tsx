'use client';

import React from 'react';
import Link from 'next/link';
import ScrambledBrand from './ScrambledBrand';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: '#040405',
      borderTop: '1px solid #1a1a24',
      padding: '5rem 2rem 3rem',
      position: 'relative',
      zIndex: 10,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Top Grid Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '3rem',
          marginBottom: '4rem',
        }}>
          
          {/* Brand Info Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '220px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
              <img src="/selixes_icon.png" alt="Selixes Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.22em', color: '#fff', textTransform: 'uppercase' }}>
                <ScrambledBrand />
              </span>
            </Link>
            <p style={{ fontSize: '0.825rem', color: '#8e8e9f', lineHeight: 1.6, margin: 0 }}>
               Sovereign by design AI Gateway. millisecond failover routing, active token arbitrage, and full compliance isolation.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
                display: 'inline-block',
              }} />
              <span style={{ fontSize: '0.675rem', fontFamily: 'monospace', color: '#22c55e', fontWeight: 700, letterSpacing: '0.05em' }}>
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
          </div>

          {/* Column 2: Product */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Product
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/pricing" style={linkStyle}>Pricing Plans</Link>
              <Link href="/#playground" style={linkStyle}>Header Builder</Link>
              <Link href="/#simulate" style={linkStyle}>Chaos Simulator</Link>
              <Link href="/#walkthrough" style={linkStyle}>Console Preview</Link>
            </div>
          </div>

          {/* Column 3: Developers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Documentation
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/docs/getting-started" style={linkStyle}>Getting Started</Link>
              <Link href="/docs/openai-compatibility" style={linkStyle}>OpenAI SDK Swap</Link>
              <Link href="/docs/failover-policy" style={linkStyle}>Outage Policies</Link>
              <Link href="/docs/local-continuity" style={linkStyle}>Ollama Continuity</Link>
              <Link href="/docs/migration" style={linkStyle}>Migration Guide</Link>
            </div>
          </div>

          {/* Column 4: Company & Legal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Company & Legal
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/about" style={linkStyle}>About Mission</Link>
              <Link href="/blog" style={linkStyle}>Technical Blog</Link>
              <Link href="/contact" style={linkStyle}>Contact Sales</Link>
              <Link href="/privacy-policy" style={linkStyle}>Privacy Policy</Link>
              <Link href="/terms-of-service" style={linkStyle}>Terms of Service</Link>
              <Link href="/security-registry" style={linkStyle}>Security Registry</Link>
              <a href="https://github.com/kunal3262k-bit/API-SHIELD" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                GitHub Repository
              </a>
            </div>
          </div>

        </div>

        {/* Bottom copyright and legal area */}
        <div style={{
          borderTop: '1px solid #14141d',
          paddingTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <p style={{ color: '#52526b', margin: 0, fontSize: '0.75rem', fontFamily: 'Inter, sans-serif' }}>
            &copy; {currentYear} Selixes. Built for secure, private-cloud sovereign deployments.
          </p>
          
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {[
              { name: 'Privacy Policy', href: '/privacy-policy' },
              { name: 'Terms of Service', href: '/terms-of-service' },
              { name: 'Security Registry', href: '/security-registry' },
            ].map((item) => (
              <Link key={item.name} href={item.href} style={{
                fontSize: '0.75rem',
                color: '#52526b',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#52526b'; }}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Simple SVG GitHub Link */}
            {/* TODO: Check if a 'selixes' GitHub organization exists and update this URL to 'https://github.com/selixes/...' if applicable. For now, keeping the personal account repository link live and functional. */}
            <a 
              href="https://github.com/kunal3262k-bit/API-SHIELD"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Selixes GitHub Repository"
              style={{ display: 'inline-flex', color: '#52526b', transition: 'color 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#52526b'; }}
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
          
        </div>

      </div>
    </footer>
  );
}

const linkStyle: React.CSSProperties = {
  fontSize: '0.825rem',
  color: '#52526b',
  textDecoration: 'none',
  fontFamily: 'Inter, sans-serif',
  transition: 'color 0.2s',
};
