import { Controller, Get, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentOrg } from '../auth/decorators';

@UseGuards(ClerkAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  getMyOrg(@CurrentOrg() orgId: string) {
    return this.organizationsService.findOne(orgId);
  }

  @Get('me/stats')
  getStats(@CurrentOrg() orgId: string) {
    return this.organizationsService.getStats(orgId);
  }
}
