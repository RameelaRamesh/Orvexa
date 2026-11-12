import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions, RequireAnyPermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async createWorkspace(
    @CurrentUser('id') userId: string,
    @Body('name') name: string,
    @Body('businessType') businessType?: string,
    @Body('country') country?: string,
    @Body('orgSize') orgSize?: string,
  ) {
    return this.workspacesService.createWorkspace(userId, name, businessType, country, orgSize);
  }

  @Get()
  async getUserWorkspaces(@CurrentUser('id') userId: string) {
    return this.workspacesService.getUserWorkspaces(userId);
  }

  @Get('onboarding/recommendations')
  async getOnboardingRecommendations(
    @Query('industries') industries?: string,
    @Query('orgSize') orgSize?: string,
  ) {
    const list = industries ? industries.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return this.workspacesService.getOnboardingRecommendations(list, orgSize);
  }

  @UseGuards(TenantGuard)
  @Get('onboarding/status')
  async getOnboardingStatus(@CurrentWorkspace() workspaceId: string) {
    return this.workspacesService.getOnboardingStatus(workspaceId);
  }

  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('settings:manage')
  @Patch('onboarding/step')
  async updateOnboardingStep(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { step: string; data: any; markCompleted?: boolean },
  ) {
    return this.workspacesService.updateOnboardingStep(workspaceId, body.step, body.data, body.markCompleted);
  }

  @UseGuards(TenantGuard, PermissionsGuard)
  @RequireAnyPermissions('invitations:manage', 'settings:manage', 'people:manage')
  @Get('invite-link')
  async getShareInviteLink(@CurrentWorkspace() workspaceId: string) {
    return this.workspacesService.getShareInviteLink(workspaceId);
  }

  @UseGuards(TenantGuard, PermissionsGuard)
  @RequireAnyPermissions('invitations:manage', 'settings:manage', 'people:manage')
  @Patch('invite-link')
  async updateShareInviteLink(
    @CurrentWorkspace() workspaceId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.workspacesService.updateShareInviteLink(workspaceId, body, req?.userContext);
  }

  @UseGuards(TenantGuard)
  @Get(':id')
  async getWorkspaceDetails(
    @Param('id') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.getWorkspaceDetails(workspaceId, userId);
  }

  @UseGuards(TenantGuard, PermissionsGuard)
  @Patch('settings')
  @RequirePermissions('settings:manage')
  async updateSettings(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.workspacesService.updateSettings(workspaceId, body);
  }
}
