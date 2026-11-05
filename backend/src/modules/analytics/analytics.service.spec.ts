import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('PHASE 11: Analytics, User Experience and Universal Calendar Acceptance Suite', () => {
  let analyticsService: AnalyticsService;

  // In-memory test state
  let taskTable: any[] = [];
  let workItemTable: any[] = [];
  let attendanceTable: any[] = [];
  let leaveRequestTable: any[] = [];
  let qualityReviewTable: any[] = [];
  let assetTable: any[] = [];
  let shiftTable: any[] = [];
  let membershipTable: any[] = [];

  const workspaceIdA = 'ws_org_analytics_01';
  const memberAdminId = 'mem_admin_01';
  const memberAliceId = 'mem_alice_02';
  const memberBobId = 'mem_bob_03';

  const mockPrisma: any = {
    membership: {
      count: jest.fn().mockImplementation(async ({ where }) => {
        return membershipTable.filter((m) => m.workspaceId === where.workspaceId && m.status === 'ACTIVE').length;
      }),
      findMany: jest.fn().mockImplementation(async () => membershipTable),
    },
    task: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return taskTable.filter((t) => {
          if (t.workspaceId !== where.workspaceId) return false;
          if (where.assigneeMembershipId && t.assigneeMembershipId !== where.assigneeMembershipId) return false;
          if (where.status && where.status !== t.status) return false;
          if (where.priority && where.priority !== t.priority) return false;
          return true;
        });
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return taskTable.filter((t) => t.workspaceId === where.workspaceId).length;
      }),
    },
    workItem: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return workItemTable.filter((w) => w.workspaceId === where.workspaceId);
      }),
    },
    attendance: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return attendanceTable.filter((a) => {
          if (a.workspaceId !== where.workspaceId) return false;
          if (where.membershipId && a.membershipId !== where.membershipId) return false;
          return true;
        });
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return attendanceTable.filter((a) => a.workspaceId === where.workspaceId).length;
      }),
    },
    leaveRequest: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return leaveRequestTable.filter((l) => {
          if (l.workspaceId !== where.workspaceId) return false;
          if (where.membershipId && l.membershipId !== where.membershipId) return false;
          return true;
        });
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return leaveRequestTable.filter((l) => l.workspaceId === where.workspaceId).length;
      }),
    },
    qualityReview: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return qualityReviewTable.filter((q) => q.workspaceId === where.workspaceId);
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return qualityReviewTable.filter((q) => q.workspaceId === where.workspaceId).length;
      }),
    },
    asset: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return assetTable.filter((a) => a.workspaceId === where.workspaceId);
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return assetTable.filter((a) => a.workspaceId === where.workspaceId).length;
      }),
    },
    shift: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return shiftTable.filter((s) => s.workspaceId === where.workspaceId);
      }),
    },
  };

  beforeEach(async () => {
    taskTable = [];
    workItemTable = [];
    attendanceTable = [];
    leaveRequestTable = [];
    qualityReviewTable = [];
    assetTable = [];
    shiftTable = [];
    membershipTable = [
      { id: memberAdminId, workspaceId: workspaceIdA, status: 'ACTIVE', accessRole: 'ADMIN', user: { firstName: 'Admin', lastName: 'User', email: 'admin@orvexa.io' } },
      { id: memberAliceId, workspaceId: workspaceIdA, status: 'ACTIVE', accessRole: 'MEMBER', user: { firstName: 'Alice', lastName: 'Engineer', email: 'alice@orvexa.io' } },
      { id: memberBobId, workspaceId: workspaceIdA, status: 'ACTIVE', accessRole: 'MEMBER', user: { firstName: 'Bob', lastName: 'Analyst', email: 'bob@orvexa.io' } },
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  it('TC-PHASE11-01: Overview metrics calculation with zero records handles empty state safely without NaN', async () => {
    const overview = await analyticsService.getOverview(workspaceIdA, memberAdminId, 'ADMIN');

    expect(overview.kpis.tasks.total).toBe(0);
    expect(overview.kpis.tasks.completionRate).toBe(0);
    expect(overview.kpis.attendance.totalWorkHours).toBe(0);
    expect(overview.kpis.attendance.averageDailyHours).toBe(0);
    expect(overview.kpis.quality.averageScore).toBeNull(); // Transparent null when no audits
    expect(overview.kpis.quality.slaHealthPercentage).toBe(100);
    expect(overview.kpis.assets.utilizationRate).toBe(0);
    expect(overview.metricDefinitions).toBeDefined();
    expect(overview.metricDefinitions.taskCompletionRate.formula).toBe('(Completed Tasks / Total Filtered Tasks) * 100');
  });

  it('TC-PHASE11-02: Task completion rate and overdue counts reflect exact mathematical formulas', async () => {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);

    taskTable.push(
      { id: 't1', workspaceId: workspaceIdA, title: 'Task 1', status: 'COMPLETED', priority: 'HIGH', dueDate: yesterday, createdAt: new Date() },
      { id: 't2', workspaceId: workspaceIdA, title: 'Task 2', status: 'COMPLETED', priority: 'MEDIUM', dueDate: tomorrow, createdAt: new Date() },
      { id: 't3', workspaceId: workspaceIdA, title: 'Task 3', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: yesterday, createdAt: new Date() }, // Overdue
      { id: 't4', workspaceId: workspaceIdA, title: 'Task 4', status: 'TODO', priority: 'LOW', dueDate: tomorrow, createdAt: new Date() },
    );

    const overview = await analyticsService.getOverview(workspaceIdA, memberAdminId, 'ADMIN');

    expect(overview.kpis.tasks.total).toBe(4);
    expect(overview.kpis.tasks.completed).toBe(2);
    expect(overview.kpis.tasks.completionRate).toBe(50.0); // 2 / 4 * 100
    expect(overview.kpis.tasks.overdue).toBe(1); // Task 3 is overdue
  });

  it('TC-PHASE11-03: Quality reviews calculate genuine average score and SLA health', async () => {
    taskTable.push(
      { id: 't1', workspaceId: workspaceIdA, title: 'Task 1', status: 'COMPLETED', priority: 'MEDIUM', dueDate: null, createdAt: new Date() },
    );
    qualityReviewTable.push(
      { id: 'q1', workspaceId: workspaceIdA, score: 90, maxScore: 100, passStatus: 'PASSED', reviewedAt: new Date() },
      { id: 'q2', workspaceId: workspaceIdA, score: 80, maxScore: 100, passStatus: 'REWORK_REQUIRED', reviewedAt: new Date() },
    );

    const overview = await analyticsService.getOverview(workspaceIdA, memberAdminId, 'ADMIN');

    expect(overview.kpis.quality.totalAudits).toBe(2);
    expect(overview.kpis.quality.averageScore).toBe(85.0); // (90 + 80) / 2
    expect(overview.kpis.quality.passedAudits).toBe(1);
    expect(overview.kpis.quality.reworkRequired).toBe(1);
    expect(overview.kpis.quality.slaHealthPercentage).toBe(100.0);
  });

  it('TC-PHASE11-04: Attendance aggregates elapsed hours and active clock-in presence', async () => {
    const today = new Date();
    attendanceTable.push(
      { id: 'a1', workspaceId: workspaceIdA, membershipId: memberAliceId, date: today, clockIn: today, clockOut: today, totalWorkMinutes: 480, status: 'PRESENT' },
      { id: 'a2', workspaceId: workspaceIdA, membershipId: memberBobId, date: today, clockIn: today, clockOut: null, totalWorkMinutes: 240, status: 'PRESENT' }, // active clock-in
    );

    const overview = await analyticsService.getOverview(workspaceIdA, memberAdminId, 'ADMIN');

    expect(overview.kpis.attendance.totalSessions).toBe(2);
    expect(overview.kpis.attendance.totalWorkHours).toBe(12.0); // (480 + 240) / 60
    expect(overview.kpis.attendance.averageDailyHours).toBe(6.0); // 12 / 2
    expect(overview.kpis.attendance.presentToday).toBe(2);
    expect(overview.kpis.attendance.activeClockedIn).toBe(1);
  });

  it('TC-PHASE11-05: Metric definitions dictionary provides transparent formula metadata', () => {
    const definitions = analyticsService.getMetricDefinitions();
    expect(definitions.taskCompletionRate).toBeDefined();
    expect(definitions.averageWorkHours).toBeDefined();
    expect(definitions.slaAdherenceRate).toBeDefined();
    expect(definitions.averageQualityScore.formula).toContain('Sum(QualityReview.Score)');
  });

  it('TC-PHASE11-06: Universal calendar aggregates multiple operational layers into unified schema', async () => {
    const now = new Date();
    shiftTable.push({ id: 's1', workspaceId: workspaceIdA, name: 'Standard Day Shift', startTime: '09:00', endTime: '17:00', workDays: ['MON', 'TUE'] });
    leaveRequestTable.push({ id: 'l1', workspaceId: workspaceIdA, membershipId: memberAliceId, leaveType: 'ANNUAL', totalDays: 2, startDate: now, endDate: now, status: 'APPROVED' });
    taskTable.push({ id: 't1', workspaceId: workspaceIdA, title: 'Release v2.0', status: 'IN_PROGRESS', priority: 'URGENT', dueDate: now, createdAt: now });

    const calendar = await analyticsService.getCalendarEvents(workspaceIdA, memberAdminId, 'ADMIN');

    expect(calendar.events.length).toBeGreaterThanOrEqual(3);
    const layers = calendar.events.map((e) => e.layer);
    expect(layers).toContain('SHIFTS');
    expect(layers).toContain('LEAVE');
    expect(layers).toContain('TASKS');
  });

  it('TC-PHASE11-07: Drill-down reports return itemized and correctly mapped attributes', async () => {
    taskTable.push({
      id: 't1',
      workspaceId: workspaceIdA,
      title: 'Audit Engine Integration',
      status: 'COMPLETED',
      priority: 'HIGH',
      dueDate: new Date(),
      createdAt: new Date(),
      project: { id: 'p1', name: 'Core Platform', key: 'COR' },
      assignee: { user: { firstName: 'Alice', lastName: 'Engineer', email: 'alice@orvexa.io' } },
    });

    const drilldown = await analyticsService.getDrilldown(workspaceIdA, memberAdminId, 'ADMIN', 'tasks');

    expect(drilldown.category).toBe('tasks');
    expect(drilldown.total).toBe(1);
    const item = drilldown.items[0] as any;
    expect(item.title).toBe('Audit Engine Integration');
    expect(item.projectName).toBe('Core Platform');
    expect(item.assigneeName).toBe('Alice Engineer');
  });

  it('TC-PHASE11-08: Rejects unsupported drilldown categories with BadRequestException', async () => {
    await expect(
      analyticsService.getDrilldown(workspaceIdA, memberAdminId, 'ADMIN', 'unknown_category'),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-PHASE11-09: CSV export outputs RFC-compliant headers and escaped rows without leaking credentials', async () => {
    taskTable.push({
      id: 't1',
      workspaceId: workspaceIdA,
      title: 'Fix "Edge-Case" Bug',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date(),
      createdAt: new Date(),
      project: { id: 'p1', name: 'UI Engine' },
      assignee: { user: { firstName: 'Bob', lastName: 'Analyst', email: 'bob@orvexa.io' } },
    });

    const csvOutput = await analyticsService.exportData(workspaceIdA, memberAdminId, 'ADMIN', 'tasks', 'csv');

    expect(typeof csvOutput).toBe('string');
    expect(csvOutput).toContain('id,title,status,priority,dueDate,projectName,assigneeName,assigneeEmail,createdAt');
    expect(csvOutput).toContain('Fix ""Edge-Case"" Bug'); // Escaped quotes
    expect(csvOutput).not.toContain('passwordHash');
    expect(csvOutput).not.toContain('mfaSecret');
  });

  it('TC-PHASE11-10: Member permissions automatically constrain scoped metrics to assigned items', async () => {
    taskTable.push(
      { id: 't1', workspaceId: workspaceIdA, title: 'Alice Task', assigneeMembershipId: memberAliceId, status: 'COMPLETED', priority: 'LOW', createdAt: new Date() },
      { id: 't2', workspaceId: workspaceIdA, title: 'Bob Task', assigneeMembershipId: memberBobId, status: 'TODO', priority: 'HIGH', createdAt: new Date() },
    );

    // Alice requests overview with MEMBER role
    const aliceOverview = await analyticsService.getOverview(workspaceIdA, memberAliceId, 'MEMBER');

    expect(aliceOverview.kpis.tasks.total).toBe(1);
    expect(aliceOverview.kpis.tasks.completed).toBe(1);
    expect(aliceOverview.kpis.tasks.completionRate).toBe(100.0);
  });
});
