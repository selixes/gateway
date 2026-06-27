'use client';

import React, { useState } from 'react';
import SectionCanvas from './SectionCanvas';

interface QuickstartSDKPlaygroundProps {
  isMobile: boolean;
  budgetCap: number;
  setBudgetCap: (val: number) => void;
  concurrencyLimit: number;
  setConcurrencyLimit: (val: number) => void;
  timeoutLimit: number;
  setTimeoutLimit: (val: number) => void;
  selectedTarget: 'anthropic' | 'gemini' | 'ollama';
  setSelectedTarget: (val: 'anthropic' | 'gemini' | 'ollama') => void;
  triggerToast: (msg: string) => void;
}

export default function QuickstartSDKPlayground({
  isMobile,
  budgetCap,
  setBudgetCap,
  concurrencyLimit,
  setConcurrencyLimit,
  timeoutLimit,
  setTimeoutLimit,
  selectedTarget,
  setSelectedTarget,
  triggerToast
}: QuickstartSDKPlaygroundProps) {
  const [docsTab, setDocsTab] = useState<'curl' | 'nodejs' | 'python'>('curl');
  const [copied, setCopied] = useState(false);

  const getCodeSnippet = () => {
    const cost = budgetCap.toFixed(2);
    if (docsTab === 'curl') {
      return `curl http://localhost:4000/v1/chat/completions \\
  -H "Authorization: Bearer selixes_live_prodkey982" \\
  -H "Content-Type: application/json" \\
  -H "x-selixes-session-id: session_agent_crm_820" \\
  -H "x-selixes-max-session-cost: ${cost}" \\
  -H "x-selixes-max-concurrent-calls: ${concurrencyLimit}" \\
  -H "x-selixes-timeout: ${timeoutLimit}" \\
  -H "x-selixes-fallback-route: ${selectedTarget}" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Extract details from invoices"}]
  }'`;
    }
    if (docsTab === 'nodejs') {
      return `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: "selixes_live_prodkey982",
  baseURL: 'http://localhost:4000/v1', // Point directly to gateway
  defaultHeaders: {
    'x-selixes-session-id': 'session_agent_crm_820',
    'x-selixes-max-session-cost': '${cost}',
    'x-selixes-max-concurrent-calls': '${concurrencyLimit}',
    'x-selixes-timeout': '${timeoutLimit}',
    'x-selixes-fallback-route': '${selectedTarget}'
  }
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Extract details from invoices' }]
});`;
    }
    return `from openai import OpenAI

client = OpenAI(
    api_key="selixes_live_prodkey982",
    base_url="http://localhost:4000/v1", # Route through local gateway
    default_headers={
        "x-selixes-session-id": "session_agent_crm_820",
        "x-selixes-max-session-cost": "${cost}",
        "x-selixes-max-concurrent-calls": "${concurrencyLimit}",
        "x-selixes-timeout": "${timeoutLimit}"
    }
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Extract details from invoices"}]
)`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopied(true);
    triggerToast(`🛡️ Code copied! session_id armed with $${budgetCap.toFixed(2)} budget.`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SectionCanvas>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>
          INTEGRATION BUILDER
        </span>
        <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem', color: '#fff' }}>
          Interactive Quickstart Header Builder
        </h2>
        <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
          Tweak timeout limits and session dollar spending caps. Watch code blocks generate your target integration parameters instantly.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* Left Controls */}
        <div style={{
          background: '#0d0d12', border: '1px solid #1e1e2c', borderRadius: '14px',
          padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f2f2f7', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #1a1a24', paddingBottom: '0.5rem', margin: 0 }}>
            Header Parameters
          </h4>

          {/* Cost slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1aa' }}>Max Spending Cap</label>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--accent-hover)' }}>${budgetCap.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0.05" max="2.00" step="0.05"
              value={budgetCap}
              onChange={(e) => setBudgetCap(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Concurrency slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1aa' }}>Max Concurrency</label>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--accent-hover)' }}>{concurrencyLimit} calls</span>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={concurrencyLimit}
              onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Timeout slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1aa' }}>Timeout Threshold</label>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--accent-hover)' }}>{timeoutLimit}ms</span>
            </div>
            <input
              type="range" min="1000" max="10000" step="500"
              value={timeoutLimit}
              onChange={(e) => setTimeoutLimit(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>

          {/* Standby Override Selector */}
          <div>
            <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>
              Standby Fallback Tier
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {['anthropic', 'gemini', 'ollama'].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTarget(t as 'anthropic' | 'gemini' | 'ollama')}
                  style={{
                    padding: '6px', fontSize: '0.7rem', fontWeight: 700,
                    background: selectedTarget === t ? 'rgba(99,102,241,0.06)' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedTarget === t ? 'var(--accent)' : '#22222d',
                    borderRadius: '6px', cursor: 'pointer', color: selectedTarget === t ? '#fff' : '#a1a1aa',
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right: Code Block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1a1a24', paddingBottom: '0.5rem' }}>
            {[
              { id: 'curl', name: 'cURL API' },
              { id: 'nodejs', name: 'Node.js SDK' },
              { id: 'python', name: 'Python SDK' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDocsTab(tab.id as 'curl' | 'nodejs' | 'python')}
                style={{
                  background: docsTab === tab.id ? '#181822' : 'transparent',
                  border: '1px solid',
                  borderColor: docsTab === tab.id ? '#2a2a3b' : 'transparent',
                  color: docsTab === tab.id ? '#fff' : '#8e8e9f',
                  borderRadius: '6px', padding: '0.5rem 1.25rem',
                  fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div style={{
            background: '#040406', border: '1px solid #1e1e2c', borderRadius: '12px',
            overflow: 'hidden', position: 'relative'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.625rem 1.25rem', borderBottom: '1px solid #1a1a24', background: '#0e0e13'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#52525b', fontFamily: 'monospace' }}>
                {docsTab === 'curl' ? 'Terminal' : docsTab === 'nodejs' ? 'index.js' : 'main.py'}
              </span>
              <button
                onClick={copyCode}
                style={{
                  background: 'transparent', border: '1px solid #27272a', color: '#a1a1aa',
                  borderRadius: '6px', padding: '4px 10px', fontSize: '0.725rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                {copied ? '✅ Snippet Copied!' : '📋 Copy Parameters'}
              </button>
            </div>

            <div className="overflow-x-auto max-w-full rounded-lg -webkit-overflow-scrolling-touch">
              <pre 
                className="w-max max-w-none p-4 sm:p-6 text-xs sm:text-sm"
                style={{
                  margin: 0, lineHeight: 1.6,
                  overflowX: 'auto', color: '#cbd5e1', fontFamily: 'monospace'
                }}
              >
                <code>{getCodeSnippet()}</code>
              </pre>
            </div>
          </div>
        </div>

      </div>

    </div>
    </SectionCanvas>
  );
}
