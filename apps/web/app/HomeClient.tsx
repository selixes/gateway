'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SectionCanvas from '../components/SectionCanvas';
import HeroCommandCenter from '../components/HeroCommandCenter';
import dynamic from 'next/dynamic';
import Navbar from '../components/Navbar';
import InteractiveGlowCard from '../components/InteractiveGlowCard';
import Footer from '../components/Footer';

function SimulatorSkeleton() {
  return (
    <div className="w-full min-h-[600px] bg-[#0d0d12] border border-[#1f1f2c] rounded-[20px] p-10 animate-pulse flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-[#1a1a26] pb-4">
        <div className="h-6 bg-[#181824] w-1/4 rounded-md" />
        <div className="h-8 bg-[#181824] w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10">
        <div className="flex flex-col gap-4">
          <div className="h-12 bg-[#181824] rounded-lg" />
          <div className="h-12 bg-[#181824] rounded-lg" />
          <div className="h-12 bg-[#181824] rounded-lg" />
        </div>
        <div className="h-80 bg-[#181824] rounded-lg" />
      </div>
    </div>
  );
}

function ChaptersViewSkeleton() {
  return (
    <div className="w-full min-h-[500px] bg-[#0d0d11] border border-[#1f1f2b] rounded-[18px] p-6 animate-pulse grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
      <div className="flex flex-col gap-4">
        <div className="h-16 bg-[#121217] rounded-lg" />
        <div className="h-16 bg-[#121217] rounded-lg" />
        <div className="h-16 bg-[#121217] rounded-lg" />
      </div>
      <div className="h-96 bg-[#07070a] rounded-lg" />
    </div>
  );
}

function PlaygroundSkeleton() {
  return (
    <div className="w-full min-h-[450px] bg-[#0d0d11] border border-[#1f1f2b] rounded-[18px] p-10 animate-pulse grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10">
      <div className="flex flex-col gap-6">
        <div className="h-8 bg-[#121217] rounded-md" />
        <div className="h-12 bg-[#121217] rounded-md" />
        <div className="h-12 bg-[#121217] rounded-md" />
      </div>
      <div className="h-80 bg-[#121217] rounded-md" />
    </div>
  );
}

function VideoSkeleton() {
  return (
    <div className="w-full min-h-[500px] bg-[#0d0d11] border border-[#1f1f2b] rounded-[20px] p-6 animate-pulse grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
      <div className="flex flex-col gap-4">
        <div className="h-10 bg-[#121217] rounded-lg" />
        <div className="h-16 bg-[#121217] rounded-lg" />
        <div className="h-16 bg-[#121217] rounded-lg" />
      </div>
      <div className="h-[480px] bg-[#07070a] rounded-lg" />
    </div>
  );
}

const IncidentResponseSimulator = dynamic(() => import('../components/IncidentResponseSimulator'), {
  ssr: false,
  loading: () => <SimulatorSkeleton />
});

const DashboardSandboxShowcase = dynamic(() => import('../components/DashboardSandboxShowcase'), {
  ssr: false,
  loading: () => <ChaptersViewSkeleton />
});

const QuickstartSDKPlayground = dynamic(() => import('../components/QuickstartSDKPlayground'), {
  ssr: false,
  loading: () => <PlaygroundSkeleton />
});

const TelemetryWave = dynamic(() => import('../components/TelemetryWave'), {
  ssr: false,
  loading: () => <div style={{ height: '144px' }} />
});

// ── FAQ Items Categorized ──────────────────────────────────────────────────
const faqCategories = [
  { id: 'all', name: 'All Objections' },
  { id: 'general', name: 'Reliability & Failover' },
  { id: 'security', name: 'Security & Sovereignty' },
  { id: 'integration', name: 'Integration & SDKs' }
];

const faqs = [
  {
    category: 'general',
    q: 'What happens if OpenAI goes down entirely?',
    a: 'Selixes catches the outage in under 15ms. If OpenAI returns a 5xx gateway code or times out, the gateway dynamically redirects the call to your Standby Tier (like Anthropic Claude or Google Gemini) without dropping the client socket connection.'
  },
  {
    category: 'general',
    q: 'How fast is the failover rerouting process?',
    a: 'The transit routing overhead is under 15ms. Since Selixes maintains persistent connection pools to all major LLM backends, the swap is practically instantaneous.'
  },
  {
    category: 'general',
    q: 'Does Selixes automatically retry failed requests?',
    a: 'Yes. You can customize the retry policy in your headers. By default, Selixes will execute 2 back-off retries on the primary provider before shifting the circuit breaker and executing standby failover.'
  },
  {
    category: 'security',
    q: 'Do you store or look at prompt snapshots?',
    a: 'No. If you choose our sovereign self-hosted Community or Enterprise VPS deployments, 100% of data stays inside your private VPC. No keys, prompts, or snapshots ever leave your boundary.'
  },
  {
    category: 'security',
    q: 'Can I self-host Selixes on my own hardware?',
    a: 'Yes, absolutely. Selixes is containerized via Docker and Kubernetes templates, allowing absolute private deployment on AWS, GCP, or bare metal in under 5 minutes.'
  },
  {
    category: 'security',
    q: 'Is my data encrypted during the gateway transit?',
    a: 'Yes. All transit connections are fully encrypted using TLS 1.3. Local fallback operations are completely isolated and stored in encrypted temporary memory maps.'
  },
  {
    category: 'integration',
    q: 'Does Selixes support LangChain workflows?',
    a: 'Yes. Because Selixes implements standard OpenAI-compatible endpoints, you simply swap the baseURL coordinate inside your LangChain LLM configuration.'
  },
  {
    category: 'integration',
    q: 'Can I use my existing OpenAI SDK without swapping libraries?',
    a: 'Yes! This is our strongest design principle. You keep your official, standard OpenAI client library. You only swap the baseURL to point to localhost:4000/v1 and supply your Selixes key.'
  },
  {
    category: 'integration',
    q: 'Does it support local Continuity model backups with Ollama?',
    a: 'Yes. When all cloud providers are offline, Selixes boots Continuity Mode, proxying critical calls to a local edge Ollama Llama-3 node for graceful offline recovery.'
  }
];

