'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ScrambledBrand from './ScrambledBrand';

export default function Navbar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getLinkStyle = (path: string) => {
    const isActive = pathname === path || (path === '/docs' && pathname.startsWith('/docs'));
    return {
      fontSize: isMobile ? '1rem' : '0.85rem',
      color: isActive ? '#fff' : '#a1a1aa',
      textDecoration: 'none',
      transition: 'color 0.2s',
      fontWeight: isActive ? 600 : 500,
    };
  };

  return (
    <>
      <nav 
        className="max-w-[100vw] overflow-hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderBottom: '1px solid #1a1a24',
          background: 'rgba(7,7,9,0.85)',
          backdropFilter: 'blur(16px)',
          padding: isMobile ? '0.75rem 1.25rem' : '0 2.5rem',
          height: '62px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '100vw',
          overflow: 'hidden',
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600;700&display=swap');
          @keyframes brand-x-glow {
            0%, 100% {
              text-shadow: 0 0 4px rgba(0, 210, 255, 0.35), 0 0 10px rgba(0, 210, 255, 0.15);
              color: #00d2ff;
            }
            50% {
              text-shadow: 0 0 14px rgba(99, 102, 241, 0.95), 0 0 24px rgba(99, 102, 241, 0.5);
              color: #818cf8;
            }
          }
          .brand-x {
            display: inline-block;
            animation: brand-x-glow 3s ease-in-out infinite;
            font-weight: 800;
          }
        `}</style>
        {isMobile ? (
          <div className="overflow-hidden w-full max-w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Link href="/" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
              <img src="/selixes_icon.png" alt="Selixes Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.22em', color: '#fff', marginLeft: '0.2rem', textTransform: 'uppercase' }}>
                <ScrambledBrand />
              </span>
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="ml-auto flex-shrink-0"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                outline: 'none',
              }}
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? '✕' : '☰'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
                <img src="/selixes_icon.png" alt="Selixes Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                <span style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.25em', color: '#fff', marginLeft: '0.3rem', textTransform: 'uppercase' }}>
                  <ScrambledBrand />
                </span>
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2.2rem' }}>
              <Link href="/docs/getting-started" style={getLinkStyle('/docs')}>Docs</Link>
              <Link href="/pricing" style={getLinkStyle('/pricing')}>Pricing</Link>
              <Link href="/about" style={getLinkStyle('/about')}>About</Link>
              <Link href="/contact" style={getLinkStyle('/contact')}>Contact</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <Link href="/sign-in" style={{ textDecoration: 'none', border: '1px solid #22222d', background: 'transparent', color: '#cbd5e1', fontSize: '0.8125rem', padding: '0.45rem 1.1rem', borderRadius: '7px', cursor: 'pointer', transition: 'all 0.2s' }}>Sign In</Link>
              <Link href="/dashboard" style={{ textDecoration: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.8125rem', padding: '0.45rem 1.25rem', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{"Console ->"}</Link>
            </div>
          </>
        )}
      </nav>

      {/* Glassmorphic Mobile Drawer */}
      {isMobile && isOpen && (
        <div style={{
          position: 'fixed',
          top: '62px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(7, 7, 9, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid #1a1a24',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          padding: '2.5rem 1.5rem',
          gap: '1.75rem',
          animation: 'fade-in-nav 0.25s ease-out both',
        }}>
          <style>{`
            @keyframes fade-in-nav {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Link href="/docs/getting-started" onClick={() => setIsOpen(false)} style={getLinkStyle('/docs')}>Docs</Link>
            <Link href="/pricing" onClick={() => setIsOpen(false)} style={getLinkStyle('/pricing')}>Pricing</Link>
            <Link href="/about" onClick={() => setIsOpen(false)} style={getLinkStyle('/about')}>About</Link>
            <Link href="/contact" onClick={() => setIsOpen(false)} style={getLinkStyle('/contact')}>Contact</Link>
          </div>
          <div style={{ height: '1px', background: '#1a1a24', margin: '0.5rem 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/sign-in" onClick={() => setIsOpen(false)} style={{ textDecoration: 'none', border: '1px solid #22222d', background: 'transparent', color: '#cbd5e1', fontSize: '0.925rem', padding: '0.75rem 1.25rem', borderRadius: '7px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500 }}>Sign In</Link>
            <Link href="/dashboard" onClick={() => setIsOpen(false)} style={{ textDecoration: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.925rem', padding: '0.75rem 1.25rem', borderRadius: '7px', fontWeight: 650, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>{"Console ->"}</Link>
          </div>
        </div>
      )}
    </>
  );
}
