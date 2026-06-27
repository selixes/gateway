import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { StartRunDto, EndRunDto, AddEventDto } from './dto/execution.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentOrg } from '../auth/decorators';
import { WebhookSecretGuard } from '../auth/webhook-secret.guard';

// Webhook endpoints — open, external execution providers push here
@UseGuards(WebhookSecretGuard)
@Controller('webhooks/execution')
export class ExecutionsWebhookController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post('start')
  start(@Body() dto: StartRunDto) {
    return this.executionsService.startRun(dto);
  }

  @Post('end')
  end(@Body() dto: EndRunDto) {
    return this.executionsService.endRun(dto);
  }

  @Post('event')
  event(@Body() dto: AddEventDto) {
    return this.executionsService.addEvent(dto);
  }
}

// Authenticated read endpoints for the frontend dashboard
@UseGuards(ClerkAuthGuard, RolesGuard)
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  // All runs across the org — used by the global Runs page
  @Get()
  all(@CurrentOrg() orgId: string) {
    return this.executionsService.findAllByOrg(orgId);
  }

  @Get('workflow/:workflowId')
  byWorkflow(@Param('workflowId') workflowId: string, @CurrentOrg() orgId: string) {
    return this.executionsService.findRunsByWorkflow(workflowId, orgId);
  }

  @Post(':runId/replay')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  replay(@Param('runId') runId: string, @CurrentOrg() orgId: string) {
    return this.executionsService.replayRun(runId, orgId);
  }

  // Must come after /workflow/:id and /:id/replay to avoid route collision
  @Get(':runId')
  detail(@Param('runId') runId: string, @CurrentOrg() orgId: string) {
    return this.executionsService.findRunDetail(runId, orgId);
  }
}
