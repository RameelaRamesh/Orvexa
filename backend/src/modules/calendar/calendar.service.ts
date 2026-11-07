import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  RsvpDto,
  CreateCompanyHolidayDto,
  CalendarEventType,
  RsvpStatus,
} from './calendar.dto';

export interface CalendarEventItem {
  id: string;
  title: string;
  type: string;
  layer: 'MEETINGS' | 'TASKS' | 'HOLIDAYS' | 'LEAVE' | 'SHIFTS' | 'COMPANY_EVENTS';
  startDate: string;
  endDate: string;
  allDay: boolean;
  status: string;
  color: string;
  locationUrl?: string;
  description?: string;
  organizer?: {
    id: string;
    name: string;
    email?: string;
  };
  participants?: Array<{
    membershipId: string;
    userId?: string;
    name: string;
    email?: string;
    status: string;
    respondedAt?: string;
  }>;
  departmentId?: string;
  departmentName?: string;
  teamId?: string;
  teamName?: string;
  audience?: string;
  recurrence?: string;
  reminderMinutes?: number;
  canEdit?: boolean;
  details?: Record<string, any>;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 1. TAMIL NADU PUBLIC HOLIDAYS CATALOG
  // ---------------------------------------------------------------------------
  public getTamilNaduPublicHolidays(year: number): Array<{
    id: string;
    name: string;
    date: string;
    dayOfWeek: string;
    type: 'PUBLIC_HOLIDAY';
    isOptional: boolean;
    description: string;
  }> {
    const holidays = [
      { month: 1, day: 1, name: "New Year's Day", desc: 'Public Holiday across Tamil Nadu' },
      { month: 1, day: 14, name: 'Pongal / Makar Sankranti', desc: 'Harvest festival celebrated across Tamil Nadu' },
      { month: 1, day: 15, name: 'Thiruvalluvar Day', desc: 'Honoring the classical Tamil poet and philosopher' },
      { month: 1, day: 16, name: 'Uzhavar Thirunal / Farmers Day', desc: 'Day of thanksgiving for agriculture' },
      { month: 1, day: 26, name: 'Republic Day', desc: 'National Holiday' },
      { month: 3, day: 20, name: 'Eid ul-Fitr / Ramzan', desc: 'Islamic religious festival' },
      { month: 4, day: 3, name: 'Good Friday', desc: 'Christian religious observance' },
      { month: 4, day: 14, name: 'Tamil New Year (Puthandu) & Ambedkar Jayanti', desc: 'Tamil solar calendar commencement' },
      { month: 5, day: 1, name: 'May Day (Labor Day)', desc: 'International Workers Day' },
      { month: 5, day: 27, name: 'Bakrid / Eid al-Adha', desc: 'Islamic religious observance' },
      { month: 6, day: 26, name: 'Muharram', desc: 'Islamic New Year observance' },
      { month: 8, day: 15, name: 'Independence Day', desc: 'National Holiday celebrating Indian independence' },
      { month: 8, day: 26, name: 'Krishna Jayanthi', desc: 'Celebration of Lord Krishna birth' },
      { month: 9, day: 5, name: 'Milad-un-Nabi', desc: 'Prophet Muhammad birthday observance' },
      { month: 10, day: 2, name: 'Gandhi Jayanti', desc: 'National Holiday commemorating Mahatma Gandhi' },
      { month: 10, day: 19, name: 'Ayutha Pooja / Saraswathi Pooja', desc: 'Worship of tools, wisdom and learning' },
      { month: 10, day: 20, name: 'Vijaya Dasami', desc: 'Triumph of righteousness and auspicious beginnings' },
      { month: 11, day: 8, name: 'Deepavali (Diwali)', desc: 'Festival of Lights' },
      { month: 11, day: 13, name: 'Diwali (Holiday Observance)', desc: 'Workspace holiday observance' },
      { month: 12, day: 25, name: 'Christmas Day', desc: 'Christian festival celebrating the birth of Jesus' },
    ];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return holidays.map((h, idx) => {
      const dateObj = new Date(Date.UTC(year, h.month - 1, h.day));
      const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
      return {
        id: `pub_tn_${year}_${idx + 1}`,
        name: h.name,
        date: dateStr,
        dayOfWeek: dayNames[dateObj.getUTCDay()],
        type: 'PUBLIC_HOLIDAY',
        isOptional: false,
        description: h.desc,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 2. HELPER: RESOLVE USER MEMBERSHIP & PERMISSIONS
  // ---------------------------------------------------------------------------
  private async resolveUserContext(workspaceId: string, membershipId: string, userRole: string) {
    const membership: any = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: {
        user: true,
        department: true,
        team: true,
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const accessRole = (membership?.accessRole || userRole || 'MEMBER').toUpperCase();
    const isOwnerOrAdmin = accessRole === 'OWNER' || accessRole === 'ADMIN' || accessRole.includes('OWNER') || accessRole.includes('ADMIN');
    const isManager = accessRole === 'MANAGER' || accessRole.includes('MANAGER');
    const isLead = accessRole.includes('LEAD');

    // Extract permission codes
    const permCodes: string[] = [];
    if (membership?.role?.permissions) {
      for (const rp of membership.role.permissions) {
        if (rp.permission?.code) permCodes.push(rp.permission.code);
      }
    }

    const hasPerm = (code: string) => isOwnerOrAdmin || permCodes.includes(code);

    return {
      membership,
      accessRole,
      isOwnerOrAdmin,
      isManager,
      isLead,
      canViewAll: isOwnerOrAdmin || hasPerm('calendar:view:all'),
      canViewDept: isOwnerOrAdmin || isManager || hasPerm('calendar:view:department'),
      canViewTeam: isOwnerOrAdmin || isManager || isLead || hasPerm('calendar:view:team'),
      canViewSchedules: isOwnerOrAdmin || hasPerm('calendar:view:schedules'),
      canCreate: true, // all authenticated members can schedule meetings
      canManageHolidays: isOwnerOrAdmin || hasPerm('calendar:holidays:manage'),
      departmentId: membership?.departmentId,
      teamId: membership?.teamId,
      userName: membership?.user ? `${membership.user.firstName} ${membership.user.lastName}`.trim() : 'User',
      userEmail: membership?.user?.email || '',
    };
  }

  // ---------------------------------------------------------------------------
  // 3. UNIFIED CALENDAR EVENTS RETRIEVAL WITH PERMISSION-BASED VISIBILITY
  // ---------------------------------------------------------------------------
  async getEvents(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    filters: {
      startDate?: string;
      endDate?: string;
      search?: string;
      type?: string;
      departmentId?: string;
      teamId?: string;
      status?: string;
      layers?: string[];
      scope?: string;
      memberIds?: string[];
    } = {},
  ): Promise<{ workspaceId: string; events: CalendarEventItem[]; metadata: Record<string, any> }> {
    const userCtx = await this.resolveUserContext(workspaceId, membershipId, userRole);

    const now = new Date();
    const start = filters.startDate ? new Date(filters.startDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = filters.endDate ? new Date(filters.endDate) : new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    end.setHours(23, 59, 59, 999);

    const scope = (filters.scope || 'MY_SCHEDULE').toUpperCase();

    const events: CalendarEventItem[] = [];

    // --- A. MEETINGS & CUSTOM COMPANY EVENTS ---
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as Record<string, any>) || {};
    const storedCalendarEvents: any[] = settings.calendarEvents || [];

    let inMemEvents: any[] = [];
    try {
      inMemEvents = await (this.prisma as any).calendarEvent.findMany({ where: { workspaceId } });
    } catch {
      inMemEvents = [];
    }

    const allCustomEvents = [...storedCalendarEvents];
    for (const ime of inMemEvents) {
      if (!allCustomEvents.some((e) => e.id === ime.id)) {
        allCustomEvents.push(ime);
      }
    }

    const liveCustomEvents = allCustomEvents.filter((e) => !e.id?.startsWith('evt_seed_') && !e.id?.startsWith('seed_') && !e.id?.includes('seed'));
    for (const evt of liveCustomEvents) {
      if (evt.status === 'CANCELLED' && filters.status !== 'CANCELLED') continue;

      const evtStart = new Date(evt.startDate);
      const evtEnd = new Date(evt.endDate || evt.startDate);

      if (evtStart > end || evtEnd < start) continue;

      // Visibility & Scope checking
      let isVisible = false;
      const isCompanyWide = evt.audience === 'ALL' || evt.type === 'COMPANY_EVENT' || evt.type === 'HOLIDAY';

      if (isCompanyWide) {
        isVisible = true; // Company wide events always visible in all scopes
      } else if (scope === 'MY_SCHEDULE') {
        isVisible = evt.organizerMembershipId === membershipId ||
          (evt.participants && evt.participants.some((p: any) => p.membershipId === membershipId));
      } else if (scope === 'MY_TEAM' && userCtx.teamId) {
        isVisible = evt.teamId === userCtx.teamId ||
          evt.organizerMembershipId === membershipId ||
          (evt.participants && evt.participants.some((p: any) => p.membershipId === membershipId));
      } else if (scope === 'MY_DEPARTMENT' && userCtx.departmentId) {
        isVisible = evt.departmentId === userCtx.departmentId ||
          evt.organizerMembershipId === membershipId ||
          (evt.participants && evt.participants.some((p: any) => p.membershipId === membershipId));
      } else if (scope === 'SELECT_PEOPLE' && filters.memberIds && filters.memberIds.length > 0) {
        isVisible = filters.memberIds.includes(evt.organizerMembershipId) ||
          (evt.participants && evt.participants.some((p: any) => filters.memberIds!.includes(p.membershipId)));
      } else if (scope === 'ENTIRE_WORKSPACE' && (userCtx.canViewAll || userCtx.isOwnerOrAdmin)) {
        isVisible = true;
      } else {
        isVisible = evt.organizerMembershipId === membershipId ||
          (evt.participants && evt.participants.some((p: any) => p.membershipId === membershipId));
      }

      if (!isVisible) continue;

      const isMeeting = evt.type === 'MEETING' || evt.type === CalendarEventType.MEETING;
      const isOrganizer = evt.organizerMembershipId === membershipId;
      const canEdit = isOrganizer || userCtx.isOwnerOrAdmin;

      events.push({
        id: evt.id,
        title: evt.title,
        type: evt.type || 'MEETING',
        layer: isMeeting ? 'MEETINGS' : 'COMPANY_EVENTS',
        startDate: evt.startDate,
        endDate: evt.endDate,
        allDay: Boolean(evt.allDay),
        status: evt.status || 'CONFIRMED',
        color: isMeeting ? '#3b82f6' : '#ec4899',
        locationUrl: evt.locationUrl,
        description: evt.description,
        organizer: {
          id: evt.organizerMembershipId,
          name: evt.organizerName || 'Organizer',
          email: evt.organizerEmail,
        },
        participants: evt.participants || [],
        departmentId: evt.departmentId,
        departmentName: evt.departmentName,
        teamId: evt.teamId,
        teamName: evt.teamName,
        audience: evt.audience,
        recurrence: evt.recurrence,
        reminderMinutes: evt.reminderMinutes,
        canEdit,
        details: {
          participantCount: evt.participants ? evt.participants.length : 0,
          room: evt.locationUrl,
        },
      });
    }

    // --- B. TASKS & DEADLINES (MULTI-DAY TASK CONTINUITY) ---
    try {
      const taskWhere: any = { workspaceId };

      if (scope === 'MY_SCHEDULE') {
        taskWhere.OR = [
          { assigneeMembershipId: membershipId },
          { assignee: { userId: userCtx.membership?.userId } },
        ];
      } else if (scope === 'MY_TEAM' && userCtx.teamId) {
        taskWhere.assignee = { teamId: userCtx.teamId };
      } else if (scope === 'MY_DEPARTMENT' && userCtx.departmentId) {
        taskWhere.assignee = { departmentId: userCtx.departmentId };
      } else if (scope === 'SELECT_PEOPLE' && filters.memberIds && filters.memberIds.length > 0) {
        taskWhere.assigneeMembershipId = { in: filters.memberIds };
      } else if (scope === 'ENTIRE_WORKSPACE' && (userCtx.canViewAll || userCtx.isOwnerOrAdmin)) {
        // all workspace tasks
      } else {
        taskWhere.assigneeMembershipId = membershipId;
      }

      const [tasks, workspaceMemberships] = await Promise.all([
        this.prisma.task.findMany({
          where: taskWhere,
          include: {
            project: { select: { id: true, name: true } },
            assignee: {
              include: { user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } } },
            },
          },
        }),
        this.prisma.membership.findMany({
          where: { workspaceId },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            team: { select: { name: true } },
            department: { select: { name: true } },
          },
        }),
      ]);

      for (const t of tasks) {
        if (t.id?.startsWith('task_seed_') || t.id?.startsWith('seed_') || t.id?.includes('seed')) continue;

        const sla = (t.sla as any) || {};
        const rawStart = sla.startDate || (t as any).startDate || (t.dueDate ? t.dueDate : t.createdAt) || new Date();
        const rawEnd = t.dueDate || rawStart;

        const taskStartDate = new Date(rawStart);
        const taskEndDate = new Date(rawEnd);
        if (isNaN(taskStartDate.getTime()) || isNaN(taskEndDate.getTime())) continue;

        const validStart = taskStartDate <= taskEndDate ? taskStartDate : taskEndDate;
        const validEnd = taskStartDate <= taskEndDate ? taskEndDate : taskStartDate;

        // Multi-day overlap check: task start must be before calendar end, and task end must be after calendar start
        if (validStart > end || validEnd < start) continue;

        const creatorId = sla.creatorMembershipId || (t as any).creatorMembershipId || (t as any).createdByMembershipId;
        let assignerName = '';
        if (creatorId) {
          const creatorMem = workspaceMemberships.find((m: any) => m.id === creatorId || m.userId === creatorId);
          if (creatorMem?.user?.firstName) {
            assignerName = `${creatorMem.user.firstName} ${creatorMem.user.lastName}`.trim();
          }
        }
        if (!assignerName) {
          const lead = workspaceMemberships.find((m: any) => m.accessRole === 'MANAGER' || m.accessRole === 'OWNER' || m.accessRole === 'ADMIN');
          if (lead?.user?.firstName) {
            assignerName = `${lead.user.firstName} ${lead.user.lastName}`.trim();
          }
        }

        const isOverdue = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate).getTime() < Date.now();
        const assigneeName = t.assignee?.user
          ? `${t.assignee.user.firstName} ${t.assignee.user.lastName}`.trim()
          : (t as any).assigneeName || 'Unassigned';

        const progress = sla.progress !== undefined
          ? sla.progress
          : (t.status === 'COMPLETED' ? 100 : t.status === 'IN_PROGRESS' ? 25 : 0);

        let color = '#8b5cf6'; // purple default
        if (t.status === 'COMPLETED') {
          color = '#10b981'; // emerald green
        } else if (isOverdue) {
          color = '#ef4444'; // red
        } else if (t.status === 'IN_REVIEW') {
          color = '#f59e0b'; // amber
        } else if (t.status === 'IN_PROGRESS') {
          color = '#3b82f6'; // blue
        }

        events.push({
          id: `task-${t.id}`,
          title: t.title,
          type: 'TASK',
          layer: 'TASKS',
          startDate: validStart.toISOString(),
          endDate: validEnd.toISOString(),
          allDay: true,
          status: t.status || 'TODO',
          color,
          description: t.description,
          details: {
            taskId: t.id,
            projectId: t.projectId || t.project?.id || null,
            projectName: t.project?.name || (t as any).projectName || 'Standalone',
            priority: t.priority || 'MEDIUM',
            assigneeName,
            assigneeId: t.assigneeMembershipId,
            assignerName,
            creatorMembershipId: creatorId,
            dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate : (t.dueDate as any).toISOString()) : null,
            startDate: validStart.toISOString(),
            deadline: t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate : (t.dueDate as any).toISOString()) : null,
            progress,
            isOverdue,
            isMyTask: t.assigneeMembershipId === membershipId || userCtx.membership?.userId === (t as any).assignee?.userId,
            hasDueDate: Boolean(t.dueDate),
          },
        });
      }
    } catch (e: any) {
      this.logger.warn(`Error aggregating tasks for calendar: ${e.message}`);
    }

