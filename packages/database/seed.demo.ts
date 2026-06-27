/**
 * AKRA FlowOps — Production Demo Seed
 * Scenario: AI Lead Qualification Pipeline
 * Run: npx ts-node seed.demo.ts
 */
import { PrismaClient, RunStatus, WorkflowStatus, EventType, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────
const ago = (ms: number) => new Date(Date.now() - ms);
const mins = (n: number) => n * 60_000;
const secs = (n: number) => n * 1_000;
const reqId = () => `req_${Math.random().toString(36).slice(2, 14)}`;
const uuid  = () => crypto.randomUUID();

// ── Lead Payloads ──────────────────────────────────────────
const LEADS = [
  { name: 'Sarah Chen',      company: 'Acme Capital',        employees: 120, budget: '$15,000/mo', source: 'LinkedIn Ads',  message: 'Looking to automate lead qualification and onboarding using AI.', quality: 'HIGH',   prob: 0.84, urgency: 'HIGH',   deal: 'HIGH' },
  { name: 'Marcus Webb',     company: 'GrowthStack Inc',     employees: 45,  budget: '$4,000/mo',  source: 'Typeform',       message: 'Want to reduce manual CRM updates. Our sales team wastes 2hrs daily.', quality: 'HIGH',   prob: 0.79, urgency: 'MEDIUM', deal: 'MEDIUM' },
  { name: 'Priya Nair',      company: 'Bloom Retail',        employees: 310, budget: '$30,000/mo', source: 'Website Form',   message: 'Enterprise-wide AI adoption roadmap. Need workflow automation at scale.', quality: 'HIGH',   prob: 0.91, urgency: 'HIGH',   deal: 'ENTERPRISE' },
  { name: 'James Okafor',    company: 'NexaFlow',            employees: 18,  budget: '$900/mo',    source: 'Facebook Ads',   message: 'Just exploring options. Not sure if AI is right for us yet.', quality: 'LOW',    prob: 0.12, urgency: 'LOW',    deal: 'LOW' },
  { name: 'Lisa Tanaka',     company: 'Meridian Consulting',  employees: 75,  budget: '$8,500/mo',  source: 'LinkedIn Ads',  message: 'We run 200+ client reports monthly. AI summarization would save massive time.', quality: 'HIGH',   prob: 0.77, urgency: 'MEDIUM', deal: 'HIGH' },
  { name: 'Tom Harrington',  company: 'Bridgepoint RE',      employees: 30,  budget: '$2,200/mo',  source: 'Website Form',   message: 'Interested in automating email follow-ups for real estate leads.', quality: 'MEDIUM', prob: 0.41, urgency: 'LOW',    deal: 'MEDIUM' },
  { name: 'Aisha Kamara',    company: 'Volta Health',        employees: 200, budget: '$12,000/mo', source: 'Typeform',       message: 'Healthcare automation for patient intake and triage classification.', quality: 'HIGH',   prob: 0.68, urgency: 'MEDIUM', deal: 'HIGH' },
  { name: 'Derek Muñoz',     company: 'FastTrack Logistics', employees: 90,  budget: '$5,000/mo',  source: 'LinkedIn Ads',   message: 'Dispatch routing optimization. We have 500 shipments/day.', quality: 'MEDIUM', prob: 0.55, urgency: 'MEDIUM', deal: 'MEDIUM' },
  { name: 'Nina Petrov',     company: 'ClearSight Analytics',employees: 12,  budget: '$600/mo',    source: 'Facebook Ads',   message: 'Small team, curious about AI tools. Not urgent.', quality: 'LOW',    prob: 0.08, urgency: 'LOW',    deal: 'LOW' },
  { name: 'Carlos Reyes',    company: 'Apex Ventures',       employees: 55,  budget: '$7,000/mo',  source: 'Website Form',   message: 'VC firm wanting to automate portfolio company reporting with AI.', quality: 'HIGH',   prob: 0.72, urgency: 'HIGH',   deal: 'HIGH' },
];

// ── AI Models ──────────────────────────────────────────────
type ModelDef = { provider: string; model: string; ppt: number; pct: number };
const MODELS: ModelDef[] = [
  { provider: 'openai',    model: 'gpt-4.1',                ppt: 0.000002,  pct: 0.000008  },
  { provider: 'openai',    model: 'gpt-4o-mini',            ppt: 0.0000006, pct: 0.0000024 },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', ppt: 0.000003,  pct: 0.000015  },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022',  ppt: 0.0000008, pct: 0.000004  },
];

