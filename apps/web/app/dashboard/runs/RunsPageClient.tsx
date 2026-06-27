'use client';

import { useState, useEffect } from 'react';
import { RunsTable } from '../../../components/RunsTable';
import { RunStatusBadge } from '../../../components/StatusBadge';
import { ExecutionTimeline } from '../../../components/ExecutionTimeline';
import { TraceInspector } from '../../../components/TraceInspector';
import { ReplayButton } from '../../../components/ReplayButton';
import { useMounted } from '../../../lib/useMounted';
import { getRunDetails } from './actions';
import type { WorkflowRun } from '../../../lib/types';

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-[var(--bg-border)] last:border-b-0">
      <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider w-[120px] shrink-0">
        {label}
      </span>
      <span className="text-sm text-[var(--text-secondary)] font-mono truncate">{value}</span>
    </div>
  );
}

function RunDetailSkeleton() {
  return (
    <div className="animate-pulse p-6 bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-[10px] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="h-6 bg-[var(--bg-elevated)] w-1/3 rounded" />
        <div className="h-8 bg-[var(--bg-elevated)] w-24 rounded" />
      </div>
      <div className="h-40 bg-[var(--bg-elevated)] rounded-[10px]" />
      <div className="h-48 bg-[var(--bg-elevated)] rounded-[10px]" />
      <div className="h-64 bg-[var(--bg-elevated)] rounded-[10px]" />
    </div>
  );
}

interface RunsPageClientProps {
  initialRuns: WorkflowRun[];
  failed: number;
  success: number;
  rate: string;
}

export function RunsPageClient({ initialRuns, failed, success, rate }: RunsPageClientProps) {
  const isMounted = useMounted();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<WorkflowRun | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  // Draggable Divider Width state (in percentage for left pane)
  const [leftWidth, setLeftWidth] = useState(55);
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Clamp between 35% and 65% for balance
      setLeftWidth(Math.min(Math.max(newWidth, 35), 65));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Load selected run detail client-side
  useEffect(() => {
    if (!selectedRunId) {
      setRunDetail(null);
      return;
    }

    let active = true;
    setIsDetailLoading(true);
    
    getRunDetails(selectedRunId)
      .then(data => {
        if (active) {
          setRunDetail(data);
          setIsDetailLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          setIsDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedRunId]);

  return (
    <div>
      {/* Metrics Banner */}
      <div className={`mb-8 flex justify-between items-end ${selectedRunId ? 'hidden lg:flex' : 'flex'}`}>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-1">
            Runs
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {initialRuns.length} total executions · {rate}% success rate · {failed} failed
          </p>
        </div>
      </div>

      {/* Main Grid/Split Container */}
      <div className="flex flex-col lg:flex-row gap-0 items-stretch min-h-[500px]">
        {/* Left Pane (Table) */}
        <div
          className={`${selectedRunId ? 'hidden lg:block' : 'block w-full'}`}
          style={{ width: selectedRunId && isMounted ? `${leftWidth}%` : '100%' }}
        >
          <RunsTable initialRuns={initialRuns} onSelectRun={setSelectedRunId} />
        </div>

        {/* Draggable Splitter handle (only desktop and only when run selected) */}
        {selectedRunId && (
          <div
            onMouseDown={startDrag}
            className={`hidden lg:flex w-2.5 mx-2 cursor-col-resize hover:bg-[var(--accent)] active:bg-[var(--accent)] transition-colors duration-150 rounded-full select-none items-center justify-center shrink-0 ${
              isDragging ? 'bg-[var(--accent)]' : 'bg-[var(--bg-border)]'
            }`}
            title="Drag to resize split panes"
          >
            <div className="w-0.5 h-8 bg-zinc-700 rounded-full" />
          </div>
        )}

        {/* Right Pane (Detail View) */}
        {selectedRunId && (
          <div
            className="flex-1 min-w-0"
            style={{ width: selectedRunId && isMounted ? `${100 - leftWidth}%` : 'auto' }}
          >
            {isDetailLoading || !runDetail ? (
              <RunDetailSkeleton />
            ) : (
              <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-[10px] p-6 flex flex-col gap-6 relative">
                {/* Close/Back Nav */}
                <div className="flex justify-between items-center border-b border-[var(--bg-border)] pb-4">
                  <button
                    onClick={() => setSelectedRunId(null)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    ← Back to Runs List
                  </button>
                  <button
                    onClick={() => setSelectedRunId(null)}
                    className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                    title="Close Details Pane"
                  >
                    ✕
                  </button>
                </div>

                {/* Main Header Info */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                        {runDetail.workflow?.name ?? 'Run Detail'}
                      </h2>
                      <RunStatusBadge status={runDetail.status} />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-mono truncate max-w-xs sm:max-w-md">
                      {runDetail.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums">
                        {formatDuration(runDetail.duration)}
                      </p>
                      <p className="text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wider">duration</p>
                    </div>
                    <ReplayButton runId={runDetail.id} status={runDetail.status} />
                  </div>
                </div>

                {/* Metadata Card */}
                <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-[10px] p-4 flex flex-col">
                  <MetaRow label="Workflow" value={runDetail.workflow?.name ?? runDetail.workflowId} />
                  <MetaRow label="Provider" value={runDetail.workflow?.provider ?? '—'} />
                  <MetaRow label="Trigger" value={runDetail.triggerType} />
                  <MetaRow label="Started" value={new Date(runDetail.startedAt).toLocaleString()} />
                  <MetaRow label="Completed" value={runDetail.completedAt ? new Date(runDetail.completedAt).toLocaleString() : 'Still running...'} />
                  {runDetail.errorMessage && (
                    <MetaRow label="Error" value={<span className="text-[var(--danger)]">{runDetail.errorMessage}</span>} />
                  )}
                </div>

                {/* Timeline Section */}
                <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-[10px] overflow-hidden">
                  <div className="padding-4 px-6 py-4 border-b border-[var(--bg-border)] bg-[rgba(255,255,255,0.01)]">
                    <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Execution Timeline
                    </h3>
                    <p className="text-[0.7rem] text-[var(--text-muted)] mt-0.5">
                      {runDetail.events?.length ?? 0} events
                    </p>
                  </div>
                  <div className="p-6">
                    <ExecutionTimeline events={runDetail.events ?? []} />
                  </div>
                </div>

                {/* AI Trace Inspector Section */}
                <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-[10px] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--bg-border)] bg-[rgba(255,255,255,0.01)]">
                    <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      AI Traces
                    </h3>
                    <p className="text-[0.7rem] text-[var(--text-muted)] mt-0.5">
                      {runDetail.traces?.length ?? 0} AI calls — click to inspect
                    </p>
                  </div>
                  <TraceInspector traces={runDetail.traces ?? []} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
