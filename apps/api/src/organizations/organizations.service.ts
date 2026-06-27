import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  findOne(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: true,
        workflows: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async getStats(id: string) {
    const [workflows, totalRuns, failedRuns] = await Promise.all([
      this.prisma.workflow.count({ where: { organizationId: id } }),
      this.prisma.workflowRun.count({
        where: { workflow: { organizationId: id } },
      }),
      this.prisma.workflowRun.count({
        where: { workflow: { organizationId: id }, status: 'FAILED' },
      }),
    ]);
    return { workflows, totalRuns, failedRuns, successRate: totalRuns > 0 ? ((totalRuns - failedRuns) / totalRuns) * 100 : 100 };
  }
}