function calcCost(m: ModelDef, pt: number, ct: number) {
  return +(m.ppt * pt + m.pct * ct).toFixed(6);
}

// ── Event builder ──────────────────────────────────────────
function buildEvents(runId: string, lead: typeof LEADS[0], baseTime: Date, failed = false, timeout = false) {
  const t = baseTime.getTime();
  const events: any[] = [
    { runId, type: EventType.RUN_STARTED,   message: `Webhook received from ${lead.source}`,
      metadata: { source: lead.source, company: lead.company, email: `${lead.name.toLowerCase().replace(' ','.')}@${lead.company.toLowerCase().replace(/\s+/g,'')+'.io'}` },
      createdAt: new Date(t) },
    { runId, type: EventType.NODE_EXECUTED, message: 'Lead payload validated — all required fields present',
      metadata: { name: lead.name, company: lead.company, budget: lead.budget, employees: lead.employees },
      createdAt: new Date(t + 180) },
    { runId, type: EventType.NODE_EXECUTED, message: 'Company enrichment node completed',
      metadata: { employees: lead.employees, industry: 'Technology', location: 'US' },
      createdAt: new Date(t + 420) },
    { runId, type: EventType.AI_CALLED,     message: 'OpenAI GPT-4.1 — lead classification prompt dispatched',
      metadata: { promptVersion: 'v2.3', temperature: 0.2 },
      createdAt: new Date(t + 600) },
  ];

  if (timeout) {
    events.push({ runId, type: EventType.RETRY_TRIGGERED, message: 'AI call timed out after 30s — triggering retry (attempt 2/3)',
      metadata: { attempt: 2, delayMs: 2000 }, createdAt: new Date(t + 31_000) });
    events.push({ runId, type: EventType.FAILURE_OCCURRED, message: 'AI provider unavailable after 3 retries — run marked FAILED',
      metadata: { httpStatus: 503, providerError: 'Service Unavailable' }, createdAt: new Date(t + 35_000) });
    return events;
  }

  if (failed) {
    events.push({ runId, type: EventType.RETRY_TRIGGERED, message: 'Rate limit (429) — retry after 2s backoff',
      metadata: { retryAfter: 2000, attempt: 1 }, createdAt: new Date(t + 1_200) });
    events.push({ runId, type: EventType.FAILURE_OCCURRED, message: `OpenAI 429 — quota exceeded for org`,
      metadata: { httpStatus: 429, model: 'gpt-4.1' }, createdAt: new Date(t + 3_500) });
    return events;
  }

  const latency = 900 + Math.floor(Math.random() * 1_800);
  events.push({ runId, type: EventType.NODE_EXECUTED, message: `AI classification complete — score: ${lead.quality}, P(convert): ${lead.prob}`,
    metadata: { leadQuality: lead.quality, conversionProbability: lead.prob, urgency: lead.urgency, estimatedDealSize: lead.deal, latencyMs: latency },
    createdAt: new Date(t + 600 + latency) });

  if (lead.quality === 'HIGH') {
    events.push({ runId, type: EventType.NODE_EXECUTED, message: 'CRM record created in HubSpot — lead assigned to Sales Rep',
      metadata: { crmId: `hs_${Math.floor(Math.random()*900000+100000)}`, dealStage: 'QUALIFIED', owner: 'sales@akra.io' },
      createdAt: new Date(t + 600 + latency + 340) });
    events.push({ runId, type: EventType.NODE_EXECUTED, message: 'Slack alert sent to #hot-leads — deal value estimated HIGH',
      metadata: { channel: '#hot-leads', notified: ['founder@akra.io'], urgency: lead.urgency },
      createdAt: new Date(t + 600 + latency + 560) });
  }

  return events;
}

