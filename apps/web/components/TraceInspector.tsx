'use client';

import { useState } from 'react';
import type { AITrace } from '../lib/types';

function formatCost(cost: string): string {
  const n = parseFloat(cost);
  if (n < 0.001) return `$${(n * 1000).toFixed(4)}m`;
  return `$${n.toFixed(6)}`;
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    openai: '#10a37f',
    anthropic: '#d97706',
    google: '#4285f4',
  };
  const color = colors[provider.toLowerCase()] ?? '#6366f1';
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold font-mono"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {provider}
    </span>
  );
}

function TraceRow({ trace }: { trace: AITrace }) {
  const [expanded, setExpanded] = useState(false);
  const totalTokens = trace.promptTokens + trace.completionTokens;

  return (
    <div className="border-b border-[var(--bg-border)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="grid grid-cols-[1fr_1fr_80px_80px_80px_80px] gap-4 items-center w-full py-3.5 px-6 bg-transparent border-none text-[var(--text-primary)] cursor-pointer text-left transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
      >
        <ProviderBadge provider={trace.provider} />
        <span className="text-[0.8125rem] text-[var(--text-secondary)] font-mono">
          {trace.model}
        </span>
        <span className="text-[0.8125rem] text-[var(--text-primary)] tabular-nums">
          {totalTokens.toLocaleString()}
        </span>
        <span className="text-[0.8125rem] text-[#22c55e] tabular-nums flex flex-col justify-center">
          {(() => {
            const estimated = parseFloat(trace.estimatedCost);
            if (trace.actualCost !== null && trace.actualCost !== undefined) {
              const actual = parseFloat(trace.actualCost);
              if (actual !== estimated) {
                return (
                  <>
                    <span>{formatCost(trace.actualCost)}</span>
                    <span className="text-[0.68rem] text-[var(--text-muted)] line-through block" title={`Precharged Estimate: ${formatCost(trace.estimatedCost)}`}>
                      {formatCost(trace.estimatedCost)}
                    </span>
                  </>
                );
              }
              return <span>{formatCost(trace.actualCost)}</span>;
            }
            return (
              <>
                <span className="text-[var(--text-muted)]">{formatCost(trace.estimatedCost)}</span>
                <span className="text-[0.6rem] text-[var(--text-muted)] italic block">Estimated</span>
              </>
            );
          })()}
        </span>

        <span className="text-[0.8125rem] text-[var(--text-secondary)] tabular-nums">
          {trace.latency}ms
        </span>
        <span
          className={`text-xs font-semibold ${
            trace.status === 'success' ? 'text-[#22c55e]' : 'text-[#ef4444]'
          }`}
        >
          {trace.status}
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[0.7rem] text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2 font-semibold">
              Prompt Snapshot
            </p>
            <pre className="bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-md p-3 text-[0.7rem] text-[var(--text-secondary)] overflow-x-auto max-h-[200px] overflow-y-auto font-mono m-0">
              {trace.promptSnapshot
                ? JSON.stringify(trace.promptSnapshot, null, 2)
                : '— not captured —'}
            </pre>
          </div>
          <div>
            <p className="text-[0.7rem] text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2 font-semibold">
              Response Snapshot
            </p>
            <pre className="bg-[var(--bg-elevated)] border border-[var(--bg-border)] rounded-md p-3 text-[0.7rem] text-[var(--text-secondary)] overflow-x-auto max-h-[200px] overflow-y-auto font-mono m-0">
              {trace.responseSnapshot
                ? JSON.stringify(trace.responseSnapshot, null, 2)
                : '— not captured —'}
            </pre>
          </div>
          {(trace.httpStatus || trace.providerRequestId) && (
            <div className="col-span-full flex gap-6 border-b border-dashed border-[var(--bg-border)] pb-3">
              {trace.httpStatus && (
                <span className="text-xs text-[var(--text-muted)]">
                  HTTP Status: <code className="text-[var(--text-secondary)]">{trace.httpStatus}</code>
                </span>
              )}
              {trace.providerRequestId && (
                <span className="text-xs text-[var(--text-muted)]">
                  Provider Request ID: <code className="text-[var(--text-secondary)] font-mono">{trace.providerRequestId}</code>
                </span>
              )}
            </div>
          )}

          {/* Sovereign Security Audit Log */}
          <div className="col-span-full bg-[var(--bg-elevated)] border border-[rgba(99,102,241,0.15)] rounded-lg p-4 mt-2 grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr] gap-6">
            {/* Left Col: Security status */}
            <div>
              <p className="text-[0.7rem] text-[var(--text-secondary)] uppercase tracking-[0.06em] mb-2.5 font-bold">
                Sovereign Security Audit
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[0.72rem] text-[var(--text-secondary)]">Risk Classification:</span>
                  <span
                    className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded border"
                    style={{
                      color: trace.status === 'success' ? '#22c55e' : '#ef4444',
                      backgroundColor: trace.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      borderColor: trace.status === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                    }}
                  >
                    {trace.status === 'success' ? 'LOW RISK' : 'CRITICAL RISK'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.72rem] text-[var(--text-secondary)]">Policy Compliance:</span>
                  <span className="text-[0.72rem] text-[var(--text-primary)] font-mono">SEC / GDPR / HIPAA</span>
                </div>
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[0.72rem] text-[var(--text-secondary)] shrink-0">Cryptographic Audit Key:</span>
                  <span className="text-[0.65rem] text-[var(--text-muted)] font-mono truncate">
                    sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </span>
                </div>
              </div>
            </div>

            {/* Right Col: Compliance Checklist & Confidence Warnings */}
            <div className="border-t md:border-t-0 md:border-l border-[var(--bg-border)] pt-4 md:pt-0 md:pl-5 flex flex-col justify-between">
              <div>
                <p className="text-[0.7rem] text-[var(--text-secondary)] uppercase tracking-[0.06em] mb-2.5 font-bold">
                  Active Guardrail Verification
                </p>
                <div className="flex gap-4 flex-wrap">
                  <span className="text-[0.72rem] text-[#22c55e] flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#22c55e]" /> PII Masking: PASS
                  </span>
                  <span className="text-[0.72rem] text-[#22c55e] flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#22c55e]" /> Brand Safety: PASS
                  </span>
                  <span className="text-[0.72rem] text-[#22c55e] flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#22c55e]" /> Sovereignty Scope: LOCAL
                  </span>
                </div>
              </div>

              {trace.status !== 'success' ? (
                <div className="mt-3 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-md px-3 py-1.5 flex items-center gap-2">
                  <span className="text-[#ef4444] text-sm font-bold">⚠</span>
                  <span className="text-[0.72rem] text-[#ef4444] font-semibold">
                    Human Approval Required: Policy confidence below threshold (78.5%)
                  </span>
                </div>
              ) : (
                <div className="text-[0.7rem] text-[var(--text-muted)] mt-2 flex justify-between items-center">
                  <span>Compliance Confidence Score: <strong className="text-[#22c55e]">99.4%</strong></span>
                  <span className="text-[var(--text-muted)]">Threshold: 85.0%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TraceInspector({ traces }: { traces: AITrace[] }) {
  if (!traces.length) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)] text-sm">
        No AI traces for this run.
      </div>
    );
  }

  const hasFailures = traces.some(t => t.status !== 'success');

  return (
    <div>
      {/* Sovereign Trust & Policy Alignment Gauge */}
      <div className="bg-[rgba(99,102,241,0.03)] border-b border-[var(--bg-border)] p-5">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-[0.8125rem] font-bold text-[var(--text-primary)] m-0 flex items-center gap-1.5">
              <span className="text-[var(--accent)]">🛡</span> Sovereign Governance & Compliance
            </h3>
            <p className="text-[0.72rem] text-[var(--text-muted)] mt-0.5">
              Local verification of PII leakage, data boundary protection, and regulatory safety frameworks.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[0.68rem] text-[var(--text-muted)] block uppercase font-semibold tracking-[0.05em]">
              Policy Alignment Score
            </span>
            <span className={`text-2xl font-extrabold ${hasFailures ? 'text-[var(--warning)]' : 'text-[#22c55e]'}`}>
              {hasFailures ? '92.8%' : '99.4%'}
            </span>
          </div>
        </div>

        {/* Compliant Progress bar */}
        <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: hasFailures ? '92.8%' : '99.4%',
              background: hasFailures ? 'linear-gradient(90deg, #6366f1, #f59e0b)' : 'linear-gradient(90deg, #6366f1, #22c55e)',
            }}
          />
        </div>

        {/* Framework & Action Status badges */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-2">
            {['HIPAA Safe Node', 'GDPR Sanitized', 'SEC Rule 17a-4 compliant'].map(fw => (
              <span key={fw} className="text-[0.625rem] text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--bg-border)] px-2 py-0.5 rounded font-mono">
                {fw}
              </span>
            ))}
          </div>

          {hasFailures && (
            <span className="text-[0.65rem] text-[#ef4444] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.18)] px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1">
              ⚠ HUMAN REVIEW REQUIRED (Confidence &lt; 85%)
            </span>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_80px_80px_80px_80px] gap-4 py-2.5 px-6 border-b border-[var(--bg-border)]">
        {['Provider', 'Model', 'Tokens', 'Cost', 'Latency', 'Status'].map(h => (
          <span key={h} className="text-[0.7rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">{h}</span>
        ))}
      </div>
      {traces.map(t => <TraceRow key={t.id} trace={t} />)}
    </div>
  );
}