// ── Chapter Walkthrough Screenshots console chapters ─────────────────────
const consoleChapters = [
  {
    id: 'hero',
    name: '01. Overview Console & Cost Advisor',
    desc: 'Deep-dive organizational dashboard. Audits weekly transits, saved token fees, and provides active arbitrage recommendations.',
    image: '/demo/01_platform_hero.png',
    time: '0:00 - 0:20'
  },
  {
    id: 'timeline',
    name: '02. Resiliency & Outage Heal Stream',
    desc: 'Real-time telemetry showing live transits and autonomic circuit breakers rerouting timeout spikes in under 15ms.',
    image: '/demo/02_execution_timeline.png',
    time: '0:20 - 0:40'
  },
  {
    id: 'trace',
    name: '03. Multi-Model Trace Ingest Details',
    desc: 'Granular step-level audits. Tracks exact prompt snapshots, latencies, and token spending margins for all agent runs.',
    image: '/demo/03_provider_trace_stream.png',
    time: '0:40 - 1:00'
  },
  {
    id: 'continuity',
    name: '04. Continuity local Ollama Boot',
    desc: 'Visual trace details highlighting local Ollama edge recovery during global cloud blackout at $0.00 in token fees.',
    image: '/demo/04_continuity_recovery_trace.png',
    time: '1:00 - 1:20'
  }
];

interface LogLine {
  text: string;
  type: 'info' | 'warn' | 'error' | 'success' | 'system';
  time: string;
}

// ── Incident Response Simulator Presets ────────────────────────────────────
interface Preset {
  id: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii';
  name: string;
  desc: string;
  impactWithout: { downtime: string; lostRequests: string; cost: string };
  impactWith: { downtime: string; lostRequests: string; cost: string };
  scorecard: { recoveryTime: string; requestsProtected: string; costAvoided: string; status: string };
  codeConfig: { budgetCap: number; concurrencyLimit: number; fallbackRoute: 'anthropic' | 'gemini' | 'ollama' };
  steps: { text: string; type: 'info' | 'warn' | 'error' | 'success' | 'system' }[];
}

const presets: Preset[] = [
  {
    id: 'outage',
    name: '📡 Production Outage',
    desc: 'Simulate OpenAI API downtime and track instantaneous 15ms failover routing.',
    impactWithout: { downtime: '4m 18s', lostRequests: '1,248', cost: '$82.40' },
    impactWith: { downtime: '15ms', lostRequests: '0', cost: '$0.85 (Standby)' },
    scorecard: { recoveryTime: '15ms', requestsProtected: '100% (0 Lost)', costAvoided: '$81.55', status: 'SECURED' },
    codeConfig: { budgetCap: 1.50, concurrencyLimit: 10, fallbackRoute: 'anthropic' },
    steps: [
      { text: '📡 Dispatching prompt payload to primary route: OpenAI GPT-4o...', type: 'info' },
      { text: '⏳ OpenAI US-East latency spiking past SLA thresholds (3000ms)...', type: 'warn' },
      { text: '❌ HTTP 504 GATEWAY TIMEOUT returned from OpenAI servers.', type: 'error' },
      { text: '🛡️ Selixes Circuit Breaker tripped. Engaging autonomic routing policy.', type: 'system' },
      { text: '🔄 Rerouting request traffic stream to Standby Tier: Anthropic Claude 3.5 Sonnet...', type: 'info' },
      { text: '✅ Anthropic answered successfully (status: 200, latency: 180ms).', type: 'success' },
      { text: '🛡️ Uptime preserved pre-TTFT. System survived.', type: 'success' }
    ]
  },
  {
    id: 'loop',
    name: '🔄 Runaway Agent Loop',
    desc: 'Simulate an autonomous agent trapped in a recursive tool loop draining your wallet.',
    impactWithout: { downtime: '12m 45s', lostRequests: 'Recursive Loop', cost: '$188.00' },
    impactWith: { downtime: '0s (Capped)', lostRequests: '0', cost: '$1.50 (Capped)' },
    scorecard: { recoveryTime: 'Under 1ms', requestsProtected: '100% (47 Blocked)', costAvoided: '$186.50', status: 'CAPPED' },
    codeConfig: { budgetCap: 1.50, concurrencyLimit: 5, fallbackRoute: 'anthropic' },
    steps: [
      { text: '🤖 Agent initial plan formulated: start web research workflow...', type: 'info' },
      { text: '📥 Step 1: Query Google Search API... (Cost: $0.30)', type: 'info' },
      { text: '📥 Step 2: Recursively scrape content... (Cost: $0.60)', type: 'info' },
      { text: '⚠️ Recursive tool loop detected: Agent invoking same tools iteratively.', type: 'warn' },
      { text: '📈 Wallet drainage warning: Cumulative session spend at $0.90...', type: 'warn' },
      { text: '📈 Cumulative session spend hits budget threshold at $1.50...', type: 'warn' },
      { text: '🛡️ BUDGET GATE TRIPPED: x-apishield-max-session-cost limit (1.50) exceeded.', type: 'system' },
      { text: '🚫 Intercepting runaway agent loop: Selixes deflecting active connections.', type: 'error' },
      { text: '✅ Request blocked with HTTP 429 runaway_agent_protection. Budget secured!', type: 'success' }
    ]
  },
  {
    id: 'meltdown',
    name: '💥 Provider Meltdown',
    desc: 'Simulate global cloud outages across both OpenAI and Anthropic simultaneously.',
    impactWithout: { downtime: '2h 14m', lostRequests: '8,410', cost: '$0.00' },
    impactWith: { downtime: '14ms', lostRequests: '0', cost: '$0.00 (Self-Hosted)' },
    scorecard: { recoveryTime: '14ms', requestsProtected: '100% (0 Lost)', costAvoided: 'Continuity Active', status: 'STANDALONE' },
    codeConfig: { budgetCap: 5.00, concurrencyLimit: 10, fallbackRoute: 'ollama' },
    steps: [
      { text: '📡 Dispatching batch analysis query to primary: OpenAI GPT-4o...', type: 'info' },
      { text: '❌ Primary endpoint offline: OpenAI returned 502 Bad Gateway.', type: 'error' },
      { text: '🔄 Failover fallback initiated: Routing to Anthropic Claude...', type: 'system' },
      { text: '❌ Standby endpoint offline: Anthropic returned 503 Service Unavailable.', type: 'error' },
      { text: '⚠️ GLOBAL BLACKOUT DETECTED: All external cloud endpoints degraded.', type: 'warn' },
      { text: '🛡️ Engaging Local Continuity Engine: Proxying requests to sovereign Local Edge...', type: 'system' },
      { text: '🔌 Activating Ollama Llama-3 local VPC container node...', type: 'info' },
      { text: '✅ Local model processed prompt successfully (status: 200, latency: 14ms).', type: 'success' },
      { text: '🛡️ Zero downtime continuity maintained offline. Prompts preserved!', type: 'success' }
    ]
  },
  {
    id: 'cost',
    name: '💸 Cost Explosion',
    desc: 'Simulate a concurrent swarm of 100 agents flooding endpoints simultaneously.',
    impactWithout: { downtime: 'Server Collapse', lostRequests: '94 (Crashed)', cost: '$410.00' },
    impactWith: { downtime: '0s (Throttled)', lostRequests: '0 (Queued)', cost: '$12.00 (Throttled)' },
    scorecard: { recoveryTime: '0.8ms', requestsProtected: '100% (94 Throttled)', costAvoided: '$398.00', status: 'ISOLATED' },
    codeConfig: { budgetCap: 10.00, concurrencyLimit: 3, fallbackRoute: 'anthropic' },
    steps: [
      { text: '🌊 Swarm burst: Launching concurrent pipelines (100 parallel active agents)...', type: 'info' },
      { text: '📥 Concurrency load rising: Admitting Request #1, #2, #3...', type: 'info' },
      { text: '⚠️ Swarm ceiling warning: Concurrency limit reaching standard levels...', type: 'warn' },
      { text: '🛡️ CONCURRENCY CEILING TRIAGED: limit (x-apishield-max-concurrent-calls: 3) hit.', type: 'system' },
      { text: '🚫 Request #4: Blocked and isolated. Thrown 429 queue limit reached.', type: 'error' },
      { text: '🚫 Request #5: Blocked and isolated. Thrown 429 queue limit reached.', type: 'error' },
      { text: '📤 Request #1 completed successfully. Active slots open: 1', type: 'success' },
      { text: '📥 Admitting next queued worker (Request #6). Swarm flow modulated safely.', type: 'info' },
      { text: '🛡️ Swarm throttle confirmed. Sub-millisecond latency isolation verified.', type: 'success' }
    ]
  },
  {
    id: 'pii',
    name: '🔒 PII Leakage Attempt',
    desc: 'Detect and mask sensitive client information at the edge before LLM transport.',
    impactWithout: { downtime: 'Compliance Breach', lostRequests: '0 (Data Leaked)', cost: 'Legal Liability' },
    impactWith: { downtime: '4ms (Filter)', lostRequests: '0 (Redacted)', cost: 'Zero Liability' },
    scorecard: { recoveryTime: '4ms', requestsProtected: '100% (1 Leak Blocked)', costAvoided: 'Zero Audit Risk', status: 'ANONYMIZED' },
    codeConfig: { budgetCap: 10.00, concurrencyLimit: 10, fallbackRoute: 'gemini' },
    steps: [
      { text: '📡 Processing customer service request containing user prompt...', type: 'info' },
      { text: '🔍 Scanning prompt payload for sensitive parameters...', type: 'info' },
      { text: '⚠️ SECURITY ALERT: PII patterns detected (Customer SSN: ***-**-4912, OpenAI API Key).', type: 'warn' },
      { text: '🛡️ Edge Sanitization Engaged: x-apishield-pii-scrubbing active.', type: 'system' },
      { text: '✂️ Redaction applied: SSN masked to [REDACTED_SSN], API Key replaced with [REDACTED_TOKEN].', type: 'info' },
      { text: '📤 Releasing sanitized prompt payload securely to upstream provider...', type: 'info' },
      { text: '✅ Upstream provider answered safely without receiving sensitive raw customer data.', type: 'success' },
      { text: '🛡️ Edge compliance boundary secure. Data boundary preserved!', type: 'success' }
    ]
  }
];