// ── Trace builder ──────────────────────────────────────────
function buildTrace(runId: string, lead: typeof LEADS[0], m: ModelDef, baseTime: Date, failed = false) {
  const pt = 280 + Math.floor(Math.random() * 120);
  const ct = failed ? 0 : 90 + Math.floor(Math.random() * 180);
  const latency = failed ? 30_100 + Math.floor(Math.random()*500) : 900 + Math.floor(Math.random()*1800);
  return {
    runId, provider: m.provider, model: m.model,
    promptTokens: pt, completionTokens: ct,
    latency,
    estimatedCost: calcCost(m, pt, ct),
    status: failed ? 'error' : 'success',
    httpStatus: failed ? 429 : 200,
    providerRequestId: reqId(),
    promptSnapshot: {
      system: 'You are an expert B2B lead qualification specialist. Analyze the lead and return structured JSON only.',
      user: `Qualify this lead:\nName: ${lead.name}\nCompany: ${lead.company}\nEmployees: ${lead.employees}\nBudget: ${lead.budget}\nMessage: "${lead.message}"\nSource: ${lead.source}`,
    },
    responseSnapshot: failed ? Prisma.JsonNull : {
      leadQuality: lead.quality,
      conversionProbability: lead.prob,
      urgency: lead.urgency,
      estimatedDealSize: lead.deal,
      intent: lead.message.slice(0, 60) + '...',
      summary: `${lead.company} is a ${lead.employees < 50 ? 'small' : lead.employees < 150 ? 'mid-market' : 'enterprise'} company showing ${lead.quality.toLowerCase()} buying intent. Recommend ${lead.quality === 'HIGH' ? 'immediate outreach' : lead.quality === 'MEDIUM' ? 'nurture sequence' : 'low-priority follow-up'}.`,
      recommendedAction: lead.quality === 'HIGH' ? 'Schedule discovery call within 24h' : lead.quality === 'MEDIUM' ? 'Add to nurture sequence' : 'Send general info email',
    },
    createdAt: new Date(baseTime.getTime() + 600),
  };
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding AKRA FlowOps production demo data...\n');

  // Org
  const org = await prisma.organization.upsert({
    where: { clerkOrgId: 'demo_acme_agency_001' },
    update: {},
    create: { clerkOrgId: 'demo_acme_agency_001', name: 'Acme Marketing Agency', plan: 'PRO' },
  });
  console.log(`  ✓ Org: ${org.name}`);

  // Workflows
  const leadQual = await prisma.workflow.upsert({
    where: { id: 'wf-lead-qual-demo' },
    update: {},
    create: { id: 'wf-lead-qual-demo', organizationId: org.id, name: 'AI Lead Qualification Pipeline', provider: 'n8n', externalWorkflowId: 'n8n-wf-4521', status: WorkflowStatus.ACTIVE },
  });
  const emailAssist = await prisma.workflow.upsert({
    where: { id: 'wf-email-assist-demo' },
    update: {},
    create: { id: 'wf-email-assist-demo', organizationId: org.id, name: 'Gmail AI Assistant', provider: 'n8n', externalWorkflowId: 'n8n-wf-4522', status: WorkflowStatus.ACTIVE },
  });
  const crmSync = await prisma.workflow.upsert({
    where: { id: 'wf-crm-sync-demo' },
    update: {},
    create: { id: 'wf-crm-sync-demo', organizationId: org.id, name: 'CRM Auto-Updater', provider: 'n8n', externalWorkflowId: 'n8n-wf-4523', status: WorkflowStatus.ERROR },
  });
  console.log(`  ✓ 3 workflows created\n`);

  // ── Lead Qual Runs ─────────────────────────────────────
  const SCENARIOS: Array<{ leadIdx: number; status: RunStatus; mIdx: number; startAgo: number; failed?: boolean; timeout?: boolean }> = [
    { leadIdx: 2, status: RunStatus.SUCCESS, mIdx: 0, startAgo: mins(5)   },  // Priya — Enterprise HIGH
    { leadIdx: 0, status: RunStatus.SUCCESS, mIdx: 0, startAgo: mins(22)  },  // Sarah — HIGH
    { leadIdx: 4, status: RunStatus.SUCCESS, mIdx: 2, startAgo: mins(47)  },  // Lisa  — HIGH + Anthropic
    { leadIdx: 9, status: RunStatus.SUCCESS, mIdx: 2, startAgo: mins(68)  },  // Carlos — HIGH
    { leadIdx: 6, status: RunStatus.SUCCESS, mIdx: 0, startAgo: mins(95)  },  // Aisha — HIGH
    { leadIdx: 5, status: RunStatus.SUCCESS, mIdx: 1, startAgo: mins(128) },  // Tom  — MEDIUM
    { leadIdx: 7, status: RunStatus.SUCCESS, mIdx: 3, startAgo: mins(155) },  // Derek — MEDIUM + Haiku
    { leadIdx: 1, status: RunStatus.SUCCESS, mIdx: 0, startAgo: mins(190) },  // Marcus — HIGH
    { leadIdx: 3, status: RunStatus.FAILED,  mIdx: 0, startAgo: mins(230), failed: true },   // James — FAILED (429)
    { leadIdx: 8, status: RunStatus.FAILED,  mIdx: 0, startAgo: mins(285), timeout: true },  // Nina — FAILED (timeout)
  ];

  let runCount = 0;
  for (const sc of SCENARIOS) {
    const lead = LEADS[sc.leadIdx];
    const m = MODELS[sc.mIdx];
    const startedAt = ago(sc.startAgo);
    const isFailed = sc.status === RunStatus.FAILED;
    const baseDur = sc.timeout ? secs(35) : sc.failed ? secs(4) : secs(2) + Math.floor(Math.random() * secs(3));
    const completedAt = new Date(startedAt.getTime() + baseDur);

    const run = await prisma.workflowRun.create({
      data: {
        workflowId: leadQual.id,
        status: sc.status,
        startedAt,
        completedAt,
        duration: baseDur,
        triggerType: `WEBHOOK:${lead.source.replace(/\s+/g, '_').toUpperCase()}`,
        errorMessage: sc.timeout
          ? 'AI provider timeout after 3 retries (503 Service Unavailable)'
          : sc.failed
          ? 'OpenAI rate limit exceeded (429) — quota exhausted'
          : null,
      },
    });

    // Events
    const events = buildEvents(run.id, lead, startedAt, sc.failed, sc.timeout);
    await prisma.executionEvent.createMany({ data: events, skipDuplicates: true });

    // AI Trace (skip on timeout — provider never responded)
    if (!sc.timeout) {
      await prisma.aITrace.create({
        data: buildTrace(run.id, lead, m, startedAt, sc.failed),
      });
    }

    runCount++;
    const icon = isFailed ? '✗' : '✓';
    console.log(`  ${icon} Run [${sc.status.padEnd(7)}] ${lead.name.padEnd(18)} — ${lead.quality} — ${m.provider}/${m.model}`);
  }

  // ── Email Assistant Runs ───────────────────────────────
  const emailRuns = [
    { dur: secs(1) + 200, m: MODELS[3], startAgo: mins(10)  },
    { dur: secs(1) + 450, m: MODELS[3], startAgo: mins(35)  },
    { dur: secs(2) + 100, m: MODELS[3], startAgo: mins(72)  },
    { dur: secs(1) + 800, m: MODELS[2], startAgo: mins(110) },
    { dur: secs(1) + 600, m: MODELS[2], startAgo: mins(200) },
  ];

  for (const er of emailRuns) {
    const startedAt = ago(er.startAgo);
    const run = await prisma.workflowRun.create({
      data: { workflowId: emailAssist.id, status: RunStatus.SUCCESS, startedAt, completedAt: new Date(startedAt.getTime() + er.dur), duration: er.dur, triggerType: 'GMAIL_TRIGGER' },
    });
    await prisma.executionEvent.createMany({
      data: [
        { runId: run.id, type: EventType.RUN_STARTED,   message: 'Gmail trigger fired — new email detected', createdAt: new Date(startedAt.getTime()) },
        { runId: run.id, type: EventType.NODE_EXECUTED, message: 'Email thread extracted and chunked for AI processing', createdAt: new Date(startedAt.getTime() + 120) },
        { runId: run.id, type: EventType.AI_CALLED,     message: `${er.m.provider}/${er.m.model} — draft reply generation`, createdAt: new Date(startedAt.getTime() + 300) },
        { runId: run.id, type: EventType.NODE_EXECUTED, message: 'AI draft inserted into Gmail compose window', createdAt: new Date(startedAt.getTime() + er.dur - 200) },
      ],
      skipDuplicates: true,
    });
    const pt = 180 + Math.floor(Math.random() * 80);
    const ct = 120 + Math.floor(Math.random() * 100);
    await prisma.aITrace.create({
      data: {
        runId: run.id, provider: er.m.provider, model: er.m.model,
        promptTokens: pt, completionTokens: ct,
        latency: 700 + Math.floor(Math.random() * 800),
        estimatedCost: calcCost(er.m, pt, ct),
        status: 'success', httpStatus: 200, providerRequestId: reqId(),
        promptSnapshot: { system: 'Draft a professional reply to this email thread.', user: '[Email thread content]' },
        responseSnapshot: { draft: 'Thank you for reaching out. I\'d be happy to schedule a call to discuss your needs...', tone: 'professional', wordCount: 87 },
        createdAt: new Date(startedAt.getTime() + 300),
      },
    });
    runCount++;
  }
  console.log(`  ✓ 5 Gmail Assistant runs created`);

  // ── CRM Sync Runs (with failure) ───────────────────────
  const crmRun = await prisma.workflowRun.create({
    data: {
      workflowId: crmSync.id, status: RunStatus.FAILED,
      startedAt: ago(mins(15)), completedAt: ago(mins(15) - secs(8)),
      duration: secs(8), triggerType: 'SCHEDULE',
      errorMessage: 'HubSpot API 401 — access token expired',
    },
  });
  await prisma.executionEvent.createMany({
    data: [
      { runId: crmRun.id, type: EventType.RUN_STARTED,      message: 'Scheduled CRM sync triggered', createdAt: ago(mins(15)) },
      { runId: crmRun.id, type: EventType.NODE_EXECUTED,     message: 'Fetching updated records from Postgres', createdAt: ago(mins(15) - secs(1)) },
      { runId: crmRun.id, type: EventType.RETRY_TRIGGERED,   message: 'HubSpot 401 — refreshing token and retrying', metadata: { attempt: 1 }, createdAt: ago(mins(15) - secs(4)) },
      { runId: crmRun.id, type: EventType.FAILURE_OCCURRED,  message: 'Token refresh failed — HubSpot OAuth credentials revoked', metadata: { httpStatus: 401, fix: 'Re-authorize HubSpot integration in Settings' }, createdAt: ago(mins(15) - secs(8)) },
    ],
    skipDuplicates: true,
  });
  console.log(`  ✓ CRM sync failure scenario created`);
  runCount++;

  // ── Summary ────────────────────────────────────────────
  const traceCount  = await prisma.aITrace.count();
  const eventCount  = await prisma.executionEvent.count();
  const totalCost   = await prisma.aITrace.aggregate({ _sum: { estimatedCost: true } });

  console.log(`
╔═══════════════════════════════════════════════╗
║         AKRA FlowOps Demo Seed Complete       ║
╠═══════════════════════════════════════════════╣
║  Organization  Acme Marketing Agency          ║
║  Workflows     3  (lead qual, email, CRM)     ║
║  Runs          ${String(runCount).padEnd(30)} ║
║  Events        ${String(eventCount).padEnd(30)} ║
║  AI Traces     ${String(traceCount).padEnd(30)} ║
║  Est. AI Cost  $${String(Number(totalCost._sum.estimatedCost ?? 0).toFixed(4)).padEnd(29)} ║
║  Providers     openai, anthropic              ║
╚═══════════════════════════════════════════════╝

Open http://localhost:3000/dashboard to view.
`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
