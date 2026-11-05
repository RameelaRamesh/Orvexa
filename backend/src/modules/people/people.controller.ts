import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PeopleService } from './people.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';
import { SystemAccessRole } from '@prisma/client';

@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Public()
  @Get('invitations/verify')
  async verifyInvitation(@Query('token') token: string) {
    return this.peopleService.verifyInvitationToken(token);
  }

  @Public()
  @Post('invitations/accept')
  async acceptInvitation(
    @Body() dto: { token: string; password?: string; firstName?: string; lastName?: string },
  ) {
    return this.peopleService.acceptInvitation(dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Get()
  async listMembers(
    @CurrentWorkspace() workspaceId: string,
    @Req() req: any,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
    @Query('accessRole') accessRole?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.peopleService.listMembers(
      workspaceId,
      {
        departmentId,
        teamId,
        accessRole,
        status,
        search,
      },
      req.userContext,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Get('export')
  @RequirePermissions('people:export')
  async exportMembers(
    @CurrentWorkspace() workspaceId: string,
    @Req() req: any,
  ) {
    return this.peopleService.exportMembers(workspaceId, req.userContext);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Get('payroll/export')
  @RequirePermissions('payroll:export')
  async exportPayroll(
    @CurrentWorkspace() workspaceId: string,
    @Req() req: any,
  ) {
    return this.peopleService.exportPayroll(workspaceId, req.userContext);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Get('invitations')
  @RequirePermissions('people:manage')
  async listInvitations(@CurrentWorkspace() workspaceId: string) {
    return this.peopleService.listInvitations(workspaceId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post('invite')
  @RequirePermissions('invitations:manage')
  async inviteMember(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser('id') invitedByUserId: string,
    @Body()
    body: {
      email: string;
      firstName: string;
      lastName: string;
      accessRole?: SystemAccessRole;
      roleId?: string;
      departmentId?: string;
      teamId?: string;
      designationId?: string;
      designationTitle?: string;
      reportsToId?: string;
      dataScope?: string;
    },
  ) {
    return this.peopleService.inviteMember(workspaceId, invitedByUserId, body);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post('invitations/:id/resend')
  @RequirePermissions('invitations:manage')
  async resendInvitation(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') invitationId: string,
  ) {
    return this.peopleService.resendInvitation(workspaceId, invitationId, currentUserId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Delete('invitations/:id/revoke')
  @RequirePermissions('invitations:manage')
  async revokeInvitation(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') invitationId: string,
  ) {
    return this.peopleService.revokeInvitation(workspaceId, invitationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post('invitations/:id/revoke')
  @RequirePermissions('invitations:manage')
  async revokeInvitationPost(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') invitationId: string,
  ) {
    return this.peopleService.revokeInvitation(workspaceId, invitationId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Get(':id')
  async getMemberById(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
  ) {
    return this.peopleService.getMemberById(workspaceId, membershipId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Patch(':id/profile')
  async updateMemberProfile(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
    @Body() body: any,
  ) {
    return this.peopleService.updateMemberProfile(workspaceId, membershipId, body);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Get(':id/completeness')
  async getProfileCompleteness(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
  ) {
    return this.peopleService.getProfileCompleteness(workspaceId, membershipId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post(':id/reminder')
  async sendIncompleteProfileReminder(
    @CurrentWorkspace() workspaceId: string,
    @Req() req: any,
    @Param('id') membershipId: string,
  ) {
    return this.peopleService.sendIncompleteProfileReminder(workspaceId, membershipId, req.membershipId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post(':id/onboarding-tasks')
  async updateOnboardingTasks(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
    @Body('tasks') tasks: any[],
  ) {
    return this.peopleService.updateOnboardingTasks(workspaceId, membershipId, tasks);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Get(':id/payroll')
  @RequirePermissions('payroll:view')
  async getMemberPayroll(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
    @Req() req: any,
  ) {
    return this.peopleService.getMemberPayroll(workspaceId, membershipId, req.userContext);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Patch(':id/payroll')
  @RequirePermissions('payroll:edit')
  async updateMemberPayroll(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
    @Body() body: any,
  ) {
    return this.peopleService.updateMemberPayroll(workspaceId, membershipId, body);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Patch(':id/org-details')
  @RequirePermissions('people:manage')
  async updateMemberOrgDetails(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
    @Body() body: any,
  ) {
    return this.peopleService.updateMemberOrgDetails(workspaceId, membershipId, body);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post(':id/suspend')
  @RequirePermissions('people:manage')
  async suspendMember(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
  ) {
    return this.peopleService.suspendMember(workspaceId, membershipId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post(':id/reactivate')
  @RequirePermissions('people:manage')
  async reactivateMember(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
  ) {
    return this.peopleService.reactivateMember(workspaceId, membershipId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post(':id/remove')
  @RequirePermissions('people:manage')
  async removeMember(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
  ) {
    return this.peopleService.removeMember(workspaceId, membershipId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post(':id/offboard/initiate')
  @RequirePermissions('people:manage')
  async initiateOffboarding(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
    @Body() body: { lastWorkingDate: string; exitReason?: string; notes?: string },
  ) {
    return this.peopleService.initiateOffboarding(workspaceId, membershipId, body);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post(':id/offboard/complete')
  @RequirePermissions('people:manage')
  async completeOffboarding(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') membershipId: string,
    @Body() body: { reassignToMembershipId?: string },
  ) {
    return this.peopleService.completeOffboarding(workspaceId, membershipId, body);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Post('transfer-ownership')
  async transferOwnership(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser('id') currentUserId: string,
    @Body('newOwnerMembershipId') newOwnerMembershipId: string,
  ) {
    return this.peopleService.transferOwnership(workspaceId, currentUserId, newOwnerMembershipId);
  }
}