    // --- C. PUBLIC HOLIDAYS (TAMIL NADU) ---
    const yearsToCheck = Array.from(
      new Set([start.getFullYear(), end.getFullYear(), 2026]),
    );

    for (const yr of yearsToCheck) {
      const pubHolidays = this.getTamilNaduPublicHolidays(yr);
      for (const h of pubHolidays) {
        const hDate = new Date(`${h.date}T00:00:00.000Z`);
        if (hDate >= start && hDate <= end) {
          events.push({
            id: h.id,
            title: h.name,
            type: 'HOLIDAY',
            layer: 'HOLIDAYS',
            startDate: `${h.date}T00:00:00.000Z`,
            endDate: `${h.date}T23:59:59.999Z`,
            allDay: true,
            status: 'OFFICIAL',
            color: '#10b981',
            description: h.description,
            details: {
              region: 'Tamil Nadu, India',
              category: 'Public Holiday',
              dayOfWeek: h.dayOfWeek,
            },
          });
        }
      }
    }

    // --- D. COMPANY HOLIDAYS ---
    const companyHolidays: any[] = settings.companyHolidays || [];
    try {
      const dbHolidays = await this.prisma.holiday.findMany({ where: { workspaceId } });
      for (const dh of dbHolidays) {
        if (!companyHolidays.some((ch) => ch.id === dh.id)) {
          companyHolidays.push(dh);
        }
      }
    } catch {}

