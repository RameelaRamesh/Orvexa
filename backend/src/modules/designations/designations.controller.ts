import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Get()
  async list(@CurrentWorkspace() workspaceId: string) {
    return this.designationsService.list(workspaceId);
  }

  @Post()
  @RequirePermissions('people:manage')
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { title: string; level?: number; description?: string },
  ) {
    return this.designationsService.create(workspaceId, body.title, body.level, body.description);
  }

  @Patch(':id')
  @RequirePermissions('people:manage')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; level?: number; description?: string },
  ) {
    return this.designationsService.update(id, workspaceId, body);
  }

  @Delete(':id')
  @RequirePermissions('people:manage')
  async delete(@CurrentWorkspace() workspaceId: string, @Param('id') id: string) {
    return this.designationsService.delete(id, workspaceId);
  }
}
