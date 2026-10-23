import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TaskStatus, PriorityLevel } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ---------------------------------------------------------------------------
  // WORK ITEM LIST & RETRIEVAL
  // ---------------------------------------------------------------------------

  @Get()
  async list(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('assigneeMembershipId') assigneeMembershipId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: PriorityLevel,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.list(
      workspaceId,
      { projectId, assigneeMembershipId, status, priority, clientId, search },
      req.userContext,
    );
  }

  // WORKFLOWS (STATIC ROUTES BEFORE DYNAMIC :id)

  @Get('workflows/rules')
  async listWorkflowRules(@CurrentWorkspace() workspaceId: string) {
    return this.tasksService.listWorkflowRules(workspaceId);
  }

  @Post('workflows/rules')
  @RequirePermissions('tasks:manage')
  async createWorkflowRule(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
  ) {
    return this.tasksService.createWorkflowRule(workspaceId, body);
  }

  @Get('workflows/executions')
  async listWorkflowExecutions(
    @CurrentWorkspace() workspaceId: string,
    @Query('status') status?: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.tasksService.listWorkflowExecutions(workspaceId, { status, taskId });
  }

  @Post('workflows/executions/:id/retry')
  @RequirePermissions('tasks:manage')
  async retryWorkflowExecution(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') executionId: string,
  ) {
    return this.tasksService.retryWorkflowExecution(workspaceId, executionId);
  }

  @Get(':id')
  async getById(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.getById(workspaceId, id);
  }

  // ---------------------------------------------------------------------------
  // WORK ITEM CREATION & CORE UPDATES
  // ---------------------------------------------------------------------------

  @Post()
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Body()
    body: {
      title: string;
      description?: string;
      projectId?: string;
      assigneeMembershipId?: string;
      assigneeMembershipIds?: string[];
      status?: TaskStatus;
      priority?: PriorityLevel;
      dueDate?: Date;
      startDate?: Date;
      estimatedHours?: number;
      clientId?: string;
      departmentId?: string;
      assetId?: string;
      customFields?: Record<string, any>;
      dependsOnTaskIds?: string[];
      collaboratorIds?: string[];
    },
  ) {
    return this.tasksService.create(workspaceId, body, req.membershipId);
  }

  @Patch(':id')
  async update(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: PriorityLevel;
      assigneeMembershipId?: string;
      assigneeMembershipIds?: string[];
      dueDate?: Date;
      startDate?: Date;
      actualHours?: number;
      estimatedHours?: number;
      progress?: number;
      customFields?: Record<string, any>;
    },
  ) {
    return this.tasksService.update(id, workspaceId, body, req.membershipId);
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE & COLLABORATION ACTIONS
  // ---------------------------------------------------------------------------

  @Post(':id/reassign')
  async reassign(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('assigneeMembershipId') newAssigneeMembershipId: string,
    @Body('reason') reason?: string,
  ) {
    return this.tasksService.reassign(id, workspaceId, newAssigneeMembershipId, req.membershipId, reason);
  }

  @Post(':id/review')
  async submitForReview(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('reviewerMembershipId') reviewerMembershipId?: string,
    @Body('notes') notes?: string,
  ) {
    return this.tasksService.submitForReview(id, workspaceId, reviewerMembershipId, req.membershipId, notes);
  }

  @Post(':id/rework')
  async rejectToRework(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.tasksService.rejectToRework(id, workspaceId, reason, req.membershipId);
  }

  @Post(':id/complete')
  async complete(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('actualHours') actualHours?: number,
  ) {
    return this.tasksService.complete(id, workspaceId, req.membershipId, actualHours);
  }

  @Post(':id/reopen')
  async reopen(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.tasksService.reopen(id, workspaceId, reason, req.membershipId);
  }

  @Post(':id/escalate')
  async escalate(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('escalateToMembershipId') escalateToMembershipId?: string,
  ) {
    return this.tasksService.escalate(id, workspaceId, reason, escalateToMembershipId, req.membershipId);
  }

  @Post(':id/comments')
  async addComment(
    @CurrentWorkspace() workspaceId: string,
    @Request() req: any,
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    const authorName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Team Member';
    return this.tasksService.addComment(id, workspaceId, req.membershipId, authorName, text);
  }

  @Post(':id/dependencies')
  async setDependencies(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string,
    @Body('dependsOnTaskIds') dependsOnTaskIds: string[],
  ) {
    return this.tasksService.setDependencies(id, workspaceId, dependsOnTaskIds);
  }
}
