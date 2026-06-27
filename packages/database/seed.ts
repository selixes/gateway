/**
 * AKRA FlowOps — Demo Seed Script
 * 
 * Creates a realistic demo dataset for testing the observability UI:
 *   1 Organization → 2 Workflows → 5 Runs → Events → AI Traces
 *
 * Usage: npx ts-node --esm seed.ts
 * (Run AFTER `npx prisma db push` with a live PostgreSQL instance)
 */

import { PrismaClient, RunStatus, WorkflowStatus, EventType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AKRA FlowOps demo data...');

  // ─── Organization ────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { clerkOrgId: 'demo_org_001' },
    update: {},
    create: {
      clerkOrgId: 'demo_org_001',
      name: 'Acme Marketing Ltd',
      plan: 'FREE',
    },
  });
  console.log(`  ✓ Organization: ${org.name} (${org.id})`);

  // ─── Workflows ───────────────────────────────────────────────
  const leadQualWf = await prisma.workflow.upsert({
    where: { id: 'wf-lead-qual-001' },
    update: {},
    create: {
      id: 'wf-lead-qual-001',
      organizationId: org.id,
      name: 'Lead Qualification Pipeline',
      provider: 'n8n',
      externalWorkflowId: 'n8n-wf-1234',
      status: WorkflowStatus.ACTIVE,
    },
  });

  const emailWf = await prisma.workflow.upsert({
    where: { id: 'wf-email-assistant-001' },
    update: {},
    create: {
      id: 'wf-email-assistant-001',
      organizationId: org.id,
      name: 'Gmail AI Assistant',
      provider: 'n8n',
      externalWorkflowId: 'n8n-wf-5678',
      status: WorkflowStatus.ACTIVE,
    },
  });
  console.log(`  ✓ 2 workflows created`);

  // ─── Helper: create a complete run with events + traces ──────
  async function createRun(opts: {
    id: string;
    workflowId: string;
    status: RunStatus;
    durationMs: number;
    errorMessage?: string;
    traces: { provider: string; model: string; promptTokens: number; completionTokens: number; latencyMs: number; costUsd: number }[];
  }) {
    const startedAt = new Date(Date.now() - opts.durationMs - Math.random() * 3_600_000);
    const completedAt = new Date(startedAt.getTime() + opts.durationMs);

    const run = await prisma.workflowRun.upsert({
      where: { id: opts.id },
      update: {},
      create: {
        id: opts.id,
        workflowId: opts.workflowId,
        status: opts.status,
        startedAt,
        completedAt,
        duration: opts.durationMs,
        triggerType: 'WEBHOOK',
        errorMessage: opts.errorMessage,
      },
    });

    // Events
    await prisma.executionEvent.createMany({
      skipDuplicates: true,
      data: [
        { runId: run.id, type: EventType.RUN_STARTED, message: 'Webhook received, run initiated', createdAt: startedAt },
        { runId: run.id, type: EventType.NODE_EXECUTED, message: 'Data extraction node completed', createdAt: new Date(startedAt.getTime() + 200), metadata: { nodeId: 'extract-lead-data', rows: 3 } },
        ...(opts.traces.length > 0 ? [{ runId: run.id, type: EventType.AI_CALLED, message: `${opts.traces[0].provider}/${opts.traces[0].model} invoked`, createdAt: new Date(startedAt.getTime() + 500) }] : []),
        ...(opts.status === 'FAILED' ? [{ runId: run.id, type: EventType.FAILURE_OCCURRED, message: opts.errorMessage ?? 'Unknown error', createdAt: completedAt }] : []),
        ...(opts.status === 'SUCCESS' ? [{ runId: run.id, type: EventType.NODE_EXECUTED, message: 'CRM update node completed', createdAt: new Date(startedAt.getTime() + opts.durationMs - 100) }] : []),
      ],
    });

    // AI Traces
    for (const t of opts.traces) {
      await prisma.aITrace.create({
        data: {
          runId: run.id,
          provider: t.provider,
          model: t.model,
          promptTokens: t.promptTokens,
          completionTokens: t.completionTokens,
          latency: t.latencyMs,
          estimatedCost: t.costUsd,
          status: opts.status === 'FAILED' ? 'error' : 'success',
          httpStatus: 200,
          providerRequestId: `req_${Math.random().toString(36).slice(2, 12)}`,
          promptSnapshot: {
            system: 'You are a lead qualification expert. Analyze the lead and respond with a JSON score.',
            user: 'Lead: John Smith, Company: Acme Corp, Budget: $50k/yr, Pain: manual data entry',
          },
          responseSnapshot: {
            score: 87,
            tier: 'HOT',
            reasoning: 'High budget, clear pain point, decision maker',
            recommended_action: 'Schedule demo call within 24 hours',
          },
          createdAt: new Date(startedAt.getTime() + 500),
        },
      });
    }

    return run;
  }

  // ─── Seed Runs ───────────────────────────────────────────────
  await createRun({
    id: 'run-001', workflowId: leadQualWf.id, status: RunStatus.SUCCESS, durationMs: 1842,
    traces: [{ provider: 'openai', model: 'gpt-4o', promptTokens: 312, completionTokens: 128, latencyMs: 1204, costUsd: 0.001344 }],
  });

  await createRun({
    id: 'run-002', workflowId: leadQualWf.id, status: RunStatus.SUCCESS, durationMs: 2103,
    traces: [{ provider: 'openai', model: 'gpt-4o', promptTokens: 290, completionTokens: 145, latencyMs: 1540, costUsd: 0.001282 }],
  });

  await createRun({
    id: 'run-003', workflowId: leadQualWf.id, status: RunStatus.FAILED, durationMs: 3210,
    errorMessage: 'OpenAI API rate limit exceeded (429)',
    traces: [{ provider: 'openai', model: 'gpt-4o', promptTokens: 312, completionTokens: 0, latencyMs: 3100, costUsd: 0.000374 }],
  });

  await createRun({
    id: 'run-004', workflowId: emailWf.id, status: RunStatus.SUCCESS, durationMs: 945,
    traces: [{ provider: 'anthropic', model: 'claude-3-5-haiku', promptTokens: 198, completionTokens: 340, latencyMs: 820, costUsd: 0.000814 }],
  });

  await createRun({
    id: 'run-005', workflowId: emailWf.id, status: RunStatus.SUCCESS, durationMs: 1120,
    traces: [{ provider: 'anthropic', model: 'claude-3-5-haiku', promptTokens: 210, completionTokens: 380, latencyMs: 910, costUsd: 0.000874 }],
  });

  console.log(`  ✓ 5 runs seeded with events and AI traces`);
  console.log('\n✅ Seed complete! Start the API and web app to see data in the dashboard.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