export default function HomeClient() {
  // ── Mobile Detection Hook ──────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 960);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── 1. Incident Response Simulator State ──────────────────────
  const [currentPreset, setCurrentPreset] = useState<'outage' | 'loop' | 'meltdown' | 'cost' | 'pii'>('outage');
  const [simPhase, setSimPhase] = useState<'idle' | 'running' | 'completed'>('idle');
  const [simProgress, setSimProgress] = useState(0);
  const [simLogs, setSimLogs] = useState<LogLine[]>([]);
  const [activeStepIdx, setActiveStepIdx] = useState(-1);
  const [simBudgetSpent, setSimBudgetSpent] = useState(0);
  const [maskedPIICount, setMaskedPIICount] = useState(0);
  const [activeRoutePath, setActiveRoutePath] = useState<'openai' | 'anthropic' | 'ollama' | 'none'>('openai');
  const [openaiStatus, setOpenaiStatus] = useState<'healthy' | 'offline' | 'degraded'>('healthy');
  const [anthropicStatus, setAnthropicStatus] = useState<'healthy' | 'offline' | 'degraded'>('healthy');

  // Real-time scrambling SSN and API Key variables for edge sanitization leakage simulation
  const [scrambledSSN, setScrambledSSN] = useState('553-29-4912');
  const [scrambledKey, setScrambledKey] = useState('sk-proj-shield9210');

  useEffect(() => {
    if (currentPreset === 'pii' && simPhase === 'running') {
      if (activeStepIdx === 2 || activeStepIdx === 3) {
        const interval = setInterval(() => {
          const chars = '0123456789X#$@%&';
          const randomSSN = Array(11).fill(0).map((_, i) => (i === 3 || i === 6) ? '-' : chars[Math.floor(Math.random() * chars.length)]).join('');
          const randomKey = 'sk-proj-' + Array(10).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
          setScrambledSSN(randomSSN);
          setScrambledKey(randomKey);
        }, 80);
        return () => clearInterval(interval);
      } else if (activeStepIdx >= 4) {
        setScrambledSSN('[REDACTED_SSN]');
        setScrambledKey('[REDACTED_API_KEY]');
      } else {
        setScrambledSSN('553-29-4912');
        setScrambledKey('sk-proj-shield9210');
      }
    } else if (simPhase === 'completed' && currentPreset === 'pii') {
      setScrambledSSN('[REDACTED_SSN]');
      setScrambledKey('[REDACTED_API_KEY]');
    } else {
      setScrambledSSN('553-29-4912');
      setScrambledKey('sk-proj-shield9210');
    }
  }, [currentPreset, simPhase, activeStepIdx]);

  const terminalContainerRef = useRef<HTMLDivElement>(null);

  // ── Magic Elements state variables ────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [healthGrid, setHealthGrid] = useState<string[]>(Array(24).fill('success'));



  // Trigger custom toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  // Toast automatic dismiss effect
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Live Uptime Health Grid telemetry effect
  useEffect(() => {
    const isDegraded = currentPreset === 'outage' && activeStepIdx >= 2;
    if (isDegraded) {
      const next = [...healthGrid];
      next.shift();
      next.push('error');
      setHealthGrid(next);

      const interval = setInterval(() => {
        setHealthGrid(prev => {
          const nextGrid = [...prev];
          nextGrid.shift();
          nextGrid.push(Math.random() > 0.4 ? 'standby' : 'warning');
          return nextGrid;
        });
      }, 700);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setHealthGrid(prev => {
          const nextGrid = [...prev];
          nextGrid.shift();
          nextGrid.push('success');
          return nextGrid;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentPreset, activeStepIdx]);

  // Dynamic GPU-accelerated card border cursor spotlights
  const handleMouseMoveCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  // Dispatch simulator state updates to window event for global status synchronization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('selixes-sim-state', {
        detail: {
          currentPreset,
          simPhase,
          activeStepIdx,
          openaiStatus,
          anthropicStatus,
          activeRoutePath
        }
      }));
    }
  }, [currentPreset, simPhase, activeStepIdx, openaiStatus, anthropicStatus, activeRoutePath]);

  // Auto scroll simulated logs strictly inside the terminal container div without scrolling the page window
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [simLogs]);

  const simPhaseRef = useRef(simPhase);
  useEffect(() => {
    simPhaseRef.current = simPhase;
  }, [simPhase]);



  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Simulation execution engine
  const executeSimulation = async (presetId: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii') => {
    if (simPhase === 'running') return;
    setSimPhase('running');
    setSimProgress(0);
    setSimLogs([]);
    setActiveStepIdx(-1);
    setSimBudgetSpent(0);
    setMaskedPIICount(0);
    setOpenaiStatus('healthy');
    setAnthropicStatus('healthy');
    setActiveRoutePath('openai');

    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    for (let i = 0; i < preset.steps.length; i++) {
      setActiveStepIdx(i);
      setSimProgress(Math.min(100, Math.round(((i + 1) / preset.steps.length) * 100)));
      
      const step = preset.steps[i];
      if (step) {
        setSimLogs(prev => [...prev, { text: step.text, type: step.type, time: getFormattedTime() }]);
      }

      // Real-time visualization adjustments
      if (presetId === 'outage') {
        if (i === 1) setOpenaiStatus('degraded');
        if (i === 2) {
          setOpenaiStatus('offline');
          setActiveRoutePath('none');
        }
        if (i === 4) {
          setActiveRoutePath('anthropic');
        }
      }

      if (presetId === 'loop') {
        if (i >= 1 && i <= 5) {
          setSimBudgetSpent(prev => parseFloat((prev + 0.30).toFixed(2)));
        }
        if (i === 6) {
          setSimBudgetSpent(1.50);
        }
      }

      if (presetId === 'meltdown') {
        if (i === 1) setOpenaiStatus('offline');
        if (i === 3) setAnthropicStatus('offline');
        if (i === 5) {
          setActiveRoutePath('ollama');
        }
      }

      if (presetId === 'pii') {
        if (i === 4) {
          setMaskedPIICount(2);
        }
      }

      await delay(900);
    }

    setSimPhase('completed');
    triggerToast(`🏁 ${preset.name} simulation completed!`);
  };

  // Replicate config values to code builder playground and smooth scroll to it
  const replicateProtection = (presetId: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii') => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    setBudgetCap(preset.codeConfig.budgetCap);
    setConcurrencyLimit(preset.codeConfig.concurrencyLimit);
    setSelectedTarget(preset.codeConfig.fallbackRoute);

    triggerToast(`⚙️ Playground populated with ${preset.name} headers!`);

    const playgroundElement = document.getElementById('playground');
    if (playgroundElement) {
      playgroundElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Default configurations
  const selectPreset = (presetId: 'outage' | 'loop' | 'meltdown' | 'cost' | 'pii') => {
    setCurrentPreset(presetId);
    setSimPhase('idle');
    setSimProgress(0);
    setSimLogs([{ text: `📟 Press 'Run Incident Simulation' to execute the standard operational scenario.`, type: 'system', time: getFormattedTime() }]);
    setActiveStepIdx(-1);
    setSimBudgetSpent(0);
    setMaskedPIICount(0);
    setOpenaiStatus('healthy');
    setAnthropicStatus('healthy');
    setActiveRoutePath('openai');
  };


  useEffect(() => {
    selectPreset('outage');
  }, []);

  // ── 2. Quickstart Header Playground State ─────────────────────────────────
  const [budgetCap, setBudgetCap] = useState(0.20);
  const [concurrencyLimit, setConcurrencyLimit] = useState(3);
  const [timeoutLimit, setTimeoutLimit] = useState(5000);
  const [selectedTarget, setSelectedTarget] = useState<'anthropic' | 'gemini' | 'ollama'>('anthropic');
  // Watcher effect for playground configuration changes to trigger dynamic micro-toasts
  const isInitialPlayground = useRef(true);
  useEffect(() => {
    if (isInitialPlayground.current) {
      isInitialPlayground.current = false;
      return;
    }
    triggerToast(`⚙️ Config Swapped: Capping at $${budgetCap.toFixed(2)} | Concurrency Limit: ${concurrencyLimit}`);
  }, [budgetCap, concurrencyLimit, timeoutLimit, selectedTarget]);

  // IntersectionObserver for Scroll Reveal Animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const observedSet = new Set<Element>();

    const observeNewElements = () => {
      const elements = document.querySelectorAll(
        '.scroll-reveal, .scroll-reveal-zoom, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-fade'
      );
      elements.forEach((el) => {
        if (!observedSet.has(el)) {
          observer.observe(el);
          observedSet.add(el);
        }
      });
    };

    observeNewElements();

    const mutationObserver = new MutationObserver(() => {
      observeNewElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  // ── 4. Cost Savings Calculator State ──────────────────────────────────────
  const [monthlySpend, setMonthlySpend] = useState(5000);

  const getArbitrageSavings = () => monthlySpend * 0.22; // 22% average cost savings
  const getOutageSavings = () => monthlySpend * 0.15; // SLA breaches churn
  const getToolSavings = () => monthlySpend * 0.08; // Runaway loop capping
  const getNetAnnualSavings = () => (getArbitrageSavings() + getOutageSavings() + getToolSavings()) * 12;

  // ── 5. Searchable FAQs State ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [faqTab, setFaqTab] = useState('all');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  const filteredFaqs = faqs.filter(f => {
    const matchCat = faqTab === 'all' || f.category === faqTab;
    const matchSearch = f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#080809', color: '#f2f2f7', position: 'relative', overflowX: 'hidden' }}>
      <Navbar />

      {/* ── Hero Command Center (Stitch: Sovereign Command Center) ── */}
      <HeroCommandCenter />

      <TelemetryWave />

      {/* ── Stats & Compatibility Section ── */}
      <section style={{ padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center', background: 'transparent' }}>
        <div style={{ width: '100%', maxWidth: '1200px' }}>
          
          <style>{`
            .stat-tile-card {
              border: 1px solid rgba(255, 255, 255, 0.04) !important;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .stat-tile-card .tile-value {
              transition: color 0.3s ease, text-shadow 0.3s ease !important;
            }
            .stat-tile-card .tile-icon-svg {
              transition: stroke 0.3s ease, filter 0.3s ease !important;
            }
            /* Success card */
            .stat-tile-card.success-tile {
              background: linear-gradient(180deg, rgba(34, 197, 94, 0.02) 0%, rgba(13, 13, 18, 0.95) 100%) !important;
              box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 15px rgba(34, 197, 94, 0.05) !important;
            }
            .stat-tile-card.success-tile:hover {
              border-color: rgba(34, 197, 94, 0.35) !important;
              background: linear-gradient(180deg, rgba(34, 197, 94, 0.08) 0%, rgba(18, 18, 24, 0.98) 100%) !important;
              box-shadow: 0 16px 36px rgba(0,0,0,0.6), 0 0 25px rgba(34, 197, 94, 0.25) !important;
            }
            .stat-tile-card.success-tile .tile-value {
              color: #cbd5e1;
            }
            .stat-tile-card.success-tile:hover .tile-value {
              color: #22c55e !important;
              text-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
            }
            .stat-tile-card.success-tile .tile-icon-svg {
              stroke: #9494a8 !important;
            }
            .stat-tile-card.success-tile:hover .tile-icon-svg {
              stroke: #22c55e !important;
              filter: drop-shadow(0 0 4px #22c55e);
            }

            /* Info card */
            .stat-tile-card.info-tile {
              background: linear-gradient(180deg, rgba(59, 130, 246, 0.02) 0%, rgba(13, 13, 18, 0.95) 100%) !important;
              box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 15px rgba(59, 130, 246, 0.05) !important;
            }
            .stat-tile-card.info-tile:hover {
              border-color: rgba(59, 130, 246, 0.35) !important;
              background: linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(18, 18, 24, 0.98) 100%) !important;
              box-shadow: 0 16px 36px rgba(0,0,0,0.6), 0 0 25px rgba(59, 130, 246, 0.25) !important;
            }
            .stat-tile-card.info-tile .tile-value {
              color: #cbd5e1;
            }
            .stat-tile-card.info-tile:hover .tile-value {
              color: #3b82f6 !important;
              text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
            }
            .stat-tile-card.info-tile .tile-icon-svg {
              stroke: #9494a8 !important;
            }
            .stat-tile-card.info-tile:hover .tile-icon-svg {
              stroke: #3b82f6 !important;
              filter: drop-shadow(0 0 4px #3b82f6);
            }

            /* Accent card */
            .stat-tile-card.accent-tile {
              background: linear-gradient(180deg, rgba(99, 102, 241, 0.02) 0%, rgba(13, 13, 18, 0.95) 100%) !important;
              box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 15px rgba(99, 102, 241, 0.05) !important;
            }
            .stat-tile-card.accent-tile:hover {
              border-color: rgba(99, 102, 241, 0.35) !important;
              background: linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(18, 18, 24, 0.98) 100%) !important;
              box-shadow: 0 16px 36px rgba(0,0,0,0.6), 0 0 25px rgba(99, 102, 241, 0.25) !important;
            }
            .stat-tile-card.accent-tile .tile-value {
              color: #cbd5e1;
            }
            .stat-tile-card.accent-tile:hover .tile-value {
              color: #6366f1 !important;
              text-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
            }
            .stat-tile-card.accent-tile .tile-icon-svg {
              stroke: #9494a8 !important;
            }
            .stat-tile-card.accent-tile:hover .tile-icon-svg {
              stroke: #6366f1 !important;
              filter: drop-shadow(0 0 4px #6366f1);
            }

            /* Warning card */
            .stat-tile-card.warning-tile {
              background: linear-gradient(180deg, rgba(245, 158, 11, 0.02) 0%, rgba(13, 13, 18, 0.95) 100%) !important;
              box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 15px rgba(245, 158, 11, 0.05) !important;
            }
            .stat-tile-card.warning-tile:hover {
              border-color: rgba(245, 158, 11, 0.35) !important;
              background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(18, 18, 24, 0.98) 100%) !important;
              box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 0 25px rgba(245, 158, 11, 0.25) !important;
            }
            .stat-tile-card.warning-tile .tile-value {
              color: #cbd5e1;
            }
            .stat-tile-card.warning-tile:hover .tile-value {
              color: #f59e0b !important;
              text-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
            }
            .stat-tile-card.warning-tile .tile-icon-svg {
              stroke: #9494a8 !important;
            }
            .stat-tile-card.warning-tile:hover .tile-icon-svg {
              stroke: #f59e0b !important;
              filter: drop-shadow(0 0 4px #f59e0b);
            }
          `}</style>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '20px',
            width: '100%',
            marginBottom: '32px'
          }}>
            {[
              {
                value: '<15ms',
                label: 'Rerouting Latency',
                sub: 'autonomic transit overhead',
                tileClass: 'success-tile',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="tile-icon-svg" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )
              },
              {
                value: 'Resilient',
                label: 'AI Routing',
                sub: 'built for resilient routing',
                tileClass: 'info-tile',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="tile-icon-svg" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                )
              },
              {
                value: '100%',
                label: 'Sovereign VPC',
                sub: 'no prompt data storage',
                tileClass: 'accent-tile',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="tile-icon-svg" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )
              },
              {
                value: 'Local Edge',
                label: 'Offline Continuity',
                sub: 'ollama container backup',
                tileClass: 'warning-tile',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="tile-icon-svg" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
                    <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
                  </svg>
                )
              }
            ].map((stat) => (
              <div
                key={stat.label}
                className={`glow-card stat-tile-card ${stat.tileClass}`}
                style={{
                  borderRadius: '12px',
                  padding: isMobile ? '12px 16px' : '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'default',
                  position: 'relative',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
                onMouseMove={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
                }}
              >
                {/* Wrap inside elements in relative container to stay above the spotlight layer */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span className="tile-value" style={{
                      fontSize: isMobile ? '18px' : '28px',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}>{stat.value}</span>
                    <div className="tile-icon-wrapper" style={{
                      width: '28px', height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {stat.icon}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontFamily: 'Inter, sans-serif',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: '6px'
                  }}>{stat.label}</div>
                  <div style={{
                    fontSize: '10.5px',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    opacity: 0.85,
                  }}>{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof logos */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <span style={{ fontSize: '11px', fontFamily: 'Inter', color: '#3a3a4a', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Compatible with
            </span>
            {['OpenAI', 'Anthropic', 'Gemini', 'Ollama'].map(name => (
              <span key={name} style={{
                fontSize: '12px', fontFamily: "'Space Grotesk', sans-serif",
                color: '#44445a', fontWeight: 700,
                padding: '4px 10px',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '6px',
              }}>{name}</span>
            ))}
          </div>

          {/* Trusted Customer Logos Row */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderTop: '1px dashed rgba(255,255,255,0.04)', paddingTop: '2rem' }}>
            <span style={{ fontSize: '10px', fontFamily: 'Inter', color: '#52526b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Trusted by AI Engineering Teams at
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap', opacity: 0.55 }}>
              {['Acme AI', 'PromptOps', 'AgentFlow', 'Hyperion AI', 'Sovereign Lab'].map(name => (
                <span key={name} style={{
                  fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif",
                  color: '#fff', fontWeight: 600, letterSpacing: '-0.02em'
                }}>{name}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── 2-Line Migration Example Section ── */}
      <section style={{ padding: '5rem 1.5rem 3rem', background: 'transparent', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '680px' }}>
          {/* Static Integration Code Block */}
          <InteractiveGlowCard borderRadius="12px" className="hero-animate-code" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid #1f1f2c',
              background: '#0e0e13',
            }}>
              {['#ef4444', '#fb923c', '#22c55e'].map(c => (
                <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
              ))}
              <span style={{ marginLeft: '0.5rem', fontSize: '0.725rem', color: '#8e8e9f', fontFamily: 'monospace', fontWeight: 600 }}>
                2-line migration example (Standard OpenAI SDK)
              </span>
            </div>
            <div className="w-full overflow-x-auto max-w-full rounded-lg -webkit-overflow-scrolling-touch">
              <pre 
                className="w-max max-w-none"
                style={{
                  padding: '1.5rem',
                  margin: 0,
                  fontSize: '0.825rem',
                  lineHeight: '1.7',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  background: '#09090b',
                  color: '#cbd5e1',
                }}
              >
                <span style={{ color: '#71717a' }}>// 1. Install OpenAI SDK</span><br />
                <span style={{ color: '#f43f5e' }}>npm</span> install openai<br /><br />
                <span style={{ color: '#71717a' }}>// 2. Initialize SDK with Selixes Base URL</span><br />
                <span style={{ color: '#f43f5e' }}>const</span> <span style={{ color: '#38bdf8' }}>openai</span> = <span style={{ color: '#f43f5e' }}>new</span> <span style={{ color: '#e2e8f0' }}>OpenAI</span>({'{'}<br />
                &nbsp;&nbsp;<span style={{ color: '#a5b4fc' }}>apiKey</span>: <span style={{ color: '#38bdf8' }}>process</span>.<span style={{ color: '#38bdf8' }}>env</span>.<span style={{ color: '#e2e8f0' }}>SELIXES_API_KEY</span>,<br />
                &nbsp;&nbsp;<span style={{ color: '#f472b6' }}>baseURL</span>: <span style={{ color: '#34d399' }}>&apos;http://localhost:4000/v1&apos;</span> <span style={{ color: '#71717a' }}>// Route through gateway</span><br />
                {'}'});<br /><br />
                <span style={{ color: '#71717a' }}>// 3. Request completes with autonomic outage failovers and Continuity Mode!</span><br />
                <span style={{ color: '#f43f5e' }}>const</span> <span style={{ color: '#38bdf8' }}>chat</span> = <span style={{ color: '#f43f5e' }}>await</span> <span style={{ color: '#38bdf8' }}>openai</span>.<span style={{ color: '#38bdf8' }}>chat</span>.<span style={{ color: '#38bdf8' }}>completions</span>.<span style={{ color: '#38bdf8' }}>create</span>({'{'}<br />
                &nbsp;&nbsp;<span style={{ color: '#a5b4fc' }}>model</span>: <span style={{ color: '#34d399' }}>&apos;gpt-4o&apos;</span>,<br />
                &nbsp;&nbsp;<span style={{ color: '#a5b4fc' }}>messages</span>: [{'{'} <span style={{ color: '#a5b4fc' }}>role</span>: <span style={{ color: '#34d399' }}>&apos;user&apos;</span>, <span style={{ color: '#a5b4fc' }}>content</span>: <span style={{ color: '#34d399' }}>&apos;Analyze sales funnel...&apos;</span> {'}'}],<br />
                {'}'});
              </pre>
            </div>
          </InteractiveGlowCard>
        </div>
      </section>

      {/* ── 1. WAR ROOM: Incident Response Simulator ────────────────────────────── */}
      <section id="simulate" className="cyber-grid-bg" style={{ padding: '6rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        
        {/* Subtle glowing auras behind the War Room console */}
        <div className="aura-spotlight" style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.03) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div className="aura-spotlight" style={{ position: 'absolute', bottom: '15%', right: '15%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.015) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div className="scroll-reveal-zoom">
          <IncidentResponseSimulator
            isMobile={isMobile}
            currentPreset={currentPreset}
            simPhase={simPhase}
            simProgress={simProgress}
            simLogs={simLogs}
            activeStepIdx={activeStepIdx}
            simBudgetSpent={simBudgetSpent}
            maskedPIICount={maskedPIICount}
            activeRoutePath={activeRoutePath}
            openaiStatus={openaiStatus}
            anthropicStatus={anthropicStatus}
            scrambledSSN={scrambledSSN}
            scrambledKey={scrambledKey}
            healthGrid={healthGrid}
            executeSimulation={executeSimulation}
            replicateProtection={replicateProtection}
            selectPreset={selectPreset}
          />
        </div>

      </section>


      {/* ── 3. Interactive Quickstart SDK Header Playground ──────────────── */}
      <section id="playground" style={{ padding: '6rem 1.5rem', background: 'transparent' }}>
        <div className="scroll-reveal-zoom">
          <QuickstartSDKPlayground
            isMobile={isMobile}
            budgetCap={budgetCap}
            setBudgetCap={setBudgetCap}
            concurrencyLimit={concurrencyLimit}
            setConcurrencyLimit={setConcurrencyLimit}
            timeoutLimit={timeoutLimit}
            setTimeoutLimit={setTimeoutLimit}
            selectedTarget={selectedTarget}
            setSelectedTarget={setSelectedTarget}
            triggerToast={triggerToast}
          />
        </div>
      </section>

      {/* ── 4. Cost Savings Calculator Slider Section ───────────────────── */}
      <section id="savings" style={{ padding: isMobile ? '3rem 1rem' : '6rem 1.5rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }} className="scroll-reveal">
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', marginBottom: '0.5rem' }}>
              SAVINGS CALCULATOR
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem', color: '#fff' }}>
              Estimate Your Weekly LLM Savings
            </h2>
            <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
              Drag the monthly transaction spend slider to estimate actual token fee cost arbitrage and protected loop spends.
            </p>
          </div>

          <InteractiveGlowCard borderRadius="16px" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{
              padding: isMobile ? '1.5rem' : '2.5rem',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr',
              gap: isMobile ? '1.5rem' : '3rem',
              alignItems: 'center'
            }}>
              
              {/* Input Slider */}
              <div className="scroll-reveal-left" style={{ transitionDelay: '100ms' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
                  Monthly LLM Spend
                </h4>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-hover)', letterSpacing: '-0.03em', display: 'block', marginBottom: '0.5rem' }}>
                  ${monthlySpend.toLocaleString()}
                </span>
                <input
                  type="range" min="1000" max="50000" step="1000"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
              </div>

              {/* Calculations Breakdown */}
              <div className="scroll-reveal-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', transitionDelay: '200ms' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div style={{ background: '#131318', border: '1px solid #22222d', borderRadius: '8px', padding: '0.85rem 1.125rem' }}>
                    <span style={{ fontSize: '0.675rem', color: '#8e8e9f', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Arbitrage Cap</span>
                    <strong style={{ fontSize: '1.1rem', color: '#34d399' }}>${getArbitrageSavings().toLocaleString()}/mo</strong>
                  </div>
                  <div style={{ background: '#131318', border: '1px solid #22222d', borderRadius: '8px', padding: '0.85rem 1.125rem' }}>
                    <span style={{ fontSize: '0.675rem', color: '#8e8e9f', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Loop Protection</span>
                    <strong style={{ fontSize: '1.1rem', color: '#34d399' }}>${getToolSavings().toLocaleString()}/mo</strong>
                  </div>
                  <div style={{ background: '#131318', border: '1px solid #22222d', borderRadius: '8px', padding: '0.85rem 1.125rem' }}>
                    <span style={{ fontSize: '0.675rem', color: '#8e8e9f', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Outage Saved Churn</span>
                    <strong style={{ fontSize: '1.1rem', color: '#34d399' }}>${getOutageSavings().toLocaleString()}/mo</strong>
                  </div>
                  <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '0.85rem 1.125rem' }}>
                    <span style={{ fontSize: '0.675rem', color: '#a5b4fc', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Net Annual Saved</span>
                    <strong style={{ fontSize: '1.1rem', color: '#fff' }}>${getNetAnnualSavings().toLocaleString()}/yr</strong>
                  </div>
                </div>
                <p style={{ fontSize: '0.725rem', color: '#52526b', margin: '0', lineHeight: 1.4 }}>
                  Estimates based on typical usage patterns across arbitrage routing, loop protection, and outage avoidance; actual savings vary by workload.
                </p>
                <Link href="/contact" className="btn-primary" style={{ padding: '0.65rem 0', justifyContent: 'center', borderRadius: '6px', fontSize: '0.875rem', textDecoration: 'none' }}>
                  Book architecture review <span style={{ marginLeft: '4px' }}>{"->"}</span>
                </Link>
              </div>

            </div>
          </InteractiveGlowCard>

        </div>
      </section>

      {/* ── 2. Reliability Console Dashboard Chapters View ────────────────── */}
      {/* ── 2. Interactive Console Dashboard Showcase ────────────────── */}
      <section id="walkthrough" style={{ padding: '6rem 1.5rem' }}>
        <div className="scroll-reveal-zoom">
          <DashboardSandboxShowcase isMobile={isMobile} />
        </div>
      </section>

      {/* ── 5. Designed for AI Production Workloads Trust Grid ────────────── */}
      <section id="features" style={{ padding: isMobile ? '3rem 1rem' : '6rem 1.5rem', background: '#0b0b0e' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4.5rem' }} className="scroll-reveal">
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', marginBottom: '0.5rem' }}>
              ENGINEERED FOR PRODUCTION
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem', color: '#fff' }}>
              Designed for AI Production Workloads
            </h2>
            <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
              Every structural gateway primitive is audited and validated under adversarial parallel swarm execution checks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '1rem' : '1.5rem' }}>
            {[
              { title: 'Circuit Breaker Failover', desc: 'Surgically catches upstream timeouts and provider errors. Swaps routes to Anthropic Claude or Gemini standbys in 15ms.', icon: '🔮', color: '#6366f1' },
              { title: 'Recursive Loop Protection', desc: 'Trips trajectory limits automatically. Intercepts message histories at 3 consecutive tool failures to stop loop spending.', icon: '🚫', color: '#ef4444' },
              { title: 'Budget Gate Enforcement', desc: 'Enforces spending caps per user session. Rejects runaway agents cleanly with rich standard JSON error payloads.', icon: '💵', color: '#34d399' },
              { title: 'Connection Leak Safeguard', desc: 'Listens directly on standard NestJS/Express close events. Atomic decrementing ensures zero budget state leakage.', icon: '🔌', color: '#3b82f6' },
              { title: 'Sovereign Self-Hosting', desc: 'Deploy within private cloud metal boundary using Docker or Kubernetes. 100% PII privacy governance compliance.', icon: '🌐', iconColor: '#f59e0b', color: '#f59e0b' },
              { title: 'Telemetry Trace Inspector', desc: 'Audits prompt snapshots, exact models, latencies, and token spending details inside structured Postgres tables.', icon: '📊', color: '#8b5cf6' }
            ].map((feat, index) => (
              <div
                key={index}
                style={{
                  background: '#0d0d12', border: '1px solid #1f1f2c', borderRadius: '12px',
                  padding: '1.75rem',
                  transition: 'all 0.2s, opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  width: isMobile ? '100%' : undefined,
                  transitionDelay: `${(index + 1) * 100}ms`,
                  ['--card-glow-color' as any]: feat.color
                }}
                className="feature-card glow-card scroll-reveal"
                onMouseMove={handleMouseMoveCard}
              >
                <div className="feature-icon" style={{
                  width: '42px', height: '42px', background: `${feat.color}12`,
                  border: `1px solid ${feat.color}25`, borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem', color: feat.color, marginBottom: '1.25rem'
                }}>{feat.icon}</div>
                <h4 style={{ fontSize: '0.975rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>{feat.title}</h4>
                <p style={{ fontSize: '0.825rem', color: '#8e8e9f', lineHeight: 1.6, margin: 0 }}>{feat.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 5.5. What Reliability Engineers Say (Developer Testimonials) ── */}
      <section id="testimonials" style={{ padding: isMobile ? '3rem 1rem' : '6rem 1.5rem', background: '#080809' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }} className="scroll-reveal">
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', marginBottom: '0.5rem' }}>
              PERSPECTIVES
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem', color: '#fff' }}>
              What Reliability Engineers Say
            </h2>
            <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
              See how modern AI engineering teams use Selixes to contain budgets and guarantee uptime.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              {
                text: "“Selixes saved us over $12,000 in token costs in our first month by intercepting runaway agent loops. The budget gate triggers instantly.”",
                author: "Sarah Chen",
                role: "Tech Lead at AgentFlow",
                initials: "SC"
              },
              {
                text: "“Our uptime went from 99.4% to 99.99% after routing through Selixes. The 15ms circuit-breaker failover to Anthropic Claude is practically magic.”",
                author: "Marcus Vance",
                role: "Principal Architect at Hyperion AI",
                initials: "MV"
              },
              {
                text: "“The sovereign self-hosting option made compliance approval a breeze. 100% of PII stays within our AWS VPC boundaries.”",
                author: "Elena Rostova",
                role: "VP of Security at CognitiveScale",
                initials: "ER"
              }
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  background: '#0d0d12',
                  border: '1px solid #1f1f2c',
                  borderRadius: '12px',
                  padding: '2.25rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.5rem',
                  position: 'relative'
                }}
                className="scroll-reveal"
              >
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                  {item.text}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1.5px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: '#fff'
                  }}>
                    {item.initials}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block' }}>{item.author}</strong>
                    <span style={{ fontSize: '0.725rem', color: '#8e8e9f' }}>{item.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 6. Searchable & Categorized FAQ Accordion ────────────────────── */}
      <section id="faq" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }} className="scroll-reveal">
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'block', marginBottom: '0.5rem' }}>
              FAQ SHEET
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem', color: '#fff' }}>
              Frequently Asked Objections
            </h2>
            <p style={{ color: '#8e8e9f', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.5 }}>
              Sovereign VPS deployment blueprints, retry policies, data encryption, and SDK coordinates explained.
            </p>
          </div>

          {/* Search input */}
          <div className="px-4 sm:px-0 mx-auto w-full max-w-xl" style={{ position: 'relative', marginBottom: '2rem' }}>
            <input
              type="text"
              placeholder="🔍 Search technical FAQs (Ollama, self-host, LangChain, failover)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', background: '#0e0e13', border: '1px solid #22222d',
                borderRadius: '10px', padding: '0.85rem 1.25rem', color: '#fff', fontSize: '0.875rem',
                outline: 'none', transition: 'border 0.2s'
              }}
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center px-4 sm:px-0" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            {faqCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setFaqTab(cat.id);
                  setExpandedFaqIndex(null);
                }}
                className="flex-shrink-0 text-xs sm:text-sm"
                style={{
                  background: faqTab === cat.id ? 'var(--accent)' : '#0e0e13',
                  border: '1px solid', borderColor: faqTab === cat.id ? 'transparent' : '#22222d',
                  color: faqTab === cat.id ? '#fff' : '#a1a1aa',
                  borderRadius: '999px', padding: '6px 16px', fontSize: isMobile ? '0.75rem' : '0.8rem',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Accordion Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredFaqs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#52525b', padding: '2.5rem', border: '1px dashed #22222d', borderRadius: '10px' }}>
                No matching objection sheets found for "{searchQuery}".
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = expandedFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="scroll-reveal"
                    style={{
                      background: '#0d0d12', border: '1px solid',
                      borderColor: isOpen ? 'var(--bg-border)' : '#1c1c27',
                      borderRadius: '10px', overflow: 'hidden',
                      transition: 'all 0.2s, opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
                      transitionDelay: `${(idx + 1) * 80}ms`
                    }}
                  >
                    <button
                      onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                      style={{
                        width: '100%', background: 'transparent', border: 'none',
                        padding: isMobile ? '1rem' : '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center', textAlign: 'left', cursor: 'pointer',
                        color: '#fff', fontWeight: 650, fontSize: '0.925rem'
                      }}
                    >
                      <span>{faq.q}</span>
                      <span 
                        className="flex-shrink-0"
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s', fontSize: '0.9rem', color: 'var(--accent)',
                          marginTop: isMobile ? '2px' : '0'
                        }}
                      >
                        ▼
                      </span>
                    </button>
                    
                    <div style={{
                      maxHeight: isOpen ? '300px' : '0',
                      transition: 'max-height 0.25s ease-in-out', overflow: 'hidden',
                      background: 'rgba(255,255,255,0.005)'
                    }}>
                      <p style={{
                        padding: isMobile ? '0 1rem 1rem' : '0 1.5rem 1.25rem', margin: 0, fontSize: '0.85rem',
                        color: '#a1a1b0', lineHeight: 1.6, borderTop: '1px solid #1c1c27'
                      }}>
                        {faq.a}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </section>

      {/* ── Premium Footer ── */}
      <Footer />

      {/* Magic Element 5: Micro-Toast Notification Chassis */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 1000,
          background: 'rgba(10,10,14,0.92)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid var(--accent)',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          boxShadow: '0 12px 36px rgba(99,102,241,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
          <span style={{ fontSize: '1.25rem' }}>🔔</span>
          <div>
            <span style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--accent-hover)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
              SYSTEM INTERCEPT
            </span>
            <span style={{ fontSize: '0.8125rem', color: '#cbd5e1', fontWeight: 500 }}>
              {toastMessage}
            </span>
          </div>
          <button 
            onClick={() => setShowToast(false)} 
            style={{ 
              background: 'transparent', border: 'none', color: '#52526b', 
              cursor: 'pointer', fontSize: '1.1rem', marginLeft: '0.50rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Custom styles */}
      <style jsx global>{`
        .gradient-text {
          background: linear-gradient(135deg, #ffffff 0%, #c7d2fe 65%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--accent);
          color: #fff;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          background: var(--accent-hover);
          box-shadow: 0 0 20px rgba(99,102,241,0.35);
          transform: translateY(-1px);
        }
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          color: #cbd5e1;
          border: 1px solid #22222d;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover {
          border-color: #3f3f46;
          background: #14141b;
          color: #fff;
        }
        .feature-card {
          will-change: transform, border-color, box-shadow;
        }
        .nav-links a:hover {
          color: #fff !important;
        }
      `}</style>

    </div>
  );
}
