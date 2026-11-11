import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequireAnyPermissions } from '../../common/decorators/permissions.decorator';
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
  @RequireAnyPermissions('people:manage', 'roles:manage', 'org:manage', 'departments:manage')
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body()
    body: {
      title: string;
      level?: number;
      description?: string;
      departmentId?: string | null;
      defaultAccessRole?: string;
      defaultDataScope?: string;
      defaultRoleId?: string | null;
      permissionCodes?: string[];
      autoSyncRole?: boolean;
    },
  ) {
    return this.designationsService.create(workspaceId, body.title, body.level, body.description, {
      departmentId: body.departmentId,
      defaultAccessRole: body.defaultAccessRole,
      defaultDataScope: body.defaultDataScope,
      defaultRoleId: body.defaultRoleId,
      permissionCodes: body.permissionCodes,
      autoSyncRole: body.autoSyncRole,
    });
  }

  @Patch(':id')
  @RequireAnyPermissions('people:manage', 'roles:manage', 'org:manage', 'departments:manage')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      level?: number;
      description?: string;
      departmentId?: string | null;
      defaultAccessRole?: string;
      defaultDataScope?: string;
      defaultRoleId?: string | null;
      permissionCodes?: string[];
      autoSyncRole?: boolean;
    },
  ) {
    return this.designationsService.update(id, workspaceId, body);
  }

  @Delete(':id')
  @RequireAnyPermissions('people:manage', 'roles:manage', 'org:manage', 'departments:manage')
  async delete(@CurrentWorkspace() workspaceId: string, @Param('id') id: string) {
    return this.designationsService.delete(id, workspaceId);
  }
}
