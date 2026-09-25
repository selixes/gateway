'use client';

import React, { useState } from 'react';

const SNIPPETS = {
  python: `# 1. Install official OpenAI SDK (zero proprietary dependencies)
# pip install openai

import os
from openai import OpenAI

# Drop-in replacement: point base_url to Selixes Sovereign Gateway
client = OpenAI(
    base_url="https://proxy.selixes.com/v1",
    api_key=os.environ.get("SELIXES_API_KEY", "selixes_live_demo")
)

# Call any model — Selixes enforces:
# ⚡ Sub-16ms active edge failover across OpenAI & Anthropic
# 🛡️ Trajectory loop interceptors (halts recursive multi-agent spend bleed)
# 💰 Microsecond Redis spend reservation
response = client.chat.completions.create(
    model="gpt-4o", # Automatically hot-swapped to claude-3-5-sonnet on 503 / 429
    messages=[{"role": "user", "content": "Analyze production error telemetry"}],
    extra_headers={
        "X-Selixes-Session-Cap": "5.00",    # Hard dollar cap for this session
        "X-Selixes-Loop-Guard": "strict"    # Intercept recursive tool loops at 3 repeats
    }
)

print(response.choices[0].message.content)`,

  typescript: `// 1. Install official OpenAI SDK
// npm install openai

import OpenAI from 'openai';

// 1-line integration: Wrap your calls in Selixes Reliability Runtime
const openai = new OpenAI({
  baseURL: 'https://proxy.selixes.com/v1',
  apiKey: process.env.SELIXES_API_KEY || 'selixes_live_demo',
});

async function runProtectedAgent() {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Generate database migration script' }],
    stream: true,
  });

  // Zero-Drop Splicing: If OpenAI drops connection at token 450,
  // Selixes splices to Claude 3.5 Sonnet in 14.2ms without breaking this loop.
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

runProtectedAgent();`,

  langchain: `# Protect multi-agent swarms (LangChain / LangGraph / CrewAI)
# pip install langchain-openai

import os
from langchain_openai import ChatOpenAI

# Intercepts agent tool loops and enforces global budget ceilings
agent_llm = ChatOpenAI(
    base_url="https://proxy.selixes.com/v1",
    api_key=os.environ.get("SELIXES_API_KEY"),
    model="gpt-4o",
    model_kwargs={
        "extra_headers": {
            "X-Selixes-Session-ID": "agent-worker-prod-04",
            "X-Selixes-Cost-Arbitrage": "auto" # Auto-routes routine tasks to Gemini Flash
        }
    }
)

response = agent_llm.invoke("Synthesize report findings")
print(response.content)`,

  curl: `curl https://proxy.selixes.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SELIXES_API_KEY" \\
  -H "X-Selixes-Session-Cap: 10.00" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "system", "content": "You are a production agent."},
      {"role": "user", "content": "Execute data transform"}
    ],
    "stream": true
  }'`,

  docker: `# Self-Host Selixes in your own VPC (Zero External Egress)
# Run locally or in private Kubernetes cluster:

docker run -d \\
  -p 8080:8080 \\
  -e REDIS_URL=redis://redis:6379 \\
  -e PRIMARY_PROVIDER_KEY=$OPENAI_API_KEY \\
  -e FALLBACK_PROVIDER_KEY=$ANTHROPIC_API_KEY \\
  -e FAILOVER_LATENCY_THRESHOLD_MS=2500 \\
  ghcr.io/kunal3262k-bit/selixes-gateway:latest`
};

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'python' | 'typescript' | 'langchain' | 'curl' | 'docker'>('python');

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: '0.375rem' }}>
          SDK Quickstarts & Gateway Integration
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '720px', lineHeight: 1.5 }}>
          Drop-in zero-code refactor. Keep your existing OpenAI, Anthropic, or LangChain SDKs—just update your <code style={{ color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>baseURL</code> to route through Selixes edge reliability.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--bg-border)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'python', label: 'Python (OpenAI)' },
          { id: 'typescript', label: 'TypeScript / Node' },
          { id: 'langchain', label: 'LangChain / LangGraph' },
          { id: 'curl', label: 'cURL / REST' },
          { id: 'docker', label: 'VPC Self-Host (Docker)' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: activeTab === tab.id ? '1px solid var(--accent-primary)' : '1px solid transparent',
              background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code Display */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--bg-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '2rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1.25rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--bg-border)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Integration Snippet ({activeTab})
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(SNIPPETS[activeTab])}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--bg-border)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Copy Code
          </button>
        </div>
        <pre style={{
          margin: 0,
          padding: '1.25rem',
          fontSize: '0.8125rem',
          fontFamily: 'JetBrains Mono, Consolas, monospace',
          color: '#e2e8f0',
          lineHeight: 1.6,
          overflowX: 'auto'
        }}>
          {SNIPPETS[activeTab]}
        </pre>
      </div>

      {/* Architectural Guarantees Grid */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
        Gateway Protection Guarantees
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {[
          { title: 'Sub-16ms Edge Failover', desc: 'When OpenAI latency exceeds 3000ms or drops an HTTP 503, Selixes hot-swaps to Claude 3.5 Sonnet without resetting your client socket.', icon: '⚡' },
          { title: 'Trajectory Loop Interceptor', desc: 'Rolling SHA-256 tool hash window detects recursive agent retry loops and halts runaway token bleed before thousands in budget are burned.', icon: '🛡️' },
          { title: 'Sub-0.8ms Redis Spend Cap', desc: 'Atomic INCRBYFLOAT reservations prevent multi-threaded swarm jobs from breaching your hard budget boundaries.', icon: '🔒' },
          { title: 'Sovereign VPC Continuity', desc: 'Deploy within your private AWS/GCP VPC or on-prem Kubernetes cluster with zero external proxy egress.', icon: '🌐' },
        ].map((feat, idx) => (
          <div key={idx} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: '10px',
            padding: '1.25rem',
          }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{feat.icon}</div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.375rem' }}>{feat.title}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
