'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

import { useState, useEffect, useRef } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '◈', exact: true },
  { href: '/dashboard/workflows', label: 'Workflows', icon: '⬡' },
  { href: '/dashboard/runs', label: 'Runs', icon: '⟳' },
  { href: '/dashboard/traces', label: 'AI Traces', icon: '◊' },
  { href: '/dashboard/observability', label: 'Observability', icon: '📡' },
  { href: '/dashboard/templates', label: 'Templates', icon: '⊞' },
  { href: '/dashboard/integrations', label: 'Integrations', icon: '⚡' },
];

const bottomItems = [
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentSwipe, setCurrentSwipe] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile || !isOpen) return;

    function onVisualViewportChange() {
      if (!drawerRef.current || !window.visualViewport) return;
      const visualViewportHeight = window.visualViewport.height;
      const diffFromInitial = window.innerHeight - visualViewportHeight;
      
      drawerRef.current.style.maxHeight = `${visualViewportHeight * 0.85}px`;
      drawerRef.current.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onVisualViewportChange);
      window.visualViewport.addEventListener('scroll', onVisualViewportChange);
      onVisualViewportChange();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onVisualViewportChange);
        window.visualViewport.removeEventListener('scroll', onVisualViewportChange);
      }
    };
  }, [isMobile, isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      setStartY(touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const touch = e.touches[0];
    if (touch) {
      const deltaY = touch.clientY - startY;
      if (deltaY > 0) { // only swipe down to dismiss
        setCurrentSwipe(deltaY);
        if (drawerRef.current) {
          drawerRef.current.style.setProperty('--swipe-amount', `${deltaY}px`);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (currentSwipe > 120) {
      setIsOpen(false);
    }
    setStartY(null);
    setCurrentSwipe(0);
    if (drawerRef.current) {
      drawerRef.current.style.setProperty('--swipe-amount', `0px`);
    }
  };

  const isActive = (item: typeof navItems[0]) => item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);

  if (isMobile) {
    return (
      <>
        {/* Fixed Header */}
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--bg-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle Navigation Menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              {isOpen ? '✕' : '☰'}
            </button>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <img src="/selixes_icon.png" alt="Selixes Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Selixes
              </span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  rootBox: { width: '100px' },
                  organizationSwitcherTrigger: {
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)',
                    color: 'var(--text-primary)',
                    maxWidth: '90px'
                  },
                },
              }}
            />
            <UserButton appearance={{ elements: { avatarBox: { width: '24px', height: '24px' } } }} />
          </div>
        </header>

        {/* Mobile drawer overlay */}
        {isOpen && (
          <div 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 98,
            }}
          />
        )}

        {/* Mobile bottom sheet drawer */}
        {isOpen && (
          <div 
            ref={drawerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '80vh',
              background: 'rgba(8, 8, 9, 0.98)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              borderTop: '1px solid var(--bg-border)',
              zIndex: 99,
              display: 'flex',
              flexDirection: 'column',
              padding: '0.75rem 1rem 1.5rem',
              transform: 'translateY(var(--swipe-amount, 0px))',
              transition: startY === null ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              overflowY: 'auto'
            }}
          >
            {/* Grab/Swipe handle */}
            <div 
              style={{ 
                width: '36px', 
                height: '4px', 
                background: 'var(--text-muted)', 
                borderRadius: '999px', 
                margin: '0 auto 1.25rem',
                cursor: 'ns-resize'
              }} 
            />

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              {navItems.map(item => {
                const active = isActive(item);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.925rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'all 0.15s',
                    textDecoration: 'none',
                  }}>
                    <span style={{ fontSize: '1.1rem', color: active ? 'var(--accent)' : 'inherit', width: '20px', textAlign: 'center' }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ padding: '0.75rem 0 0', borderTop: '1px solid var(--bg-border)', marginTop: '1.5rem' }}>
              {bottomItems.map(item => {
                const active = isActive(item);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.925rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                    textDecoration: 'none',
                  }}>
                    <span style={{ fontSize: '1.1rem', color: active ? 'var(--accent)' : 'inherit', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside style={{
      width: '228px',
      minHeight: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--bg-border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '1.125rem 1.25rem', borderBottom: '1px solid var(--bg-border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <img src="/selixes_icon.png" alt="Selixes Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginLeft: '0.1rem' }}>
            Selixes
          </span>
        </Link>
      </div>

      {/* Org Switcher */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--bg-border)' }}>
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: {
              rootBox: { width: '100%' },
              organizationSwitcherTrigger: {
                width: '100%',
                padding: '0.375rem 0.625rem',
                borderRadius: '7px',
                fontSize: '0.8125rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-primary)',
              },
            },
          }}
        />
      </div>

      {/* Primary Nav */}
      <nav style={{ flex: 1, padding: '0.625rem 0.625rem 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(item => {
          const active = isActive(item);
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '7px',
              fontSize: '0.875rem',
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s',
              textDecoration: 'none',
            }}>
              <span style={{ fontSize: '0.9375rem', color: active ? 'var(--accent)' : 'inherit', width: '18px', textAlign: 'center' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div style={{ padding: '0.625rem', borderTop: '1px solid var(--bg-border)' }}>
        {bottomItems.map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.5rem 0.75rem', borderRadius: '7px',
            fontSize: '0.875rem', color: 'var(--text-secondary)',
            textDecoration: 'none', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: '0.9375rem', width: '18px', textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* User Button */}
        <div style={{ padding: '0.625rem 0.75rem', marginTop: '4px' }}>
          <UserButton appearance={{ elements: { avatarBox: { width: '28px', height: '28px' } } }} />
        </div>
      </div>
    </aside>
  );
}
