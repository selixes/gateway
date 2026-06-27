import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RunStatus, EventType } from '@prisma/client';
import { StartRunDto, EndRunDto, AddEventDto } from './dto/execution.dto';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  async startRun(dto: StartRunDto) {
    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: dto.workflowId,
        status: RunStatus.RUNNING,
        triggerType: dto.triggerType ?? 'WEBHOOK',
      },
    });

    await this.prisma.executionEvent.create({
      data: { runId: run.id, type: EventType.RUN_STARTED, message: 'Run initiated' },
    });

    this.logger.log(`Run started: ${run.id} for workflow ${dto.workflowId}`);
    return { runId: run.id };
  }

  async endRun(dto: EndRunDto) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: dto.runId },
      include: {
        workflow: {
          include: { organization: { select: { name: true } } },
        },
        _count: {
          select: { traces: true },
        },
      },
    });

    if (!run) throw new NotFoundException(`Run ${dto.runId} not found`);

    const completedAt = new Date();
    const duration = completedAt.getTime() - run.startedAt.getTime();
    const status = dto.status === 'SUCCESS' ? RunStatus.SUCCESS : RunStatus.FAILED;

    await this.prisma.workflowRun.update({
      where: { id: dto.runId },
      data: { status, completedAt, duration, errorMessage: dto.errorMessage },
    });

    if (status === RunStatus.FAILED) {
      await this.prisma.executionEvent.create({
        data: {
          runId: dto.runId,
          type: EventType.FAILURE_OCCURRED,
          message: dto.errorMessage ?? 'Unknown failure',
        },
      });

      // Fire-and-forget alerts — never block the response
      this.alerts.sendFailureAlert({
        runId: dto.runId,
        workflowName: run.workflow.name,
        workflowId: run.workflowId,
        organizationName: run.workflow.organization.name,
        errorMessage: dto.errorMessage ?? null,
        duration,
        startedAt: run.startedAt,
        provider: run.workflow.provider,
        traceCount: run._count?.traces ?? 0,
      }).catch(err => this.logger.error(`Alert dispatch failed: ${err.message}`));
    }

    this.logger.log(`Run ${dto.runId} ended: ${status} (${duration}ms)`);
    return { runId: dto.runId, status, duration };
  }

  async addEvent(dto: AddEventDto) {
    const typeMap: Record<string, EventType> = {
      NODE_EXECUTED: EventType.NODE_EXECUTED,
      AI_CALLED: EventType.AI_CALLED,
      RETRY_TRIGGERED: EventType.RETRY_TRIGGERED,
      FAILURE_OCCURRED: EventType.FAILURE_OCCURRED,
      RUN_STARTED: EventType.RUN_STARTED,
    };
    const eventType = typeMap[dto.type] ?? EventType.NODE_EXECUTED;
    const event = await this.prisma.executionEvent.create({
      data: {
        runId: dto.runId,
        type: eventType,
        message: dto.message,
        metadata: dto.metadata ?? undefined,
      },
    });

    if (eventType === EventType.FAILURE_OCCURRED) {
      const run = await this.prisma.workflowRun.findUnique({
        where: { id: dto.runId },
        include: {
          workflow: {
            include: { organization: { select: { name: true } } },
          },
          _count: {
            select: { traces: true },
          },
        },
      });

      if (run && run.status !== RunStatus.FAILED) {
        const completedAt = new Date();
        const duration = completedAt.getTime() - run.startedAt.getTime();
        await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: { status: RunStatus.FAILED, completedAt, duration, errorMessage: dto.message },
        });

        this.alerts.sendFailureAlert({
          runId: run.id,
          workflowName: run.workflow.name,
          workflowId: run.workflowId,
          organizationName: run.workflow.organization.name,
          errorMessage: dto.message ?? 'Failure occurred',
          duration,
          startedAt: run.startedAt,
          provider: run.workflow.provider,
          traceCount: run._count?.traces ?? 0,
        }).catch(err => this.logger.error(`Alert dispatch failed: ${err.message}`));
      }
    }

    return event;
  }

  /** Replay a failed run: creates a new PENDING run cloned from the original. */
  async replayRun(runId: string, organizationId: string) {
    const original = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: { select: { id: true, name: true, organizationId: true } } },
    });

    if (!original || original.workflow.organizationId !== organizationId) {
      throw new NotFoundException(`Run ${runId} not found`);
    }

    const replayRun = await this.prisma.workflowRun.create({
      data: {
        workflowId: original.workflowId,
        status: RunStatus.PENDING,
        triggerType: `REPLAY:${original.id}`,
      },
    });

    await this.prisma.executionEvent.create({
      data: {
        runId: replayRun.id,
        type: EventType.RUN_STARTED,
        message: `Replay of run ${original.id}`,
        metadata: { parentRunId: original.id },
      },
    });

    this.logger.log(`Replay created: ${replayRun.id} (original: ${runId})`);
    return { runId: replayRun.id, parentRunId: runId, status: RunStatus.PENDING };
  }

  findRunsByWorkflow(workflowId: string, organizationId: string) {
    return this.prisma.workflowRun.findMany({
      where: { workflowId, workflow: { organizationId } },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        workflow: { select: { name: true, provider: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  findAllByOrg(organizationId: string) {
    return this.prisma.workflowRun.findMany({
      where: { workflow: { organizationId } },
      include: {
        workflow: { select: { id: true, name: true, provider: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  findRunDetail(runId: string, organizationId: string) {
    return this.prisma.workflowRun.findFirst({
      where: { id: runId, workflow: { organizationId } },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        traces: { orderBy: { createdAt: 'asc' } },
        workflow: {
          select: { id: true, name: true, provider: true, organizationId: true },
        },
      },
    });
  }
}
