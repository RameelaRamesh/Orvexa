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
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { ProjectStatus, PriorityLevel } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.projectsService.list(workspaceId, status, req.userContext);
  }

  @Get(':id')
  async getById(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.getById(id, workspaceId);
  }

  @Post()
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body()
    body: {
      name: string;
      key: string;
      clientId?: string;
      description?: string;
      departmentId?: string;
      managerMembershipId?: string;
      memberMembershipIds?: string[];
      priority?: PriorityLevel;
      status?: ProjectStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const creatorMembershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.projectsService.create(workspaceId, body, creatorMembershipId);
  }

  @Patch(':id')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      priority?: PriorityLevel;
      startDate?: Date;
      endDate?: Date;
      departmentId?: string;
      managerMembershipId?: string;
      memberMembershipIds?: string[];
    },
  ) {
    const actorMembershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.projectsService.update(id, workspaceId, body, actorMembershipId);
  }

  @Post(':id/members')
  async addMember(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('memberMembershipId') memberMembershipId: string,
  ) {
    const actorMembershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.projectsService.addMember(id, workspaceId, memberMembershipId, actorMembershipId);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    const actorMembershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.projectsService.removeMember(id, workspaceId, memberId, actorMembershipId);
  }

  @Post(':id/files')
  async addFile(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body() file: { name: string; url: string; size?: string; type?: string },
  ) {
    const actorMembershipId = req.membership?.id || req.membershipId || req.userContext?.membershipId;
    return this.projectsService.addFile(id, workspaceId, file, actorMembershipId);
  }

  @Delete(':id')
  async remove(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.remove(id, workspaceId);
  }
}
