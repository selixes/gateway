import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Agent Stack Architecture & Governance - LangGraph, CrewAI & AutoGen',
    description: 'Learn how to secure autonomous multi-agent stacks with Selixes. Intercept recursive tool loops, enforce session budget caps, and failover model outages in ~16ms.',
    keywords: [
      'Agent Stack Governance',
      'LangGraph Gateway',
      'CrewAI Proxy',
      'AutoGen Failover',
      'Runaway Agent Loop Interceptor',
      'AI Agent Guardrails',
      'Multi-Agent Reliability',
      'Per-Agent Session Cost'
    ],
    alternates: {
      canonical: 'https://selixes.com/docs/agent-stack',
    },
  };
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://selixes.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Docs",
      "item": "https://selixes.com/docs/getting-started"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Agent Stack Ops",
      "item": "https://selixes.com/docs/agent-stack"
    }
  ]
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Agent Stack Architecture & Governance: LangGraph, CrewAI & AutoGen",
  "description": "How to secure autonomous multi-agent stacks with Selixes: recursive tool loops, per-agent budget caps, and sub-16ms failover.",
  "inLanguage": "en",
  "author": {
    "@type": "Organization",
    "name": "Selixes"
  }
};

export default function AgentStackDocsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div>
        {/* Page Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.08em', color: '#818cf8', textTransform: 'uppercase' }}>
            Multi-Agent Operations
          </span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: '0.25rem 0 0.5rem' }}>
            Agent Stack Architecture & Governance
          </h1>
          <p style={{ color: '#8e8e9f', fontSize: '1rem', lineHeight: 1.6 }}>
            Autonomous agents don't make single API calls. They plan, reflect, and invoke external tools across recursive loops. Selixes acts as the sovereign runtime firewall that prevents agents from burning budget, looping indefinitely, or crashing mid-execution when upstream providers fail.
          </p>
        </div>

        {/* Section 1: The 4 Failure Modes */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            The 4 Fatal Production Failure Modes of Autonomous Agents
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#09090d', border: '1px solid #1a1a24', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>1. Recursive Tool Loops</div>
              <p style={{ fontSize: '12px', color: '#9494a8', margin: 0, lineHeight: 1.5 }}>
                An agent receives a malformed tool output, hallucinates an invalid fix, and calls the tool repeatedly until token limits or credit cards are exhausted.
              </p>
            </div>

            <div style={{ background: '#09090d', border: '1px solid #1a1a24', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>2. Mid-Plan 429 Rate Limits</div>
              <p style={{ fontSize: '12px', color: '#9494a8', margin: 0, lineHeight: 1.5 }}>
                On Step 8 of a 10-step plan, OpenAI throws an HTTP 429 or 504. The entire agent run crashes, discarding 20,000+ tokens of accumulated context.
              </p>
            </div>

            <div style={{ background: '#09090d', border: '1px solid #1a1a24', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>3. Uncapped Financial Exposure</div>
              <p style={{ fontSize: '12px', color: '#9494a8', margin: 0, lineHeight: 1.5 }}>
                Sub-agents spawning nested tasks without hard budget boundaries can trigger hundreds of dollars of GPT-4o calls in minutes.
              </p>
            </div>

            <div style={{ background: '#09090d', border: '1px solid #1a1a24', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', marginBottom: '4px' }}>4. Total Cloud Outages</div>
              <p style={{ fontSize: '12px', color: '#9494a8', margin: 0, lineHeight: 1.5 }}>
                When public cloud LLMs experience regional brownouts, customer-facing agents shut down completely with zero degraded continuity.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Framework Recipes */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Framework Integration Recipes (2-Line Configuration)
          </h2>

          {/* LangGraph */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.5rem' }}>
              1. LangGraph StateGraph Integration
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              Pass your Selixes proxy URL and headers into LangChain’s standard <code>ChatOpenAI</code> constructor:
            </p>
            <pre style={{
              background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
              padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
              overflowX: 'auto'
            }}>
              <code>{`import os
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

# Point to sovereign Selixes Gateway
llm = ChatOpenAI(
    model="gpt-4o",
    base_url="http://localhost:4000/v1",
    api_key=os.environ.get("SELIXES_API_KEY"),
    default_headers={
        "x-selixes-timeout": "5000",             # Failover to Claude if OpenAI > 5s
        "x-selixes-max-session-cost": "0.25",    # Hard cost budget for this graph run
        "x-selixes-loop-guard": "true",           # Trip circuit breaker on repeated tool calls
        "x-selixes-semantic-cache": "true"       # Serve repeated agent sub-tasks from vector cache
    }
)`}</code>
            </pre>
          </div>

          {/* CrewAI */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.5rem' }}>
              2. CrewAI Multi-Agent Teams
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#a1a1b0', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              Configure CrewAI agents with resilient routing to prevent rate limits from stalling the entire crew:
            </p>
            <pre style={{
              background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
              padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
              overflowX: 'auto'
            }}>
              <code>{`import os
from crewai import Agent, Task, Crew, LLM

# Configure Selixes-backed LLM
selixes_llm = LLM(
    model="openai/gpt-4o",
    base_url="http://localhost:4000/v1",
    api_key=os.environ.get("SELIXES_API_KEY"),
    extra_headers={
        "x-selixes-fallback": "anthropic",
        "x-selixes-max-session-cost": "0.50"
    }
)

researcher = Agent(
    role="Senior Market Analyst",
    goal="Investigate quarterly cloud infrastructure spend",
    llm=selixes_llm
)`}</code>
            </pre>
          </div>

          {/* AutoGen */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.5rem' }}>
              3. Microsoft AutoGen
            </h3>
            <pre style={{
              background: '#040406', border: '1px solid #1a1a24', borderRadius: '8px',
              padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace',
              overflowX: 'auto'
            }}>
              <code>{`config_list = [
    {
        "model": "gpt-4o",
        "base_url": "http://localhost:4000/v1",
        "api_key": os.environ.get("SELIXES_API_KEY"),
        "default_headers": {
            "x-selixes-continuity": "ollama/llama3",  # Local edge backup during outages
            "x-selixes-max-session-cost": "0.30"
        }
    }
]`}</code>
            </pre>
          </div>
        </section>

        {/* Section 3: Next Steps */}
        <section style={{ borderTop: '1px solid #1a1a24', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Continue Learning</div>
            <div style={{ fontSize: '12px', color: '#8e8e9f' }}>Explore failover policies and model registry configurations.</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/docs/failover-policy"
              style={{
                fontSize: '13px',
                color: '#818cf8',
                textDecoration: 'none',
                padding: '8px 16px',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '6px',
                background: 'rgba(99,102,241,0.08)'
              }}
            >
              Failover Policy →
            </Link>
            <Link
              href="/compare"
              style={{
                fontSize: '13px',
                color: '#cbd5e1',
                textDecoration: 'none',
                padding: '8px 16px',
                border: '1px solid #22222f',
                borderRadius: '6px',
                background: 'transparent'
              }}
            >
              Compare Gateways →
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}
