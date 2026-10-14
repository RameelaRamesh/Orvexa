import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TimeService } from './time.service';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceStatus, ApprovalStatus } from '@prisma/client';

describe('PHASE 6: Complete Attendance and Time Management Acceptance Suite', () => {
  let timeService: TimeService;
  let prisma: any;

  const mockPrisma: any = {
    workspace: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    attendance: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    attendanceBreak: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shift: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    leaveRequest: {
      findFirst: jest.fn(),
    },
    holiday: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    timesheet: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    overtimeRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    timeService = module.get<TimeService>(TimeService);
    prisma = module.get<PrismaService>(PrismaService);

    // Default workspace settings: module enabled
    mockPrisma.workspace.findUnique.mockResolvedValue({
      id: 'ws_alpha',
      settings: {
        enabledModules: ['attendance', 'time'],
        attendancePolicy: {
          allowMultipleSessionsPerDay: true,
          maxDailySessions: 5,
          allowMultipleBreaks: true,
          gracePeriodMinutes: 15,
          halfDayMinutes: 240,
          fullDayMinutes: 480,
          overtimeThresholdMinutes: 480,
          autoCloseMissedCheckoutHours: 16,
        },
      },
    });
  });

  // =========================================================================
  // 1. REPEATED SAME-DAY SESSIONS & MULTI-SESSION POLICY
  // =========================================================================
  describe('Requirement 1, 3 & 4: Multi-Session Support (Checkout Does NOT Lock Day)', () => {
    it('should allow an employee to clock in again on the same day after a completed checkout', async () => {
      // 1. First session already completed earlier today
      const completedSession = {
        id: 'att_session_1',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_1',
        date: new Date(),
        clockIn: new Date(Date.now() - 4 * 3600 * 1000),
        clockOut: new Date(Date.now() - 2 * 3600 * 1000),
        totalWorkMinutes: 120,
        totalBreakMinutes: 0,
        status: AttendanceStatus.PRESENT,
      };

      // When searching for active session: none active
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      // When searching for today's sessions: one session already exists
      mockPrisma.attendance.findMany.mockResolvedValue([completedSession]);

      mockPrisma.attendance.create.mockResolvedValue({
        id: 'att_session_2',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_1',
        clockIn: new Date(),
        clockOut: null,
        status: AttendanceStatus.PRESENT,
        breaks: [],
      });

      const secondSession = await timeService.clockIn('ws_alpha', 'mem_1', { notes: 'Afternoon session' });

      expect(secondSession.id).toBe('att_session_2');
      expect(mockPrisma.attendance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws_alpha',
          membershipId: 'mem_1',
          status: AttendanceStatus.PRESENT,
        }),
        include: { breaks: true },
      });
    });

    it('should reject a second session if organization policy forbids multiple sessions per day', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_alpha',
        settings: {
          attendancePolicy: {
            allowMultipleSessionsPerDay: false,
            maxDailySessions: 1,
          },
        },
      });

      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.findMany.mockResolvedValue([
        { id: 'att_session_1', clockOut: new Date() },
      ]);

      await expect(
        timeService.clockIn('ws_alpha', 'mem_1'),
      ).rejects.toThrow(
        new BadRequestException(
          'Organisation policy permits only one work session per day. You have already completed a session today.',
        ),
      );
    });

    it('should reject clock-in when maximum daily sessions limit is reached', async () => {
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_alpha',
        settings: {
          attendancePolicy: {
            allowMultipleSessionsPerDay: true,
            maxDailySessions: 2,
          },
        },
      });

      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.findMany.mockResolvedValue([
        { id: 'att_s1', clockOut: new Date() },
        { id: 'att_s2', clockOut: new Date() },
      ]);

      await expect(
        timeService.clockIn('ws_alpha', 'mem_1'),
      ).rejects.toThrow(
        new BadRequestException('Maximum daily work sessions limit reached (2 sessions allowed per day).'),
      );
    });
  });

  // =========================================================================
  // 2. MULTIPLE BREAKS WITHIN A SINGLE WORK SESSION
  // =========================================================================
  describe('Requirement 2 & 8: Multiple Breaks Tracking & Duration Recalculation', () => {
    it('should allow taking multiple breaks in a session and sum total break duration accurately', async () => {
      const activeAttendance = {
        id: 'att_active',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_1',
        clockIn: new Date(Date.now() - 3 * 3600 * 1000),
        clockOut: null,
        breaks: [
          // Break 1 already completed (15 mins)
          { id: 'brk_1', breakStart: new Date(), breakEnd: new Date(), durationMinutes: 15, breakType: 'SHORT_BREAK' },
        ],
      };

      mockPrisma.attendance.findFirst.mockResolvedValue(activeAttendance);

      // Start Break 2 (Lunch)
      mockPrisma.attendanceBreak.create.mockResolvedValue({
        id: 'brk_2',
        attendanceId: 'att_active',
        breakStart: new Date(),
        breakEnd: null,
        breakType: 'LUNCH',
      });

      const break2 = await timeService.startBreak('ws_alpha', 'mem_1', 'LUNCH');
      expect(break2.breakType).toBe('LUNCH');
      expect(mockPrisma.attendanceBreak.create).toHaveBeenCalled();
    });

    it('should reject starting a new break if a break is already in progress', async () => {
      const activeAttendanceWithOpenBreak = {
        id: 'att_active',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_1',
        clockOut: null,
        breaks: [
          { id: 'brk_open', breakStart: new Date(), breakEnd: null, breakType: 'SHORT_BREAK' },
        ],
      };

      mockPrisma.attendance.findFirst.mockResolvedValue(activeAttendanceWithOpenBreak);

      await expect(
        timeService.startBreak('ws_alpha', 'mem_1', 'LUNCH'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should end break and correctly update attendance totalBreakMinutes', async () => {
      const breakStart = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
      const activeAttendance = {
        id: 'att_active',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_1',
        clockOut: null,
        breaks: [{ id: 'brk_open', breakStart, breakEnd: null, breakType: 'LUNCH' }],
      };

      mockPrisma.attendance.findFirst.mockResolvedValue(activeAttendance);
      mockPrisma.attendanceBreak.update.mockResolvedValue({ id: 'brk_open', durationMinutes: 30 });
      mockPrisma.attendanceBreak.findMany.mockResolvedValue([
        { id: 'brk_1', durationMinutes: 15 },
        { id: 'brk_open', durationMinutes: 30 },
      ]);
      mockPrisma.attendance.update.mockResolvedValue({
        id: 'att_active',
        totalBreakMinutes: 45,
        breaks: [],
      });

      const updated = await timeService.endBreak('ws_alpha', 'mem_1');
      expect(mockPrisma.attendance.update).toHaveBeenCalledWith({
        where: { id: 'att_active' },
        data: { totalBreakMinutes: 45 },
        include: { breaks: true },
      });
      expect(updated.totalBreakMinutes).toBe(45);
    });
  });

  // =========================================================================
  // 3. OVERNIGHT SHIFTS & CROSS-MIDNIGHT DURATION CALCULATION
  // =========================================================================
  describe('Requirement 7 & 8: Overnight Shifts & Midnight Crossing Mathematics', () => {
    it('should compute worked duration across midnight correctly without date distortion', async () => {
      // Clock in at 22:00 (Day 1) and Clock out at 06:00 (Day 2) -> 8 hours (480 mins)
      const clockInTime = new Date('2026-10-12T22:00:00.000Z');
      const clockOutTime = new Date('2026-10-13T06:00:00.000Z');

      const activeOvernight = {
        id: 'att_night',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_night_owl',
        clockIn: clockInTime,
        clockOut: null,
        status: AttendanceStatus.PRESENT,
        breaks: [],
      };

      mockPrisma.attendance.findFirst.mockResolvedValue(activeOvernight);
      mockPrisma.attendanceBreak.findMany.mockResolvedValue([
        { id: 'brk_night', durationMinutes: 60 }, // 1 hour break during shift
      ]);

      // Mock Date.now() or use clockOut return
      jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
        if (args.length > 0) {
          // @ts-ignore
          return new (jest.requireActual('Date'))(...args);
        }
        return clockOutTime as any;
      });

      mockPrisma.attendance.update.mockImplementation((args: any) => {
        return Promise.resolve({
          ...activeOvernight,
          ...args.data,
        });
      });

      const result = await timeService.clockOut('ws_alpha', 'mem_night_owl');

      // Gross = 8 hours = 480 mins. Net = 480 - 60 = 420 mins (7 hours).
      expect(result.totalBreakMinutes).toBe(60);
      expect(result.totalWorkMinutes).toBe(420);
      expect(result.clockOut).toEqual(clockOutTime);

      jest.restoreAllMocks();
    });
  });

  // =========================================================================
  // 4. GRACE PERIODS & LATE ARRIVAL DETECTION
  // =========================================================================
  describe('Requirement 7: Grace Periods & Late Arrival Detection', () => {
    it('should mark attendance status as LATE when clocking in past scheduled shift + grace period', async () => {
      // Shift starts at 09:00, grace period = 15 mins -> Late after 09:15
      mockPrisma.shift.findFirst.mockResolvedValue({
        id: 'shift_morning',
        name: 'Morning Shift',
        startTime: '09:00',
        endTime: '17:00',
      });

      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.findMany.mockResolvedValue([]); // First session of day

      // Clock in at 09:35 AM (20 mins late)
      const lateTime = new Date();
      lateTime.setHours(9, 35, 0, 0);

      jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
        if (args.length > 0) {
          // @ts-ignore
          return new (jest.requireActual('Date'))(...args);
        }
        return lateTime as any;
      });

      mockPrisma.attendance.create.mockImplementation((args: any) => ({
        id: 'att_late',
        ...args.data,
        breaks: [],
      }));

      const session = await timeService.clockIn('ws_alpha', 'mem_late_guy');

      expect(session.status).toBe(AttendanceStatus.LATE);
      expect((session as any).metadata.isLate).toBe(true);
      expect((session as any).metadata.lateMinutes).toBe(35); // 09:35 - 09:00 = 35 mins
      expect(mockPrisma.notification.create).toHaveBeenCalled(); // Late arrival notification

      jest.restoreAllMocks();
    });
  });

  // =========================================================================
  // 5. CONCURRENCY & DUPLICATE REQUESTS DEBOUNCE
  // =========================================================================
  describe('Requirement 5: Duplicate Action & Race-Condition Guard', () => {
    it('should return existing session idempotently on rapid double-clicks within 3 seconds', async () => {
      const recentSession = {
        id: 'att_double_click',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_1',
        clockIn: new Date(Date.now() - 1500), // 1.5 seconds ago
        clockOut: null,
        breaks: [],
      };

      mockPrisma.attendance.findFirst.mockResolvedValue(recentSession);

      const result = await timeService.clockIn('ws_alpha', 'mem_1');
      expect(result.id).toBe('att_double_click');
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('should reject clock-in if an active session has been running for a long duration', async () => {
      const activeSession = {
        id: 'att_already_working',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_1',
        clockIn: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago
        clockOut: null,
        breaks: [],
      };

      mockPrisma.attendance.findFirst.mockResolvedValue(activeSession);

      await expect(timeService.clockIn('ws_alpha', 'mem_1')).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 6. MISSED CHECKOUT AUTO-RESOLUTION
  // =========================================================================
  describe('Requirement 9: Missed Checkout Detection & Resolution', () => {
    it('autoCloseMissedCheckouts should auto-cap abandoned sessions past cutoff threshold', async () => {
      const abandoned = {
        id: 'att_abandoned',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_forgot',
        clockIn: new Date(Date.now() - 20 * 3600 * 1000), // 20 hours ago (> 16h threshold)
        clockOut: null,
        breaks: [],
      };

      mockPrisma.attendance.findMany.mockResolvedValue([abandoned]);
      mockPrisma.attendance.update.mockResolvedValue({
        id: 'att_abandoned',
        status: AttendanceStatus.HALF_DAY,
      });

      const report = await timeService.autoCloseMissedCheckouts('ws_alpha');

      expect(report.resolvedCount).toBe(1);
      expect(mockPrisma.attendance.update).toHaveBeenCalledWith({
        where: { id: 'att_abandoned' },
        data: expect.objectContaining({
          status: AttendanceStatus.HALF_DAY,
          notes: expect.stringContaining('[AUTO_CLOSED_MISSED_CHECKOUT]'),
        }),
      });
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. ATTENDANCE CORRECTIONS WORKFLOW & APPROVALS
  // =========================================================================
  describe('Requirement 9: Attendance Correction Submission & Manager Approval', () => {
    it('submitCorrection records request; approveCorrection atomically recalculates attendance', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue({
        id: 'att_to_fix',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_worker',
        clockIn: new Date('2026-10-12T10:00:00Z'),
        clockOut: new Date('2026-10-12T16:00:00Z'),
        membership: { user: { firstName: 'Bruce', lastName: 'Wayne' } },
      });

      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_alpha',
        settings: { attendanceCorrections: [] },
      });

      // 1. Submit Correction
      const correction = await timeService.submitCorrection('ws_alpha', 'mem_worker', {
        attendanceId: 'att_to_fix',
        requestedClockIn: '2026-10-12T09:00:00Z',
        requestedClockOut: '2026-10-12T17:00:00Z',
        reason: 'Network outage during morning badge swipe',
      });

      expect(correction.status).toBe('PENDING');
      expect(correction.reason).toBe('Network outage during morning badge swipe');

      // 2. Manager Approves Correction
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_alpha',
        settings: { attendanceCorrections: [correction] },
      });
      mockPrisma.attendance.findUnique.mockResolvedValue({
        id: 'att_to_fix',
        breaks: [],
      });

      const approved = await timeService.approveCorrection(
        'ws_alpha',
        correction.id,
        'mem_manager_1',
        'Verified against door logs',
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.reviewedBy).toBe('mem_manager_1');
      expect(mockPrisma.attendance.update).toHaveBeenCalledWith({
        where: { id: 'att_to_fix' },
        data: expect.objectContaining({
          totalWorkMinutes: 480, // 09:00 to 17:00 = 8 hours = 480 mins
          notes: expect.stringContaining('[CORRECTED by mem_manager_1'),
        }),
      });
    });
  });

  // =========================================================================
  // 8. LEAVE OVERLAP & HOLIDAY INTEGRATIONS
  // =========================================================================
  describe('Requirement 11: Leave & Holiday Overlap Integrations', () => {
    it('getTodayStatus should indicate ON_LEAVE when member has approved leave on current date', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave_req_1',
        leaveType: 'ANNUAL',
        status: ApprovalStatus.APPROVED,
      });

      const status = await timeService.getTodayStatus('ws_alpha', 'mem_vacationer');

      expect(status.status).toBe('ON_LEAVE');
      expect(status.todaySummary.isOnLeave).toBe(true);
      expect(status.todaySummary.leaveDetails.type).toBe('ANNUAL');
    });

    it('clockIn on a registered Holiday records holiday work metadata', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.holiday.findFirst.mockResolvedValue({
        id: 'hol_1',
        name: 'Founders Day',
      });

      mockPrisma.attendance.create.mockImplementation((args: any) => ({
        id: 'att_holiday_work',
        ...args.data,
        breaks: [],
      }));

      const session = await timeService.clockIn('ws_alpha', 'mem_dedicated');

      expect((session as any).metadata.isHolidayWork).toBe(true);
      expect(session.notes).toContain('"isHolidayWork":true');
    });
  });

  // =========================================================================
  // 9. HISTORICAL REPORTS & DATA SCOPE RESTRICTIONS
  // =========================================================================
  describe('Requirement 10 & 12: Historical Reporting & Scoped Manager Logs', () => {
    it('listWorkspaceAttendance should apply TEAM dataScope filtering for managers', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([
        {
          id: 'att_t1',
          date: new Date(),
          clockIn: new Date(),
          clockOut: new Date(),
          totalWorkMinutes: 480,
          totalBreakMinutes: 60,
          membership: { user: { firstName: 'Tim' } },
          breaks: [],
        },
      ]);

      const managerContext = {
        membershipId: 'mem_team_lead',
        accessRole: 'MEMBER',
        dataScope: 'TEAM',
        teamId: 'team_sales',
      };

      await timeService.listWorkspaceAttendance('ws_alpha', {}, managerContext);

      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          workspaceId: 'ws_alpha',
          membership: {
            OR: [
              { id: 'mem_team_lead' },
              { teamId: 'team_sales' },
              { reportsToId: 'mem_team_lead' },
            ],
          },
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('getAttendanceReportSummary should compute accurate compliance rate and totals', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([
        {
          id: 'att_1',
          membershipId: 'mem_1',
          status: AttendanceStatus.PRESENT,
          totalWorkMinutes: 480,
          totalBreakMinutes: 60,
          overtimeMinutes: 0,
          membership: {},
          breaks: [],
        },
        {
          id: 'att_2',
          membershipId: 'mem_2',
          status: AttendanceStatus.LATE,
          totalWorkMinutes: 420,
          totalBreakMinutes: 30,
          overtimeMinutes: 0,
          membership: {},
          breaks: [],
        },
      ]);

      const summary = await timeService.getAttendanceReportSummary('ws_alpha');

      expect(summary.totalRecords).toBe(2);
      expect(summary.uniqueEmployees).toBe(2);
      expect(summary.totalWorkHours).toBe(15); // (480 + 420) / 60 = 15 hrs
      expect(summary.presentCount).toBe(1);
      expect(summary.lateCount).toBe(1);
      expect(summary.attendanceComplianceRate).toBe('100%'); // (1 present + 1 late) / 2 = 100%
    });
  });

  // =========================================================================
  // 10. AUTO-CLOSE OPEN BREAK ON CLOCK-OUT
  // =========================================================================
  describe('Requirement 2: Auto-close open break on clock-out', () => {
    it('clockOut should automatically close any active break without leaving dangling open breaks', async () => {
      const breakStart = new Date(Date.now() - 25 * 60 * 1000);
      const activeWithOpenBreak = {
        id: 'att_with_break',
        workspaceId: 'ws_alpha',
        membershipId: 'mem_worker',
        clockIn: new Date(Date.now() - 4 * 3600 * 1000),
        clockOut: null,
        breaks: [{ id: 'brk_dangling', breakStart, breakEnd: null, durationMinutes: 0 }],
      };

      mockPrisma.attendance.findFirst.mockResolvedValue(activeWithOpenBreak);
      mockPrisma.attendanceBreak.findMany.mockResolvedValue([
        { id: 'brk_dangling', durationMinutes: 25 },
      ]);
      mockPrisma.attendance.update.mockImplementation((args: any) => Promise.resolve(args.data));

      await timeService.clockOut('ws_alpha', 'mem_worker');

      // Verified break was closed
      expect(mockPrisma.attendanceBreak.update).toHaveBeenCalledWith({
        where: { id: 'brk_dangling' },
        data: expect.objectContaining({
          durationMinutes: expect.any(Number),
          breakEnd: expect.any(Date),
        }),
      });
    });
  });
});
