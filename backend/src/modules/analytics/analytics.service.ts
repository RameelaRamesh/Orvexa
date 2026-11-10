import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  hasPermission,
  isTargetWithinScope,
  resolveEffectiveScope,
  resolveLedTeamIds,
} from '../../common/utils/access-scope.util';

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export interface MetricDefinition {
  name: string;
  category: string;
  formula: string;
  description: string;
  unit: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // METRIC DEFINITIONS (TRANSPARENT CALCULATION DICTIONARY)
  // ---------------------------------------------------------------------------
  getMetricDefinitions(): Record<string, MetricDefinition> {
    return {
      taskCompletionRate: {
        name: 'Task Completion Rate',
        category: 'Work Execution',
        formula: '(Completed Tasks / Total Filtered Tasks) * 100',
        description: 'Percentage of scoped tasks marked COMPLETED within the selected date window.',
        unit: '%',
      },
      activeProjects: {
        name: 'Active Projects',
        category: 'Work Execution',
        formula: 'Count(Projects WHERE Status NOT IN [COMPLETED, CANCELLED])',
        description: 'Number of ongoing projects currently active or in progress.',
        unit: 'projects',
      },
      overdueTasksCount: {
        name: 'Overdue Tasks',
        category: 'Work Execution',
        formula: 'Count(Tasks WHERE DueDate < Now AND Status NOT IN [COMPLETED, CANCELLED])',
        description: 'Number of active tasks whose deadline has elapsed without completion.',
        unit: 'tasks',
      },
      averageWorkHours: {
        name: 'Average Daily Work Hours',
        category: 'Time & Attendance',
        formula: 'Sum(TotalWorkMinutes) / (Count(Attendance Records) * 60)',
        description: 'Mean elapsed productive work hours per attended day across members.',
        unit: 'hours',
      },
      attendanceRate: {
        name: 'Attendance Present Rate',
        category: 'Time & Attendance',
        formula: '(Present Attendance Records / Total Expected Member-Days) * 100',
        description: 'Proportion of scheduled working days fulfilled with recorded presence.',
        unit: '%',
      },
      averageQualityScore: {
        name: 'Average Quality Audit Score',
        category: 'Quality & Compliance',
        formula: 'Sum(QualityReview.Score) / Count(QualityReviews)',
        description: 'Mean percentage score evaluated across all audited batches and work items.',
        unit: '%',
      },
      slaAdherenceRate: {
        name: 'SLA Adherence Rate',
        category: 'Quality & Compliance',
        formula: '((Total Eligible Items - Breached Items) / Total Eligible Items) * 100',
        description: 'Proportion of work items resolved within configured SLA thresholds without breach.',
        unit: '%',
      },
      assetUtilizationRate: {
        name: 'Asset Utilization Rate',
        category: 'Resources',
        formula: '(Assigned Assets / Total Active Assets) * 100',
        description: 'Percentage of organizational equipment currently in active employee custody.',
        unit: '%',
      },
    };
  }

  private async resolveAnalyticsMemberIds(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    filters: { memberId?: string; departmentId?: string; teamId?: string; scope?: string },
    userContext?: any,
  ): Promise<{ mode: 'ALL' | 'SINGLE' | 'LIST'; memberId?: string; memberIds?: string[] }> {
    const scopeUpper = (filters.scope || '').toUpperCase();
    if (scopeUpper === 'MY_DATA') {
      return { mode: 'SINGLE', memberId: membershipId, memberIds: [membershipId] };
    }

    // Preserve direct unit test behavior when userContext is omitted
    if (!userContext) {
      const isManagerOrAdmin = ['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(userRole);
      if (!isManagerOrAdmin) return { mode: 'SINGLE', memberId: membershipId, memberIds: [membershipId] };
      if (filters.memberId) return { mode: 'SINGLE', memberId: filters.memberId, memberIds: [filters.memberId] };
      return { mode: 'ALL' };
    }

    const canViewReports = userContext.accessRole === 'OWNER' || hasPermission(userContext, 'reports:view');
    const effectiveScope = userContext.accessRole === 'OWNER'
      ? 'GLOBAL'
      : !canViewReports
      ? 'ASSIGNED'
      : resolveEffectiveScope(userContext);

    if (effectiveScope === 'ASSIGNED') {
      return { mode: 'SINGLE', memberId: membershipId, memberIds: [membershipId] };
    }

    if (effectiveScope === 'GLOBAL') {
      if (filters.memberId) return { mode: 'SINGLE', memberId: filters.memberId, memberIds: [filters.memberId] };
      if (filters.departmentId || filters.teamId) {
        const members = await this.prisma.membership.findMany({
          where: {
            workspaceId,
            status: 'ACTIVE',
            ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
            ...(filters.teamId ? { teamId: filters.teamId } : {}),
          },
          select: { id: true },
        });
        const ids = (members || []).map((m: any) => m.id).filter(Boolean);
        return { mode: 'LIST', memberIds: ids.length > 0 ? ids : ['__none__'] };
      }
      return { mode: 'ALL' };
    }

    // Scoped to TEAM or DEPARTMENT: Tech TL only gets Tech metrics; Dept Lead gets Dept metrics
    const [members, ledTeamIds] = await Promise.all([
      this.prisma.membership.findMany({
        where: { workspaceId, status: 'ACTIVE' },
        select: { id: true, departmentId: true, teamId: true, reportsToId: true },
      }),
      resolveLedTeamIds(this.prisma, workspaceId, membershipId),
    ]);
    const allowedIds = Array.from(new Set([
      membershipId,
      ...(members || [])
        .filter((m: any) => isTargetWithinScope(userContext, m, ledTeamIds))
        .map((m: any) => m.id),
    ].filter(Boolean)));

    if (filters.memberId) {
      return allowedIds.includes(filters.memberId)
        ? { mode: 'SINGLE', memberId: filters.memberId, memberIds: [filters.memberId] }
        : { mode: 'LIST', memberIds: ['__none__'] };
    }

    return { mode: 'LIST', memberIds: allowedIds };
  }

  // ---------------------------------------------------------------------------
  // OVERVIEW METRICS ENGINE
  // ---------------------------------------------------------------------------
  async getOverview(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    filters: {
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      teamId?: string;
      memberId?: string;
      status?: string;
      priority?: string;
      scope?: string;
    } = {},
    userContext?: any,
  ) {
    // Date Range Scoping
    const start = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    // Ensure end date covers end of that day
    end.setHours(23, 59, 59, 999);

    const scopeRes = await this.resolveAnalyticsMemberIds(workspaceId, membershipId, userRole, filters, userContext);
    const applyMemFilter = (field: string) => {
      if (scopeRes.mode === 'SINGLE' && scopeRes.memberId) return { [field]: scopeRes.memberId };
      if (scopeRes.mode === 'LIST' && scopeRes.memberIds) return { [field]: { in: scopeRes.memberIds } };
      return {};
    };

    // 1. Task Queries
    const taskWhere: any = {
      workspaceId,
      createdAt: { gte: start, lte: end },
      ...applyMemFilter('assigneeMembershipId'),
    };
    if (filters.status && filters.status !== 'ALL') {
      taskWhere.status = filters.status;
    }
    if (filters.priority && filters.priority !== 'ALL') {
      taskWhere.priority = filters.priority;
    }

    const [allTasks, totalMembersCount] = await Promise.all([
      this.prisma.task.findMany({
        where: taskWhere,
        select: {
          id: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
        },
      }),
      scopeRes.mode === 'LIST' && scopeRes.memberIds
        ? Promise.resolve(scopeRes.memberIds.filter((id) => id !== '__none__').length)
        : scopeRes.mode === 'SINGLE'
        ? Promise.resolve(1)
        : this.prisma.membership.count({
            where: { workspaceId, status: 'ACTIVE' },
          }),
    ]);
    let activeProjectsCount = 0;
    let totalProjectsCount = 0;
    if (scopeRes.mode === 'ALL') {
      if (this.prisma.project?.count) {
        [activeProjectsCount, totalProjectsCount] = await Promise.all([
          this.prisma.project.count({ where: { workspaceId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
          this.prisma.project.count({ where: { workspaceId } }),
        ]);
      }
    } else if (this.prisma.project?.findMany) {
      const allowedIdSet = new Set(scopeRes.memberIds || []);
      const [rawProj, ws] = await Promise.all([
        this.prisma.project.findMany({
          where: { workspaceId },
          include: { tasks: { select: { assigneeMembershipId: true } } },
        }),
        this.prisma.workspace?.findUnique
          ? this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } }).catch(() => null)
          : Promise.resolve(null),
      ]);
      const allMeta = ((ws?.settings as any)?.projectMetadata || {}) as Record<string, any>;
      const effScope = userContext ? resolveEffectiveScope(userContext) : 'ASSIGNED';
      const visibleProj = (rawProj || []).filter((p: any) => {
        const meta = allMeta[p.id] || {};
        if (meta.managerMembershipId && allowedIdSet.has(meta.managerMembershipId)) return true;
        if (Array.isArray(meta.memberMembershipIds) && meta.memberMembershipIds.some((id: string) => allowedIdSet.has(id))) return true;
        if (effScope === 'DEPARTMENT' && userContext?.departmentId && meta.departmentId === userContext.departmentId) return true;
        return Array.isArray(p.tasks) && p.tasks.some((tk: any) => tk.assigneeMembershipId && allowedIdSet.has(tk.assigneeMembershipId));
      });
      totalProjectsCount = visibleProj.length;
      activeProjectsCount = visibleProj.filter((p: any) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').length;
    }

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgressTasks = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const todoTasks = allTasks.filter((t) => t.status === 'TODO').length;
    const inReviewTasks = allTasks.filter((t) => t.status === 'IN_REVIEW').length;
    const now = new Date();
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED',
    ).length;

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

    // 2. Work Items / Operations Queue
    const workItemWhere: any = {
      workspaceId,
      createdAt: { gte: start, lte: end },
      ...applyMemFilter('assignedMembershipId'),
    };

    const workItems = await this.prisma.workItem.findMany({
      where: workItemWhere,
      select: {
        id: true,
        status: true,
        priority: true,
        quantity: true,
        processedQuantity: true,
        qaScore: true,
      },
    });

    const totalWorkItems = workItems.length;
    const completedWorkItems = workItems.filter((w) => w.status === 'COMPLETED').length;
    const pendingWorkItems = workItems.filter((w) => w.status === 'PENDING').length;
    const processingWorkItems = workItems.filter((w) => w.status === 'PROCESSING').length;
    const qaReviewWorkItems = workItems.filter((w) => w.status === 'QA_REVIEW').length;
    const reworkWorkItems = workItems.filter((w) => w.status === 'REWORK').length;

    // 3. Time & Attendance Records
    const attendanceWhere: any = {
      workspaceId,
      date: { gte: start, lte: end },
      ...applyMemFilter('membershipId'),
    };

    const attendances = await this.prisma.attendance.findMany({
      where: attendanceWhere,
      select: {
        id: true,
        date: true,
        totalWorkMinutes: true,
        status: true,
        clockOut: true,
      },
    });

    const totalWorkMinutes = attendances.reduce((acc, a) => acc + (a.totalWorkMinutes || 0), 0);
    const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
    const attendanceCount = attendances.length;
    const averageDailyHours = attendanceCount > 0 ? Math.round((totalWorkHours / attendanceCount) * 10) / 10 : 0;

    // Check today presence
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayAttendances = await this.prisma.attendance.findMany({
      where: {
        workspaceId,
        date: { gte: startOfToday, lte: endOfToday },
        ...applyMemFilter('membershipId'),
      },
      select: {
        id: true,
        membershipId: true,
        clockOut: true,
      },
    });

    const presentTodayCount = new Set(todayAttendances.map((a) => a.membershipId)).size;
    const activeClockedInCount = todayAttendances.filter((a) => !a.clockOut).length;

    // 4. Leave Requests
    const leaveWhere: any = {
      workspaceId,
      startDate: { lte: end },
      endDate: { gte: start },
      ...applyMemFilter('membershipId'),
    };

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: leaveWhere,
      select: {
        id: true,
        leaveType: true,
        status: true,
        totalDays: true,
        startDate: true,
        endDate: true,
      },
    });

    const totalLeaveRequests = leaveRequests.length;
    const pendingLeaveCount = leaveRequests.filter((l) => l.status === 'PENDING').length;
    const approvedLeaveCount = leaveRequests.filter((l) => l.status === 'APPROVED').length;
    const onLeaveTodayCount = leaveRequests.filter(
      (l) => l.status === 'APPROVED' && new Date(l.startDate) <= endOfToday && new Date(l.endDate) >= startOfToday,
    ).length;

    // 5. Quality Scorecard & SLA
    const qualityWhere: any = {
      workspaceId,
      reviewedAt: { gte: start, lte: end },
    };

    const rawQualityReviews: any[] =
      scopeRes.mode === 'ALL'
        ? await this.prisma.qualityReview.findMany({
            where: qualityWhere,
            select: {
              id: true,
              score: true,
              maxScore: true,
              passStatus: true,
            },
          })
        : await this.prisma.qualityReview.findMany({
            where: qualityWhere,
            include: {
              workItem: { select: { assignedMembershipId: true } },
            },
          });
    const allowedIdSet = scopeRes.memberIds ? new Set(scopeRes.memberIds) : null;
    const qualityReviews =
      scopeRes.mode === 'ALL' || !allowedIdSet
        ? rawQualityReviews
        : rawQualityReviews.filter((q: any) =>
            allowedIdSet.has(q.reviewerMembershipId) ||
            (q.workItem?.assignedMembershipId && allowedIdSet.has(q.workItem.assignedMembershipId)),
          );

    const totalQualityReviews = qualityReviews.length;
    const sumQualityScores = qualityReviews.reduce((acc, q) => acc + (q.score / (q.maxScore || 100)) * 100, 0);
    const averageQualityScore =
      totalQualityReviews > 0 ? Math.round((sumQualityScores / totalQualityReviews) * 10) / 10 : null;
    const passedQualityAudits = qualityReviews.filter((q) => q.passStatus === 'PASSED').length;
    const reworkRequiredAudits = qualityReviews.filter((q) => q.passStatus === 'REWORK_REQUIRED' || q.passStatus === 'FAILED').length;

    // SLA health
    const slaBreachedItems = overdueTasks;
    const slaHealthPercentage =
      totalTasks > 0 ? Math.round(((totalTasks - slaBreachedItems) / totalTasks) * 1000) / 10 : 100.0;

    // 6. Assets & Inventory
    const assets = await this.prisma.asset.findMany({
      where: {
        workspaceId,
        ...applyMemFilter('assignedToMembershipId'),
      },
      select: {
        id: true,
        status: true,
      },
    });

    const totalAssets = assets.length;
    const assignedAssets = assets.filter((a) => a.status === 'ASSIGNED').length;
    const availableAssets = assets.filter((a) => a.status === 'AVAILABLE').length;
    const underMaintenanceAssets = assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length;
    const assetUtilizationRate = totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 1000) / 10 : 0;

    const attendanceRate = totalMembersCount > 0
      ? Math.round((presentTodayCount / totalMembersCount) * 1000) / 10
      : (attendanceCount > 0 ? 100.0 : 0.0);

    return {
      workspaceId,
      userRole,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      kpis: {
        projects: {
          active: activeProjectsCount,
          total: totalProjectsCount,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          todo: todoTasks,
          inReview: inReviewTasks,
          overdue: overdueTasks,
          completionRate: taskCompletionRate,
        },
        workItems: {
          total: totalWorkItems,
          completed: completedWorkItems,
          pending: pendingWorkItems,
          processing: processingWorkItems,
          qaReview: qaReviewWorkItems,
          rework: reworkWorkItems,
        },
        attendance: {
          totalSessions: attendanceCount,
          totalWorkHours,
          averageDailyHours,
          presentToday: presentTodayCount,
          activeClockedIn: activeClockedInCount,
          totalMembers: totalMembersCount,
          attendanceRate,
        },
        leave: {
          totalRequests: totalLeaveRequests,
          pending: pendingLeaveCount,
          approved: approvedLeaveCount,
          onLeaveToday: onLeaveTodayCount,
        },
        quality: {
          totalAudits: totalQualityReviews,
          averageScore: averageQualityScore,
          passedAudits: passedQualityAudits,
          reworkRequired: reworkRequiredAudits,
          slaHealthPercentage,
          slaBreaches: slaBreachedItems,
        },
        assets: {
          total: totalAssets,
          assigned: assignedAssets,
          available: availableAssets,
          maintenance: underMaintenanceAssets,
          utilizationRate: assetUtilizationRate,
        },
      },
      metricDefinitions: this.getMetricDefinitions(),
    };
  }

  // ---------------------------------------------------------------------------
  // UNIVERSAL CALENDAR MULTI-LAYER AGGREGATION
  // ---------------------------------------------------------------------------
  async getCalendarEvents(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    filters: {
      startDate?: string;
      endDate?: string;
      layers?: string[];
      memberId?: string;
    } = {},
    userContext?: any,
  ) {
    const start = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = filters.endDate ? new Date(filters.endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    end.setHours(23, 59, 59, 999);

    const scopeRes = await this.resolveAnalyticsMemberIds(workspaceId, membershipId, userRole, filters, userContext);
    const applyMemFilter = (field: string) => {
      if (scopeRes.mode === 'SINGLE' && scopeRes.memberId) return { [field]: scopeRes.memberId };
      if (scopeRes.mode === 'LIST' && scopeRes.memberIds) return { [field]: { in: scopeRes.memberIds } };
      return {};
    };
    const activeLayers = filters.layers && filters.layers.length > 0
      ? filters.layers.map((l) => l.toUpperCase())
      : ['ATTENDANCE', 'SHIFTS', 'LEAVE', 'TASKS', 'QUALITY'];

    const events: Array<{
      id: string;
      title: string;
      type: string;
      layer: string;
      startDate: string;
      endDate: string;
      allDay: boolean;
      status: string;
      color: string;
      entityType: string;
      entityId: string;
      details?: any;
    }> = [];

    // Layer 1: Attendance Sessions
    if (activeLayers.includes('ATTENDANCE')) {
      const attWhere: any = {
        workspaceId,
        date: { gte: start, lte: end },
        ...applyMemFilter('membershipId'),
      };

      const attendances = await this.prisma.attendance.findMany({
        where: attWhere,
        include: {
          membership: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { clockIn: 'asc' },
      });

      for (const a of attendances) {
        const hours = (a.totalWorkMinutes / 60).toFixed(1);
        events.push({
          id: `att-${a.id}`,
          title: `${a.membership?.user?.firstName || 'User'}: ${hours}h (${a.status})`,
          type: 'ATTENDANCE_SESSION',
          layer: 'ATTENDANCE',
          startDate: a.clockIn.toISOString(),
          endDate: (a.clockOut || a.clockIn).toISOString(),
          allDay: false,
          status: a.status,
          color: a.status === 'LATE' ? '#f59e0b' : '#10b981',
          entityType: 'ATTENDANCE',
          entityId: a.id,
          details: {
            memberName: `${a.membership?.user?.firstName} ${a.membership?.user?.lastName}`,
            workMinutes: a.totalWorkMinutes,
            notes: a.notes,
          },
        });
      }
    }

    // Layer 2: Shifts & Work Schedules
    if (activeLayers.includes('SHIFTS')) {
      const shifts = await this.prisma.shift.findMany({
        where: { workspaceId },
      });

      for (const s of shifts) {
        events.push({
          id: `shift-${s.id}`,
          title: `Shift: ${s.name} (${s.startTime} - ${s.endTime})`,
          type: 'WORK_SHIFT',
          layer: 'SHIFTS',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          allDay: true,
          status: 'ACTIVE',
          color: '#3b82f6',
          entityType: 'SHIFT',
          entityId: s.id,
          details: {
            workDays: s.workDays,
            hours: `${s.startTime} - ${s.endTime}`,
          },
        });
      }
    }

    // Layer 3: Leave Requests
    if (activeLayers.includes('LEAVE')) {
      const leaveWhere: any = {
        workspaceId,
        startDate: { lte: end },
        endDate: { gte: start },
        ...applyMemFilter('membershipId'),
      };

      const leaves = await this.prisma.leaveRequest.findMany({
        where: leaveWhere,
        include: {
          membership: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      for (const l of leaves) {
        events.push({
          id: `leave-${l.id}`,
          title: `${l.membership?.user?.firstName || 'Member'} — ${l.leaveType} (${l.totalDays}d)`,
          type: 'LEAVE_REQUEST',
          layer: 'LEAVE',
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
          allDay: true,
          status: l.status,
          color: l.status === 'APPROVED' ? '#f59e0b' : '#9ca3af',
          entityType: 'LEAVE',
          entityId: l.id,
          details: {
            memberName: `${l.membership?.user?.firstName} ${l.membership?.user?.lastName}`,
            reason: l.reason,
            days: l.totalDays,
          },
        });
      }
    }

    // Layer 4: Tasks & Work Item Deadlines
    if (activeLayers.includes('TASKS')) {
      const taskWhere: any = {
        workspaceId,
        ...applyMemFilter('assigneeMembershipId'),
        OR: [
          { dueDate: { gte: start, lte: end } },
          { startDate: { gte: start, lte: end } },
          { createdAt: { gte: start, lte: end } },
          { AND: [{ dueDate: null }, { status: { notIn: ['COMPLETED', 'CANCELLED'] } }] },
        ],
      };

      const tasks = await this.prisma.task.findMany({
        where: taskWhere,
        include: {
          project: { select: { name: true } },
          assignee: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      for (const t of tasks) {
        const taskDate = t.dueDate || (t as any).startDate || t.createdAt || new Date();
        const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH';
        const dateIso = taskDate.toISOString();
        const prefix = t.dueDate ? 'Due' : 'Task';
        events.push({
          id: `task-${t.id}`,
          title: `${prefix}: ${t.title} [${t.priority}]`,
          type: 'TASK_DEADLINE',
          layer: 'TASKS',
          startDate: dateIso,
          endDate: (t.dueDate || taskDate).toISOString(),
          allDay: true,
          status: t.status,
          color: isUrgent ? '#ef4444' : '#8b5cf6',
          entityType: 'TASK',
          entityId: t.id,
          details: {
            projectName: t.project?.name || 'General',
            assigneeName: t.assignee?.user ? `${t.assignee.user.firstName} ${t.assignee.user.lastName}` : 'Unassigned',
            priority: t.priority,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          },
        });
      }
    }

    // Layer 5: Quality Audits
    if (activeLayers.includes('QUALITY')) {
      const qualityWhere: any = {
        workspaceId,
        reviewedAt: { gte: start, lte: end },
      };

      const rawReviews: any[] = await this.prisma.qualityReview.findMany({
        where: qualityWhere,
        include: {
          workItem: { select: { title: true, batchId: true, assignedMembershipId: true } },
          reviewer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });
      const allowedIdSet = scopeRes.memberIds ? new Set(scopeRes.memberIds) : null;
      const reviews =
        scopeRes.mode === 'ALL' || !allowedIdSet
          ? rawReviews
          : rawReviews.filter((q: any) =>
              allowedIdSet.has(q.reviewerMembershipId) ||
              (q.workItem?.assignedMembershipId && allowedIdSet.has(q.workItem.assignedMembershipId)),
            );

      for (const q of reviews) {
        events.push({
          id: `qa-${q.id}`,
          title: `QA Audit: ${q.workItem?.title || 'Batch'} (${q.score}%)`,
          type: 'QUALITY_AUDIT',
          layer: 'QUALITY',
          startDate: q.reviewedAt.toISOString(),
          endDate: q.reviewedAt.toISOString(),
          allDay: false,
          status: q.passStatus,
          color: q.passStatus === 'PASSED' ? '#06b6d4' : '#f43f5e',
          entityType: 'QUALITY',
          entityId: q.id,
          details: {
            reviewerName: `${q.reviewer?.user?.firstName} ${q.reviewer?.user?.lastName}`,
            score: q.score,
            feedback: q.feedback,
          },
        });
      }
    }

    // Layer 6: Meetings & Calendar Events
    try {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      });
      const settings = (ws?.settings as Record<string, any>) || {};
      const storedEvts: any[] = settings.calendarEvents || [];
      const allowedIdSet = scopeRes.memberIds ? new Set(scopeRes.memberIds) : null;
      for (const ce of storedEvts) {
        if (scopeRes.mode !== 'ALL' && allowedIdSet) {
          const isCompanyWide = ce.audience === 'ALL' || ce.type === 'COMPANY_EVENT' || ce.type === 'HOLIDAY';
          const participantHit = Array.isArray(ce.participants) && ce.participants.some((p: any) => allowedIdSet.has(p.membershipId));
          const orgHit = ce.organizerMembershipId && allowedIdSet.has(ce.organizerMembershipId);
          if (!isCompanyWide && !participantHit && !orgHit) continue;
        }
        const ceStart = new Date(ce.startDate);
        const ceEnd = new Date(ce.endDate || ce.startDate);
        if (ceStart <= end && ceEnd >= start && ce.status !== 'CANCELLED') {
          events.push({
            id: ce.id,
            title: ce.title,
            type: ce.type || 'MEETING',
            layer: ce.type === 'MEETING' ? 'MEETINGS' : 'COMPANY_EVENTS',
            startDate: ce.startDate,
            endDate: ce.endDate,
            allDay: Boolean(ce.allDay),
            status: ce.status || 'CONFIRMED',
            color: ce.type === 'MEETING' ? '#3b82f6' : '#ec4899',
            entityType: 'MEETING',
            entityId: ce.id,
            details: {
              locationUrl: ce.locationUrl,
              description: ce.description,
              participants: ce.participants,
              organizerName: ce.organizerName,
            },
          });
        }
      }
    } catch {}

    return {
      workspaceId,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      layers: activeLayers,
      totalEvents: events.length,
      events,
    };
  }

  // ---------------------------------------------------------------------------
  // DRILL-DOWN DATA REPORTS WITH RELIABLE FILTERING
  // ---------------------------------------------------------------------------
  async getDrilldown(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    category: string,
    filters: {
      startDate?: string;
      endDate?: string;
      status?: string;
      priority?: string;
      memberId?: string;
      search?: string;
      scope?: string;
      limit?: number;
      offset?: number;
    } = {},
    userContext?: any,
  ) {
    const start = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const scopeRes = await this.resolveAnalyticsMemberIds(workspaceId, membershipId, userRole, filters, userContext);
    const applyMemFilter = (field: string) => {
      if (scopeRes.mode === 'SINGLE' && scopeRes.memberId) return { [field]: scopeRes.memberId };
      if (scopeRes.mode === 'LIST' && scopeRes.memberIds) return { [field]: { in: scopeRes.memberIds } };
      return {};
    };

    const limit = Number(filters.limit) || 50;
    const offset = Number(filters.offset) || 0;

    switch (category.toLowerCase()) {
      case 'tasks': {
        const where: any = {
          workspaceId,
          createdAt: { gte: start, lte: end },
          ...applyMemFilter('assigneeMembershipId'),
        };
        if (filters.status && filters.status !== 'ALL') {
          if (filters.status === 'OVERDUE') {
            where.dueDate = { lt: new Date() };
            where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
          } else {
            where.status = filters.status;
          }
        }
        if (filters.priority && filters.priority !== 'ALL') where.priority = filters.priority;
        if (filters.search) {
          where.title = { contains: filters.search, mode: 'insensitive' };
        }

        const [items, total] = await Promise.all([
          this.prisma.task.findMany({
            where,
            include: {
              project: { select: { id: true, name: true, key: true } },
              assignee: {
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          this.prisma.task.count({ where }),
        ]);

        return {
          category: 'tasks',
          total,
          limit,
          offset,
          items: items.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            projectName: t.project?.name || 'General',
            assigneeName: t.assignee?.user ? `${t.assignee.user.firstName} ${t.assignee.user.lastName}` : 'Unassigned',
            assigneeEmail: t.assignee?.user?.email,
            createdAt: t.createdAt,
          })),
        };
      }

      case 'attendance': {
        const where: any = {
          workspaceId,
          date: { gte: start, lte: end },
          ...applyMemFilter('membershipId'),
        };
        if (filters.status && filters.status !== 'ALL') where.status = filters.status;

        const [items, total] = await Promise.all([
          this.prisma.attendance.findMany({
            where,
            include: {
              membership: {
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
              },
            },
            orderBy: { clockIn: 'desc' },
            take: limit,
            skip: offset,
          }),
          this.prisma.attendance.count({ where }),
        ]);

        return {
          category: 'attendance',
          total,
          limit,
          offset,
          items: items.map((a) => ({
            id: a.id,
            date: a.date,
            clockIn: a.clockIn,
            clockOut: a.clockOut,
            totalWorkMinutes: a.totalWorkMinutes,
            totalWorkHours: Math.round((a.totalWorkMinutes / 60) * 10) / 10,
            status: a.status,
            notes: a.notes,
            memberName: a.membership?.user ? `${a.membership.user.firstName} ${a.membership.user.lastName}` : 'Member',
            memberEmail: a.membership?.user?.email,
          })),
        };
      }

      case 'leave': {
        const where: any = {
          workspaceId,
          startDate: { lte: end },
          endDate: { gte: start },
          ...applyMemFilter('membershipId'),
        };
        if (filters.status && filters.status !== 'ALL') where.status = filters.status;

        const [items, total] = await Promise.all([
          this.prisma.leaveRequest.findMany({
            where,
            include: {
              membership: {
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          this.prisma.leaveRequest.count({ where }),
        ]);

        return {
          category: 'leave',
          total,
          limit,
          offset,
          items: items.map((l) => ({
            id: l.id,
            leaveType: l.leaveType,
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: l.totalDays,
            reason: l.reason,
            status: l.status,
            memberName: l.membership?.user ? `${l.membership.user.firstName} ${l.membership.user.lastName}` : 'Member',
            memberEmail: l.membership?.user?.email,
            createdAt: l.createdAt,
          })),
        };
      }

      case 'quality': {
        const where: any = {
          workspaceId,
          reviewedAt: { gte: start, lte: end },
        };
        if (filters.status && filters.status !== 'ALL') where.passStatus = filters.status;

        let items: any[] = [];
        let total = 0;
        if (scopeRes.mode === 'ALL') {
          [items, total] = await Promise.all([
            this.prisma.qualityReview.findMany({
              where,
              include: {
                workItem: { select: { id: true, title: true, batchId: true } },
                reviewer: {
                  include: { user: { select: { firstName: true, lastName: true, email: true } } },
                },
              },
              orderBy: { reviewedAt: 'desc' },
              take: limit,
              skip: offset,
            }),
            this.prisma.qualityReview.count({ where }),
          ]);
        } else {
          const allowedIdSet = new Set(scopeRes.memberIds || []);
          const rawItems = await this.prisma.qualityReview.findMany({
            where,
            include: {
              workItem: { select: { id: true, title: true, batchId: true, assignedMembershipId: true } },
              reviewer: {
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
              },
            },
            orderBy: { reviewedAt: 'desc' },
          });
          const filtered = (rawItems || []).filter((q: any) =>
            allowedIdSet.has(q.reviewerMembershipId) ||
            (q.workItem?.assignedMembershipId && allowedIdSet.has(q.workItem.assignedMembershipId)),
          );
          total = filtered.length;
          items = filtered.slice(offset, offset + limit);
        }

        return {
          category: 'quality',
          total,
          limit,
          offset,
          items: items.map((q) => ({
            id: q.id,
            workItemTitle: q.workItem?.title || 'General Batch',
            score: q.score,
            maxScore: q.maxScore,
            passStatus: q.passStatus,
            feedback: q.feedback,
            reviewerName: q.reviewer?.user ? `${q.reviewer.user.firstName} ${q.reviewer.user.lastName}` : 'Reviewer',
            reviewerEmail: q.reviewer?.user?.email,
            reviewedAt: q.reviewedAt,
          })),
        };
      }

      case 'assets': {
        const where: any = { workspaceId, ...applyMemFilter('assignedToMembershipId') };
        if (filters.status && filters.status !== 'ALL') where.status = filters.status;
        if (filters.search) {
          where.name = { contains: filters.search, mode: 'insensitive' };
        }

        const [items, total] = await Promise.all([
          this.prisma.asset.findMany({
            where,
            include: {
              assignedTo: {
                include: { user: { select: { firstName: true, lastName: true, email: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          this.prisma.asset.count({ where }),
        ]);

        return {
          category: 'assets',
          total,
          limit,
          offset,
          items: items.map((a) => ({
            id: a.id,
            name: a.name,
            assetTag: a.assetTag,
            serialNumber: a.serialNumber,
            category: a.category,
            status: a.status,
            cost: a.cost,
            assignedToName: a.assignedTo?.user ? `${a.assignedTo.user.firstName} ${a.assignedTo.user.lastName}` : 'Unassigned',
            assignedToEmail: a.assignedTo?.user?.email,
            createdAt: a.createdAt,
          })),
        };
      }

      case 'projects': {
        const where: any = { workspaceId };
        if (filters.status && filters.status !== 'ALL') {
          if (filters.status === 'ACTIVE') {
            where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
          } else {
            where.status = filters.status;
          }
        }
        if (filters.search) {
          where.name = { contains: filters.search, mode: 'insensitive' };
        }

        let items: any[] = [];
        let total = 0;
        if (this.prisma.project?.findMany) {
          if (scopeRes.mode === 'ALL') {
            [items, total] = await Promise.all([
              this.prisma.project.findMany({
                where,
                include: {
                  client: { select: { name: true } },
                  tasks: { select: { id: true, status: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
              }),
              this.prisma.project.count({ where }),
            ]);
          } else {
            const allowedIdSet = new Set(scopeRes.memberIds || []);
            const [rawProjects, ws] = await Promise.all([
              this.prisma.project.findMany({
                where,
                include: {
                  client: { select: { name: true } },
                  tasks: { select: { id: true, status: true, assigneeMembershipId: true } },
                },
                orderBy: { createdAt: 'desc' },
              }),
              this.prisma.workspace?.findUnique
                ? this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } }).catch(() => null)
                : Promise.resolve(null),
            ]);
            const allMeta = ((ws?.settings as any)?.projectMetadata || {}) as Record<string, any>;
            const effScope = userContext ? resolveEffectiveScope(userContext) : 'ASSIGNED';
            const filtered = (rawProjects || []).filter((p: any) => {
              const meta = allMeta[p.id] || {};
              if (meta.managerMembershipId && allowedIdSet.has(meta.managerMembershipId)) return true;
              if (Array.isArray(meta.memberMembershipIds) && meta.memberMembershipIds.some((id: string) => allowedIdSet.has(id))) return true;
              if (effScope === 'DEPARTMENT' && userContext?.departmentId && meta.departmentId === userContext.departmentId) return true;
              return Array.isArray(p.tasks) && p.tasks.some((t: any) => t.assigneeMembershipId && allowedIdSet.has(t.assigneeMembershipId));
            });
            total = filtered.length;
            items = filtered.slice(offset, offset + limit);
          }
        }

        return {
          category: 'projects',
          total,
          limit,
          offset,
          items: items.map((p) => {
            const totalT = p.tasks?.length || 0;
            const compT = p.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
            const progress = totalT > 0 ? Math.round((compT / totalT) * 100) : 0;
            return {
              id: p.id,
              name: p.name,
              key: p.key,
              status: p.status,
              priority: p.priority || 'MEDIUM',
              progress,
              totalTasks: totalT,
              completedTasks: compT,
              clientName: p.client?.name || 'Internal',
              startDate: p.startDate,
              targetDate: p.endDate || null,
              createdAt: p.createdAt,
            };
          }),
        };
      }

      default:
        throw new BadRequestException(`Unsupported drilldown category: ${category}. Supported categories: tasks, attendance, leave, quality, assets, projects`);
    }
  }

  // ---------------------------------------------------------------------------
  // SECURE EXPORT GENERATION (CSV & JSON) WITHOUT DATA LEAKAGE
  // ---------------------------------------------------------------------------
  async exportData(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    category: string,
    format: 'json' | 'csv' = 'json',
    filters: any = {},
    userContext?: any,
  ) {
    const drilldown = await this.getDrilldown(workspaceId, membershipId, userRole, category, {
      ...filters,
      limit: 1000, // Export up to 1000 rows
      offset: 0,
    }, userContext);

    if (format === 'json') {
      return {
        exportDate: new Date().toISOString(),
        workspaceId,
        category,
        totalRecords: drilldown.total,
        data: drilldown.items,
      };
    }

    // Generate CSV
    const items = drilldown.items;
    if (items.length === 0) {
      return 'No records available for export in the selected range.\n';
    }

    const headers = Object.keys(items[0]);
    const csvRows = [headers.join(',')];

    for (const item of items) {
      const row = headers.map((header) => {
        const val = item[header];
        if (val === null || val === undefined) return '""';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        // Escape quotes
        return `"${str.replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
}
