import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { TracesService } from './traces.service';
import { IngestTraceDto } from './dto/ingest-trace.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentOrg } from '../auth/decorators';
import { WebhookSecretGuard } from '../auth/webhook-secret.guard';

// Webhook endpoint — external push from any AI execution provider
@UseGuards(WebhookSecretGuard)
@Controller('webhooks/ai')
export class TracesWebhookController {
  constructor(private readonly tracesService: TracesService) {}

  @Post('trace')
  ingest(@Body() dto: IngestTraceDto) {
    return this.tracesService.ingest(dto);
  }
}

// Authenticated dashboard reads
@UseGuards(ClerkAuthGuard)
@Controller('traces')
export class TracesController {
  constructor(private readonly tracesService: TracesService) {}

  @Get('run/:runId')
  byRun(@Param('runId') runId: string, @CurrentOrg() orgId: string) {
    return this.tracesService.findByRun(runId, orgId);
  }

  @Get('analytics/cost')
  costByOrg(@CurrentOrg() orgId: string) {
    return this.tracesService.getAggregateCostByOrg(orgId);
  }

  @Get('analytics/report')
  reportByOrg(@CurrentOrg() orgId: string) {
    return this.tracesService.getWeeklyReport(orgId);
  }
}
