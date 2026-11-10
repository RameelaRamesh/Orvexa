import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async list(@CurrentWorkspace() workspaceId: string) {
    return this.departmentsService.list(workspaceId);
  }

  @Post()
  @RequirePermissions('people:manage')
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { name: string; code?: string; description?: string },
  ) {
    return this.departmentsService.create(workspaceId, body.name, body.code, body.description);
  }

  @Patch(':id')
  @RequirePermissions('people:manage')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; description?: string },
  ) {
    return this.departmentsService.update(id, workspaceId, body);
  }

  @Delete(':id')
  @RequirePermissions('people:manage')
  async delete(@CurrentWorkspace() workspaceId: string, @Param('id') id: string) {
    return this.departmentsService.delete(id, workspaceId);
  }
}
