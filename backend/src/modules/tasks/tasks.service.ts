import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaskStatus, PriorityLevel, ApprovalStatus } from '@prisma/client';
import {
  buildUserContextFromMembership,
  hasPermission,
  isTargetWithinScope,
  resolveEffectiveScope,
  resolveLedTeamIds,
} from '../../common/utils/access-scope.util';

export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  trigger: 'ON_CREATE' | 'ON_STATUS_CHANGE' | 'ON_REWORK' | 'ON_DUE_DATE_APPROACHING' | 'MANUAL';
  conditions: Array<{
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'IN';
    value: any;
  }>;
  actions: Array<{
    type: 'ASSIGN_USER' | 'SEND_NOTIFICATION' | 'CREATE_APPROVAL_REQUEST' | 'UPDATE_FIELD' | 'ESCALATE';
    payload: any;
  }>;
  isActive: boolean;
  createdAt: Date;
}

export interface WorkflowExecution {
  id: string;
  idempotencyKey: string;
  workflowRuleId: string;
  workflowRuleName: string;
  targetTaskId: string;
  targetTaskTitle: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING';
  retryCount: number;
  maxRetries: number;
  executedActions: string[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TasksService implements OnModuleInit {
  onModuleInit() {
    setTimeout(() => {
      this.checkOverdueTasks().catch(() => null);
    }, 5000);

    setInterval(() => {
      this.checkOverdueTasks().catch(() => null);
    }, 60000);
  }
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // UNIVERSAL WORK ITEM LISTING & FILTERING
  // ---------------------------------------------------------------------------

  async list(
    workspaceId: string,
    filter?: {
      projectId?: string;
      assigneeMembershipId?: string;
      status?: string;
      priority?: PriorityLevel;
      clientId?: string;
      search?: string;
      scope?: string;
    },
    userContext?: any,
  ) {
    const where: any = { workspaceId };
    this.checkOverdueTasks(workspaceId).catch(() => null);

    if (filter?.projectId) where.projectId = filter.projectId;
    if (filter?.assigneeMembershipId) where.assigneeMembershipId = filter.assigneeMembershipId;
    if (filter?.priority) where.priority = filter.priority;

    let filterStatus = filter?.status;
    let filterOverdue = false;
    let filterBlocked = false;

    if (filterStatus) {
      if (filterStatus === 'OVERDUE') {
        filterOverdue = true;
      } else if (filterStatus === 'BLOCKED') {
        filterBlocked = true;
      } else if (filterStatus === 'DONE') {
        where.status = TaskStatus.COMPLETED;
      } else if (filterStatus !== 'ALL') {
        where.status = filterStatus as TaskStatus;
      }
    }

    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Strict permission & scope resolution: Tech TL (scope:team) only sees Tech team tasks;
    // Marketing TL (scope:team) only sees Marketing team tasks; Dept Lead (scope:department) sees their dept.
    const effectiveScope = userContext ? resolveEffectiveScope(userContext) : 'GLOBAL';
    const ledTeamIds = userContext?.membershipId
      ? await resolveLedTeamIds(this.prisma, workspaceId, userContext.membershipId)
      : [];

    // Explicit filter.scope can ONLY narrow visibility, never widen beyond effectiveScope
    let appliedScope = effectiveScope;
    if (filter?.scope === 'MY_WORK' && userContext?.membershipId) {
      appliedScope = 'ASSIGNED';
    } else if (filter?.scope === 'TEAM_WORK' && (effectiveScope === 'GLOBAL' || effectiveScope === 'DEPARTMENT')) {
      if (userContext?.teamId || ledTeamIds.length > 0) {
        appliedScope = 'TEAM';
      }
    }

    if (userContext && appliedScope === 'ASSIGNED' && userContext.membershipId) {
      where.assigneeMembershipId = userContext.membershipId;
    }

    let tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, key: true, status: true, clientId: true, createdAt: true },
        },
        assignee: {
          include: {
            user: { select: { firstName: true, lastName: true, avatarUrl: true, email: true } },
            department: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (userContext && appliedScope !== 'GLOBAL') {
      tasks = tasks.filter((t: any) => {
        const meta = (t.sla as any) || {};
        if (userContext.membershipId && t.assigneeMembershipId === userContext.membershipId) return true;
        if (appliedScope === 'ASSIGNED') {
          return Array.isArray(meta.collaboratorIds) && meta.collaboratorIds.includes(userContext.membershipId);
        }
        if (t.assignee) {
          return isTargetWithinScope(userContext, t.assignee, ledTeamIds);
        }
        // Unassigned task visibility within scoped team/department
        if (appliedScope === 'DEPARTMENT' && userContext.departmentId && meta.departmentId === userContext.departmentId) {
          return true;
        }
        return Boolean(userContext.membershipId && meta.creatorMembershipId === userContext.membershipId);
      });
    }

    if (filterOverdue) {
      tasks = tasks.filter((t: any) => t.status !== TaskStatus.COMPLETED && t.dueDate && new Date(t.dueDate).getTime() < Date.now());
    } else if (filterBlocked) {
      tasks = tasks.filter((t: any) => (t.sla as any)?.isBlocked || (t.sla as any)?.dependsOnTaskIds?.length > 0);
    }

    return tasks.map((t) => this.enrichTaskPayload(t));
  }

  async getById(workspaceId: string, id: string, userContext?: any) {
    const task = await this.prisma.task.findFirst({
      where: { id, workspaceId },
      include: {
        project: {
          include: { client: true },
        },
        assignee: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            department: true,
            team: true,
            designation: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Work item not found in workspace');
    }

    if (userContext && resolveEffectiveScope(userContext) !== 'GLOBAL') {
      const ledTeamIds = await resolveLedTeamIds(this.prisma, workspaceId, userContext.membershipId);
      const meta = (task.sla as any) || {};
      const effectiveScope = resolveEffectiveScope(userContext);
      const isSelfOrCollaborator =
        (userContext.membershipId && task.assigneeMembershipId === userContext.membershipId) ||
        (userContext.membershipId && meta.creatorMembershipId === userContext.membershipId) ||
        (Array.isArray(meta.collaboratorIds) && meta.collaboratorIds.includes(userContext.membershipId));
      const isWithinAssigneeScope = task.assignee ? isTargetWithinScope(userContext, task.assignee, ledTeamIds) : false;
      const isSameDeptUnassigned = !task.assignee && effectiveScope === 'DEPARTMENT' && userContext.departmentId && meta.departmentId === userContext.departmentId;
      if (!isSelfOrCollaborator && !isWithinAssigneeScope && !isSameDeptUnassigned) {
        throw new ForbiddenException('Access denied: This work item is outside your team or department visibility scope');
      }
    }

    // Resolve dependencies details
    const metadata = (task.sla as any) || {};
    const depIds: string[] = metadata.dependsOnTaskIds || [];
    let dependenciesDetails: any[] = [];
    if (depIds.length > 0) {
      dependenciesDetails = await this.prisma.task.findMany({
        where: { id: { in: depIds }, workspaceId },
        select: { id: true, title: true, status: true, priority: true },
      });
    }

    const enriched = this.enrichTaskPayload(task);
    return {
      ...enriched,
      dependenciesDetails,
      isBlocked: dependenciesDetails.some((d) => d.status !== 'COMPLETED'),
    };
  }

  // ---------------------------------------------------------------------------
  // WORK ITEM CREATION & UPDATES (STANDALONE & LINKED)
  // ---------------------------------------------------------------------------

  async create(
    workspaceId: string,
    data: {
      title: string;
      description?: string;
      projectId?: string;
      assigneeMembershipId?: string;
      assigneeMembershipIds?: string[];
      status?: TaskStatus;
      priority?: PriorityLevel;
      dueDate?: Date | string;
      startDate?: Date | string;
      estimatedHours?: number;
      clientId?: string;
      departmentId?: string;
      assetId?: string;
      customFields?: Record<string, any>;
      dependsOnTaskIds?: string[];
      collaboratorIds?: string[];
      reviewRequired?: boolean;
      subtasks?: Array<{ title: string } | string>;
      progressMode?: 'MANUAL' | 'SUBTASK';
      attachments?: any[];
    },
    creatorMembershipId?: string,
  ) {
    if (!data.title || !data.title.trim()) {
      throw new BadRequestException('Work item title is required');
    }

    // Validate project if explicitly linked
    if (data.projectId) {
      const proj = await this.prisma.project.findFirst({
        where: { id: data.projectId, workspaceId },
      });
      if (!proj) {
        throw new BadRequestException('Linked project not found in this workspace');
      }
    }

    // Validate dependency cycle if initial dependencies provided
    if (data.dependsOnTaskIds && data.dependsOnTaskIds.length > 0) {
      await this.validateDependencyIds(workspaceId, data.dependsOnTaskIds);
    }

    const initialStatus = data.status || TaskStatus.TODO;
    const initialProgress = initialStatus === TaskStatus.COMPLETED ? 100 : initialStatus === TaskStatus.IN_PROGRESS ? 25 : 0;

    const assigneeIds: string[] = Array.isArray(data.assigneeMembershipIds) && data.assigneeMembershipIds.length > 0
      ? data.assigneeMembershipIds.filter(Boolean)
      : data.assigneeMembershipId ? [data.assigneeMembershipId] : [];

    const primaryAssigneeId = assigneeIds.length > 0 ? assigneeIds[0] : null;

    const allCollaboratorIds = Array.from(new Set([
      ...(data.collaboratorIds || []),
      ...assigneeIds,
    ]));

    const initialSubtasks = Array.isArray(data.subtasks)
      ? data.subtasks.map((s: any) => ({
          id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title: typeof s === 'string' ? s.trim() : (s.title || '').trim(),
          isCompleted: false,
          createdAt: new Date().toISOString(),
        })).filter((s) => s.title)
      : [];

    const initialMetadata: any = {
      creatorMembershipId: creatorMembershipId || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      progress: initialProgress,
      progressMode: data.progressMode || (initialSubtasks.length > 0 ? 'SUBTASK' : 'MANUAL'),
      reviewRequired: Boolean(data.reviewRequired),
      subtasks: initialSubtasks,
      progressUpdates: [],
      clientId: data.clientId || null,
      departmentId: data.departmentId || null,
      assetId: data.assetId || null,
      customFields: data.customFields || {},
      dependsOnTaskIds: data.dependsOnTaskIds || [],
      collaboratorIds: allCollaboratorIds,
      assigneeMembershipIds: assigneeIds,
      comments: [],
      attachments: data.attachments || [],
      activityLog: [
        {
          action: 'CREATED',
          actorId: creatorMembershipId || 'SYSTEM',
          timestamp: new Date(),
          details: 'Work item created',
        },
      ],
      reworkCount: 0,
    };

    const task = await this.prisma.task.create({
      data: {
        workspaceId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        projectId: data.projectId || null,
        assigneeMembershipId: primaryAssigneeId,
        status: initialStatus,
        priority: data.priority || PriorityLevel.MEDIUM,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : null,
        sla: initialMetadata,
      },
      include: {
        project: true,
        assignee: { include: { user: true } },
      },
    });

    // Notify all assignees if assigned at creation
    for (const memId of assigneeIds) {
      await this.sendNotification(
        workspaceId,
        memId,
        'New Work Item Assigned',
        `You have been assigned to: "${task.title}"`,
        `/app/projects?taskId=${task.id}`,
      );
    }

    // Trigger durable workflow evaluation
    await this.evaluateWorkflows(workspaceId, 'ON_CREATE', task);

    return this.enrichTaskPayload(task);
  }

  async update(
    id: string,
    workspaceId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: PriorityLevel;
      assigneeMembershipId?: string;
      assigneeMembershipIds?: string[];
      dueDate?: Date | string;
      startDate?: Date | string;
      actualHours?: number;
      estimatedHours?: number;
      progress?: number;
      customFields?: Record<string, any>;
    },
    actorMembershipId?: string,
    userContext?: any,
  ) {
    const existing = await this.prisma.task.findFirst({
      where: { id, workspaceId },
      include: { assignee: true },
    });

    if (!existing) {
      throw new NotFoundException('Work item not found');
    }

    const currentMetadata = (existing.sla as any) || {};
    const activityLog = currentMetadata.activityLog || [];

    const newAssigneeIds = data.assigneeMembershipIds !== undefined
      ? (Array.isArray(data.assigneeMembershipIds) ? data.assigneeMembershipIds.filter(Boolean) : [])
      : data.assigneeMembershipId !== undefined
      ? (data.assigneeMembershipId ? [data.assigneeMembershipId] : [])
      : undefined;

    const primaryAssigneeId = newAssigneeIds !== undefined
      ? (newAssigneeIds.length > 0 ? newAssigneeIds[0] : null)
      : data.assigneeMembershipId;

    const isStatusChanging = data.status && data.status !== existing.status;
    const isAssigneeChanging = primaryAssigneeId !== undefined && primaryAssigneeId !== existing.assigneeMembershipId;
    const isDueDateChanging = data.dueDate && new Date(data.dueDate).getTime() !== (existing.dueDate ? new Date(existing.dueDate).getTime() : 0);

    // Scope check if updating a task under restricted visibility
    if (userContext && resolveEffectiveScope(userContext) !== 'GLOBAL') {
      const ledTeamIds = await resolveLedTeamIds(this.prisma, workspaceId, userContext.membershipId);
      const isAllowed =
        existing.assigneeMembershipId === userContext.membershipId ||
        currentMetadata.creatorMembershipId === userContext.membershipId ||
        (existing.assignee ? isTargetWithinScope(userContext, existing.assignee, ledTeamIds) : false);
      if (!isAllowed) {
        throw new ForbiddenException('Access denied: Cannot modify a work item outside your visibility scope');
      }
    }

    // If status moving to COMPLETED, verify approval/manage permission & blocking dependencies
    if (data.status === TaskStatus.COMPLETED) {
      if (userContext && Array.isArray(userContext.permissionCodes)) {
        if (userContext.accessRole !== 'OWNER' && !hasPermission(userContext, ['approvals:approve', 'tasks:manage'])) {
          throw new ForbiddenException(
            'Access restricted: Your role does not have task completion/approval permission (`approvals:approve` or `tasks:manage`). Please submit for review.',
          );
        }
      } else if (actorMembershipId) {
        const actor = await this.prisma.membership.findFirst({
          where: { id: actorMembershipId, workspaceId },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });
        if (actor) {
          if (actor.role?.permissions) {
            const actorCtx = buildUserContextFromMembership(actor);
            if (actorCtx.accessRole !== 'OWNER' && !hasPermission(actorCtx, ['approvals:approve', 'tasks:manage'])) {
              throw new ForbiddenException(
                'Access restricted: Your role does not have task completion/approval permission. Please submit for review.',
              );
            }
          } else if (actor.accessRole === 'MEMBER') {
            throw new ForbiddenException(
              'Access restricted: Only authorized reviewers and managers can complete work items. Please submit for review.',
            );
          }
        }
      }
      await this.verifyDependenciesCompleted(workspaceId, id, currentMetadata);
    }

    if (isStatusChanging) {
      activityLog.push({
        action: 'STATUS_CHANGED',
        actorId: actorMembershipId || 'SYSTEM',
        timestamp: new Date(),
        details: `Status changed from ${existing.status} to ${data.status}`,
      });
    }

    if (isAssigneeChanging || (newAssigneeIds !== undefined)) {
      activityLog.push({
        action: 'REASSIGNED',
        actorId: actorMembershipId || 'SYSTEM',
        timestamp: new Date(),
        details: primaryAssigneeId
          ? `Reassigned to membership ${primaryAssigneeId}`
          : `Assignees updated (${newAssigneeIds ? newAssigneeIds.length : 0} member(s) assigned)`,
      });
    }

    if (isDueDateChanging) {
      activityLog.push({
        action: 'DUE_DATE_UPDATED',
        actorId: actorMembershipId || 'SYSTEM',
        timestamp: new Date(),
        details: `Due date changed to ${new Date(data.dueDate!).toLocaleDateString()}`,
      });
    }

    const updatedMetadata = {
      ...((isDueDateChanging && data.dueDate && new Date(data.dueDate).getTime() > Date.now()) ? { overdueNotifiedAt: null, isOverdue: false } : {}),
      ...currentMetadata,
      ...(newAssigneeIds !== undefined
        ? {
            assigneeMembershipIds: newAssigneeIds,
            collaboratorIds: Array.from(new Set([...(currentMetadata.collaboratorIds || []), ...newAssigneeIds])),
          }
        : {}),
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
      ...(data.progress !== undefined ? { progress: Number(data.progress) } : isStatusChanging && data.status === 'COMPLETED' ? { progress: 100 } : {}),
      ...(data.customFields ? { customFields: { ...currentMetadata.customFields, ...data.customFields } } : {}),
      activityLog,
    };

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.priority ? { priority: data.priority } : {}),
        ...(primaryAssigneeId !== undefined ? { assigneeMembershipId: primaryAssigneeId } : {}),
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.actualHours !== undefined ? { actualHours: Number(data.actualHours) } : {}),
        ...(data.estimatedHours !== undefined ? { estimatedHours: Number(data.estimatedHours) } : {}),
        sla: updatedMetadata,
      },
      include: {
        project: true,
        assignee: { include: { user: true } },
      },
    });

    if (isAssigneeChanging && primaryAssigneeId) {
      await this.sendNotification(
        workspaceId,
        primaryAssigneeId,
        'Work Item Reassigned to You',
        `You are now assigned to: "${updated.title}"`,
        `/app/projects?taskId=${updated.id}`,
      );
    }

    if (isStatusChanging) {
      await this.evaluateWorkflows(workspaceId, 'ON_STATUS_CHANGE', updated);
    }

    return this.enrichTaskPayload(updated);
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE ACTIONS: REASSIGN, REVIEW, REWORK, COMPLETE, REOPEN, ESCALATE
  // ---------------------------------------------------------------------------

  async reassign(id: string, workspaceId: string, newAssigneeMembershipId: string, actorMembershipId?: string, reason?: string, userContext?: any) {
    const assignee = await this.prisma.membership.findFirst({
      where: { id: newAssigneeMembershipId, workspaceId },
      include: { user: true },
    });
    if (!assignee) {
      throw new NotFoundException('Assignee not found in this workspace');
    }

    if (userContext && resolveEffectiveScope(userContext) !== 'GLOBAL') {
      const ledTeamIds = await resolveLedTeamIds(this.prisma, workspaceId, userContext.membershipId);
      if (!isTargetWithinScope(userContext, assignee, ledTeamIds)) {
        throw new ForbiddenException('Access denied: Cannot reassign work items to members outside your team or department scope');
      }
    }

    return this.update(
      id,
      workspaceId,
      { assigneeMembershipId: newAssigneeMembershipId },
      actorMembershipId,
      userContext,
    );
  }

  async submitForReview(id: string, workspaceId: string, reviewerMembershipId?: string, actorMembershipId?: string, notes?: string) {
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Work item not found');

    const metadata = (task.sla as any) || {};
    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'SUBMITTED_FOR_REVIEW',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: notes || 'Submitted for review & quality check',
    });

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.IN_REVIEW,
        sla: {
          ...metadata,
          progress: 75,
          reviewerMembershipId: reviewerMembershipId || metadata.reviewerMembershipId || null,
          activityLog,
        },
      },
      include: { project: true, assignee: { include: { user: true } } },
    });

    const managersToAlert = await this.prisma.membership.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
        OR: [
          { accessRole: { in: ['MANAGER', 'ADMIN', 'OWNER'] } },
          ...(updated.assignee?.reportsToId ? [{ id: updated.assignee.reportsToId }] : []),
        ],
      },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    for (const m of (managersToAlert || [])) {
      if (m.id === actorMembershipId) continue;
      const mCtx = m.role?.permissions ? buildUserContextFromMembership(m) : { membershipId: m.id, accessRole: m.accessRole, dataScope: m.dataScope, departmentId: m.departmentId, teamId: m.teamId };
      if (updated.assignee && mCtx.accessRole !== 'OWNER') {
        if (!hasPermission(mCtx as any, ['approvals:approve', 'tasks:manage'])) continue;
        const mLedTeams = await resolveLedTeamIds(this.prisma, workspaceId, m.id);
        if (!isTargetWithinScope(mCtx as any, updated.assignee, mLedTeams)) continue;
      }
      await this.sendNotification(
        workspaceId,
        m.id,
        'Work Item Ready for Review',
        `"${updated.title}" was submitted for review by ${updated.assignee?.user?.firstName || 'team member'}.`,
        `/app/projects?taskId=${updated.id}`,
      );
    }

    if (reviewerMembershipId) {
      await this.sendNotification(
        workspaceId,
        reviewerMembershipId,
        'Work Item Ready for Review',
        `"${updated.title}" was submitted for your review.`,
        `/app/projects?taskId=${updated.id}`,
      );
    }

    await this.evaluateWorkflows(workspaceId, 'ON_STATUS_CHANGE', updated);
    return this.enrichTaskPayload(updated);
  }

  async rejectToRework(id: string, workspaceId: string, reason: string, actorMembershipId?: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason/feedback is required when rejecting to rework');
    }

    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Work item not found');

    const metadata = (task.sla as any) || {};
    const activityLog = metadata.activityLog || [];
    const reworkCount = (metadata.reworkCount || 0) + 1;

    activityLog.push({
      action: 'REJECTED_TO_REWORK',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: `Rework Cycle #${reworkCount}: ${reason.trim()}`,
    });

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.IN_PROGRESS,
        sla: {
          ...metadata,
          progress: 35,
          isRework: true,
          reworkCount,
          lastReworkReason: reason.trim(),
          activityLog,
        },
      },
      include: { project: true, assignee: { include: { user: true } } },
    });

    if (updated.assigneeMembershipId) {
      await this.sendNotification(
        workspaceId,
        updated.assigneeMembershipId,
        'Work Item Returned for Rework',
        `"${updated.title}" requires revisions: ${reason.trim()}`,
        `/app/projects?taskId=${updated.id}`,
      );
    }

    await this.evaluateWorkflows(workspaceId, 'ON_REWORK', updated);
    return this.enrichTaskPayload(updated);
  }

  async complete(id: string, workspaceId: string, actorMembershipId?: string, actualHours?: number, userContext?: any) {
    if (userContext && Array.isArray(userContext.permissionCodes)) {
      if (userContext.accessRole !== 'OWNER' && !hasPermission(userContext, ['approvals:approve', 'tasks:manage'])) {
        throw new ForbiddenException(
          'Access restricted: Your role does not have task completion/approval permission (`approvals:approve` or `tasks:manage`). Please submit for review.',
        );
      }
    } else if (actorMembershipId) {
      const actor = await this.prisma.membership.findFirst({
        where: { id: actorMembershipId, workspaceId },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      });
      if (actor) {
        if (actor.role?.permissions) {
          const actorCtx = buildUserContextFromMembership(actor);
          if (actorCtx.accessRole !== 'OWNER' && !hasPermission(actorCtx, ['approvals:approve', 'tasks:manage'])) {
            throw new ForbiddenException(
              'Access restricted: Your role does not have task completion/approval permission. Please submit for review.',
            );
          }
        } else if (actor.accessRole === 'MEMBER') {
          throw new ForbiddenException(
            'Access restricted: Only authorized reviewers and managers can complete work items. Please submit for review.',
          );
        }
      }
    }
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Work item not found');

    const metadata = (task.sla as any) || {};
    await this.verifyDependenciesCompleted(workspaceId, id, metadata);

    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'COMPLETED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: 'Work item successfully marked as COMPLETED',
    });

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        actualHours: actualHours !== undefined ? Number(actualHours) : task.actualHours,
        sla: {
          ...metadata,
          progress: 100,
          completedAt: new Date(),
          completedByManagerMembershipId: actorMembershipId || null,
          activityLog,
        },
      },
      include: { project: true, assignee: { include: { user: true } } },
    });

    await this.evaluateWorkflows(workspaceId, 'ON_STATUS_CHANGE', updated);
    return this.enrichTaskPayload(updated);
  }

  async reopen(id: string, workspaceId: string, reason?: string, actorMembershipId?: string) {
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Work item not found');

    const metadata = (task.sla as any) || {};
    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'REOPENED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: reason ? `Reopened: ${reason}` : 'Work item reopened',
    });

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.IN_PROGRESS,
        sla: {
          ...metadata,
          progress: 30,
          activityLog,
        },
      },
      include: { project: true, assignee: { include: { user: true } } },
    });

    return this.enrichTaskPayload(updated);
  }

  async escalate(id: string, workspaceId: string, reason: string, escalateToMembershipId?: string, actorMembershipId?: string) {
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Work item not found');

    const metadata = (task.sla as any) || {};
    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'ESCALATED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: `Escalation: ${reason}`,
    });

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        priority: PriorityLevel.URGENT,
        sla: {
          ...metadata,
          isEscalated: true,
          escalatedToMembershipId: escalateToMembershipId || null,
          escalationReason: reason,
          escalatedAt: new Date(),
          activityLog,
        },
      },
      include: { project: true, assignee: { include: { user: true } } },
    });

    if (escalateToMembershipId) {
      await this.sendNotification(
        workspaceId,
        escalateToMembershipId,
        'Urgent Escalation: Work Item',
        `"${updated.title}" has been escalated to you: ${reason}`,
        `/app/projects?taskId=${updated.id}`,
      );
    }

    return this.enrichTaskPayload(updated);
  }

  // ---------------------------------------------------------------------------
  // COMMENTS / DISCUSSIONS THREAD
  // ---------------------------------------------------------------------------

  async addComment(id: string, workspaceId: string, authorMembershipId: string, authorName: string, text: string) {
    if (!text || !text.trim()) {
      throw new BadRequestException('Comment text cannot be empty');
    }

    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Work item not found');

    const metadata = (task.sla as any) || {};
    const comments = metadata.comments || [];
    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      authorMembershipId,
      authorName,
      text: text.trim(),
      createdAt: new Date(),
    };

    await this.prisma.task.update({
      where: { id },
      data: {
        sla: {
          ...metadata,
          comments: [...comments, newComment],
        },
      },
    });

    return newComment;
  }

  // ---------------------------------------------------------------------------
  // DEPENDENCIES MANAGEMENT & CYCLE DETECTION (DAG VALIDATION)
  // ---------------------------------------------------------------------------

  async setDependencies(id: string, workspaceId: string, dependsOnTaskIds: string[]) {
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Work item not found');

    // Remove duplicates and self
    const cleanIds = Array.from(new Set(dependsOnTaskIds.filter((depId) => depId !== id)));

    if (cleanIds.length > 0) {
      await this.validateDependencyIds(workspaceId, cleanIds);

      // Run cycle detection for each candidate dependency
      for (const depId of cleanIds) {
        const hasCycle = await this.wouldCreateCycle(workspaceId, id, depId);
        if (hasCycle) {
          throw new BadRequestException(
            `Circular dependency detected: Task cannot depend on "${depId}" as it creates an invalid cycle.`,
          );
        }
      }
    }

    const metadata = (task.sla as any) || {};
    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'DEPENDENCIES_UPDATED',
      actorId: 'SYSTEM',
      timestamp: new Date(),
      details: `Dependencies set to ${cleanIds.length} task(s)`,
    });

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        sla: {
          ...metadata,
          dependsOnTaskIds: cleanIds,
          activityLog,
        },
      },
    });

    return this.getById(workspaceId, id);
  }

  // ---------------------------------------------------------------------------
  // SUBTASKS, PROGRESS & EXTENSIONS
  // ---------------------------------------------------------------------------

  async addSubtask(id: string, workspaceId: string, title: string, actorMembershipId?: string) {
    if (!title || !title.trim()) {
      throw new BadRequestException('Subtask title is required');
    }
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Task not found');

    const metadata = (task.sla as any) || {};
    const subtasks = metadata.subtasks || [];
    const newSub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: title.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    const updatedSubtasks = [...subtasks, newSub];

    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'SUBTASK_ADDED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: `Added subtask: "${title.trim()}"`,
    });

    let newProgress = metadata.progress;
    if (metadata.progressMode === 'SUBTASK') {
      const completed = updatedSubtasks.filter((s: any) => s.isCompleted).length;
      newProgress = Math.round((completed / updatedSubtasks.length) * 100);
    }

    await this.prisma.task.update({
      where: { id },
      data: {
        sla: {
          ...metadata,
          subtasks: updatedSubtasks,
          progress: newProgress,
          activityLog,
        },
      },
    });

    return this.getById(workspaceId, id);
  }

  async toggleSubtask(id: string, workspaceId: string, subtaskId: string, isCompleted: boolean, actorMembershipId?: string) {
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Task not found');

    const metadata = (task.sla as any) || {};
    const subtasks = metadata.subtasks || [];
    const updatedSubtasks = subtasks.map((s: any) =>
      s.id === subtaskId ? { ...s, isCompleted: Boolean(isCompleted), completedAt: isCompleted ? new Date().toISOString() : null } : s
    );

    const targetSub = subtasks.find((s: any) => s.id === subtaskId);
    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: isCompleted ? 'SUBTASK_COMPLETED' : 'SUBTASK_REOPENED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: `Subtask "${targetSub?.title || subtaskId}" marked as ${isCompleted ? 'completed' : 'incomplete'}`,
    });

    let newProgress = metadata.progress;
    if (metadata.progressMode === 'SUBTASK' || metadata.subtaskProgressEnabled) {
      const completed = updatedSubtasks.filter((s: any) => s.isCompleted).length;
      newProgress = updatedSubtasks.length > 0 ? Math.round((completed / updatedSubtasks.length) * 100) : 0;
    }

    await this.prisma.task.update({
      where: { id },
      data: {
        sla: {
          ...metadata,
          subtasks: updatedSubtasks,
          progress: newProgress,
          activityLog,
        },
      },
    });

    return this.getById(workspaceId, id);
  }

  async deleteSubtask(id: string, workspaceId: string, subtaskId: string, actorMembershipId?: string) {
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Task not found');

    const metadata = (task.sla as any) || {};
    const subtasks = metadata.subtasks || [];
    const updatedSubtasks = subtasks.filter((s: any) => s.id !== subtaskId);

    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'SUBTASK_DELETED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: `Deleted subtask ${subtaskId}`,
    });

    let newProgress = metadata.progress;
    if (metadata.progressMode === 'SUBTASK') {
      const completed = updatedSubtasks.filter((s: any) => s.isCompleted).length;
      newProgress = updatedSubtasks.length > 0 ? Math.round((completed / updatedSubtasks.length) * 100) : 0;
    }

    await this.prisma.task.update({
      where: { id },
      data: {
        sla: {
          ...metadata,
          subtasks: updatedSubtasks,
          progress: newProgress,
          activityLog,
        },
      },
    });

    return this.getById(workspaceId, id);
  }

  async updateProgress(id: string, workspaceId: string, progress: number, comment?: string, actorMembershipId?: string, authorName?: string) {
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Task not found');

    const metadata = (task.sla as any) || {};
    const prevProgress = metadata.progress !== undefined ? metadata.progress : 0;
    const clampedProgress = Math.max(0, Math.min(100, Math.round(Number(progress))));

    const progressUpdates = metadata.progressUpdates || [];
    const updateRecord = {
      id: `prog_${Date.now()}`,
      previousProgress: prevProgress,
      newProgress: clampedProgress,
      updatedBy: authorName || 'Team Member',
      actorMembershipId: actorMembershipId || 'SYSTEM',
      updatedAt: new Date().toISOString(),
      comment: comment ? comment.trim() : null,
    };
    progressUpdates.push(updateRecord);

    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'PROGRESS_UPDATED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: `Progress updated from ${prevProgress}% to ${clampedProgress}%${comment ? `: "${comment.trim()}"` : ''}`,
    });

    let status = task.status;
    if (clampedProgress === 100 && !metadata.reviewRequired) {
      status = TaskStatus.COMPLETED;
    } else if (clampedProgress > 0 && status === TaskStatus.TODO) {
      status = TaskStatus.IN_PROGRESS;
    }

    await this.prisma.task.update({
      where: { id },
      data: {
        status,
        sla: {
          ...metadata,
          progress: clampedProgress,
          progressMode: 'MANUAL',
          progressUpdates,
          activityLog,
        },
      },
    });

    return this.getById(workspaceId, id);
  }

  async requestExtension(id: string, workspaceId: string, proposedDeadline: Date | string, reason: string, actorMembershipId?: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Reason is required for deadline extension');
    }
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Task not found');

    const metadata = (task.sla as any) || {};
    const extensionRequest = {
      id: `ext_${Date.now()}`,
      proposedDeadline: new Date(proposedDeadline).toISOString(),
      currentDeadline: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      reason: reason.trim(),
      requestedByMembershipId: actorMembershipId || 'SYSTEM',
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
    };

    const activityLog = metadata.activityLog || [];
    activityLog.push({
      action: 'EXTENSION_REQUESTED',
      actorId: actorMembershipId || 'SYSTEM',
      timestamp: new Date(),
      details: `Extension requested to ${new Date(proposedDeadline).toLocaleDateString()}: "${reason.trim()}"`,
    });

    await this.prisma.task.update({
      where: { id },
      data: {
        sla: {
          ...metadata,
          extensionRequest,
          activityLog,
        },
      },
    });

    const taskAssignee = task.assigneeMembershipId
      ? await this.prisma.membership.findFirst({ where: { id: task.assigneeMembershipId, workspaceId } })
      : null;
    const managers = await this.prisma.membership.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
        accessRole: { in: ['MANAGER', 'ADMIN', 'OWNER'] },
      },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    for (const m of (managers || [])) {
      if (m.id === actorMembershipId) continue;
      const mCtx = m.role?.permissions ? buildUserContextFromMembership(m) : { membershipId: m.id, accessRole: m.accessRole, dataScope: m.dataScope, departmentId: m.departmentId, teamId: m.teamId };
      if (taskAssignee && mCtx.accessRole !== 'OWNER') {
        if (!hasPermission(mCtx as any, ['approvals:approve', 'tasks:manage'])) continue;
        const mLedTeams = await resolveLedTeamIds(this.prisma, workspaceId, m.id);
        if (!isTargetWithinScope(mCtx as any, taskAssignee, mLedTeams)) continue;
      }
      await this.sendNotification(
        workspaceId,
        m.id,
        'Deadline Extension Request',
        `Extension requested for "${task.title}" to ${new Date(proposedDeadline).toLocaleDateString()}. Reason: ${reason.trim()}`,
        `/app/projects?taskId=${task.id}`,
      );
    }

    return this.getById(workspaceId, id);
  }

  async reviewExtension(id: string, workspaceId: string, action: 'APPROVE' | 'REJECT', feedback?: string, actorMembershipId?: string) {
    const task = await this.prisma.task.findFirst({ where: { id, workspaceId } });
    if (!task) throw new NotFoundException('Task not found');

    const metadata = (task.sla as any) || {};
    const ext = metadata.extensionRequest;
    if (!ext || ext.status !== 'PENDING') {
      throw new BadRequestException('No pending extension request found for this task');
    }

    const activityLog = metadata.activityLog || [];
    let updatedDueDate = task.dueDate;

    if (action === 'APPROVE') {
      const oldDue = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None';
      const newDue = new Date(ext.proposedDeadline);
      updatedDueDate = newDue;

      activityLog.push({
        action: 'EXTENSION_APPROVED',
        actorId: actorMembershipId || 'SYSTEM',
        timestamp: new Date(),
        details: `Extension approved. Deadline updated from ${oldDue} to ${newDue.toLocaleDateString()}.${feedback ? ` Feedback: "${feedback.trim()}"` : ''}`,
      });

      ext.status = 'APPROVED';
      ext.reviewedByMembershipId = actorMembershipId;
      ext.reviewedAt = new Date().toISOString();
      ext.feedback = feedback || null;

      if (task.assigneeMembershipId) {
        await this.sendNotification(
          workspaceId,
          task.assigneeMembershipId,
          'Deadline Extension Approved',
          `Your extension request for "${task.title}" was approved. New deadline: ${newDue.toLocaleDateString()}.`,
          `/app/projects?taskId=${task.id}`,
        );
      }
    } else {
      activityLog.push({
        action: 'EXTENSION_REJECTED',
        actorId: actorMembershipId || 'SYSTEM',
        timestamp: new Date(),
        details: `Extension rejected.${feedback ? ` Reason: "${feedback.trim()}"` : ''}`,
      });

      ext.status = 'REJECTED';
      ext.reviewedByMembershipId = actorMembershipId;
      ext.reviewedAt = new Date().toISOString();
      ext.feedback = feedback || null;

      if (task.assigneeMembershipId) {
        await this.sendNotification(
          workspaceId,
          task.assigneeMembershipId,
          'Deadline Extension Rejected',
          `Your extension request for "${task.title}" was rejected.${feedback ? ` Feedback: "${feedback.trim()}"` : ''}`,
          `/app/projects?taskId=${task.id}`,
        );
      }
    }

    await this.prisma.task.update({
      where: { id },
      data: {
        dueDate: updatedDueDate,
        sla: {
          ...metadata,
          extensionRequest: ext,
          activityLog,
          isOverdue: updatedDueDate && new Date(updatedDueDate).getTime() > Date.now() ? false : metadata.isOverdue,
        },
      },
    });

    return this.getById(workspaceId, id);
  }

  async reviewDecision(id: string, workspaceId: string, approved: boolean, feedback?: string, actorMembershipId?: string) {
    if (approved) {
      return this.complete(id, workspaceId, actorMembershipId);
    } else {
      return this.rejectToRework(id, workspaceId, feedback || 'Changes requested during review', actorMembershipId);
    }
  }

  /**
   * BFS/DFS cycle detection: checks if newDependencyId already has a path leading back to taskId
   */
  public async wouldCreateCycle(workspaceId: string, taskId: string, newDependencyId: string): Promise<boolean> {
    if (taskId === newDependencyId) return true;

    const visited = new Set<string>();
    const queue = [newDependencyId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === taskId) return true; // Cycle path found!

      if (!visited.has(currentId)) {
        visited.add(currentId);
        const currentTask = await this.prisma.task.findUnique({
          where: { id: currentId },
          select: { sla: true },
        });

        const currentMetadata = (currentTask?.sla as any) || {};
        const childDeps: string[] = currentMetadata.dependsOnTaskIds || [];
        for (const dep of childDeps) {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }

    return false;
  }

  private async validateDependencyIds(workspaceId: string, ids: string[]) {
    const count = await this.prisma.task.count({
      where: { id: { in: ids }, workspaceId },
    });
    if (count !== ids.length) {
      throw new BadRequestException('One or more dependency task IDs do not exist in this workspace');
    }
  }

  private async verifyDependenciesCompleted(workspaceId: string, taskId: string, metadata: any) {
    const depIds: string[] = metadata.dependsOnTaskIds || [];
    if (depIds.length === 0) return;

    const uncompleted = await this.prisma.task.findMany({
      where: {
        id: { in: depIds },
        workspaceId,
        status: { not: TaskStatus.COMPLETED },
      },
      select: { id: true, title: true, status: true },
    });

    if (uncompleted.length > 0) {
      const titles = uncompleted.map((u) => `"${u.title}" (${u.status})`).join(', ');
      throw new BadRequestException(
        `Cannot complete work item: blocking dependencies must be COMPLETED first. Pending: ${titles}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // DURABLE WORKFLOW EXECUTION ENGINE (SAFE EVALUATOR WITH RETRIES & IDEMPOTENCY)
  // ---------------------------------------------------------------------------

  async listWorkflowRules(workspaceId: string): Promise<WorkflowRule[]> {
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as any) || {};
    return settings.workflowRules || [];
  }

  async createWorkflowRule(workspaceId: string, rule: Omit<WorkflowRule, 'id' | 'createdAt'>): Promise<WorkflowRule> {
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as any) || {};
    const rules: WorkflowRule[] = settings.workflowRules || [];

    const newRule: WorkflowRule = {
      ...rule,
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          workflowRules: [newRule, ...rules],
        },
      },
    });

    return newRule;
  }

  async listWorkflowExecutions(workspaceId: string, query?: { status?: string; taskId?: string }): Promise<WorkflowExecution[]> {
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as any) || {};
    let executions: WorkflowExecution[] = settings.workflowExecutions || [];

    if (query?.status) executions = executions.filter((e) => e.status === query.status);
    if (query?.taskId) executions = executions.filter((e) => e.targetTaskId === query.taskId);

    return executions;
  }

  /**
   * Safely evaluates workflow triggers and rules without arbitrary code execution
   */
  public async evaluateWorkflows(workspaceId: string, trigger: string, task: any) {
    const rules = await this.listWorkflowRules(workspaceId);
    const matchingRules = rules.filter((r) => r.isActive && r.trigger === trigger);

    for (const rule of matchingRules) {
      const isMatch = this.evalConditions(rule.conditions, task);
      if (!isMatch) continue;

      const idempotencyKey = `${rule.id}_${task.id}_${trigger}_${task.status}`;
      await this.executeWorkflowRule(workspaceId, rule, task, idempotencyKey);
    }
  }

  private evalConditions(conditions: WorkflowRule['conditions'], task: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((cond) => {
      const targetVal = task[cond.field] !== undefined ? task[cond.field] : task.sla?.[cond.field];

      switch (cond.operator) {
        case 'EQUALS':
          return String(targetVal) === String(cond.value);
        case 'NOT_EQUALS':
          return String(targetVal) !== String(cond.value);
        case 'CONTAINS':
          return String(targetVal).toLowerCase().includes(String(cond.value).toLowerCase());
        case 'GREATER_THAN':
          return Number(targetVal) > Number(cond.value);
        case 'IN':
          return Array.isArray(cond.value) && cond.value.includes(targetVal);
        default:
          return false;
      }
    });
  }

  private async executeWorkflowRule(
    workspaceId: string,
    rule: WorkflowRule,
    task: any,
    idempotencyKey: string,
    retryAttempt = 0,
  ): Promise<WorkflowExecution> {
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as any) || {};
    const executions: WorkflowExecution[] = settings.workflowExecutions || [];

    // Idempotency check: don't re-run successfully executed rule for same event
    const existing = executions.find((e) => e.idempotencyKey === idempotencyKey && e.status === 'SUCCESS');
    if (existing) {
      return existing;
    }

    const executedActions: string[] = [];
    let executionError: string | undefined = undefined;
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';

    try {
      for (const action of rule.actions) {
        if (action.type === 'SEND_NOTIFICATION') {
          const recipientId = action.payload.recipientMembershipId || task.assigneeMembershipId;
          if (recipientId) {
            await this.sendNotification(
              workspaceId,
              recipientId,
              action.payload.title || `Workflow Alert: ${rule.name}`,
              action.payload.message || `Automated workflow executed for "${task.title}"`,
              `/app/projects?taskId=${task.id}`,
            );
            executedActions.push(`SEND_NOTIFICATION:${recipientId}`);
          }
        } else if (action.type === 'ASSIGN_USER') {
          if (action.payload.assigneeMembershipId) {
            await this.prisma.task.update({
              where: { id: task.id },
              data: { assigneeMembershipId: action.payload.assigneeMembershipId },
            });
            executedActions.push(`ASSIGN_USER:${action.payload.assigneeMembershipId}`);
          }
        } else if (action.type === 'CREATE_APPROVAL_REQUEST') {
          await this.prisma.approvalRequest.create({
            data: {
              workspaceId,
              entityType: 'TASK',
              entityId: task.id,
              requesterMembershipId: task.assigneeMembershipId || task.sla?.creatorMembershipId || 'SYSTEM',
              comments: `Automated approval triggered by workflow "${rule.name}"`,
              status: ApprovalStatus.PENDING,
            },
          });
          executedActions.push('CREATE_APPROVAL_REQUEST');
        } else if (action.type === 'ESCALATE') {
          await this.prisma.task.update({
            where: { id: task.id },
            data: { priority: PriorityLevel.URGENT },
          });
          executedActions.push('ESCALATE:URGENT');
        }
      }
    } catch (err: any) {
      status = 'FAILED';
      executionError = err.message || 'Workflow action execution failed';
    }

    const executionRecord: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      idempotencyKey,
      workflowRuleId: rule.id,
      workflowRuleName: rule.name,
      targetTaskId: task.id,
      targetTaskTitle: task.title,
      status,
      retryCount: retryAttempt,
      maxRetries: 3,
      executedActions,
      error: executionError,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          workflowExecutions: [executionRecord, ...executions.slice(0, 99)],
        },
      },
    });

    return executionRecord;
  }

  async retryWorkflowExecution(workspaceId: string, executionId: string) {
    const executions = await this.listWorkflowExecutions(workspaceId);
    const target = executions.find((e) => e.id === executionId);
    if (!target) throw new NotFoundException('Workflow execution record not found');

    const rules = await this.listWorkflowRules(workspaceId);
    const rule = rules.find((r) => r.id === target.workflowRuleId);
    if (!rule) throw new NotFoundException('Original workflow rule no longer exists');

    const task = await this.prisma.task.findUnique({ where: { id: target.targetTaskId } });
    if (!task) throw new NotFoundException('Target task no longer exists');

    return this.executeWorkflowRule(
      workspaceId,
      rule,
      task,
      `${target.idempotencyKey}_retry_${Date.now()}`,
      target.retryCount + 1,
    );
  }

  // ---------------------------------------------------------------------------
  // HELPERS & PAYLOAD ENRICHMENT
  // ---------------------------------------------------------------------------

  private enrichTaskPayload(task: any) {
    const metadata = (task.sla as any) || {};
    const comments = metadata.comments || [];
    const activityLog = metadata.activityLog || [];
    const dependsOnTaskIds = metadata.dependsOnTaskIds || [];
    const reworkCount = metadata.reworkCount || 0;

    const isOverdue =
      task.status !== 'COMPLETED' &&
      task.status !== 'CANCELLED' &&
      task.dueDate
        ? new Date(task.dueDate).getTime() < Date.now()
        : false;

    return {
      ...task,
      creatorMembershipId: metadata.creatorMembershipId || null,
      progress: metadata.progress !== undefined ? metadata.progress : task.status === 'COMPLETED' ? 100 : task.status === 'IN_PROGRESS' ? 25 : 0,
      progressMode: metadata.progressMode || 'MANUAL',
      progressUpdates: metadata.progressUpdates || [],
      subtasks: metadata.subtasks || [],
      reviewRequired: Boolean(metadata.reviewRequired),
      extensionRequest: metadata.extensionRequest || null,
      attachments: metadata.attachments || [],
      startDate: metadata.startDate || null,
      commentsCount: comments.length,
      comments,
      activityLog,
      dependsOnTaskIds,
      reworkCount,
      isRework: !!metadata.isRework,
      isOverdue,
      isBlocked: Boolean(metadata.isBlocked),
      customFields: metadata.customFields || {},
      collaboratorIds: metadata.collaboratorIds || [],
      assigneeMembershipIds: Array.isArray(metadata.assigneeMembershipIds) && metadata.assigneeMembershipIds.length > 0
        ? metadata.assigneeMembershipIds
        : (task.assigneeMembershipId ? [task.assigneeMembershipId] : []),
    };
  }

  /**
   * Scans for tasks whose deadline has ended without completion,
   * and dispatches alert notifications to higher officials (Managers, Admins, Owners, and Direct Reports).
   */
  public async checkOverdueTasks(workspaceId?: string) {
    try {
      const now = new Date();
      const where: any = {
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
        dueDate: { lt: now },
      };
      if (workspaceId) {
        where.workspaceId = workspaceId;
      }

      const overdueTasks = await this.prisma.task.findMany({
        where,
        include: {
          assignee: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          project: { select: { id: true, name: true } },
        },
      });

      for (const task of overdueTasks) {
        const metadata = (task.sla as any) || {};

        if (metadata.overdueNotifiedAt) {
          continue;
        }

        const higherOfficials = await this.prisma.membership.findMany({
          where: {
            workspaceId: task.workspaceId,
            status: 'ACTIVE',
            OR: [
              { accessRole: { in: ['OWNER', 'ADMIN', 'MANAGER'] } },
              ...(task.assignee?.reportsToId ? [{ id: task.assignee.reportsToId }] : []),
            ],
          },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });

        const assigneeName = task.assignee?.user
          ? `${task.assignee.user.firstName || ''} ${task.assignee.user.lastName || ''}`.trim()
          : 'Unassigned';

        const dueDateFormatted = task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Deadline';

        const activityLog = metadata.activityLog || [];
        activityLog.push({
          action: 'DEADLINE_BREACHED',
          actorId: 'SYSTEM',
          timestamp: now,
          details: `Task missed deadline of ${dueDateFormatted}. Higher officials notified.`,
        });

        for (const official of (higherOfficials || [])) {
          if (official.id === task.assigneeMembershipId) continue;
          if (task.assignee && official.accessRole !== 'OWNER') {
            const oCtx = official.role?.permissions ? buildUserContextFromMembership(official) : { membershipId: official.id, accessRole: official.accessRole, dataScope: official.dataScope, departmentId: official.departmentId, teamId: official.teamId };
            const oLed = await resolveLedTeamIds(this.prisma, task.workspaceId, official.id);
            if (!isTargetWithinScope(oCtx as any, task.assignee, oLed)) continue;
          }

          await this.sendNotification(
            task.workspaceId,
            official.id,
            `🚨 Deadline Missed: ${task.title}`,
            `Work item "${task.title}" assigned to ${assigneeName} missed its deadline (${dueDateFormatted}) without completion. Immediate review required.`,
            `/app/projects?taskId=${task.id}`,
          );
        }

        await this.prisma.task.update({
          where: { id: task.id },
          data: {
            sla: {
              ...metadata,
              overdueNotifiedAt: now,
              isOverdue: true,
              activityLog,
            },
          },
        });
      }
    } catch (err) {
      // Overdue scan errors do not crash caller
    }
  }

  private async sendNotification(
    workspaceId: string,
    recipientMembershipId: string,
    title: string,
    message: string,
    link?: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId,
          title,
          message,
          link: link || '/app/projects',
        },
      });
    } catch {
      // Notification errors do not fail core task flow
    }
  }
}
