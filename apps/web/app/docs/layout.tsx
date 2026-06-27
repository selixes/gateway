'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '../../components/Navbar';

const sidebarItems = [
  { href: '/docs/getting-started', label: '🚀 Getting Started' },
  { href: '/docs/core-concepts', label: '📖 Core Concepts' },
  { href: '/docs/api-reference', label: '⚙️ API Reference' },
  { href: '/docs/architecture', label: '🏛️ System Architecture' },
  { href: '/docs/openai-compatibility', label: '🔌 OpenAI Compatibility' },
  { href: '/docs/failover-policy', label: '🔮 Failover Policy' },
  { href: '/docs/model-registry', label: '🗂️ Model Registry' },
  { href: '/docs/local-continuity', label: '🏠 Local Continuity' },
  { href: '/docs/migration', label: '🔄 Migration Guide' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSidebarItems = sidebarItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#f2f2f7', display: 'flex', flexDirection: 'column' }} className="noise-bg">
      <Navbar />

      {/* Main body split layout */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        
        {/* Sticky left sidebar panel (hidden on mobile, visible on desktop) */}
        <aside 
          className="hidden md:flex"
          style={{
            width: '240px',
            background: '#09090c',
            borderRight: '1px solid #1a1a24',
            padding: '2rem 1.25rem',
            flexDirection: 'column',
            gap: '1.5rem',
            flexShrink: 0
          }}
        >
          <div>
            <h4 style={{ fontSize: '0.725rem', fontWeight: 800, color: '#52526b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem', paddingLeft: '8px' }}>
              Documentation Console
            </h4>

            {/* Docs Search Bar */}
            <div style={{ position: 'relative', marginBottom: '1.25rem', padding: '0 4px' }}>
              <input
                type="text"
                placeholder="🔍 Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0e0e13',
                  border: '1px solid #1c1c28',
                  borderRadius: '6px',
                  padding: '8px 10px 8px 12px',
                  color: '#fff',
                  fontSize: '0.775rem',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredSidebarItems.length === 0 ? (
                <div style={{ fontSize: '0.775rem', color: '#52526b', padding: '8px', fontStyle: 'italic' }}>
                  No matches found
                </div>
              ) : (
                filteredSidebarItems.map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href} href={item.href}
                      style={{
                        display: 'block', padding: '0.625rem 0.85rem', borderRadius: '7px',
                        fontSize: '0.85rem', fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'var(--text-primary)' : '#8e8e9f',
                        background: isActive ? '#14141a' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        transition: 'all 0.15s', textDecoration: 'none'
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })
              )}
            </nav>
          </div>

          <div style={{ marginTop: 'auto', padding: '1rem', background: '#0e0e13', border: '1px solid #1c1c28', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Need Assistance?
            </span>
            <p style={{ fontSize: '0.725rem', color: '#9494a8', margin: '0 0 8px 0', lineHeight: 1.4 }}>
              Our platform team can help deploy dedicated private VPC custom environments.
            </p>
            <Link href="/contact" style={{ fontSize: '0.725rem', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
              {"Apply for Pilot ->"}
            </Link>
          </div>
        </aside>

        {/* Right content page viewport */}
        <main style={{ flex: 1, padding: '3.5rem 4rem 5rem' }} className="mobile-padding-1">
          <div style={{ maxWidth: '820px' }}>
            
            {/* Visual Breadcrumbs */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: '#52526b',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '1.75rem',
              fontWeight: 500
            }}>
              <Link href="/" style={{ color: '#8e8e9f', textDecoration: 'none', transition: 'color 0.2s' }}>Home</Link>
              <span>/</span>
              <span style={{ color: '#8e8e9f' }}>Docs</span>
              <span>/</span>
              <span style={{ color: 'var(--accent-hover)' }}>
                {sidebarItems.find(item => item.href === pathname)?.label.replace(/^[^\s]+\s+/, '') || 'Page'}
              </span>
            </div>

            {children}
          </div>
        </main>

        {/* Mobile FAB Table of Contents Button (Visible only on mobile viewports) */}
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg z-50 cursor-pointer border-none transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.45)',
          }}
          aria-label="Table of Contents"
        >
          <span style={{ fontSize: '1.5rem' }}>📖</span>
        </button>

        {/* Mobile Bottom Sheet for Table of Contents */}
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <div 
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 998,
              }}
            />

            {/* Bottom Sheet Container */}
            <div 
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '60vh',
                background: 'rgba(8, 8, 9, 0.98)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                borderTop: '1px solid var(--bg-border)',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                padding: '0.75rem 1rem 2.5rem',
                overflowY: 'auto'
              }}
            >
              {/* Grab handle */}
              <div 
                style={{ 
                  width: '36px', 
                  height: '4px', 
                  background: 'var(--text-muted)', 
                  borderRadius: '999px', 
                  margin: '0 auto 1.25rem'
                }} 
              />

              <h4 style={{ fontSize: '0.725rem', fontWeight: 800, color: '#52526b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem', paddingLeft: '8px' }}>
                Documentation Index
              </h4>

              {/* Mobile Search Bar */}
              <div style={{ position: 'relative', marginBottom: '1rem', padding: '0 4px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0e0e13',
                    border: '1px solid #1c1c28',
                    borderRadius: '6px',
                    padding: '8px 10px 8px 12px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif'
                  }}
                />
              </div>
              
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredSidebarItems.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#52526b', padding: '8px', fontStyle: 'italic' }}>
                    No matches found
                  </div>
                ) : (
                  filteredSidebarItems.map(item => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href} href={item.href}
                        onClick={() => setIsOpen(false)}
                        style={{
                          display: 'block', padding: '0.75rem 1rem', borderRadius: '8px',
                          fontSize: '0.9rem', fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'var(--text-primary)' : '#8e8e9f',
                          background: isActive ? '#14141a' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                          transition: 'all 0.15s', textDecoration: 'none'
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })
                )}
              </nav>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
