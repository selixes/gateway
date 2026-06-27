import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { KeysService } from './keys.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentOrg } from '../auth/decorators';

@UseGuards(ClerkAuthGuard, RolesGuard)
@Controller('keys')
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Get()
  async getKeys(@CurrentOrg() orgId: string) {
    return this.keysService.findAll(orgId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async createKey(
    @CurrentOrg() orgId: string,
    @Body('name') name: string,
  ) {
    return this.keysService.create(orgId, name || 'Default Gateway Key');
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async revokeKey(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
  ) {
    return this.keysService.revoke(orgId, id);
  }
}
