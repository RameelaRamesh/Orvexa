import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { LeaveService } from '../leave/leave.service';
import { PeopleService } from '../people/people.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../infrastructure/mail/mail.service';
import { LeaveType, LeaveStatus } from '@prisma/client';

describe('PHASE 10: Leave, Payroll and People Operations Acceptance Suite', () => {
  let payrollService: PayrollService;
  let leaveService: LeaveService;
  let peopleService: PeopleService;

  // In-memory mock storage
  let workspaceStorage: Record<string, any> = {};
  let leavePolicyTable: any[] = [];
  let leaveBalanceTable: any[] = [];
  let leaveRequestTable: any[] = [];
  let overtimeRequestTable: any[] = [];
  let taskTable: any[] = [];
  let workItemTable: any[] = [];
  let assetTable: any[] = [];
  let auditLogTable: any[] = [];
  let notificationTable: any[] = [];
  let usersTable: any[] = [];
  let membershipsTable: any[] = [];

  const workspaceIdA = 'ws_org_gamma_01';
  const workspaceIdB = 'ws_org_delta_02';

  const memberAliceId = 'mem_alice_admin'; // Admin / HR
  const memberBobId = 'mem_bob_eng';       // Employee with unpaid leave & overtime
  const memberCharlieId = 'mem_charlie_ux'; // Another Employee

  const mockPrisma: any = {
    workspace: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        const ws = workspaceStorage[where.id];
        return ws ? { id: where.id, settings: ws.settings } : null;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        if (!workspaceStorage[where.id]) {
          workspaceStorage[where.id] = { id: where.id, settings: {} };
        }
        workspaceStorage[where.id].settings = {
          ...workspaceStorage[where.id].settings,
          ...data.settings,
        };
        return workspaceStorage[where.id];
      }),
    },
    user: {
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = usersTable.findIndex((u) => u.id === where.id);
        if (idx !== -1) {
          if (data.tokenVersion?.increment) {
            usersTable[idx].tokenVersion = (usersTable[idx].tokenVersion || 1) + data.tokenVersion.increment;
          }
          return usersTable[idx];
        }
        return null;
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        return usersTable.find((u) => u.id === where.id) || null;
      }),
    },
    membership: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        const m = membershipsTable.find((x) => {
          if (where.id && x.id !== where.id) return false;
          if (where.workspaceId && x.workspaceId !== where.workspaceId) return false;
          return true;
        });
        if (!m) return null;
        const u = usersTable.find((usr) => usr.id === m.userId);
        return {
          ...m,
          user: u || { firstName: 'Member', lastName: 'User', email: 'user@test.org' },
          designation: { title: 'Engineer', level: 2 },
          department: { name: 'Engineering' },
        };
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        const m = membershipsTable.find((x) => x.id === where.id);
        if (!m) return null;
        const u = usersTable.find((usr) => usr.id === m.userId);
        return { ...m, user: u };
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return membershipsTable
          .filter((m) => {
            if (where.workspaceId && m.workspaceId !== where.workspaceId) return false;
            if (where.status?.in && !where.status.in.includes(m.status)) return false;
            return true;
          })
          .map((m) => {
            const u = usersTable.find((usr) => usr.id === m.userId);
            return {
              ...m,
              user: u,
              designation: { title: 'Engineer', level: 2 },
              department: { name: 'Engineering' },
            };
          });
      }),
      count: jest.fn().mockImplementation(async () => 2),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = membershipsTable.findIndex((m) => m.id === where.id);
        if (idx !== -1) {
          membershipsTable[idx] = { ...membershipsTable[idx], ...data };
          return membershipsTable[idx];
        }
        return null;
      }),
    },
    leavePolicy: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return leavePolicyTable.filter((p) => p.workspaceId === where.workspaceId);
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        return leavePolicyTable.find(
          (p) => p.workspaceId === where.workspaceId_leaveType.workspaceId && p.leaveType === where.workspaceId_leaveType.leaveType,
        ) || null;
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const rec = { id: `lp_${Date.now()}_${Math.random()}`, ...data };
        leavePolicyTable.push(rec);
        return rec;
      }),
      upsert: jest.fn().mockImplementation(async ({ where, create, update }) => {
        const idx = leavePolicyTable.findIndex(
          (p) => p.workspaceId === where.workspaceId_leaveType.workspaceId && p.leaveType === where.workspaceId_leaveType.leaveType,
        );
        if (idx !== -1) {
          leavePolicyTable[idx] = { ...leavePolicyTable[idx], ...update };
          return leavePolicyTable[idx];
        }
        const rec = { id: `lp_${Date.now()}`, ...create };
        leavePolicyTable.push(rec);
        return rec;
      }),
    },
    leaveBalance: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return leaveBalanceTable.filter(
          (b) => b.workspaceId === where.workspaceId && b.membershipId === where.membershipId,
        );
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        const key = where.membershipId_leaveType_year;
        return leaveBalanceTable.find(
          (b) => b.membershipId === key.membershipId && b.leaveType === key.leaveType && b.year === key.year,
        ) || null;
      }),
      upsert: jest.fn().mockImplementation(async ({ where, create, update }) => {
        const key = where.membershipId_leaveType_year;
        const idx = leaveBalanceTable.findIndex(
          (b) => b.membershipId === key.membershipId && b.leaveType === key.leaveType && b.year === key.year,
        );
        if (idx !== -1) {
          leaveBalanceTable[idx] = { ...leaveBalanceTable[idx], ...update };
          return leaveBalanceTable[idx];
        }
        const rec = {
          id: `bal_${Date.now()}_${Math.random()}`,
          allocated: 0,
          used: 0,
          pending: 0,
          carriedOver: 0,
          ...create,
        };
        leaveBalanceTable.push(rec);
        return rec;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = leaveBalanceTable.findIndex((b) => b.id === where.id);
        if (idx !== -1) {
          if (data.pending?.increment) leaveBalanceTable[idx].pending += data.pending.increment;
          if (data.pending?.decrement) leaveBalanceTable[idx].pending -= data.pending.decrement;
          if (data.used?.increment) leaveBalanceTable[idx].used += data.used.increment;
          if (data.used?.decrement) leaveBalanceTable[idx].used -= data.used.decrement;
          return leaveBalanceTable[idx];
        }
        return null;
      }),
    },
    leaveRequest: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return leaveRequestTable.filter((r) => {
          if (where.workspaceId && r.workspaceId !== where.workspaceId) return false;
          if (where.membershipId && r.membershipId !== where.membershipId) return false;
          if (where.status && r.status !== where.status) return false;
          return true;
        });
      }),
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        return leaveRequestTable.find((r) => {
          if (where.id && r.id !== where.id) return false;
          if (where.workspaceId && r.workspaceId !== where.workspaceId) return false;
          if (where.membershipId && r.membershipId !== where.membershipId) return false;
          if (where.status?.in && !where.status.in.includes(r.status)) return false;
          if (where.OR) {
            // Overlap check
            const startCheck = where.OR[0].startDate.lte;
            const endCheck = where.OR[0].endDate.gte;
            if (r.startDate <= startCheck && r.endDate >= endCheck) return true;
          }
          return true;
        }) || null;
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const rec = { id: `lr_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() };
        leaveRequestTable.push(rec);
        return rec;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = leaveRequestTable.findIndex((r) => r.id === where.id);
        if (idx !== -1) {
          leaveRequestTable[idx] = { ...leaveRequestTable[idx], ...data };
          return leaveRequestTable[idx];
        }
        return null;
      }),
    },
    overtimeRequest: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return overtimeRequestTable.filter((o) => {
          if (where.workspaceId && o.workspaceId !== where.workspaceId) return false;
          if (where.status && o.status !== where.status) return false;
          return true;
        });
      }),
    },
    task: {
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        taskTable.forEach((t) => {
          if (t.assigneeMembershipId === where.assigneeMembershipId) {
            t.assigneeMembershipId = data.assigneeMembershipId;
          }
        });
        return { count: 1 };
      }),
    },
    workItem: {
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        workItemTable.forEach((w) => {
          if (w.assignedMembershipId === where.assignedMembershipId) {
            w.assignedMembershipId = data.assignedMembershipId;
          }
        });
        return { count: 1 };
      }),
    },
    asset: {
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        assetTable.forEach((a) => {
          if (a.assignedToMembershipId === where.assignedToMembershipId) {
            a.assignedToMembershipId = data.assignedToMembershipId;
            a.status = data.status;
          }
        });
        return { count: 1 };
      }),
    },
    auditLog: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const entry = { id: `audit_${Date.now()}`, ...data, createdAt: new Date() };
        auditLogTable.push(entry);
        return entry;
      }),
    },
    notification: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const n = { id: `notif_${Date.now()}`, ...data, createdAt: new Date() };
        notificationTable.push(n);
        return n;
      }),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockPrisma);
    }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    // Reset DB state
    leavePolicyTable = [];
    leaveBalanceTable = [];
    leaveRequestTable = [];
    overtimeRequestTable = [];
    taskTable = [];
    workItemTable = [];
    assetTable = [];
    auditLogTable = [];
    notificationTable = [];

    usersTable = [
      { id: 'u_alice', email: 'alice@gamma.org', firstName: 'Alice', lastName: 'Admin', tokenVersion: 1 },
      { id: 'u_bob', email: 'bob@gamma.org', firstName: 'Bob', lastName: 'Engineer', tokenVersion: 1 },
      { id: 'u_charlie', email: 'charlie@gamma.org', firstName: 'Charlie', lastName: 'Designer', tokenVersion: 1 },
    ];

    membershipsTable = [
      { id: memberAliceId, userId: 'u_alice', workspaceId: workspaceIdA, accessRole: 'ADMIN', status: 'ACTIVE' },
      {
        id: memberBobId,
        userId: 'u_bob',
        workspaceId: workspaceIdA,
        accessRole: 'MEMBER',
        status: 'ACTIVE',
        employeeId: 'EMP-BOB-01',
        phone: '+1 555-0199',
        emergencyContact: { name: 'Sarah', phone: '555-9999' },
      },
      {
        id: memberCharlieId,
        userId: 'u_charlie',
        workspaceId: workspaceIdA,
        accessRole: 'MEMBER',
        status: 'ACTIVE',
        // Incomplete profile for testing
        employeeId: null,
        phone: null,
        emergencyContact: null,
      },
    ];

    workspaceStorage = {
      [workspaceIdA]: {
        id: workspaceIdA,
        settings: {
          payrollConfig: {
            currency: 'USD',
            payFrequency: 'MONTHLY',
            workingDaysPerMonth: 22,
            enableUnpaidLeaveDeduction: true,
            enableOvertimePay: true,
            overtimeMultiplier: 1.5,
            standardAllowances: [{ name: 'Transport & Internet', amount: 350 }],
            standardDeductions: [{ name: 'Voluntary Insurance', amount: 200 }],
          },
          memberSalaryStructures: {
            [memberBobId]: {
              baseSalary: 5500, // $5,500 / 22 = $250/day = $31.25/hr
              currency: 'USD',
              allowances: [{ name: 'Housing & Utilities', amount: 650 }],
              deductions: [{ name: 'Healthcare Contribution', amount: 200 }],
            },
          },
          payrollPeriods: [],
          employeeOnboardingTasks: {},
        },
      },
      [workspaceIdB]: {
        id: workspaceIdB,
        settings: {
          payrollConfig: {},
          payrollPeriods: [],
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        LeaveService,
        PeopleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    payrollService = module.get<PayrollService>(PayrollService);
    leaveService = module.get<LeaveService>(LeaveService);
    peopleService = module.get<PeopleService>(PeopleService);
  });

  // ===========================================================================
  // SECTION 1: LEAVE ENGINE (BALANCES, OVERLAP & APPROVAL CHAIN)
  // ===========================================================================
  describe('1. Leave Balances, Overlapping Requests & Approvals', () => {
    it('seeds and allocates annual leave balances according to policy', async () => {
      const balances = await leaveService.getMemberBalances(workspaceIdA, memberBobId, 2026);
      expect(balances.length).toBeGreaterThanOrEqual(4);

      const annualBal = balances.find((b) => b.leaveType === LeaveType.ANNUAL);
      expect(annualBal?.allocated).toBe(15);
      expect(annualBal?.used).toBe(0);
    });

    it('creates leave request, updates pending balance, and rejects overlapping requests', async () => {
      // Bob applies for Annual Leave Oct 10 to Oct 12 (3 days)
      const req = await leaveService.create(workspaceIdA, memberBobId, {
        leaveType: LeaveType.ANNUAL,
        startDate: '2026-10-10',
        endDate: '2026-10-12',
        totalDays: 3,
        reason: 'Family event',
      });

      expect(req.status).toBe('PENDING');
      expect(req.totalDays).toBe(3);

      // Verify balance pending incremented
      const bal = await mockPrisma.leaveBalance.findUnique({
        where: { membershipId_leaveType_year: { membershipId: memberBobId, leaveType: LeaveType.ANNUAL, year: 2026 } },
      });
      expect(bal.pending).toBe(3);

      // Attempting an overlapping leave request (Oct 11 to Oct 13) must throw BadRequestException
      await expect(
        leaveService.create(workspaceIdA, memberBobId, {
          leaveType: LeaveType.ANNUAL,
          startDate: '2026-10-11',
          endDate: '2026-10-13',
          totalDays: 3,
          reason: 'Overlapping request',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves leave request, transitions balance from pending to used', async () => {
      const req = await leaveService.create(workspaceIdA, memberBobId, {
        leaveType: LeaveType.ANNUAL,
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        totalDays: 2,
      });

      // Admin Alice approves request
      const approved = await leaveService.updateStatus(req.id, workspaceIdA, memberAliceId, LeaveStatus.APPROVED);
      expect(approved.status).toBe('APPROVED');

      const bal = await mockPrisma.leaveBalance.findUnique({
        where: { membershipId_leaveType_year: { membershipId: memberBobId, leaveType: LeaveType.ANNUAL, year: 2026 } },
      });
      expect(bal.pending).toBe(0);
      expect(bal.used).toBe(2);
    });

    it('rejects leave request and restores pending balance', async () => {
      const req = await leaveService.create(workspaceIdA, memberBobId, {
        leaveType: LeaveType.ANNUAL,
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        totalDays: 3,
      });

      const rejected = await leaveService.updateStatus(req.id, workspaceIdA, memberAliceId, LeaveStatus.REJECTED);
      expect(rejected.status).toBe('REJECTED');

      const bal = await mockPrisma.leaveBalance.findUnique({
        where: { membershipId_leaveType_year: { membershipId: memberBobId, leaveType: LeaveType.ANNUAL, year: 2026 } },
      });
      expect(bal.pending).toBe(0);
    });
  });

  // ===========================================================================
  // SECTION 2: PEOPLE OPERATIONS, INCOMPLETE PROFILES & OFFBOARDING
  // ===========================================================================
  describe('2. Profile Completeness, Reminders and Offboarding Access Revocation', () => {
    it('accurately calculates employee profile completeness and missing fields', async () => {
      // Bob has emergency contact, phone, and employeeId -> ~90-100%
      const bobCheck = await peopleService.getProfileCompleteness(workspaceIdA, memberBobId);
      expect(bobCheck.completionPercentage).toBeGreaterThanOrEqual(80);

      // Charlie is missing emergency contact, phone, employeeId -> lower score
      const charlieCheck = await peopleService.getProfileCompleteness(workspaceIdA, memberCharlieId);
      expect(charlieCheck.completionPercentage).toBeLessThan(70);
      expect(charlieCheck.missingFields).toContain('Contact Phone');
      expect(charlieCheck.missingFields).toContain('Emergency Contact');
    });

    it('dispatches actionable incomplete profile reminder to employee', async () => {
      const res = await peopleService.sendIncompleteProfileReminder(workspaceIdA, memberCharlieId, memberAliceId);
      expect(res.completeness.missingFields.length).toBeGreaterThan(0);

      // Verify notification created
      expect(notificationTable.some((n) => n.recipientMembershipId === memberCharlieId && n.title.includes('Complete Your Employee Profile'))).toBe(true);
      // Verify audit log
      expect(auditLogTable.some((l) => l.action === 'PROFILE_REMINDER_SENT')).toBe(true);
    });

    it('executes offboarding: unassigns assets, reassigns tasks, revokes access tokens, and preserves audit logs', async () => {
      // Seed an assigned task and asset for Bob
      taskTable.push({ id: 'task_1', assigneeMembershipId: memberBobId, status: 'IN_PROGRESS' });
      assetTable.push({ id: 'ast_1', assignedToMembershipId: memberBobId, status: 'ASSIGNED' });

      // Initiate offboarding
      await peopleService.initiateOffboarding(workspaceIdA, memberBobId, {
        lastWorkingDate: '2026-10-31',
        exitReason: 'Relocating internationally',
      });

      // Complete offboarding with reassignment to Charlie
      const completeRes = await peopleService.completeOffboarding(workspaceIdA, memberBobId, {
        reassignToMembershipId: memberCharlieId,
      });

      expect(completeRes.membership.status).toBe('OFFBOARDED');
      expect(completeRes.membership.offboardingStatus).toBe('COMPLETED');

      // Verify task reassigned to Charlie
      expect(taskTable[0].assigneeMembershipId).toBe(memberCharlieId);

      // Verify asset returned to available pool
      expect(assetTable[0].assignedToMembershipId).toBeNull();
      expect(assetTable[0].status).toBe('AVAILABLE');

      // Verify user tokenVersion incremented (immediately invalidates all active sessions/JWTs)
      const user = usersTable.find((u) => u.id === 'u_bob');
      expect(user.tokenVersion).toBe(2);
    });
  });

  // ===========================================================================
  // SECTION 3: REPRODUCIBLE PAYROLL, UNPAID LEAVE LOP & ATTENDANCE
  // ===========================================================================
  describe('3. Payroll Calculation, Attendance/Leave Connection, Locking & Reproducibility', () => {
    it('calculates reproducible payslip integrating unpaid leave LOP and overtime pay', async () => {
      // 1. Setup Bob with 2 days approved UNPAID leave in October 2026
      leaveRequestTable.push({
        id: 'lr_unpaid_01',
        workspaceId: workspaceIdA,
        membershipId: memberBobId,
        leaveType: 'UNPAID',
        startDate: new Date('2026-10-15'),
        endDate: new Date('2026-10-16'),
        totalDays: 2,
        status: 'APPROVED',
      });

      // 2. Setup Bob with 8 hours approved Overtime in October 2026
      overtimeRequestTable.push({
        id: 'ot_01',
        workspaceId: workspaceIdA,
        membershipId: memberBobId,
        date: new Date('2026-10-20'),
        hours: 8,
        status: 'APPROVED',
      });

      // 3. Create October 2026 payroll period
      const period = await payrollService.createPeriod(workspaceIdA, {
        name: 'October 2026 Monthly Payroll',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      // 4. Calculate period payroll
      const calculated = await payrollService.calculatePeriodPayroll(workspaceIdA, period.id);
      expect(calculated.status).toBe('CALCULATED');

      const bobPayslip = calculated.payslips.find((ps) => ps.membershipId === memberBobId);
      expect(bobPayslip).toBeDefined();

      // MATHEMATICAL VERIFICATION:
      // Base: $5,500. Working days: 22. Daily rate: $5500 / 22 = $250. Hourly: $250 / 8 = $31.25.
      // Unpaid Leave (LOP): 2 days * $250 = $500.
      // Overtime Pay: 8 hrs * $31.25 * 1.5 multiplier = $375.
      // Allowances: $650.
      // Standard Deductions: $200.
      // Gross = $5500 + $650 + $375 = $6,525.
      // Total Deductions = $200 + $500 = $700.
      // Net Pay = $6525 - $700 = $5,825.
      expect(bobPayslip?.baseSalary).toBe(5500);
      expect(bobPayslip?.unpaidLeaveDays).toBe(2);
      expect(bobPayslip?.unpaidLeaveDeduction).toBe(500);
      expect(bobPayslip?.overtimeHours).toBe(8);
      expect(bobPayslip?.overtimePay).toBe(375);
      expect(bobPayslip?.grossSalary).toBe(6525);
      expect(bobPayslip?.totalDeductions).toBe(700);
      expect(bobPayslip?.netSalary).toBe(5825);

      // Verify formula transparency and audit breakdown
      expect(bobPayslip?.calculationBreakdown.unpaidLeaveFormula).toContain('2 unpaid days × $250/day = $500');

      // 5. Reproducibility test: re-calculating produces exact identical net salary
      const recalculated = await payrollService.calculatePeriodPayroll(workspaceIdA, period.id);
      const bobRecalc = recalculated.payslips.find((ps) => ps.membershipId === memberBobId);
      expect(bobRecalc?.netSalary).toBe(5825);
    });

    it('approves payroll period, permanently locking payslips against further mutation', async () => {
      const period = await payrollService.createPeriod(workspaceIdA, {
        name: 'November 2026 Monthly Payroll',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      });

      await payrollService.calculatePeriodPayroll(workspaceIdA, period.id);

      // Approve payroll period
      const approved = await payrollService.approvePeriod(workspaceIdA, period.id, memberAliceId);
      expect(approved.status).toBe('APPROVED');
      expect(approved.payslips.every((ps) => ps.locked === true)).toBe(true);

      // Attempting to recalculate an APPROVED period must throw BadRequestException
      await expect(
        payrollService.calculatePeriodPayroll(workspaceIdA, period.id),
      ).rejects.toThrow(BadRequestException);

      // Verify AuditLog
      expect(auditLogTable.some((l) => l.action === 'PAYROLL_APPROVED' && l.entityId === period.id)).toBe(true);
    });
  });

  // ===========================================================================
  // SECTION 4: PAYROLL PERMISSIONS & HISTORICAL REPORTS
  // ===========================================================================
  describe('4. Payroll Permissions & Historical Reports', () => {
    it('restricts payslip view to authorized users (employees cannot view peers)', async () => {
      const period = await payrollService.createPeriod(workspaceIdA, {
        name: 'December 2026 Payroll',
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
      const calculated = await payrollService.calculatePeriodPayroll(workspaceIdA, period.id);
      const bobPayslip = calculated.payslips.find((ps) => ps.membershipId === memberBobId);

      // Charlie (regular member) attempts to access Bob's payslip -> ForbiddenException
      await expect(
        payrollService.getPayslip(workspaceIdA, period.id, bobPayslip!.id, {
          membershipId: memberCharlieId,
          accessRole: 'MEMBER',
        }),
      ).rejects.toThrow(ForbiddenException);

      // Bob can access his own payslip
      const bobSelfView = await payrollService.getPayslip(workspaceIdA, period.id, bobPayslip!.id, {
        membershipId: memberBobId,
        accessRole: 'MEMBER',
      });
      expect(bobSelfView.id).toBe(bobPayslip!.id);

      // Alice (Admin) can view Bob's payslip
      const adminView = await payrollService.getPayslip(workspaceIdA, period.id, bobPayslip!.id, {
        membershipId: memberAliceId,
        accessRole: 'ADMIN',
      });
      expect(adminView.id).toBe(bobPayslip!.id);
    });

    it('generates historical date-range and employee-specific reports', async () => {
      const report = await payrollService.getHistoricalReports(workspaceIdA, {}, { accessRole: 'ADMIN' });
      expect(report.totalRecords).toBeGreaterThan(0);
      expect(report.totalDisbursedNet).toBeGreaterThan(0);
    });
  });
});
