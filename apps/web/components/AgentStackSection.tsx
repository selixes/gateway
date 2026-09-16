'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AgentStackSection() {
  const [activeTab, setActiveTab] = useState<'loop' | 'budget' | 'failover' | 'code'>('loop');
  const [codeFramework, setCodeFramework] = useState<'langgraph' | 'crewai' | 'autogen' | 'openai'>('langgraph');
  const [isSimulatingLoop, setIsSimulatingLoop] = useState(false);
  const [loopCycle, setLoopCycle] = useState(0);
  const [loopIntercepted, setLoopIntercepted] = useState(false);

  // Runaway loop simulation runner
  const runLoopSimulation = () => {
    setIsSimulatingLoop(true);
    setLoopCycle(0);
    setLoopIntercepted(false);

    let cycle = 0;
    const interval = setInterval(() => {
      cycle += 1;
      setLoopCycle(cycle);

      if (cycle >= 3) {
        clearInterval(interval);
        setLoopIntercepted(true);
        setIsSimulatingLoop(false);
      }
    }, 800);
  };

  return (
    <section 
      id="agent-stack"
      style={{
        padding: '6rem 1.5rem',
        background: 'linear-gradient(180deg, rgba(8,8,11,0) 0%, rgba(13,13,20,0.6) 50%, rgba(8,8,11,0) 100%)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '999px',
            padding: '6px 16px',
            marginBottom: '1rem',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#818cf8',
              boxShadow: '0 0 8px rgba(129,140,248,0.8)',
              display: 'inline-block',
            }} />
            <span style={{
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              color: '#a5b4fc',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Autonomous Agent Stack Protection
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(30px, 4.5vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#f2f2f7',
            letterSpacing: '-0.02em',
            margin: '0 0 1rem',
          }}>
            Agents Break in Production.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Selixes Keeps Them Online.
            </span>
          </h2>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            lineHeight: 1.6,
            color: '#9494a8',
            maxWidth: '680px',
            margin: '0 auto',
          }}>
            When autonomous agents plan, retry, and call tools in multi-step loops, single API timeouts crash whole workflows and infinite tool calls burn thousands in tokens. Selixes acts as your agent execution guardrail.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
        }}>
          {[
            { id: 'loop', label: '🛑 Runaway Loop Breaker', desc: 'Detects infinite recursive tool calls' },
            { id: 'budget', label: '💳 Per-Agent Cost Caps', desc: 'Hardware-enforced session budgets' },
            { id: 'failover', label: '⚡ Step-Level Failover', desc: 'Sub-16ms reroute without context loss' },
            { id: 'code', label: '🔌 2-Line Integration', desc: 'LangGraph, CrewAI, AutoGen SDKs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: activeTab === tab.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
                background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                color: activeTab === tab.id ? '#fff' : '#8e8e9f',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive Feature Stage */}
        <div style={{
          background: 'rgba(11,11,16,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          padding: '2rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}>

          {/* TAB 1: RUNAWAY LOOP BREAKER */}
          {activeTab === 'loop' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-block', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: '4px', marginBottom: '12px' }}>
                  PROTECTION: RECURSIVE REASONING TRAP
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
                  Autonomous Runaway Loop Interceptor
                </h3>
                <p style={{ color: '#9494a8', fontSize: '14px', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                  AI agents often get stuck repeating tool invocations with identical parameters (e.g. malformed SQL queries or hallucinated search arguments). Selixes tracks semantic query fingerprints per agent session and trips the circuit breaker before burning your cloud quota.
                </p>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1rem' }}>
                  <button
                    onClick={runLoopSimulation}
                    disabled={isSimulatingLoop}
                    style={{
                      background: isSimulatingLoop ? '#3730a3' : '#6366f1',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: isSimulatingLoop ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                    }}
                  >
                    {isSimulatingLoop ? 'Simulating Recursive Loop...' : 'Trigger Runaway Agent Loop'}
                  </button>
                  <span style={{ fontSize: '12px', color: '#71717a' }}>
                    Threshold: 3 identical tool calls
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#52526b' }}>
                  Header configuration: <code style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>x-selixes-loop-guard: true</code>
                </div>
              </div>

              {/* Live Terminal Visual */}
              <div style={{
                background: '#07070a',
                border: '1px solid #1a1a24',
                borderRadius: '12px',
                padding: '1.25rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #14141d', paddingBottom: '8px', marginBottom: '12px' }}>
                  <span style={{ color: '#6366f1' }}>SESSION: agent_run_942a</span>
                  <span style={{ color: loopIntercepted ? '#ef4444' : isSimulatingLoop ? '#f59e0b' : '#22c55e' }}>
                    {loopIntercepted ? 'STATUS: TRIPPED & HALTED' : isSimulatingLoop ? 'STATUS: RUNNING' : 'STATUS: IDLE'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                  <div style={{ color: '#71717a' }}>[00:00.01] Agent Node "SQL_Planner" dispatched tool: query_db()</div>
                  {loopCycle >= 1 && (
                    <div style={{ color: '#cbd5e1' }}>
                      [00:00.82] <span style={{ color: '#f59e0b' }}>CYCLE 1</span>: Tool failed with parse error. Agent retrying same arguments...
                    </div>
                  )}
                  {loopCycle >= 2 && (
                    <div style={{ color: '#f59e0b' }}>
                      [00:01.64] <span style={{ color: '#f59e0b' }}>CYCLE 2</span>: Duplicate call hash detected (<code style={{ color: '#fbbf24' }}>sha256:8b1e...</code>). Incrementing anomaly score.
                    </div>
                  )}
                  {loopCycle >= 3 && (
                    <div style={{
                      color: '#ef4444',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      padding: '8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}>
                      🛡️ [00:02.45] SELIXES CIRCUIT BREAKER TRIPPED!
                      <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', fontWeight: 400 }}>
                        Halted recursive loop at cycle 3. Saved estimated $142.80 in repeated tokens. Client session notified with graceful error code.
                      </div>
                    </div>
                  )}
                  {!isSimulatingLoop && loopCycle === 0 && (
                    <div style={{ color: '#52526b', fontStyle: 'italic', marginTop: '1rem' }}>
                      Press "Trigger Runaway Agent Loop" to watch Selixes intercept repeated tool invocations in real-time.
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #14141d', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', color: '#52526b', fontSize: '11px' }}>
                  <span>Latency: ~1.2ms (Zero overhead)</span>
                  <span>Autonomous Circuit Breaker</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PER-AGENT BUDGET ENFORCEMENT */}
          {activeTab === 'budget' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-block', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '4px', marginBottom: '12px' }}>
                  FINANCIAL GUARDRAIL: TOKEN ARBITRAGE
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
                  Hardware-Enforced Per-Session Spend Caps
                </h3>
                <p style={{ color: '#9494a8', fontSize: '14px', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                  Pass budget caps directly from your application headers. Selixes calculates real-time token economics per request. If an autonomous agent exceeds its assigned session cost limit, Selixes gracefully terminates or falls back to low-cost or local edge models.
                </p>

                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Header Directive:</span>
                    <code style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>x-selixes-max-session-cost: 0.20</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8e8e9f' }}>
                    <span>Budget Allocated: $0.20</span>
                    <span style={{ color: '#22c55e' }}>Hard enforcement: 100%</span>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#8e8e9f' }}>
                  💡 <strong>Vector Semantic Caching Bonus:</strong> Common sub-agent prompts (e.g. system summaries, classification) are served instantly from Pinecone embeddings with 0 token spend.
                </div>
              </div>

              {/* Visual Meter */}
              <div style={{
                background: '#07070a',
                border: '1px solid #1a1a24',
                borderRadius: '12px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f2f2f7' }}>Live Agent Session Cost Tally</span>
                  <span style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px' }}>Capped at $0.20</span>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: '#9494a8' }}>
                    <span>Tokens Billed</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>$0.14 / $0.20 (70%)</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#181824', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: '70%', height: '100%', background: 'linear-gradient(90deg, #10b981, #f59e0b)', borderRadius: '5px' }} />
                  </div>
                </div>

                {/* Cost breakdown items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span style={{ color: '#a1a1aa' }}>Step 1: Goal Decomposition (GPT-4o)</span>
                    <span style={{ color: '#f2f2f7' }}>$0.04</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span style={{ color: '#a1a1aa' }}>Step 2: Vector Semantic Cache (Pinecone)</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>$0.00 (FREE)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <span style={{ color: '#a1a1aa' }}>Step 3: Web Extraction (Claude 3.5 Sonnet)</span>
                    <span style={{ color: '#f2f2f7' }}>$0.10</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STEP-LEVEL FAILOVER */}
          {activeTab === 'failover' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-block', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '4px', marginBottom: '12px' }}>
                  RESILIENCE: ZERO CONTEXT LOSS
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f2f2f7', margin: '0 0 12px' }}>
                  Mid-Flight Agent Step Failover
                </h3>
                <p style={{ color: '#9494a8', fontSize: '14px', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                  When an agent is halfway through an autonomous 12-step plan, a 504 Gateway Timeout or 429 Rate Limit from OpenAI usually terminates the entire plan, discarding accumulated context. Selixes holds the client socket open and transparently fails over to Claude or Gemini in median 32ms.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}>
                    <span style={{ color: '#22c55e' }}>✓</span>
                    <span>Persistent TCP Connection Pools to all major model backends</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}>
                    <span style={{ color: '#22c55e' }}>✓</span>
                    <span>Format translation between OpenAI and Anthropic JSON structures</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}>
                    <span style={{ color: '#22c55e' }}>✓</span>
                    <span>Verified ~16ms circuit-breaker switching latency</span>
                  </div>
                </div>
              </div>

              {/* Timeline Diagram */}
              <div style={{
                background: '#07070a',
                border: '1px solid #1a1a24',
                borderRadius: '12px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f2f2f7', borderBottom: '1px solid #14141d', paddingBottom: '8px' }}>
                  Step Execution Sequence (LangGraph State Machine)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#22c55e', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>1</span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Plan Generation (OpenAI GPT-4o)</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#22c55e' }}>200 OK (380ms)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#22c55e', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>2</span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Data Retrieval (OpenAI GPT-4o)</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#22c55e' }}>200 OK (410ms)</span>
                </div>

                {/* The failover step */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  padding: '10px',
                  borderRadius: '8px'
                }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f59e0b', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>3</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>Code Execution Analysis</span>
                    <span style={{ fontSize: '11px', color: '#f59e0b' }}>OpenAI returned 504 Timeout → Swapped to Claude 3.5 Sonnet</span>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#818cf8', fontWeight: 700 }}>+16ms routing</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#22c55e', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>4</span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Final Synthesis & Output</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#22c55e' }}>Task Saved (100% Complete)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CODE INTEGRATION */}
          {activeTab === 'code' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, color: '#f2f2f7', margin: 0 }}>
                    Deploy Outage & Loop Protection in 2 Lines
                  </h3>
                  <p style={{ color: '#8e8e9f', fontSize: '13px', margin: '4px 0 0' }}>
                    Keep your favorite agent framework. Simply point your LLM client baseURL to your sovereign Selixes instance.
                  </p>
                </div>

                {/* Framework switcher */}
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { id: 'langgraph', label: 'LangGraph' },
                    { id: 'crewai', label: 'CrewAI' },
                    { id: 'autogen', label: 'AutoGen' },
                    { id: 'openai', label: 'OpenAI SDK' },
                  ].map((fw) => (
                    <button
                      key={fw.id}
                      onClick={() => setCodeFramework(fw.id as any)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: codeFramework === fw.id ? '#6366f1' : 'transparent',
                        color: codeFramework === fw.id ? '#fff' : '#9494a8',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {fw.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Snippet Box */}
              <div style={{
                background: '#07070a',
                border: '1px solid #1a1a24',
                borderRadius: '10px',
                padding: '1.25rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                overflowX: 'auto',
                lineHeight: 1.6,
              }}>
                {codeFramework === 'langgraph' && (
                  <pre style={{ margin: 0, color: '#e2e8f0' }}>
                    <span style={{ color: '#71717a' }}># LangGraph integration: Point ChatOpenAI to sovereign Selixes gateway</span>{'\n'}
                    <span style={{ color: '#c084fc' }}>from</span> langchain_openai <span style={{ color: '#c084fc' }}>import</span> ChatOpenAI{'\n\n'}
                    llm = ChatOpenAI({'\n'}
                    {'  '}model=<span style={{ color: '#86efac' }}>"gpt-4o"</span>,{'\n'}
                    {'  '}base_url=<span style={{ color: '#fbbf24' }}>"http://localhost:4000/v1"</span>,  <span style={{ color: '#6366f1' }}># 1. Point to Selixes</span>{'\n'}
                    {'  '}api_key=os.environ[<span style={{ color: '#86efac' }}>"SELIXES_API_KEY"</span>],       <span style={{ color: '#6366f1' }}># 2. Authenticate locally</span>{'\n'}
                    {'  '}default_headers={'{'}{'\n'}
                    {'    '}<span style={{ color: '#86efac' }}>"x-selixes-timeout"</span>: <span style={{ color: '#86efac' }}>"5000"</span>,               <span style={{ color: '#71717a' }}># Failover to Claude if OpenAI &gt; 5s</span>{'\n'}
                    {'    '}<span style={{ color: '#86efac' }}>"x-selixes-max-session-cost"</span>: <span style={{ color: '#86efac' }}>"0.25"</span>,      <span style={{ color: '#71717a' }}># Hard-stop runaway agent loops</span>{'\n'}
                    {'    '}<span style={{ color: '#86efac' }}>"x-selixes-loop-guard"</span>: <span style={{ color: '#86efac' }}>"true"</span>,             <span style={{ color: '#71717a' }}># Halt repetitive tool invocations</span>{'\n'}
                    {'  '}{'}'}{'\n'}
                    )
                  </pre>
                )}

                {codeFramework === 'crewai' && (
                  <pre style={{ margin: 0, color: '#e2e8f0' }}>
                    <span style={{ color: '#71717a' }}># CrewAI integration: Protect your agent crew from rate limits</span>{'\n'}
                    <span style={{ color: '#c084fc' }}>from</span> crewai <span style={{ color: '#c084fc' }}>import</span> Agent, Crew{'\n\n'}
                    research_agent = Agent({'\n'}
                    {'  '}role=<span style={{ color: '#86efac' }}>"Financial Intelligence Specialist"</span>,{'\n'}
                    {'  '}goal=<span style={{ color: '#86efac' }}>"Synthesize market risk across 10-K filings"</span>,{'\n'}
                    {'  '}llm=<span style={{ color: '#86efac' }}>"openai/gpt-4o"</span>,{'\n'}
                    {'  '}base_url=<span style={{ color: '#fbbf24' }}>"http://localhost:4000/v1"</span>,{'\n'}
                    {'  '}api_key=os.environ[<span style={{ color: '#86efac' }}>"SELIXES_API_KEY"</span>],{'\n'}
                    {'  '}headers={'{'}<span style={{ color: '#86efac' }}>"x-selixes-fallback"</span>: <span style={{ color: '#86efac' }}>"anthropic"</span>, <span style={{ color: '#86efac' }}>"x-selixes-semantic-cache"</span>: <span style={{ color: '#86efac' }}>"true"</span>{'}'}{'\n'}
                    )
                  </pre>
                )}

                {codeFramework === 'autogen' && (
                  <pre style={{ margin: 0, color: '#e2e8f0' }}>
                    <span style={{ color: '#71717a' }}># AutoGen multi-agent config with sovereign continuity</span>{'\n'}
                    config_list = [{'{'}{'\n'}
                    {'  '}<span style={{ color: '#86efac' }}>"model"</span>: <span style={{ color: '#86efac' }}>"gpt-4o"</span>,{'\n'}
                    {'  '}<span style={{ color: '#86efac' }}>"base_url"</span>: <span style={{ color: '#fbbf24' }}>"http://localhost:4000/v1"</span>,{'\n'}
                    {'  '}<span style={{ color: '#86efac' }}>"api_key"</span>: os.environ[<span style={{ color: '#86efac' }}>"SELIXES_API_KEY"</span>],{'\n'}
                    {'  '}<span style={{ color: '#86efac' }}>"default_headers"</span>: {'{'}{'\n'}
                    {'    '}<span style={{ color: '#86efac' }}>"x-selixes-continuity"</span>: <span style={{ color: '#86efac' }}>"ollama/llama3"</span>,  <span style={{ color: '#71717a' }}># Offline edge recovery</span>{'\n'}
                    {'    '}<span style={{ color: '#86efac' }}>"x-selixes-max-session-cost"</span>: <span style={{ color: '#86efac' }}>"0.50"</span>{'\n'}
                    {'  '}{'}'}{'\n'}
                    {'}'}]
                  </pre>
                )}

                {codeFramework === 'openai' && (
                  <pre style={{ margin: 0, color: '#e2e8f0' }}>
                    <span style={{ color: '#71717a' }}># Standard OpenAI Node.js / TypeScript SDK</span>{'\n'}
                    <span style={{ color: '#c084fc' }}>import</span> OpenAI <span style={{ color: '#c084fc' }}>from</span> <span style={{ color: '#86efac' }}>'openai'</span>;{'\n\n'}
                    <span style={{ color: '#c084fc' }}>const</span> openai = <span style={{ color: '#c084fc' }}>new</span> OpenAI({'{'}{'\n'}
                    {'  '}apiKey: process.env.SELIXES_API_KEY,{'\n'}
                    {'  '}baseURL: <span style={{ color: '#fbbf24' }}>'http://localhost:4000/v1'</span>,  <span style={{ color: '#6366f1' }}>// Point to sovereign engine</span>{'\n'}
                    {'}'});{'\n\n'}
                    <span style={{ color: '#c084fc' }}>const</span> response = <span style={{ color: '#c084fc' }}>await</span> openai.chat.completions.create({'{'}{'\n'}
                    {'  '}model: <span style={{ color: '#86efac' }}>'gpt-4o'</span>,{'\n'}
                    {'  '}messages: [{'{'} role: <span style={{ color: '#86efac' }}>'user'</span>, content: <span style={{ color: '#86efac' }}>'Analyze quarterly balance sheets'</span> {'}'}],{'\n'}
                    {'  '}headers: {'{'}{'\n'}
                    {'    '}<span style={{ color: '#86efac' }}>'x-selixes-timeout'</span>: <span style={{ color: '#86efac' }}>'5000'</span>,{'\n'}
                    {'    '}<span style={{ color: '#86efac' }}>'x-selixes-max-session-cost'</span>: <span style={{ color: '#86efac' }}>'0.15'</span>,{'\n'}
                    {'    '}<span style={{ color: '#86efac' }}>'x-selixes-semantic-cache'</span>: <span style={{ color: '#86efac' }}>'true'</span>{'\n'}
                    {'  '}{'}'}{'\n'}
                    {'}'});
                  </pre>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Bottom CTA bar */}
        <div style={{
          marginTop: '3rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <Link
            href="/docs/agent-stack"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#6366f1',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            }}
          >
            Read Agent Stack Documentation →
          </Link>
          <Link
            href="/compare"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.04)',
              color: '#cbd5e1',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '12px 24px',
              borderRadius: '8px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            See Feature Matrix vs LiteLLM & Portkey
          </Link>
        </div>

      </div>
    </section>
  );
}
