import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterWorkflowDto } from './dto/register-workflow.dto';
import { WorkflowStatus } from '@prisma/client';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.workflow.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string, organizationId: string) {
    return this.prisma.workflow.findFirst({
      where: { id, organizationId },
      include: {
        runs: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
  }

  register(organizationId: string, dto: RegisterWorkflowDto) {
    return this.prisma.workflow.create({
      data: {
        organizationId,
        name: dto.name,
        provider: dto.provider ?? 'EXTERNAL',
        externalWorkflowId: dto.externalWorkflowId,
        status: WorkflowStatus.ACTIVE,
      },
    });
  }

  updateStatus(id: string, organizationId: string, status: WorkflowStatus) {
    return this.prisma.workflow.updateMany({
      where: { id, organizationId },
      data: { status },
    });
  }
}