    const cleanCompanyHolidays = companyHolidays.filter((ch) => !ch.id?.startsWith('hol_seed_') && !ch.id?.startsWith('seed_') && !ch.id?.includes('seed'));
    for (const ch of cleanCompanyHolidays) {
      const cDate = new Date(ch.date);
      if (cDate >= start && cDate <= end) {
        events.push({
          id: `comp_hol_${ch.id}`,
          title: ch.name,
          type: 'HOLIDAY',
          layer: 'HOLIDAYS',
          startDate: typeof ch.date === 'string' ? ch.date : cDate.toISOString(),
          endDate: ch.endDate ? ch.endDate : (typeof ch.date === 'string' ? ch.date : cDate.toISOString()),
          allDay: true,
          status: 'COMPANY',
          color: '#059669',
          description: ch.description || 'Company Holiday',
          canEdit: userCtx.canManageHolidays,
          details: {
            category: 'Company Holiday',
            isOptional: Boolean(ch.isOptional),
            isWorkingDay: Boolean(ch.isWorkingDay),
          },
        });
      }
    }

    // --- E. LEAVE REQUESTS ---
    try {
      const leaveWhere: any = {
        workspaceId,
        startDate: { lte: end },
        endDate: { gte: start },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      };

      if (!userCtx.canViewAll) {
        if (userCtx.canViewDept && userCtx.departmentId) {
          // Department leave
          leaveWhere.OR = [
            { membershipId },
            { membership: { departmentId: userCtx.departmentId } },
          ];
        } else if (userCtx.canViewTeam && userCtx.teamId) {
          // Team leave
          leaveWhere.OR = [
            { membershipId },
            { membership: { teamId: userCtx.teamId } },
          ];
        } else {
          // Strictly user's own leave
          leaveWhere.membershipId = membershipId;
        }
      }

      const leaves = await this.prisma.leaveRequest.findMany({
        where: leaveWhere,
        include: {
          membership: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      for (const l of leaves) {
        if (l.id?.startsWith('leave_seed_') || l.id?.startsWith('seed_') || l.id?.includes('seed')) continue;
        const memberName = l.membership?.user
          ? `${l.membership.user.firstName} ${l.membership.user.lastName}`.trim()
          : 'Team Member';

        const isOwn = l.membershipId === membershipId;
        // Do not expose private medical reason to others
        const displayReason = isOwn || userCtx.isOwnerOrAdmin ? l.reason : 'Out of Office';

        events.push({
          id: `leave-${l.id}`,
          title: `Leave: ${memberName} (${l.leaveType})`,
          type: 'LEAVE',
          layer: 'LEAVE',
          startDate: new Date(l.startDate).toISOString(),
          endDate: new Date(l.endDate).toISOString(),
          allDay: true,
          status: l.status,
          color: '#f59e0b',
          description: displayReason,
          details: {
            memberName,
            leaveType: l.leaveType,
            days: l.totalDays,
            isMyLeave: isOwn,
          },
        });
      }
    } catch (e: any) {
      this.logger.warn(`Error aggregating leaves for calendar: ${e.message}`);
    }

    // --- F. WORK SHIFTS ---
    try {
      const shifts = await this.prisma.shift.findMany({
        where: { workspaceId },
      });

      for (const s of shifts) {
        events.push({
          id: `shift-${s.id}`,
          title: `${s.name} (${s.startTime} - ${s.endTime})`,
          type: 'SHIFT',
          layer: 'SHIFTS',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          allDay: true,
          status: 'ACTIVE',
          color: '#06b6d4',
          details: {
            workDays: s.workDays,
            startTime: s.startTime,
            endTime: s.endTime,
          },
        });
      }
    } catch (e: any) {
      this.logger.warn(`Error aggregating shifts: ${e.message}`);
    }

    // Apply client filters if specified
    let filteredEvents = events;

    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      filteredEvents = filteredEvents.filter((e) => {
        return (
          e.title.toLowerCase().includes(s) ||
          (e.description && e.description.toLowerCase().includes(s)) ||
          (e.organizer?.name && e.organizer.name.toLowerCase().includes(s)) ||
          (e.details?.memberName && e.details.memberName.toLowerCase().includes(s)) ||
          (e.details?.assigneeName && e.details.assigneeName.toLowerCase().includes(s)) ||
          (e.teamName && e.teamName.toLowerCase().includes(s))
        );
      });
    }

    if (filters.type) {
      const t = filters.type.toUpperCase();
      filteredEvents = filteredEvents.filter((e) => e.type.toUpperCase() === t || e.layer.toUpperCase() === t);
    }

    return {
      workspaceId,
      events: filteredEvents,
      metadata: {
        totalEvents: filteredEvents.length,
        userRole: userCtx.accessRole,
        canCreate: userCtx.canCreate,
        canManageHolidays: userCtx.canManageHolidays,
        region: 'Tamil Nadu, India',
        filtersApplied: filters,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 4. CREATE CALENDAR EVENT / SCHEDULE MEETING
  // ---------------------------------------------------------------------------
  async createEvent(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    dto: CreateCalendarEventDto,
  ): Promise<CalendarEventItem> {
    const userCtx = await this.resolveUserContext(workspaceId, membershipId, userRole);

    if (dto.audience === 'ALL' && !userCtx.canViewAll && !userCtx.isManager) {
      throw new ForbiddenException('Only managers and administrators can schedule company-wide events');
    }

    // Resolve participants
    const participants: Array<{
      membershipId: string;
      userId?: string;
      name: string;
      email?: string;
      status: string;
    }> = [];

    // Always include creator as accepted
    participants.push({
      membershipId,
      userId: userCtx.membership?.userId,
      name: userCtx.userName,
      email: userCtx.userEmail,
      status: RsvpStatus.ACCEPTED,
    });

    // Populate invited participants
    let invitedMembershipIds = dto.participantIds || [];

    // If Entire Organization / Open to All audience, expand all active members
    if (dto.audience === 'ALL') {
      const allMembers = await this.prisma.membership.findMany({
        where: { workspaceId, status: 'ACTIVE' },
        include: { user: true },
      });
      for (const am of allMembers) {
        if (!invitedMembershipIds.includes(am.id) && am.id !== membershipId) {
          invitedMembershipIds.push(am.id);
        }
      }
    }

    // If department audience, expand members of that department
    if (dto.audience === 'DEPARTMENT' && dto.departmentId) {
      const deptMembers = await this.prisma.membership.findMany({
        where: { workspaceId, departmentId: dto.departmentId, status: 'ACTIVE' },
        include: { user: true },
      });
      for (const dm of deptMembers) {
        if (!invitedMembershipIds.includes(dm.id) && dm.id !== membershipId) {
          invitedMembershipIds.push(dm.id);
        }
      }
    }

    // If team audience, expand members of that team
    if (dto.audience === 'TEAM' && dto.teamId) {
      const teamMembers = await this.prisma.membership.findMany({
        where: { workspaceId, teamId: dto.teamId, status: 'ACTIVE' },
        include: { user: true },
      });
      for (const tm of teamMembers) {
        if (!invitedMembershipIds.includes(tm.id) && tm.id !== membershipId) {
          invitedMembershipIds.push(tm.id);
        }
      }
    }

    if (invitedMembershipIds.length > 0) {
      const members = await this.prisma.membership.findMany({
        where: { id: { in: invitedMembershipIds } },
        include: { user: true },
      });

      for (const m of members) {
        if (m.id === membershipId) continue;
        participants.push({
          membershipId: m.id,
          userId: m.userId,
          name: m.user ? `${m.user.firstName} ${m.user.lastName}`.trim() : 'Participant',
          email: m.user?.email,
          status: RsvpStatus.PENDING,
        });
      }
    }

    // Resolve team / department names if supplied
    let departmentName: string | undefined;
    let teamName: string | undefined;

    if (dto.departmentId) {
      const d = await this.prisma.department.findUnique({ where: { id: dto.departmentId } }).catch(() => null);
      if (d) departmentName = d.name;
    }
    if (dto.teamId) {
      const t = await this.prisma.team.findUnique({ where: { id: dto.teamId } }).catch(() => null);
      if (t) teamName = t.name;
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEvent = {
      id: eventId,
      workspaceId,
      title: dto.title.trim(),
      type: dto.type || CalendarEventType.MEETING,
      description: dto.description?.trim(),
      startDate: dto.startDate,
      endDate: dto.endDate,
      allDay: Boolean(dto.allDay),
      locationUrl: dto.locationUrl?.trim(),
      reminderMinutes: dto.reminderMinutes || 15,
      recurrence: dto.recurrence || 'NONE',
      audience: dto.audience || 'INDIVIDUALS',
      departmentId: dto.departmentId,
      departmentName,
      teamId: dto.teamId,
      teamName,
      organizerMembershipId: membershipId,
      organizerName: userCtx.userName,
      organizerEmail: userCtx.userEmail,
      participants,
      status: 'CONFIRMED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to workspace settings
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as Record<string, any>) || {};
    const existingEvents: any[] = settings.calendarEvents || [];
    existingEvents.push(newEvent);

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          calendarEvents: existingEvents,
        },
      },
    }).catch((err) => {
      this.logger.warn(`Could not persist to workspace.settings: ${err.message}`);
    });

    // Also persist in-memory fallback
    try {
      await (this.prisma as any).calendarEvent.create({ data: newEvent });
    } catch {}

    // Send notifications to participants
    for (const p of participants) {
      if (p.membershipId === membershipId) continue;
      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId: p.membershipId,
          title: `New Calendar Invitation: ${newEvent.title}`,
          message: `${userCtx.userName} invited you to "${newEvent.title}" on ${new Date(newEvent.startDate).toLocaleDateString()}.`,
          link: '/app/calendar',
        },
      }).catch(() => null);
    }

    return {
      id: newEvent.id,
      title: newEvent.title,
      type: newEvent.type,
      layer: newEvent.type === 'MEETING' ? 'MEETINGS' : 'COMPANY_EVENTS',
      startDate: newEvent.startDate,
      endDate: newEvent.endDate,
      allDay: newEvent.allDay,
      status: newEvent.status,
      color: newEvent.type === 'MEETING' ? '#3b82f6' : '#ec4899',
      locationUrl: newEvent.locationUrl,
      description: newEvent.description,
      organizer: {
        id: newEvent.organizerMembershipId,
        name: newEvent.organizerName,
        email: newEvent.organizerEmail,
      },
      participants: newEvent.participants,
      departmentId: newEvent.departmentId,
      departmentName: newEvent.departmentName,
      teamId: newEvent.teamId,
      teamName: newEvent.teamName,
      audience: newEvent.audience,
      recurrence: newEvent.recurrence,
      reminderMinutes: newEvent.reminderMinutes,
      canEdit: true,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. UPDATE CALENDAR EVENT
  // ---------------------------------------------------------------------------
  async updateEvent(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    eventId: string,
    dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventItem> {
    const userCtx = await this.resolveUserContext(workspaceId, membershipId, userRole);

    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as Record<string, any>) || {};
    const events: any[] = settings.calendarEvents || [];

    const idx = events.findIndex((e) => e.id === eventId);
    if (idx === -1) {
      throw new NotFoundException(`Calendar event with id ${eventId} not found`);
    }

    const existing = events[idx];
    if (existing.organizerMembershipId !== membershipId && !userCtx.isOwnerOrAdmin) {
      throw new ForbiddenException('Only the organizer or an administrator can modify this event');
    }

    const updated = {
      ...existing,
      ...dto,
      title: dto.title !== undefined ? dto.title.trim() : existing.title,
      updatedAt: new Date(),
    };

    events[idx] = updated;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          calendarEvents: events,
        },
      },
    }).catch(() => null);

    // Notify participants of changes
    if (updated.participants) {
      for (const p of updated.participants) {
        if (p.membershipId === membershipId) continue;
        await this.prisma.notification.create({
          data: {
            workspaceId,
            recipientMembershipId: p.membershipId,
            title: `Event Updated: ${updated.title}`,
            message: `Details for "${updated.title}" have been updated by ${userCtx.userName}.`,
            link: '/app/calendar',
          },
        }).catch(() => null);
      }
    }

    return {
      id: updated.id,
      title: updated.title,
      type: updated.type,
      layer: updated.type === 'MEETING' ? 'MEETINGS' : 'COMPANY_EVENTS',
      startDate: updated.startDate,
      endDate: updated.endDate,
      allDay: updated.allDay,
      status: updated.status,
      color: updated.type === 'MEETING' ? '#3b82f6' : '#ec4899',
      locationUrl: updated.locationUrl,
      description: updated.description,
      organizer: {
        id: updated.organizerMembershipId,
        name: updated.organizerName,
        email: updated.organizerEmail,
      },
      participants: updated.participants,
      canEdit: true,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. DELETE / CANCEL EVENT
  // ---------------------------------------------------------------------------
  async deleteEvent(workspaceId: string, membershipId: string, userRole: string, eventId: string) {
    const userCtx = await this.resolveUserContext(workspaceId, membershipId, userRole);

    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as Record<string, any>) || {};
    const events: any[] = settings.calendarEvents || [];

    const existing = events.find((e) => e.id === eventId);
    if (!existing) {
      throw new NotFoundException(`Calendar event with id ${eventId} not found`);
    }

    if (existing.organizerMembershipId !== membershipId && !userCtx.isOwnerOrAdmin) {
      throw new ForbiddenException('Only the organizer or an administrator can delete this event');
    }

    const remaining = events.filter((e) => e.id !== eventId);

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          calendarEvents: remaining,
        },
      },
    }).catch(() => null);

    // Notify participants
    if (existing.participants) {
      for (const p of existing.participants) {
        if (p.membershipId === membershipId) continue;
        await this.prisma.notification.create({
          data: {
            workspaceId,
            recipientMembershipId: p.membershipId,
            title: `Event Cancelled: ${existing.title}`,
            message: `"${existing.title}" scheduled for ${new Date(existing.startDate).toLocaleDateString()} was cancelled.`,
            link: '/app/calendar',
          },
        }).catch(() => null);
      }
    }

    return { success: true, message: `Event ${existing.title} successfully cancelled` };
  }

  // ---------------------------------------------------------------------------
  // 7. RSVP PARTICIPANT RESPONSE
  // ---------------------------------------------------------------------------
  async respondRsvp(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    eventId: string,
    dto: RsvpDto,
  ) {
    const userCtx = await this.resolveUserContext(workspaceId, membershipId, userRole);

    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as Record<string, any>) || {};
    const events: any[] = settings.calendarEvents || [];

    const event = events.find((e) => e.id === eventId);
    if (!event) {
      throw new NotFoundException(`Calendar event with id ${eventId} not found`);
    }

    if (!event.participants) event.participants = [];

    let participant = event.participants.find((p: any) => p.membershipId === membershipId);
    if (!participant) {
      participant = {
        membershipId,
        userId: userCtx.membership?.userId,
        name: userCtx.userName,
        email: userCtx.userEmail,
        status: dto.status,
        respondedAt: new Date().toISOString(),
      };
      event.participants.push(participant);
    } else {
      participant.status = dto.status;
      participant.respondedAt = new Date().toISOString();
    }

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          calendarEvents: events,
        },
      },
    }).catch(() => null);

    // Notify organizer
    if (event.organizerMembershipId && event.organizerMembershipId !== membershipId) {
      const responseAction =
        dto.status === RsvpStatus.ACCEPTED
          ? 'accepted'
          : dto.status === RsvpStatus.DECLINED
          ? 'declined'
          : 'tentatively accepted';

      await this.prisma.notification.create({
        data: {
          workspaceId,
          recipientMembershipId: event.organizerMembershipId,
          title: `RSVP Response: ${event.title}`,
          message: `${userCtx.userName} has ${responseAction} your invitation.`,
          link: '/app/calendar',
        },
      }).catch(() => null);
    }

    return {
      eventId,
      status: dto.status,
      participant,
      participants: event.participants,
    };
  }

  // ---------------------------------------------------------------------------
  // 8. HOLIDAYS RETRIEVAL & MANAGEMENT
  // ---------------------------------------------------------------------------
  async getHolidays(workspaceId: string, year?: number) {
    const yr = year || new Date().getFullYear();
    const publicHolidays = this.getTamilNaduPublicHolidays(yr);

    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as Record<string, any>) || {};
    const companyHolidays: any[] = settings.companyHolidays || [];

    return {
      workspaceId,
      year: yr,
      region: 'Tamil Nadu, India',
      publicHolidays,
      companyHolidays,
      total: publicHolidays.length + companyHolidays.length,
    };
  }

  async createCompanyHoliday(
    workspaceId: string,
    membershipId: string,
    userRole: string,
    dto: CreateCompanyHolidayDto,
  ) {
    const userCtx = await this.resolveUserContext(workspaceId, membershipId, userRole);
    if (!userCtx.canManageHolidays) {
      throw new ForbiddenException('Only HR and Administrators can configure company holidays');
    }

    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as Record<string, any>) || {};
    const companyHolidays: any[] = settings.companyHolidays || [];

    const newHoliday = {
      id: `chol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: dto.name.trim(),
      date: dto.date,
      endDate: dto.endDate || dto.date,
      description: dto.description?.trim(),
      isOptional: Boolean(dto.isOptional),
      isWorkingDay: Boolean(dto.isWorkingDay),
      createdAt: new Date(),
    };

    companyHolidays.push(newHoliday);

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          companyHolidays,
        },
      },
    }).catch(() => null);

    try {
      await this.prisma.holiday.create({
        data: {
          workspaceId,
          name: newHoliday.name,
          date: new Date(newHoliday.date),
          isOptional: newHoliday.isOptional,
        },
      });
    } catch {}

    return newHoliday;
  }

  async deleteCompanyHoliday(workspaceId: string, membershipId: string, userRole: string, id: string) {
    const userCtx = await this.resolveUserContext(workspaceId, membershipId, userRole);
    if (!userCtx.canManageHolidays) {
      throw new ForbiddenException('Only HR and Administrators can delete company holidays');
    }

    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings = (ws?.settings as Record<string, any>) || {};
    const companyHolidays: any[] = settings.companyHolidays || [];

    const remaining = companyHolidays.filter((h) => h.id !== id);

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          companyHolidays: remaining,
        },
      },
    }).catch(() => null);

    return { success: true, message: 'Holiday deleted successfully' };
  }
}
