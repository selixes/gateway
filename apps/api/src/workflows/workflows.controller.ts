import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { RegisterWorkflowDto } from './dto/register-workflow.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentOrg } from '../auth/decorators';

@UseGuards(ClerkAuthGuard, RolesGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.workflowsService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.workflowsService.findOne(id, orgId);
  }

  @Post('register')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  register(@CurrentOrg() orgId: string, @Body() dto: RegisterWorkflowDto) {
    return this.workflowsService.register(orgId, dto);
  }
}
