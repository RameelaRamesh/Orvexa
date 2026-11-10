import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async listWorkspaceRoles(@CurrentWorkspace() workspaceId: string) {
    return this.rolesService.listWorkspaceRoles(workspaceId);
  }

  @Get('permissions')
  async listAllPermissions() {
    return this.rolesService.listAllPermissions();
  }

  /**
   * Diagnostic Access Inspector: reviews effective access and explains WHY a user can or cannot perform an action
   */
  @Get('diagnose')
  async diagnoseAccess(
    @CurrentWorkspace() workspaceId: string,
    @Req() req: any,
    @Query('membershipId') membershipId?: string,
    @Query('permission') permission?: string,
  ) {
    const targetMembershipId = membershipId || req.membershipId || req.membership?.id;
    return this.rolesService.diagnoseEffectiveAccess(workspaceId, targetMembershipId, permission);
  }

  @Get('effective-access/:membershipId')
  async getEffectiveAccess(
    @CurrentWorkspace() workspaceId: string,
    @Param('membershipId') membershipId: string,
    @Query('permission') permission?: string,
  ) {
    return this.rolesService.diagnoseEffectiveAccess(workspaceId, membershipId, permission);
  }

  @Post()
  @RequirePermissions('roles:manage')
  async createRole(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { name: string; description?: string; permissionIds?: string[] },
  ) {
    return this.rolesService.createRole(workspaceId, body.name, body.description, body.permissionIds);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('roles:manage')
  async deactivateRole(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') roleId: string,
  ) {
    return this.rolesService.deactivateRole(workspaceId, roleId);
  }

  @Patch(':id/reactivate')
  @RequirePermissions('roles:manage')
  async reactivateRole(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') roleId: string,
  ) {
    return this.rolesService.reactivateRole(workspaceId, roleId);
  }

  @Put(':id')
  @RequirePermissions('roles:manage')
  async updateRole(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') roleId: string,
    @Body() body: { name?: string; description?: string; permissionIds?: string[] },
  ) {
    return this.rolesService.updateRole(workspaceId, roleId, body);
  }

  @Patch(':id')
  @RequirePermissions('roles:manage')
  async patchRole(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') roleId: string,
    @Body() body: { name?: string; description?: string; permissionIds?: string[] },
  ) {
    return this.rolesService.updateRole(workspaceId, roleId, body);
  }

  @Patch(':id/permissions')
  @RequirePermissions('roles:manage')
  async updateRolePermissions(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') roleId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.rolesService.updateRole(workspaceId, roleId, { permissionIds: body.permissionIds });
  }

  @Delete(':id')
  @RequirePermissions('roles:manage')
  async deleteRole(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') roleId: string,
    @Query('reassignRoleId') reassignRoleId?: string,
  ) {
    return this.rolesService.deleteRole(workspaceId, roleId, reassignRoleId);
  }

  @Get(':id/members')
  @RequirePermissions('roles:manage')
  async getRoleMembers(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') roleId: string,
  ) {
    return this.rolesService.getRoleMembers(workspaceId, roleId);
  }
}
