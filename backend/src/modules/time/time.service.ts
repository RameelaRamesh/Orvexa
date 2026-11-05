import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalStatus, AttendanceStatus } from '@prisma/client';

export interface AttendancePolicy {
  allowMultipleSessionsPerDay: boolean;
  maxDailySessions: number;
  allowMultipleBreaks: boolean;
  maxBreakMinutesPerDay: number;
  gracePeriodMinutes: number;
  halfDayMinutes: number;
  fullDayMinutes: number;
  overtimeThresholdMinutes: number;
  autoCloseMissedCheckoutHours: number;
  overnightShiftEnabled: boolean;
  requireShiftAssignment: boolean;
  trackTimezone: boolean;
}

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  allowMultipleSessionsPerDay: true,
  maxDailySessions: 5,
  allowMultipleBreaks: true,
  maxBreakMinutesPerDay: 120,
  gracePeriodMinutes: 15,
  halfDayMinutes: 240, // 4 hours
  fullDayMinutes: 480, // 8 hours
  overtimeThresholdMinutes: 480, // 8 hours
  autoCloseMissedCheckoutHours: 16,
  overnightShiftEnabled: true,
  requireShiftAssignment: false,
  trackTimezone: true,
};

@Injectable()
export class TimeService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // MODULE ENTITLEMENT & POLICY ENGINE
  // ---------------------------------------------------------------------------

  private async ensureAttendanceEnabled(workspaceId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const enabledModules = settings.enabledModules;
    if (Array.isArray(enabledModules) && enabledModules.length > 0) {
      const isEnabled = enabledModules.includes('attendance') || enabledModules.includes('time');
      if (!isEnabled) {
        throw new BadRequestException(
          'Attendance & Shifts module is disabled for this workspace in Settings.',
        );
      }
    }
  }

  async getAttendancePolicy(workspaceId: string): Promise<AttendancePolicy> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    return {
      ...DEFAULT_ATTENDANCE_POLICY,
      ...(settings.attendancePolicy || {}),
    };
  }

  async updateAttendancePolicy(
    workspaceId: string,
    policyUpdates: Partial<AttendancePolicy>,
  ): Promise<AttendancePolicy> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const currentPolicy = settings.attendancePolicy || {};
    const updatedPolicy = {
      ...DEFAULT_ATTENDANCE_POLICY,
      ...currentPolicy,
      ...policyUpdates,
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          attendancePolicy: updatedPolicy,
        },
      },
    });

    return updatedPolicy;
  }

  // ---------------------------------------------------------------------------
  // ATTENDANCE EVENT MODELING & STATE TRANSITIONS
  // ---------------------------------------------------------------------------

  /**
   * Clock-In with multi-session support, race-condition protection, shift association & late arrival checking
   */
  async clockIn(
    workspaceId: string,
    membershipId: string,
    options?: { notes?: string; source?: string; timezone?: string; shiftId?: string } | string,
  ) {
    await this.ensureAttendanceEnabled(workspaceId);

    // Auto-resolve any abandoned sessions from previous days first
    await this.autoCloseMissedCheckouts(workspaceId);

    const notesStr = typeof options === 'string' ? options : options?.notes;
    const source = typeof options === 'object' ? options?.source || 'WEB' : 'WEB';
    const timezone = typeof options === 'object' ? options?.timezone || 'UTC' : 'UTC';
    const explicitShiftId = typeof options === 'object' ? options?.shiftId : undefined;

    const policy = await this.getAttendancePolicy(workspaceId);

    // 1. Race-condition & Active Session Guard
    const active = await this.prisma.attendance.findFirst({
      where: {
        workspaceId,
        membershipId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
      include: { breaks: true },
    });

    if (active) {
      // Idempotency check: if session was created in the last 3 seconds (e.g. accidental double-click), return it safely
      const ageMs = Date.now() - new Date(active.clockIn).getTime();
      if (ageMs < 3000) {
        return active;
      }
      throw new BadRequestException('Member is already clocked in and active. Must clock out before starting a new session.');
    }

    // 2. Today's Session Boundary & Multi-Session Policy Check
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const todaySessions = await this.prisma.attendance.findMany({
      where: {
        workspaceId,
        membershipId,
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { clockIn: 'asc' },
    });

    if (todaySessions.length > 0) {
      if (!policy.allowMultipleSessionsPerDay) {
        throw new BadRequestException(
          'Organisation policy permits only one work session per day. You have already completed a session today.',
        );
      }
      if (todaySessions.length >= policy.maxDailySessions) {
        throw new BadRequestException(
          `Maximum daily work sessions limit reached (${policy.maxDailySessions} sessions allowed per day).`,
        );
      }
    }

    // 3. Shift Association & Late Arrival Detection
    const shift = await this.resolveMemberShift(workspaceId, membershipId, explicitShiftId);
    let isLate = false;
    let lateMinutes = 0;

    if (shift && shift.startTime) {
      const [shiftHour, shiftMinute] = shift.startTime.split(':').map(Number);
      const shiftStartTimeToday = new Date(now);
      shiftStartTimeToday.setHours(shiftHour, shiftMinute, 0, 0);

      const gracePeriodMs = policy.gracePeriodMinutes * 60 * 1000;
      const lateThreshold = new Date(shiftStartTimeToday.getTime() + gracePeriodMs);

      // Only check late arrival on the day's primary/first session
      if (todaySessions.length === 0 && now > lateThreshold) {
        isLate = true;
        lateMinutes = Math.round((now.getTime() - shiftStartTimeToday.getTime()) / (60 * 1000));
      }
    }

    // 4. Leave & Holiday Overlap Verification
    const onLeave = await this.checkLeaveOverlap(workspaceId, membershipId, now);
    const isHoliday = await this.checkHoliday(workspaceId, now);

    const sessionIndex = todaySessions.length + 1;
    const metadata = {
      sessionIndex,
      source,
      timezone,
      shiftId: shift?.id || null,
      shiftName: shift?.name || 'General',
      isLate,
      lateMinutes,
      isOnLeave: !!onLeave,
      isHolidayWork: !!isHoliday,
    };

    const combinedNotes = [
      notesStr ? notesStr.trim() : null,
      `[META:${JSON.stringify(metadata)}]`,
    ]
      .filter(Boolean)
      .join(' ');

    const newAttendance = await this.prisma.attendance.create({
      data: {
        workspaceId,
        membershipId,
        date: now,
        clockIn: now,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        notes: combinedNotes,
      },
      include: { breaks: true },
    });

    // 5. Deduplicated Reminder / Notification on Late Arrival
    if (isLate) {
      await this.sendAttendanceNotification(
        workspaceId,
        membershipId,
        'Late Arrival Recorded',
        `Clock-in at ${now.toLocaleTimeString()} was ${lateMinutes} minutes past the scheduled shift start (${shift?.startTime || '09:00'}).`,
        'WARNING',
        `late-${now.toISOString().split('T')[0]}`,
      );
    }

    return {
      ...newAttendance,
      metadata,
    };
  }

  /**
   * Clock-Out with automatic break closure, elapsed duration calculation & early departure detection
   */
  async clockOut(
    workspaceId: string,
    membershipId: string,
    options?: { notes?: string; source?: string } | string,
  ) {
    await this.ensureAttendanceEnabled(workspaceId);

    const notesStr = typeof options === 'string' ? options : options?.notes;
    const policy = await this.getAttendancePolicy(workspaceId);

    const active = await this.prisma.attendance.findFirst({
      where: {
        workspaceId,
        membershipId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
      include: { breaks: true },
    });

    if (!active) {
      throw new NotFoundException('No active clock-in session found to clock out');
    }

    const clockOutTime = new Date();

    // Chronological validation
    if (clockOutTime < new Date(active.clockIn)) {
      throw new BadRequestException('Clock-out timestamp cannot be prior to clock-in timestamp');
    }

    // 1. Auto-close any currently open break
    const openBreak = active.breaks.find((b) => !b.breakEnd);
    if (openBreak) {
      const breakDuration = Math.max(
        1,
        Math.round((clockOutTime.getTime() - new Date(openBreak.breakStart).getTime()) / (1000 * 60)),
      );
      await this.prisma.attendanceBreak.update({
        where: { id: openBreak.id },
        data: {
          breakEnd: clockOutTime,
          durationMinutes: breakDuration,
        },
      });
    }

    // 2. Fetch all completed breaks and sum total break minutes
    const allBreaks = await this.prisma.attendanceBreak.findMany({
      where: { attendanceId: active.id },
    });
    const totalBreakMinutes = allBreaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);

    // 3. Accurate Work Duration Across Midnight / Timezones
    const grossWorkMinutes = Math.round(
      (clockOutTime.getTime() - new Date(active.clockIn).getTime()) / (1000 * 60),
    );
    const netWorkMinutes = Math.max(0, grossWorkMinutes - totalBreakMinutes);

    // 4. Status determination & early departure
    let finalStatus = active.status;
    if (finalStatus !== AttendanceStatus.LATE) {
      if (netWorkMinutes < policy.halfDayMinutes && netWorkMinutes > 0) {
        finalStatus = AttendanceStatus.HALF_DAY;
      } else {
        finalStatus = AttendanceStatus.PRESENT;
      }
    }

    // Append checkout notes
    let updatedNotes = active.notes || '';
    if (notesStr) {
      updatedNotes = `${updatedNotes} [OUT: ${notesStr.trim()}]`.trim();
    }

    const updated = await this.prisma.attendance.update({
      where: { id: active.id },
      data: {
        clockOut: clockOutTime,
        totalWorkMinutes: netWorkMinutes,
        totalBreakMinutes,
        status: finalStatus,
        notes: updatedNotes,
      },
      include: { breaks: true },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // BREAK TRACKING (MULTIPLE BREAKS & DURATION RECALCULATION)
  // ---------------------------------------------------------------------------

  async startBreak(workspaceId: string, membershipId: string, breakType?: string, notes?: string) {
    await this.ensureAttendanceEnabled(workspaceId);
    const policy = await this.getAttendancePolicy(workspaceId);

    const activeAttendance = await this.prisma.attendance.findFirst({
      where: { workspaceId, membershipId, clockOut: null },
      orderBy: { clockIn: 'desc' },
      include: { breaks: true },
    });

    if (!activeAttendance) {
      throw new BadRequestException('Must be actively clocked in to start a break');
    }

    const openBreak = activeAttendance.breaks.find((b) => !b.breakEnd);
    if (openBreak) {
      throw new BadRequestException('A break is already in progress. End current break before starting another.');
    }

    if (!policy.allowMultipleBreaks && activeAttendance.breaks.length > 0) {
      throw new BadRequestException('Organisation policy allows only one break per work session.');
    }

    return this.prisma.attendanceBreak.create({
      data: {
        attendanceId: activeAttendance.id,
        breakStart: new Date(),
        breakType: breakType || 'SHORT_BREAK',
        notes: notes || null,
      },
    });
  }

  async endBreak(workspaceId: string, membershipId: string) {
    await this.ensureAttendanceEnabled(workspaceId);

    const activeAttendance = await this.prisma.attendance.findFirst({
      where: { workspaceId, membershipId, clockOut: null },
      orderBy: { clockIn: 'desc' },
      include: { breaks: true },
    });

    if (!activeAttendance) {
      throw new BadRequestException('No active attendance session found');
    }

    const openBreak = activeAttendance.breaks.find((b) => !b.breakEnd);
    if (!openBreak) {
      throw new NotFoundException('No active break found to end');
    }

    const end = new Date();
    const duration = Math.max(
      1,
      Math.round((end.getTime() - new Date(openBreak.breakStart).getTime()) / (1000 * 60)),
    );

    await this.prisma.attendanceBreak.update({
      where: { id: openBreak.id },
      data: {
        breakEnd: end,
        durationMinutes: duration,
      },
    });

    const allBreaks = await this.prisma.attendanceBreak.findMany({
      where: { attendanceId: activeAttendance.id },
    });

    const totalBreaks = allBreaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);

    return this.prisma.attendance.update({
      where: { id: activeAttendance.id },
      data: { totalBreakMinutes: totalBreaks },
      include: { breaks: true },
    });
  }

  // ---------------------------------------------------------------------------
  // DAILY STATUS & AGGREGATE SUMMARY FOR EMPLOYEES & MANAGERS
  // ---------------------------------------------------------------------------

  async getTodayStatus(workspaceId: string, membershipId: string) {
    await this.autoCloseMissedCheckouts(workspaceId);
    const policy = await this.getAttendancePolicy(workspaceId);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const allTodaySessions = await this.prisma.attendance.findMany({
      where: {
        workspaceId,
        membershipId,
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { clockIn: 'asc' },
      include: { breaks: true },
    });

    const activeSession = allTodaySessions.find((s) => !s.clockOut) || null;
    const latestSession = allTodaySessions[allTodaySessions.length - 1] || null;

    let totalWorkMinutesToday = 0;
    let totalBreakMinutesToday = 0;

    for (const session of allTodaySessions) {
      totalBreakMinutesToday += session.totalBreakMinutes || 0;
      if (session.clockOut) {
        totalWorkMinutesToday += session.totalWorkMinutes || 0;
      } else {
        // Compute in-progress work minutes for active session
        const currentGross = Math.round((now.getTime() - new Date(session.clockIn).getTime()) / 60000);
        const currentNet = Math.max(0, currentGross - (session.totalBreakMinutes || 0));
        totalWorkMinutesToday += currentNet;
      }
    }

    const shift = await this.resolveMemberShift(workspaceId, membershipId);
    const activeBreak = activeSession?.breaks?.find((b) => !b.breakEnd) || null;
    const isOnBreak = !!activeBreak;
    const canClockInAgain =
      !activeSession &&
      (allTodaySessions.length === 0 ||
        (policy.allowMultipleSessionsPerDay && allTodaySessions.length < policy.maxDailySessions));

    const overtimeMinutes = Math.max(0, totalWorkMinutesToday - policy.overtimeThresholdMinutes);
    const onLeave = await this.checkLeaveOverlap(workspaceId, membershipId, now);
    const isHoliday = await this.checkHoliday(workspaceId, now);

    const summary = {
      sessionsCount: allTodaySessions.length,
      totalWorkMinutes: totalWorkMinutesToday,
      totalWorkHours: (totalWorkMinutesToday / 60).toFixed(1),
      totalBreakMinutes: totalBreakMinutesToday,
      overtimeMinutes,
      isClockedIn: !!activeSession,
      isOnBreak,
      activeBreak,
      canClockInAgain,
      assignedShift: shift ? { id: shift.id, name: shift.name, startTime: shift.startTime, endTime: shift.endTime } : null,
      isOnLeave: !!onLeave,
      leaveDetails: onLeave ? { type: onLeave.leaveType, status: onLeave.status } : null,
      isHoliday: !!isHoliday,
      holidayName: isHoliday ? isHoliday.name : null,
      policy: {
        allowMultipleSessionsPerDay: policy.allowMultipleSessionsPerDay,
        maxDailySessions: policy.maxDailySessions,
        gracePeriodMinutes: policy.gracePeriodMinutes,
      },
    };

    if (!latestSession && !activeSession) {
      return {
        id: null,
        clockIn: null,
        clockOut: null,
        status: onLeave ? 'ON_LEAVE' : isHoliday ? 'HOLIDAY' : 'NOT_CLOCKED_IN',
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        todaySummary: summary,
        allSessions: [],
      };
    }

    const representativeSession = activeSession || latestSession;

    return {
      ...representativeSession,
      todaySummary: summary,
      allSessions: allTodaySessions,
    };
  }

  // ---------------------------------------------------------------------------
  // WORKSPACE ATTENDANCE LISTING & DATE RANGE FILTERING (SCOPED BY MANAGER / ADMIN)
  // ---------------------------------------------------------------------------

  async listWorkspaceAttendance(
    workspaceId: string,
    query?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      membershipId?: string;
      departmentId?: string;
      teamId?: string;
      status?: string;
      search?: string;
    },
    userContext?: any,
  ) {
    const where: any = { workspaceId };

    // 1. Date Range Handling
    if (query?.startDate && query?.endDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (query?.date) {
      const targetDate = new Date(query.date);
      targetDate.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetDate);
      targetEnd.setHours(23, 59, 59, 999);
      where.date = { gte: targetDate, lte: targetEnd };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      where.date = { gte: today, lte: todayEnd };
    }

    if (query?.status) {
      where.status = query.status as AttendanceStatus;
    }

    if (query?.membershipId) {
      where.membershipId = query.membershipId;
    }

    // 2. Multi-tier Data Scope Policy Enforcement
    if (
      userContext &&
      userContext.accessRole !== 'OWNER' &&
      userContext.accessRole !== 'ADMIN'
    ) {
      const scope = userContext.dataScope || 'ASSIGNED';
      if (scope === 'ASSIGNED' || scope === 'OWN') {
        where.membershipId = userContext.membershipId;
      } else if (scope === 'DEPARTMENT') {
        where.membership = {
          departmentId: userContext.departmentId || 'unassigned',
        };
      } else if (scope === 'TEAM') {
        // Manager / Team Lead Access: self, team members, or direct reports
        where.membership = {
          OR: [
            { id: userContext.membershipId },
            ...(userContext.teamId ? [{ teamId: userContext.teamId }] : []),
            { reportsToId: userContext.membershipId },
          ],
        };
      }
    } else {
      // Admin / Owner filters
      if (query?.departmentId) {
        where.membership = { ...where.membership, departmentId: query.departmentId };
      }
      if (query?.teamId) {
        where.membership = { ...where.membership, teamId: query.teamId };
      }
      if (query?.search) {
        where.membership = {
          ...where.membership,
          user: {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        };
      }
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        membership: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            department: true,
            team: true,
            designation: true,
          },
        },
        breaks: true,
      },
      orderBy: { clockIn: 'desc' },
    });

    return records.map((r) => {
      const isOvernight =
        r.clockOut &&
        new Date(r.clockOut).getDate() !== new Date(r.clockIn).getDate();
      const netHours = (r.totalWorkMinutes / 60).toFixed(1);
      const breakHours = (r.totalBreakMinutes / 60).toFixed(1);
      const overtimeMinutes = Math.max(0, r.totalWorkMinutes - 480);

      return {
        ...r,
        netHours: Number(netHours),
        breakHours: Number(breakHours),
        isOvernight: !!isOvernight,
        overtimeMinutes,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // ATTENDANCE REPORTS & AGGREGATE SUMMARY
  // ---------------------------------------------------------------------------

  async getAttendanceReportSummary(
    workspaceId: string,
    query?: { startDate?: string; endDate?: string; departmentId?: string },
    userContext?: any,
  ) {
    const list = await this.listWorkspaceAttendance(workspaceId, query, userContext);

    const totalRecords = list.length;
    const totalWorkMinutes = list.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0);
    const totalBreakMinutes = list.reduce((sum, r) => sum + (r.totalBreakMinutes || 0), 0);
    const totalOvertimeMinutes = list.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0);

    const presentCount = list.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const lateCount = list.filter((r) => r.status === AttendanceStatus.LATE).length;
    const halfDayCount = list.filter((r) => r.status === AttendanceStatus.HALF_DAY).length;
    const missedCheckoutCount = list.filter((r) => r.notes?.includes('[AUTO_CLOSED_MISSED_CHECKOUT]')).length;

    const uniqueEmployees = new Set(list.map((r) => r.membershipId)).size;
    const attendanceCompliance =
      totalRecords > 0 ? Math.round(((presentCount + lateCount) / totalRecords) * 100) : 100;

    return {
      totalRecords,
      uniqueEmployees,
      totalWorkHours: Number((totalWorkMinutes / 60).toFixed(1)),
      totalBreakHours: Number((totalBreakMinutes / 60).toFixed(1)),
      totalOvertimeHours: Number((totalOvertimeMinutes / 60).toFixed(1)),
      presentCount,
      lateCount,
      halfDayCount,
      missedCheckoutCount,
      attendanceComplianceRate: `${attendanceCompliance}%`,
    };
  }

  async exportAttendance(
    workspaceId: string,
    query?: { startDate?: string; endDate?: string },
    userContext?: any,
  ) {
    const records = await this.listWorkspaceAttendance(workspaceId, query, userContext);

    return records.map((r) => ({
      attendanceId: r.id,
      employeeId: r.membership.employeeId || 'N/A',
      employeeName: `${r.membership.user.firstName} ${r.membership.user.lastName}`,
      email: r.membership.user.email,
      department: r.membership.department?.name || 'General',
      team: r.membership.team?.name || 'General',
      date: r.date.toISOString().split('T')[0],
      clockIn: r.clockIn.toISOString(),
      clockOut: r.clockOut ? r.clockOut.toISOString() : 'Active',
      workMinutes: r.totalWorkMinutes,
      netHours: r.netHours,
      breakMinutes: r.totalBreakMinutes,
      status: r.status,
      overtimeMinutes: r.overtimeMinutes,
      isOvernight: r.isOvernight,
      notes: r.notes || '',
    }));
  }

  // ---------------------------------------------------------------------------
  // MISSED CHECKOUT AUTO-RESOLUTION & EXCEPTION HANDLING
  // ---------------------------------------------------------------------------

  async autoCloseMissedCheckouts(workspaceId: string) {
    const policy = await this.getAttendancePolicy(workspaceId);
    const thresholdHours = policy.autoCloseMissedCheckoutHours || 16;
    const cutoffTime = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    const abandonedSessions = await this.prisma.attendance.findMany({
      where: {
        workspaceId,
        clockOut: null,
        clockIn: { lt: cutoffTime },
      },
      include: { breaks: true },
    });

    for (const session of abandonedSessions) {
      const openBreak = session.breaks.find((b) => !b.breakEnd);
      if (openBreak) {
        await this.prisma.attendanceBreak.update({
          where: { id: openBreak.id },
          data: {
            breakEnd: new Date(new Date(openBreak.breakStart).getTime() + 60 * 60 * 1000),
            durationMinutes: 60,
          },
        });
      }

      // Auto-set clock-out at fullDayMinutes (e.g. 8 hours) after clock-in
      const resolvedClockOut = new Date(new Date(session.clockIn).getTime() + policy.fullDayMinutes * 60 * 1000);
      const totalBreaks = session.breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
      const netMinutes = Math.max(0, policy.fullDayMinutes - totalBreaks);

      await this.prisma.attendance.update({
        where: { id: session.id },
        data: {
          clockOut: resolvedClockOut,
          totalWorkMinutes: netMinutes,
          totalBreakMinutes: totalBreaks,
          status: AttendanceStatus.HALF_DAY,
          notes: `${session.notes || ''} [AUTO_CLOSED_MISSED_CHECKOUT]`.trim(),
        },
      });

      // Send alert to employee
      await this.sendAttendanceNotification(
        workspaceId,
        session.membershipId,
        'Missed Checkout Auto-Resolved',
        `Your shift session from ${session.clockIn.toLocaleDateString()} was automatically closed due to missing clock-out. Please review and submit a correction if necessary.`,
        'WARNING',
        `missed-checkout-${session.id}`,
      );
    }

    return { resolvedCount: abandonedSessions.length };
  }

  // ---------------------------------------------------------------------------
  // ATTENDANCE CORRECTIONS WORKFLOW (SUBMIT, LIST, APPROVE, REJECT)
  // ---------------------------------------------------------------------------

  async submitCorrection(
    workspaceId: string,
    membershipId: string,
    data: { attendanceId: string; requestedClockIn: string | Date; requestedClockOut: string | Date; reason: string },
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: data.attendanceId, workspaceId },
      include: { membership: { include: { user: true } } },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance session not found in this workspace');
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const corrections: any[] = settings.attendanceCorrections || [];

    const newCorrection = {
      id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      attendanceId: data.attendanceId,
      membershipId,
      employeeName: `${attendance.membership.user.firstName} ${attendance.membership.user.lastName}`,
      originalClockIn: attendance.clockIn,
      originalClockOut: attendance.clockOut,
      requestedClockIn: new Date(data.requestedClockIn),
      requestedClockOut: new Date(data.requestedClockOut),
      reason: data.reason.trim(),
      status: 'PENDING',
      submittedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          attendanceCorrections: [newCorrection, ...corrections],
        },
      },
    });

    return newCorrection;
  }

  async listCorrections(workspaceId: string, query?: { status?: string; membershipId?: string }) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    let corrections: any[] = settings.attendanceCorrections || [];

    if (query?.status) {
      corrections = corrections.filter((c) => c.status === query.status);
    }
    if (query?.membershipId) {
      corrections = corrections.filter((c) => c.membershipId === query.membershipId);
    }

    return corrections;
  }

  async approveCorrection(
    workspaceId: string,
    correctionId: string,
    approverMembershipId: string,
    reviewNotes?: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const corrections: any[] = settings.attendanceCorrections || [];

    const targetIndex = corrections.findIndex((c) => c.id === correctionId);
    if (targetIndex === -1) {
      throw new NotFoundException('Correction request not found');
    }

    const correction = corrections[targetIndex];
    if (correction.status !== 'PENDING') {
      throw new BadRequestException(`Correction is already ${correction.status.toLowerCase()}`);
    }

    const attendance = await this.prisma.attendance.findUnique({
      where: { id: correction.attendanceId },
      include: { breaks: true },
    });

    if (!attendance) {
      throw new NotFoundException('Target attendance record no longer exists');
    }

    const newClockIn = new Date(correction.requestedClockIn);
    const newClockOut = new Date(correction.requestedClockOut);
    const totalBreaks = attendance.breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    const grossMinutes = Math.round((newClockOut.getTime() - newClockIn.getTime()) / 60000);
    const netWorkMinutes = Math.max(0, grossMinutes - totalBreaks);

    // Update Attendance Record
    await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockIn: newClockIn,
        clockOut: newClockOut,
        totalWorkMinutes: netWorkMinutes,
        notes: `${attendance.notes || ''} [CORRECTED by ${approverMembershipId}: ${correction.reason}]`.trim(),
      },
    });

    // Update Correction Request
    corrections[targetIndex] = {
      ...correction,
      status: 'APPROVED',
      reviewedBy: approverMembershipId,
      reviewNotes: reviewNotes || 'Approved by manager',
      reviewedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          attendanceCorrections: corrections,
        },
      },
    });

    await this.sendAttendanceNotification(
      workspaceId,
      correction.membershipId,
      'Attendance Correction Approved',
      `Your attendance correction for ${newClockIn.toLocaleDateString()} was approved.`,
      'SUCCESS',
      `corr-approved-${correction.id}`,
    );

    return corrections[targetIndex];
  }

  async rejectCorrection(
    workspaceId: string,
    correctionId: string,
    approverMembershipId: string,
    rejectionReason: string,
  ) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const corrections: any[] = settings.attendanceCorrections || [];

    const targetIndex = corrections.findIndex((c) => c.id === correctionId);
    if (targetIndex === -1) {
      throw new NotFoundException('Correction request not found');
    }

    const correction = corrections[targetIndex];
    if (correction.status !== 'PENDING') {
      throw new BadRequestException(`Correction is already ${correction.status.toLowerCase()}`);
    }

    corrections[targetIndex] = {
      ...correction,
      status: 'REJECTED',
      reviewedBy: approverMembershipId,
      rejectionReason: rejectionReason.trim(),
      reviewedAt: new Date(),
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          attendanceCorrections: corrections,
        },
      },
    });

    await this.sendAttendanceNotification(
      workspaceId,
      correction.membershipId,
      'Attendance Correction Rejected',
      `Your correction request was rejected: ${rejectionReason}`,
      'WARNING',
      `corr-rejected-${correction.id}`,
    );

    return corrections[targetIndex];
  }

  // ---------------------------------------------------------------------------
  // SHIFT MANAGEMENT & OVERNIGHT SHIFTS
  // ---------------------------------------------------------------------------

  async listShifts(workspaceId: string) {
    let shifts = await this.prisma.shift.findMany({ where: { workspaceId } });
    if (shifts.length === 0) {
      await this.prisma.shift.create({
        data: {
          workspaceId,
          name: 'Regular General Shift (9 AM - 5 PM)',
          startTime: '09:00',
          endTime: '17:00',
        },
      });
      shifts = await this.prisma.shift.findMany({ where: { workspaceId } });
    }
    return shifts.map((s) => ({
      ...s,
      isOvernight: s.endTime < s.startTime,
    }));
  }

  async createShift(
    workspaceId: string,
    data: { name: string; startTime: string; endTime: string; workDays?: any },
  ) {
    const shift = await this.prisma.shift.create({
      data: {
        workspaceId,
        name: data.name.trim(),
        startTime: data.startTime.trim(),
        endTime: data.endTime.trim(),
        workDays: data.workDays || ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      },
    });
    return {
      ...shift,
      isOvernight: shift.endTime < shift.startTime,
    };
  }

  async updateShift(
    workspaceId: string,
    shiftId: string,
    data: { name?: string; startTime?: string; endTime?: string; workDays?: any },
  ) {
    const existing = await this.prisma.shift.findFirst({
      where: { id: shiftId, workspaceId },
    });
    if (!existing) throw new NotFoundException('Shift not found in workspace');

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.startTime ? { startTime: data.startTime.trim() } : {}),
        ...(data.endTime ? { endTime: data.endTime.trim() } : {}),
        ...(data.workDays ? { workDays: data.workDays } : {}),
      },
    });

    return {
      ...updated,
      isOvernight: updated.endTime < updated.startTime,
    };
  }

  async deleteShift(workspaceId: string, shiftId: string) {
    const existing = await this.prisma.shift.findFirst({
      where: { id: shiftId, workspaceId },
    });
    if (!existing) throw new NotFoundException('Shift not found');

    await this.prisma.shift.delete({ where: { id: shiftId } });
    return { message: 'Shift deleted successfully' };
  }

  async assignShiftToMember(workspaceId: string, membershipId: string, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, workspaceId },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assignments = settings.shiftAssignments || {};

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          shiftAssignments: {
            ...assignments,
            [membershipId]: shiftId,
          },
        },
      },
    });

    return { message: 'Shift assigned successfully', shiftId, shiftName: shift.name };
  }

  private async resolveMemberShift(
    workspaceId: string,
    membershipId: string,
    explicitShiftId?: string,
  ) {
    if (explicitShiftId) {
      const s = await this.prisma.shift.findFirst({ where: { id: explicitShiftId, workspaceId } });
      if (s) return s;
    }

    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const settings = (ws?.settings as any) || {};
    const assignedShiftId = settings.shiftAssignments?.[membershipId];

    if (assignedShiftId) {
      const s = await this.prisma.shift.findFirst({ where: { id: assignedShiftId, workspaceId } });
      if (s) return s;
    }

    // Default to first workspace shift
    return this.prisma.shift.findFirst({ where: { workspaceId } });
  }

  // ---------------------------------------------------------------------------
  // INTEGRATIONS: LEAVE, HOLIDAYS & NOTIFICATIONS
  // ---------------------------------------------------------------------------

  private async checkLeaveOverlap(workspaceId: string, membershipId: string, date: Date) {
    return this.prisma.leaveRequest.findFirst({
      where: {
        workspaceId,
        membershipId,
        status: ApprovalStatus.APPROVED,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
  }

  private async checkHoliday(workspaceId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.holiday.findFirst({
      where: {
        workspaceId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  private async sendAttendanceNotification(
    workspaceId: string,
    recipientMembershipId: string,
    title: string,
    message: string,
    type: string,
    deduplicationKey: string,
  ) {
    try {
      const existing = await this.prisma.notification.findFirst({
        where: {
          workspaceId,
          recipientMembershipId,
          title,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!existing) {
        await this.prisma.notification.create({
          data: {
            workspaceId,
            recipientMembershipId,
            title,
            message,
            type,
            link: '/app/time',
          },
        });
      }
    } catch {
      // Notification errors do not fail core attendance flow
    }
  }

  // ---------------------------------------------------------------------------
  // TIMESHEETS, OVERTIME & HOLIDAYS (PRESERVED APIS)
  // ---------------------------------------------------------------------------

  async listTimesheets(workspaceId: string, membershipId?: string) {
    const where: any = { workspaceId };
    if (membershipId) where.membershipId = membershipId;

    return this.prisma.timesheet.findMany({
      where,
      include: {
        membership: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTimesheet(
    workspaceId: string,
    membershipId: string,
    data: { periodStart: Date | string; periodEnd: Date | string; totalHours: number; notes?: string },
  ) {
    return this.prisma.timesheet.create({
      data: {
        workspaceId,
        membershipId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        totalHours: Number(data.totalHours),
        notes: data.notes,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  async updateTimesheetStatus(
    workspaceId: string,
    id: string,
    approverMembershipId: string,
    status: ApprovalStatus,
  ) {
    const existing = await this.prisma.timesheet.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      throw new NotFoundException('Timesheet record not found in this workspace');
    }

    return this.prisma.timesheet.update({
      where: { id },
      data: { status, approvedByMembershipId: approverMembershipId },
    });
  }

  async listOvertime(workspaceId: string, membershipId?: string) {
    const where: any = { workspaceId };
    if (membershipId) where.membershipId = membershipId;

    return this.prisma.overtimeRequest.findMany({
      where,
      include: {
        membership: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOvertime(
    workspaceId: string,
    membershipId: string,
    data: { date: Date | string; hours: number; reason: string },
  ) {
    return this.prisma.overtimeRequest.create({
      data: {
        workspaceId,
        membershipId,
        date: new Date(data.date),
        hours: Number(data.hours),
        reason: data.reason,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  async updateOvertimeStatus(
    workspaceId: string,
    id: string,
    approverMembershipId: string,
    status: ApprovalStatus,
  ) {
    const existing = await this.prisma.overtimeRequest.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      throw new NotFoundException('Overtime record not found in this workspace');
    }

    return this.prisma.overtimeRequest.update({
      where: { id },
      data: { status, approvedByMembershipId: approverMembershipId },
    });
  }

  async listHolidays(workspaceId: string) {
    return this.prisma.holiday.findMany({
      where: { workspaceId },
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(
    workspaceId: string,
    data: { name: string; date: Date | string; isOptional?: boolean },
  ) {
    return this.prisma.holiday.create({
      data: {
        workspaceId,
        name: data.name,
        date: new Date(data.date),
        isOptional: !!data.isOptional,
      },
    });
  }
}
