import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { ProjectStatus, PriorityLevel } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list(
    @CurrentWorkspace() workspaceId: string,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.projectsService.list(workspaceId, status);
  }

  @Post()
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body()
    body: {
      name: string;
      key: string;
      clientId?: string;
      description?: string;
      priority?: PriorityLevel;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.projectsService.create(workspaceId, body);
  }

  @Patch(':id')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      priority?: PriorityLevel;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.projectsService.update(id, workspaceId, body);
  }
}
