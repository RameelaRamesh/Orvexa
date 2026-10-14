import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
    } = {},
  ) {
    const isManagerOrAdmin = ['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(userRole);

    // Date Range Scoping
    const start = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    // Ensure end date covers end of that day
    end.setHours(23, 59, 59, 999);

    const targetMembershipId = isManagerOrAdmin && filters.memberId ? filters.memberId : (!isManagerOrAdmin ? membershipId : undefined);

    // 1. Task Queries
    const taskWhere: any = {
      workspaceId,
      createdAt: { gte: start, lte: end },
    };
    if (targetMembershipId) {
      taskWhere.assigneeMembershipId = targetMembershipId;
    }
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
      this.prisma.membership.count({
        where: { workspaceId, status: 'ACTIVE' },
      }),
    ]);

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
    };
    if (targetMembershipId) {
      workItemWhere.assignedMembershipId = targetMembershipId;
    }

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
    };
    if (targetMembershipId) {
      attendanceWhere.membershipId = targetMembershipId;
    }

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
    };
    if (targetMembershipId) {
      leaveWhere.membershipId = targetMembershipId;
    }

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

    const qualityReviews = await this.prisma.qualityReview.findMany({
      where: qualityWhere,
      select: {
        id: true,
        score: true,
        maxScore: true,
        passStatus: true,
      },
    });

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
      where: { workspaceId },
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

    return {
      workspaceId,
      userRole,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      kpis: {
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
  ) {
    const isManagerOrAdmin = ['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(userRole);
    const start = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = filters.endDate ? new Date(filters.endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    const targetMembershipId = isManagerOrAdmin && filters.memberId ? filters.memberId : (!isManagerOrAdmin ? membershipId : undefined);
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
      };
      if (targetMembershipId) attWhere.membershipId = targetMembershipId;

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
      };
      if (targetMembershipId) leaveWhere.membershipId = targetMembershipId;

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
        dueDate: { gte: start, lte: end },
      };
      if (targetMembershipId) taskWhere.assigneeMembershipId = targetMembershipId;

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
        if (!t.dueDate) continue;
        const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH';
        events.push({
          id: `task-${t.id}`,
          title: `Due: ${t.title} [${t.priority}]`,
          type: 'TASK_DEADLINE',
          layer: 'TASKS',
          startDate: t.dueDate.toISOString(),
          endDate: t.dueDate.toISOString(),
          allDay: true,
          status: t.status,
          color: isUrgent ? '#ef4444' : '#8b5cf6',
          entityType: 'TASK',
          entityId: t.id,
          details: {
            projectName: t.project?.name || 'General',
            assigneeName: t.assignee?.user ? `${t.assignee.user.firstName} ${t.assignee.user.lastName}` : 'Unassigned',
            priority: t.priority,
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

      const reviews = await this.prisma.qualityReview.findMany({
        where: qualityWhere,
        include: {
          workItem: { select: { title: true, batchId: true } },
          reviewer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });

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
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const isManagerOrAdmin = ['OWNER', 'ADMIN', 'MANAGER', 'HR'].includes(userRole);
    const start = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const targetMembershipId = isManagerOrAdmin && filters.memberId ? filters.memberId : (!isManagerOrAdmin ? membershipId : undefined);
    const limit = Number(filters.limit) || 50;
    const offset = Number(filters.offset) || 0;

    switch (category.toLowerCase()) {
      case 'tasks': {
        const where: any = {
          workspaceId,
          createdAt: { gte: start, lte: end },
        };
        if (targetMembershipId) where.assigneeMembershipId = targetMembershipId;
        if (filters.status && filters.status !== 'ALL') where.status = filters.status;
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
        };
        if (targetMembershipId) where.membershipId = targetMembershipId;
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
        };
        if (targetMembershipId) where.membershipId = targetMembershipId;
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

        const [items, total] = await Promise.all([
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
        const where: any = { workspaceId };
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

      default:
        throw new BadRequestException(`Unsupported drilldown category: ${category}. Supported categories: tasks, attendance, leave, quality, assets`);
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
  ) {
    const drilldown = await this.getDrilldown(workspaceId, membershipId, userRole, category, {
      ...filters,
      limit: 1000, // Export up to 1000 rows
      offset: 0,
    });

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
