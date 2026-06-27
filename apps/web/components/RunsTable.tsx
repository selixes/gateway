'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkflowRun } from '../lib/types';
import { RunStatusBadge } from './StatusBadge';
import { useMounted } from '../lib/useMounted';

type Status = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING' | 'RETRYING';
type FilterStatus = 'ALL' | Status;

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function RunsTable({ initialRuns, onSelectRun }: { initialRuns: WorkflowRun[]; onSelectRun?: (id: string) => void }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([]);
  const [dateFilter, setDateFilter] = useState<'ALL' | '24H' | '7D' | '30D'>('ALL');
  
  // Faceted Search Sidebar States
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);

  const isMounted = useMounted();

  useEffect(() => {
    if (isMounted) {
      setSelectedModel(localStorage.getItem('selixes_filter_model'));
      setSelectedNode(localStorage.getItem('selixes_filter_node'));
      setSelectedFlag(localStorage.getItem('selixes_filter_flag'));
    }
  }, [isMounted]);

  const changeModel = (m: string | null) => {
    setSelectedModel(m);
    if (m) localStorage.setItem('selixes_filter_model', m);
    else localStorage.removeItem('selixes_filter_model');
  };

  const changeNode = (n: string | null) => {
    setSelectedNode(n);
    if (n) localStorage.setItem('selixes_filter_node', n);
    else localStorage.removeItem('selixes_filter_node');
  };

  const changeFlag = (f: string | null) => {
    setSelectedFlag(f);
    if (f) localStorage.setItem('selixes_filter_flag', f);
    else localStorage.removeItem('selixes_filter_flag');
  };

  const toggleStatus = (s: FilterStatus) => {
    if (s === 'ALL') {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses(prev => {
        if (prev.includes(s as Status)) {
          return prev.filter(x => x !== s);
        } else {
          return [...prev, s as Status];
        }
      });
    }
  };

  const filtered = useMemo(() => {
    return initialRuns.filter(run => {
      const workflowName = run.workflow?.name ?? '';
      const matchesSearch =
        !search ||
        workflowName.toLowerCase().includes(search.toLowerCase()) ||
        run.id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(run.status as Status);

      let matchesDate = true;
      if (dateFilter !== 'ALL') {
        const now = new Date();
        const runTime = new Date(run.startedAt);
        const diffMs = now.getTime() - runTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (dateFilter === '24H') matchesDate = diffHours <= 24;
        else if (dateFilter === '7D') matchesDate = diffHours <= 168;
        else if (dateFilter === '30D') matchesDate = diffHours <= 720;
      }

      let matchesModel = true;
      if (selectedModel) {
        matchesModel = (run.traces ?? []).some(t => t.model.toLowerCase().includes(selectedModel.toLowerCase())) ||
                       (run.workflow?.provider ?? '').toLowerCase().includes(selectedModel.toLowerCase()) ||
                       (run.workflow?.name ?? '').toLowerCase().includes(selectedModel.toLowerCase());
      }

      let matchesNode = true;
      if (selectedNode) {
        const trigger = run.triggerType.toLowerCase();
        if (selectedNode === 'Zurich Sovereign Edge') {
          matchesNode = trigger.includes('sovereign') || trigger.includes('zurich');
        } else if (selectedNode === 'US-East Edge') {
          matchesNode = trigger.includes('webhook') || trigger.includes('east');
        } else if (selectedNode === 'Continuity Node') {
          matchesNode = trigger.includes('replay') || trigger.includes('continuity') || trigger.includes('local');
        }
      }

      let matchesFlag = true;
      if (selectedFlag) {
        const err = (run.errorMessage ?? '').toLowerCase();
        const trigger = run.triggerType.toLowerCase();
        if (selectedFlag === 'PII Masked') {
          matchesFlag = trigger.includes('pii') || err.includes('pii') || trigger.includes('mask');
        } else if (selectedFlag === 'Memory Leak Safeguard') {
          matchesFlag = err.includes('leak') || err.includes('cwe-401') || run.status === 'FAILED';
        } else if (selectedFlag === 'Integer Overflow (CWE-190)') {
          matchesFlag = err.includes('cwe-190') || err.includes('overflow');
        } else if (selectedFlag === 'Memory Leak (CWE-401)') {
          matchesFlag = err.includes('cwe-401') || err.includes('leak');
        }
      }

      return matchesSearch && matchesStatus && matchesDate && matchesModel && matchesNode && matchesFlag;
    });
  }, [initialRuns, search, selectedStatuses, dateFilter, selectedModel, selectedNode, selectedFlag]);

  const statuses: FilterStatus[] = ['ALL', 'SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'RETRYING'];
  const counts = statuses.reduce((acc, s) => {
    acc[s] = s === 'ALL' ? initialRuns.length : initialRuns.filter(r => r.status === s).length;
    return acc;
  }, {} as Record<FilterStatus, number>);

  const statusColors: Record<FilterStatus, string> = {
    ALL: 'var(--text-muted)',
    SUCCESS: '#22c55e',
    FAILED: '#ef4444',
    RUNNING: '#3b82f6',
    PENDING: '#6b7280',
    RETRYING: '#f59e0b',
  };

  const handleParentClick = (e: React.MouseEvent, parentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelectRun) {
      onSelectRun(parentId);
    } else {
      router.push(`/dashboard/runs/${parentId}`);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', alignItems: 'start' }} className="mobile-grid-1">
      {/* Faceted Search Sidebar */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '1.25rem', height: 'fit-content' }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem', borderBottom: '1px solid var(--bg-border)', paddingBottom: '0.5rem' }}>
          Faceted Search
        </h3>
        
        {/* Model Filter */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.625rem', letterSpacing: '0.03em' }}>AI Model / Provider</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['All', 'gpt-4o', 'claude-3-5-sonnet', 'llama-3'].map(m => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: (selectedModel === m || (m === 'All' && !selectedModel)) ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: (selectedModel === m || (m === 'All' && !selectedModel)) ? 600 : 400 }}>
                <input
                  type="checkbox"
                  checked={selectedModel === m || (m === 'All' && !selectedModel)}
                  onChange={() => changeModel(m === 'All' ? null : m)}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        {/* Node Filter */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.625rem', letterSpacing: '0.03em' }}>Infrastructure Node</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['All', 'US-East Edge', 'Zurich Sovereign Edge', 'Continuity Node'].map(n => (
              <label key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: (selectedNode === n || (n === 'All' && !selectedNode)) ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: (selectedNode === n || (n === 'All' && !selectedNode)) ? 600 : 400 }}>
                <input
                  type="checkbox"
                  checked={selectedNode === n || (n === 'All' && !selectedNode)}
                  onChange={() => changeNode(n === 'All' ? null : n)}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                {n}
              </label>
            ))}
          </div>
        </div>

        {/* Vulnerability/Security Flags */}
        <div>
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.625rem', letterSpacing: '0.03em' }}>Security Auditing</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['All', 'PII Masked', 'Memory Leak Safeguard', 'Integer Overflow (CWE-190)', 'Memory Leak (CWE-401)'].map(f => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: (selectedFlag === f || (f === 'All' && !selectedFlag)) ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: (selectedFlag === f || (f === 'All' && !selectedFlag)) ? 600 : 400 }}>
                <input
                  type="checkbox"
                  checked={selectedFlag === f || (f === 'All' && !selectedFlag)}
                  onChange={() => changeFlag(f === 'All' ? null : f)}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                {f}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Column */}
      <div style={{ minWidth: 0 }}>
        {/* Filter toolbar */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none',
            }}>⌕</span>
            <input
              type="text"
              placeholder="Search by workflow name or run ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
            />
          </div>

          {/* Date Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as 'ALL' | '24H' | '7D' | '30D')}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                borderRadius: '8px',
                padding: '0.6rem 2.2rem 0.6rem 1rem',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239494a8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                backgroundSize: '14px',
                transition: 'border-color 0.15s ease',
              }}
            >
              <option value="ALL">All Time</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {statuses.map(s => {
            const active = s === 'ALL' ? selectedStatuses.length === 0 : selectedStatuses.includes(s as Status);
            const color = statusColors[s];
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: active ? 600 : 400,
                  background: active ? `${color}18` : 'var(--bg-elevated)',
                  color: active ? color : 'var(--text-muted)',
                  border: `1px solid ${active ? `${color}45` : 'var(--bg-border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {s !== 'ALL' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block' }} />}
                {s}
                {counts[s] > 0 && (
                  <span style={{
                    marginLeft: '4px',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    background: active ? `${color}25` : 'rgba(255,255,255,0.06)',
                    color: active ? color : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}>
                    {counts[s]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="responsive-table w-full border-collapse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '10px', overflow: 'hidden' }}>
          <thead>
            <tr style={{
              display: 'grid', gridTemplateColumns: '2.5fr 1fr 90px 1.5fr 1fr',
              gap: '1rem', padding: '0.75rem 1.5rem',
              borderBottom: '1px solid var(--bg-border)',
            }}>
              {['Workflow', 'Status', 'Duration', 'Trigger / Lineage', 'Started At'].map(h => (
                <th key={h} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', border: 'none', padding: 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', border: 'none' }}>
                  {search || selectedStatuses.length > 0 || dateFilter !== 'ALL'
                    ? 'No runs match your filters.'
                    : 'No runs yet. Executions appear here automatically once workflows are triggered.'}
                </td>
              </tr>
            ) : (
              filtered.map(run => {
                const isReplay = run.triggerType.startsWith('REPLAY:');
                const parentRunId = isReplay ? run.triggerType.split(':')[1] : null;
                const childRun = initialRuns.find(r => r.triggerType === `REPLAY:${run.id}`);

                return (
                  <tr
                    key={run.id}
                    onClick={() => {
                      if (onSelectRun) {
                        onSelectRun(run.id);
                      } else {
                        router.push(`/dashboard/runs/${run.id}`);
                      }
                    }}
                    style={{
                      display: 'grid', gridTemplateColumns: '2.5fr 1fr 90px 1.5fr 1fr', gap: '1rem', alignItems: 'center',
                      padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--bg-border)',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td data-label="Workflow" style={{ border: 'none', padding: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                        {run.workflow?.name ?? '—'}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', margin: 0 }}>
                        {run.id.slice(0, 12)}…
                      </p>
                    </td>
                    <td data-label="Status" style={{ border: 'none', padding: 0 }}>
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td data-label="Duration" className="tabular-nums" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', border: 'none', padding: 0 }}>
                      {formatDuration(run.duration)}
                    </td>
                    <td data-label="Trigger / Lineage" style={{ border: 'none', padding: 0 }}>
                      {isReplay && parentRunId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} onClick={e => e.stopPropagation()}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            🔁 Replayed from:
                          </span>
                          <button
                            onClick={e => handleParentClick(e, parentRunId)}
                            style={{
                              alignSelf: 'flex-start',
                              background: 'rgba(99, 102, 241, 0.1)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              borderRadius: '4px',
                              color: '#a5b4fc',
                              padding: '1px 6px',
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                            }}
                          >
                            #{parentRunId.slice(0, 8)}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {run.triggerType}
                        </span>
                      )}

                      {childRun && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }} onClick={e => e.stopPropagation()}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ➡️ Replayed as:
                          </span>
                          <button
                            onClick={e => handleParentClick(e, childRun.id)}
                            style={{
                              alignSelf: 'flex-start',
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              borderRadius: '4px',
                              color: '#34d399',
                              padding: '1px 6px',
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
                            }}
                          >
                            #{childRun.id.slice(0, 8)}
                          </button>
                        </div>
                      )}
                    </td>
                    <td data-label="Started At" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', border: 'none', padding: 0 }}>
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'right' }}>
          Showing {filtered.length} of {initialRuns.length} runs
        </p>
      )}
      </div>
    </div>
  );
}
