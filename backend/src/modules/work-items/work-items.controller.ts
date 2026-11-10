import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { WorkItemStatus, PriorityLevel } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Get()
  async list(
    @CurrentWorkspace() workspaceId: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: WorkItemStatus,
    @Query('assignedMembershipId') assignedMembershipId?: string,
  ) {
    return this.workItemsService.list(workspaceId, { clientId, status, assignedMembershipId });
  }

  @Post()
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body()
    body: {
      title: string;
      clientId?: string;
      batchId?: string;
      quantity?: number;
      targetStage?: string;
      currentStage?: string;
      priority?: PriorityLevel;
      slaDeadline?: Date;
      assignedMembershipId?: string;
      metadata?: any;
    },
  ) {
    return this.workItemsService.create(workspaceId, body);
  }

  @Patch(':id/stage')
  async updateStage(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      currentStage?: string;
      status?: WorkItemStatus;
      processedQuantity?: number;
      assignedMembershipId?: string;
      qaScore?: number;
    },
  ) {
    return this.workItemsService.updateStage(id, workspaceId, body);
  }
}
