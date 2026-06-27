'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMounted } from '../lib/useMounted';

interface CommandItem {
  title: string;
  description: string;
  shortcut?: string;
  action: () => void;
}

interface CommandCategory {
  category: string;
  items: CommandItem[];
}

export function CommandPalette() {
  const router = useRouter();
  const isMounted = useMounted();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle palette on Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
    }
  }, [isOpen]);

  const triggerAction = (toastMessage: string, action: () => void) => {
    action();
    setIsOpen(false);
    setToast(toastMessage);
    setTimeout(() => setToast(null), 3000);
  };

  const categories: CommandCategory[] = useMemo(() => [
    {
      category: 'Navigation',
      items: [
        {
          title: 'Go to Overview',
          description: 'Access the main reliability overview metrics',
          shortcut: 'G O',
          action: () => router.push('/dashboard'),
        },
        {
          title: 'Go to Workflows',
          description: 'Orchestrate guardrails and nodes',
          shortcut: 'G W',
          action: () => router.push('/dashboard/workflows'),
        },
        {
          title: 'Go to Runs',
          description: 'Monitor recent execution pipelines',
          shortcut: 'G R',
          action: () => router.push('/dashboard/runs'),
        },
        {
          title: 'Go to AI Traces',
          description: 'Audit prompts and compliance leakage',
          shortcut: 'G T',
          action: () => router.push('/dashboard/traces'),
        },
        {
          title: 'Go to Observability',
          description: 'View live provider health and costs',
          shortcut: 'G L',
          action: () => router.push('/dashboard/observability'),
        },
        {
          title: 'Go to Settings',
          description: 'Configure organization API security and keys',
          shortcut: 'G S',
          action: () => router.push('/dashboard/settings'),
        },
        {
          title: 'Go to Documentation',
          description: 'Read technical APIs, playbooks, and audits',
          shortcut: 'G D',
          action: () => router.push('/docs'),
        },
      ],
    },
    {
      category: 'Simulate Fault Injection',
      items: [
        {
          title: 'Inject Latency / Outage',
          description: 'Simulate Zurich edge connectivity drops',
          shortcut: 'A O',
          action: () => {
            // Trigger simulated outage (calls a mock system outage handler)
            console.log('Outage simulation triggered');
          },
        },
        {
          title: 'Isolate Sovereign Node',
          description: 'Trigger network partitioning and guardrail safeguards',
          shortcut: 'A F',
          action: () => {
            console.log('Sovereign node isolation triggered');
          },
        },
        {
          title: 'Restart Swarm Nodes',
          description: 'Perform rolling restart of edge validation nodes',
          shortcut: 'A R',
          action: () => {
            console.log('Swarm node restart triggered');
          },
        },
      ],
    },
    {
      category: 'Faceted Filters',
      items: [
        {
          title: 'Filter: High Latency (>500ms)',
          description: 'Apply latency filter on the Runs table',
          shortcut: 'F L',
          action: () => {
            localStorage.setItem('selixes_filter_flag', 'Memory Leak Safeguard'); // Simulates filter setting
            router.push('/dashboard/runs');
          },
        },
        {
          title: 'Filter: PII Leak Audits',
          description: 'Apply PII compliance filter',
          shortcut: 'F V',
          action: () => {
            localStorage.setItem('selixes_filter_flag', 'PII Masked');
            router.push('/dashboard/runs');
          },
        },
      ],
    },
  ], [router]);

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    return categories
      .map(cat => ({
        category: cat.category,
        items: cat.items.filter(
          item =>
            item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.description.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter(cat => cat.items.length > 0);
  }, [search, categories]);

  if (!isMounted) return null;

  return (
    <>
      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-[var(--bg-surface)] border border-green-500/30 text-green-400 text-xs font-semibold px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 animate-pulse">
          <span className="text-green-500 font-bold text-sm">✓</span> {toast}
        </div>
      )}

      {/* Palette Overlay Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Palette Box */}
          <div
            className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col relative"
            onClick={e => e.stopPropagation()}
            style={{
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            {/* Input Container */}
            <div className="flex items-center gap-3 px-4 border-b border-[var(--bg-border)] bg-[rgba(255,255,255,0.01)] py-3.5">
              <span className="text-zinc-500 text-lg font-mono">⌘</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none text-[var(--text-primary)] text-sm focus:outline-none flex-1 font-sans placeholder-zinc-500"
              />
              <span className="text-[10px] text-zinc-500 bg-[var(--bg-elevated)] border border-[var(--bg-border)] px-1.5 py-0.5 rounded font-mono select-none">
                ESC
              </span>
            </div>

            {/* Results List */}
            <div className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-1">
              {filteredCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No commands match &quot;{search}&quot;
                </div>
              ) : (
                filteredCategories.map(cat => (
                  <div key={cat.category} className="mb-2 last:mb-0">
                    <div className="px-3 py-1.5 text-[0.65rem] font-bold text-[var(--text-muted)] uppercase tracking-wider select-none">
                      {cat.category}
                    </div>
                    {cat.items.map(item => (
                      <button
                        key={item.title}
                        onClick={() =>
                          triggerAction(
                            cat.category === 'Navigation'
                              ? `Navigated to ${item.title.replace('Go to ', '')}`
                              : `Triggered: ${item.title}`,
                            item.action
                          )
                        }
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors duration-150 hover:bg-[var(--bg-elevated)] group text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[0.75rem] text-[var(--text-muted)] group-hover:text-zinc-400 transition-colors">
                            {item.description}
                          </span>
                        </div>
                        {item.shortcut && (
                          <span className="text-[10px] text-zinc-500 bg-[var(--bg-elevated)] border border-[var(--bg-border)] px-1.5 py-0.5 rounded font-mono group-hover:border-zinc-700 transition-colors">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer status */}
            <div className="border-t border-[var(--bg-border)] px-4 py-2 bg-[rgba(255,255,255,0.01)] flex justify-between items-center text-[10px] text-[var(--text-muted)] select-none">
              <span>Use ↑↓ to navigate · Enter to select</span>
              <span>Selixes Console v1.0.0</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
