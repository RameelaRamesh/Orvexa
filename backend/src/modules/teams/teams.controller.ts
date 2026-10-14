import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async list(@CurrentWorkspace() workspaceId: string) {
    return this.teamsService.list(workspaceId);
  }

  @Post()
  @RequirePermissions('people:manage')
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { name: string; departmentId?: string; description?: string; leadMembershipId?: string },
  ) {
    return this.teamsService.create(workspaceId, body);
  }

  @Patch(':id')
  @RequirePermissions('people:manage')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; departmentId?: string; description?: string; leadMembershipId?: string },
  ) {
    return this.teamsService.update(id, workspaceId, body);
  }

  @Delete(':id')
  @RequirePermissions('people:manage')
  async delete(@CurrentWorkspace() workspaceId: string, @Param('id') id: string) {
    return this.teamsService.delete(id, workspaceId);
  }
}
