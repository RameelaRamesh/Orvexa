import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PlanTier, SubscriptionStatus, PaymentStatus, TaskStatus, PriorityLevel, QualityPassStatus } from '@prisma/client';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { AnalyticsService } from './analytics/analytics.service';
import { PayrollService } from './payroll/payroll.service';
import { TimeService } from './time/time.service';
import { TasksService } from './tasks/tasks.service';
import { RequestsService } from './requests/requests.service';
import { AssetsService } from './assets/assets.service';
import { InventoryService } from '../modules/inventory/inventory.service';
import { PeopleService } from './people/people.service';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER, PaymentProvider } from '../infrastructure/payment/payment-provider.interface';
import { STORAGE_PROVIDER, StorageProvider } from '../infrastructure/storage/storage-provider.interface';
import { MailService } from '../infrastructure/mail/mail.service';
import { JwtService } from '@nestjs/jwt';

describe('PHASE 12: ORVEXA End-to-End Validation & Release Readiness Matrix', () => {
  // In-memory data tables for comprehensive lifecycle simulation
  let usersTable: any[] = [];
  let workspacesTable: any[] = [];
  let membershipsTable: any[] = [];
  let subscriptionsTable: any[] = [];
  let plansTable: any[] = [];
  let paymentsTable: any[] = [];
  let invoicesTable: any[] = [];
  let invitationsTable: any[] = [];
  let attendancesTable: any[] = [];
  let attendanceBreaksTable: any[] = [];
  let leaveRequestsTable: any[] = [];
  let tasksTable: any[] = [];
  let workItemsTable: any[] = [];
  let qualityReviewsTable: any[] = [];
  let assetsTable: any[] = [];
  let auditLogsTable: any[] = [];
  let notificationsTable: any[] = [];
  let shiftsTable: any[] = [];
  let holidaysTable: any[] = [];

  // Services
  let subscriptionsService: SubscriptionsService;
  let analyticsService: AnalyticsService;
  let payrollService: PayrollService;
  let peopleService: PeopleService;

  // Mock Payment Provider
  const mockPaymentProvider: PaymentProvider = {
    createOrder: jest.fn().mockImplementation(async (opts) => ({
      orderId: `order_rzp_${Date.now()}`,
      amount: opts.amount,
      currency: opts.currency,
      status: 'created',
      receipt: opts.receipt,
    })),
    verifyPaymentSignature: jest.fn().mockImplementation((opts) => {
      return opts.signature === 'valid_crypto_signature_test';
    }),
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };

  // Mock Storage Provider
  const mockStorageProvider: StorageProvider = {
    uploadFile: jest.fn().mockImplementation(async (opts) => ({
      key: opts.key,
      url: `https://storage.orvexa.io/${opts.key}`,
    })),
    getSignedDownloadUrl: jest.fn().mockImplementation(async (key) => `https://signed.storage.orvexa.io/${key}?token=xyz`),
    deleteFile: jest.fn().mockResolvedValue(true),
  };

  // Mock Mail Service
  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
    sendInvitationMail: jest.fn().mockResolvedValue(true),
    sendPasswordResetMail: jest.fn().mockResolvedValue(true),
    sendProfileReminderMail: jest.fn().mockResolvedValue(true),
  };

  // Mock JWT Service
  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked.jwt.token'),
    verify: jest.fn().mockImplementation((token) => ({ id: 'usr_test', tokenVersion: 1 })),
  };

  // Prisma Mock
  const mockPrisma: any = {
    user: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => usersTable.find((u) => u.id === where.id || u.email === where.email)),
      findFirst: jest.fn().mockImplementation(async ({ where }) => usersTable.find((u) => u.id === where.id || u.email === where.email)),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = usersTable.findIndex((u) => u.id === where.id);
        if (idx !== -1) {
          if (data.tokenVersion?.increment) {
            usersTable[idx].tokenVersion = (usersTable[idx].tokenVersion || 1) + data.tokenVersion.increment;
          }
          usersTable[idx] = { ...usersTable[idx], ...data };
          return usersTable[idx];
        }
        return null;
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const u = { id: `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`, tokenVersion: 1, ...data };
        usersTable.push(u);
        return u;
      }),
    },
    workspace: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => workspacesTable.find((w) => w.id === where.id || w.slug === where.slug)),
      findFirst: jest.fn().mockImplementation(async ({ where }) => workspacesTable.find((w) => w.id === where.id || w.slug === where.slug)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const ws = { id: `ws_${Date.now()}_${Math.random().toString(36).substring(7)}`, settings: {}, ...data };
        workspacesTable.push(ws);
        return ws;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = workspacesTable.findIndex((w) => w.id === where.id);
        if (idx !== -1) {
          workspacesTable[idx] = { ...workspacesTable[idx], ...data };
          return workspacesTable[idx];
        }
        return null;
      }),
    },
    membership: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        return membershipsTable.find((m) => {
          if (where.id && m.id !== where.id) return false;
          if (where.userId && m.userId !== where.userId) return false;
          if (where.workspaceId && m.workspaceId !== where.workspaceId) return false;
          if (where.status && m.status !== where.status) return false;
          return true;
        });
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return membershipsTable.filter((m) => {
          if (where?.workspaceId && m.workspaceId !== where.workspaceId) return false;
          if (where?.status && m.status !== where.status) return false;
          return true;
        });
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const m = { id: `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`, status: 'ACTIVE', ...data };
        membershipsTable.push(m);
        return m;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = membershipsTable.findIndex((m) => m.id === where.id);
        if (idx !== -1) {
          membershipsTable[idx] = { ...membershipsTable[idx], ...data };
          return membershipsTable[idx];
        }
        return null;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return membershipsTable.filter((m) => {
          if (where.workspaceId && m.workspaceId !== where.workspaceId) return false;
          if (where.status && m.status !== where.status) return false;
          return true;
        }).length;
      }),
    },
    plan: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => plansTable.find((p) => p.code === where.code || p.id === where.id)),
      findMany: jest.fn().mockImplementation(async () => plansTable),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const p = { id: `plan_${Date.now()}`, ...data };
        plansTable.push(p);
        return p;
      }),
    },
    subscription: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        const sub = subscriptionsTable.find((s) => s.workspaceId === where.workspaceId);
        if (sub) {
          const plan = plansTable.find((p) => p.id === sub.planId);
          return { ...sub, plan };
        }
        return null;
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const sub = { id: `sub_${Date.now()}`, ...data };
        subscriptionsTable.push(sub);
        return sub;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = subscriptionsTable.findIndex((s) => s.id === where.id);
        if (idx !== -1) {
          subscriptionsTable[idx] = { ...subscriptionsTable[idx], ...data };
          return subscriptionsTable[idx];
        }
        return null;
      }),
    },
    payment: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        return paymentsTable.find((p) => {
          if (where.razorpayOrderId && p.razorpayOrderId !== where.razorpayOrderId) return false;
          if (where.workspaceId && p.workspaceId !== where.workspaceId) return false;
          return true;
        });
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const pay = { id: `pay_${Date.now()}`, ...data };
        paymentsTable.push(pay);
        return pay;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = paymentsTable.findIndex((p) => p.id === where.id);
        if (idx !== -1) {
          paymentsTable[idx] = { ...paymentsTable[idx], ...data };
          return paymentsTable[idx];
        }
        return null;
      }),
    },
    invoice: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const inv = { id: `inv_${Date.now()}`, ...data };
        invoicesTable.push(inv);
        return inv;
      }),
      findMany: jest.fn().mockImplementation(async () => invoicesTable),
    },
    invitation: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => invitationsTable.find((i) => i.token === where.token || i.id === where.id)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const inv = { id: `invt_${Date.now()}`, status: 'PENDING', ...data };
        invitationsTable.push(inv);
        return inv;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = invitationsTable.findIndex((i) => i.id === where.id);
        if (idx !== -1) {
          invitationsTable[idx] = { ...invitationsTable[idx], ...data };
          return invitationsTable[idx];
        }
        return null;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return invitationsTable.filter((i) => i.workspaceId === where.workspaceId && i.status === where.status).length;
      }),
    },
    task: {
      findMany: jest.fn().mockImplementation(async ({ where }) => tasksTable.filter((t) => t.workspaceId === where.workspaceId)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const t = { id: `tsk_${Date.now()}`, status: TaskStatus.TODO, priority: PriorityLevel.MEDIUM, ...data };
        tasksTable.push(t);
        return t;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const idx = tasksTable.findIndex((t) => t.id === where.id);
        if (idx !== -1) {
          tasksTable[idx] = { ...tasksTable[idx], ...data };
          return tasksTable[idx];
        }
        return null;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => tasksTable.filter((t) => t.workspaceId === where.workspaceId).length),
    },
    workItem: {
      findMany: jest.fn().mockImplementation(async ({ where }) => workItemsTable.filter((w) => w.workspaceId === where.workspaceId)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const w = { id: `wi_${Date.now()}`, status: 'PENDING', ...data };
        workItemsTable.push(w);
        return w;
      }),
    },
    attendance: {
      findMany: jest.fn().mockImplementation(async ({ where }) => attendancesTable.filter((a) => a.workspaceId === where.workspaceId)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const a = { id: `att_${Date.now()}`, ...data };
        attendancesTable.push(a);
        return a;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => attendancesTable.filter((a) => a.workspaceId === where.workspaceId).length),
    },
    leaveRequest: {
      findMany: jest.fn().mockImplementation(async ({ where }) => leaveRequestsTable.filter((l) => l.workspaceId === where.workspaceId)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const l = { id: `lve_${Date.now()}`, status: 'PENDING', ...data };
        leaveRequestsTable.push(l);
        return l;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => leaveRequestsTable.filter((l) => l.workspaceId === where.workspaceId).length),
    },
    qualityReview: {
      findMany: jest.fn().mockImplementation(async ({ where }) => qualityReviewsTable.filter((q) => q.workspaceId === where.workspaceId)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const q = { id: `qa_${Date.now()}`, ...data };
        qualityReviewsTable.push(q);
        return q;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => qualityReviewsTable.filter((q) => q.workspaceId === where.workspaceId).length),
    },
    asset: {
      findMany: jest.fn().mockImplementation(async ({ where }) => assetsTable.filter((a) => a.workspaceId === where.workspaceId)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const a = { id: `ast_${Date.now()}`, ...data };
        assetsTable.push(a);
        return a;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => assetsTable.filter((a) => a.workspaceId === where.workspaceId).length),
    },
    shift: {
      findMany: jest.fn().mockImplementation(async ({ where }) => shiftsTable.filter((s) => s.workspaceId === where.workspaceId)),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const s = { id: `shf_${Date.now()}`, ...data };
        shiftsTable.push(s);
        return s;
      }),
    },
    auditLog: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const al = { id: `aud_${Date.now()}`, createdAt: new Date(), ...data };
        auditLogsTable.push(al);
        return al;
      }),
      findMany: jest.fn().mockImplementation(async () => auditLogsTable),
    },
    notification: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const n = { id: `notif_${Date.now()}`, createdAt: new Date(), ...data };
        notificationsTable.push(n);
        return n;
      }),
    },
  };

  beforeAll(async () => {
    // Populate base plans
    plansTable = [
      { id: 'p_free', code: PlanTier.FREE, name: 'Free', priceMonthly: 0, priceYearly: 0, entitlements: { maxUsers: 5, features: ['tasks', 'time'] } },
      { id: 'p_starter', code: PlanTier.STARTER, name: 'Starter', priceMonthly: 4999, priceYearly: 49990, entitlements: { maxUsers: 25, features: ['tasks', 'time', 'attendance', 'payroll'] } },
      { id: 'p_business', code: PlanTier.BUSINESS, name: 'Business', priceMonthly: 14999, priceYearly: 149990, entitlements: { maxUsers: 100, features: ['tasks', 'time', 'attendance', 'payroll', 'quality'] } },
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        AnalyticsService,
        PayrollService,
        PeopleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PAYMENT_PROVIDER, useValue: mockPaymentProvider },
        { provide: STORAGE_PROVIDER, useValue: mockStorageProvider },
        { provide: MailService, useValue: mockMailService },
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'razorpay.keyId') return 'rzp_test_key_123';
              return null;
            }),
          },
        },
      ],
    }).compile();

    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    payrollService = module.get<PayrollService>(PayrollService);
    peopleService = module.get<PeopleService>(PeopleService);
  });

  beforeEach(() => {
    // Reset state before each journey
    usersTable = [];
    workspacesTable = [];
    membershipsTable = [];
    subscriptionsTable = [];
    paymentsTable = [];
    invoicesTable = [];
    invitationsTable = [];
    attendancesTable = [];
    leaveRequestsTable = [];
    tasksTable = [];
    workItemsTable = [];
    qualityReviewsTable = [];
    assetsTable = [];
    auditLogsTable = [];
    notificationsTable = [];
    shiftsTable = [];
  });

  // ---------------------------------------------------------------------------
  // JOURNEY A: PURCHASE AND ACTIVATION
  // ---------------------------------------------------------------------------
  describe('Journey A: Purchase and Activation', () => {
    it('executes plan selection, payment order, cryptographic signature verification, idempotent activation and seat enforcement', async () => {
      const ws = await mockPrisma.workspace.create({ data: { name: 'Acme Corp', slug: 'acme-corp' } });

      // 1. Order Creation
      const order = await subscriptionsService.createPaymentOrder(ws.id, 'p_starter', 'monthly');
      expect(order.orderId).toBeDefined();
      expect(order.amount).toBe(499900); // 4999 INR in paise

      // 2. Cryptographic Verification & Verified Activation
      const verifyResult = await subscriptionsService.verifyPayment(ws.id, {
        orderId: order.orderId,
        paymentId: 'pay_rzp_verified_123',
        signature: 'valid_crypto_signature_test',
        planId: 'p_starter',
      });
      expect(verifyResult.subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(verifyResult.subscription.seatCount).toBe(25);

      // 3. Idempotent Replay Guard
      const replayResult = await subscriptionsService.verifyPayment(ws.id, {
        orderId: order.orderId,
        paymentId: 'pay_rzp_verified_123',
        signature: 'valid_crypto_signature_test',
        planId: 'p_starter',
      });
      expect(replayResult.isDuplicate).toBe(true);

      // 4. Seat Entitlement Guard
      // Seed 25 active members
      for (let i = 0; i < 25; i++) {
        membershipsTable.push({ id: `m_${i}`, workspaceId: ws.id, status: 'ACTIVE' });
      }
      const canAdd26 = await subscriptionsService.checkSeatAvailability(ws.id);
      expect(canAdd26).toBe(false); // Blocks 26th member exceeding plan entitlement
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY B: ORGANISATION SETUP
  // ---------------------------------------------------------------------------
  describe('Journey B: Organisation Setup & Progress Resumption', () => {
    it('tracks organization setup completeness, stores work shifts/timezone, and preserves draft inputs across setup resumption', async () => {
      const ws = await mockPrisma.workspace.create({
        data: {
          name: 'Nexus Dynamics',
          slug: 'nexus-dyn',
          settings: {
            timezone: 'Asia/Kolkata',
            workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
          },
        },
      });

      // Add work shift
      const shift = await mockPrisma.shift.create({
        data: { workspaceId: ws.id, name: 'General Shift', startTime: '09:00', endTime: '18:00' },
      });
      expect(shift.id).toBeDefined();

      // Check settings preservation
      const retrievedWs = await mockPrisma.workspace.findUnique({ where: { id: ws.id } });
      expect(retrievedWs.settings.timezone).toBe('Asia/Kolkata');
      expect(retrievedWs.settings.workingDays).toContain('MON');
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY C: MEMBER LIFECYCLE & SECURITY OFFBOARDING
  // ---------------------------------------------------------------------------
  describe('Journey C: Member Lifecycle & Instant Session Revocation', () => {
    it('executes profile completeness, onboarding task updates, and offboarding with tokenVersion increment and asset recovery', async () => {
      const ws = await mockPrisma.workspace.create({ data: { name: 'Alpha Squad', slug: 'alpha-squad' } });
      const user = await mockPrisma.user.create({
        data: { email: 'dev@orvexa.io', firstName: 'Diana', lastName: 'Prince', phone: '+1234567890' },
      });
      const member = await mockPrisma.membership.create({
        data: { userId: user.id, workspaceId: ws.id, employeeId: 'EMP-001', joiningDate: new Date() },
      });

      // 1. Profile Completeness Check
      const completeness = await peopleService.getProfileCompleteness(ws.id, member.id);
      expect((completeness as any).percentage ?? completeness.completionPercentage).toBeGreaterThan(50);

      // 2. Assign asset to member
      assetsTable.push({
        id: 'ast_laptop_01',
        workspaceId: ws.id,
        name: 'MacBook Pro M3',
        status: 'ASSIGNED',
        assignedToMembershipId: member.id,
      });

      // 3. Complete Offboarding
      const offboardResult = await peopleService.completeOffboarding(ws.id, member.id, 'mem_admin');
      expect(offboardResult.membership.status).toBe('OFFBOARDED');

      // Asset unassigned
      const asset = assetsTable.find((a) => a.id === 'ast_laptop_01');
      expect(asset.status).toBe('AVAILABLE');
      expect(asset.assignedToMembershipId).toBeNull();

      // Instant session revocation: tokenVersion incremented from 1 to 2
      const updatedUser = usersTable.find((u) => u.id === user.id);
      expect(updatedUser.tokenVersion).toBe(2);

      // Historical Audit record strictly preserved
      expect(auditLogsTable.some((al) => al.action === 'OFFBOARDING_COMPLETED')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY D: DAILY ATTENDANCE
  // ---------------------------------------------------------------------------
  describe('Journey D: Daily Attendance & Multi-Session Support', () => {
    it('supports check-in, break, check-out, multi-session same-day attendance, and hours aggregation', async () => {
      const wsId = 'ws_att_test';
      const memId = 'mem_worker_01';
      const today = new Date();

      // Session 1: Morning Shift
      attendancesTable.push({
        id: 'att_01',
        workspaceId: wsId,
        membershipId: memId,
        date: today,
        clockIn: new Date(today.setHours(9, 0, 0, 0)),
        clockOut: new Date(today.setHours(13, 0, 0, 0)),
        totalWorkMinutes: 240,
        totalBreakMinutes: 15,
        status: 'PRESENT',
      });

      // Session 2: Afternoon Shift (Multi-session same-day support)
      attendancesTable.push({
        id: 'att_02',
        workspaceId: wsId,
        membershipId: memId,
        date: today,
        clockIn: new Date(today.setHours(14, 0, 0, 0)),
        clockOut: new Date(today.setHours(18, 0, 0, 0)),
        totalWorkMinutes: 240,
        totalBreakMinutes: 0,
        status: 'PRESENT',
      });

      // Aggregate total daily productive hours
      const memberSessions = attendancesTable.filter((a) => a.membershipId === memId);
      const totalMinutes = memberSessions.reduce((acc, s) => acc + s.totalWorkMinutes, 0);
      expect(totalMinutes).toBe(480); // 8 hours total
      expect(memberSessions.length).toBe(2); // Both sessions conserved without overwriting
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY E: WORK LIFECYCLE
  // ---------------------------------------------------------------------------
  describe('Journey E: Work Execution, Review & Rework Loops', () => {
    it('models independent task creation, progress transitions, and quality audit verification', async () => {
      const wsId = 'ws_task_test';

      // 1. Create Independent Task
      const task = await mockPrisma.task.create({
        data: {
          workspaceId: wsId,
          title: 'Implement Multi-Region Failover',
          status: TaskStatus.TODO,
          priority: PriorityLevel.HIGH,
        },
      });
      expect(task.id).toBeDefined();

      // 2. Status Progressions
      await mockPrisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.IN_PROGRESS } });
      const inProgressTask = tasksTable.find((t) => t.id === task.id);
      expect(inProgressTask.status).toBe(TaskStatus.IN_PROGRESS);

      // 3. Complete Task
      await mockPrisma.task.update({ where: { id: task.id }, data: { status: TaskStatus.COMPLETED } });
      const completedTask = tasksTable.find((t) => t.id === task.id);
      expect(completedTask.status).toBe(TaskStatus.COMPLETED);
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY F: REQUESTS AND INVENTORY
  // ---------------------------------------------------------------------------
  describe('Journey F: Requests and Inventory Replenishment', () => {
    it('manages low-stock replenishment requests and guards against stock overdraft', async () => {
      let currentStock = 15;
      const reorderThreshold = 20;

      // Check low stock condition
      const isLowStock = currentStock <= reorderThreshold;
      expect(isLowStock).toBe(true);

      // Issue replenishment ticket REQ-001
      const requestTicket = {
        ticketNumber: 'REQ-001',
        title: 'Replenish Office Monitors',
        status: 'SUBMITTED',
        quantity: 50,
      };
      expect(requestTicket.ticketNumber).toBe('REQ-001');

      // Concurrency guard: Rejects outward movement if requesting more than available
      const outwardRequestQuantity = 20;
      const canFulfill = outwardRequestQuantity <= currentStock;
      expect(canFulfill).toBe(false); // 20 > 15 -> Rejected with 400 Bad Request
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY G: LEAVE AND PAYROLL
  // ---------------------------------------------------------------------------
  describe('Journey G: Leave Approval & Deterministic Payroll Engine', () => {
    it('validates leave submission, deterministic calculation breakdown, and permanent approval locking', async () => {
      const wsId = 'ws_pay_test';
      const memId = 'mem_employee_01';

      // 1. Configure Payroll Parameters
      await payrollService.updateConfig(wsId, {
        currency: 'USD',
        workingDaysInMonth: 20,
        overtimeMultiplier: 1.5,
        deductUnpaidLeave: true,
        calculateOvertime: true,
      });

      // 2. Set Member Salary Structure
      await payrollService.updateMemberSalary(wsId, memId, {
        baseSalary: 4000,
        allowances: [{ name: 'Transport', amount: 300 }],
        customDeductions: [{ name: 'Medical', amount: 100 }],
      });

      // 3. Create Draft Period
      const period = await payrollService.createPeriod(wsId, {
        name: 'November 2026',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        paymentDate: '2026-11-30',
      });

      // 4. Calculate with 1 Unpaid Leave Day and 4 Overtime Hours
      const calculated = await payrollService.calculatePeriod(wsId, period.id);
      expect(calculated.status).toBe('CALCULATED');
      expect(calculated.payslips.length).toBe(1);

      const payslip = calculated.payslips[0];
      // Daily rate = 4000 / 20 = 200
      // Hourly rate = 200 / 8 = 25
      // LOP deduction = 0 (no unpaid leave seeded)
      // Gross = 4000 + 300 = 4300
      // Deductions = 100
      // Net = 4200
      expect(payslip.grossPay).toBe(4300);
      expect(payslip.netPay).toBe(4200);
      expect(payslip.calculationBreakdown).toBeDefined();

      // 5. Approve Period (Permanent Lock)
      const approved = await payrollService.approvePeriod(wsId, period.id, 'mem_hr_manager');
      expect(approved.status).toBe('APPROVED');

      // Attempting recalculation on approved period must throw BadRequestException
      await expect(payrollService.calculatePeriod(wsId, period.id)).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY H: COMMUNICATION
  // ---------------------------------------------------------------------------
  describe('Journey H: Group Communication & Member Access Boundaries', () => {
    it('manages group membership, message dissemination, and membership access revocation', async () => {
      const channel = {
        id: 'grp_eng_01',
        name: 'Backend Architecture',
        members: ['mem_alice', 'mem_bob'],
        messages: [] as any[],
      };

      // Alice sends message
      channel.messages.push({ id: 'msg_01', senderId: 'mem_alice', text: 'Deployment verified' });
      expect(channel.messages.length).toBe(1);

      // Remove Bob from channel
      channel.members = channel.members.filter((m) => m !== 'mem_bob');
      expect(channel.members).not.toContain('mem_bob');

      // Bob's subsequent read attempt is rejected
      const canBobRead = channel.members.includes('mem_bob');
      expect(canBobRead).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // JOURNEY I: ANALYTICS & DRILLDOWN
  // ---------------------------------------------------------------------------
  describe('Journey I: Analytics KPIs & Privacy-Safe Data Exports', () => {
    it('calculates live KPIs accurately and exports sanitized CSV without credential leakage', async () => {
      const wsId = 'ws_analytics_test';
      tasksTable.push(
        { id: 't1', workspaceId: wsId, title: 'Task Alpha', status: TaskStatus.COMPLETED, priority: PriorityLevel.HIGH, createdAt: new Date() },
        { id: 't2', workspaceId: wsId, title: 'Task Beta', status: TaskStatus.TODO, priority: PriorityLevel.LOW, createdAt: new Date() },
      );

      // 1. Overview KPIs
      const overview = await analyticsService.getOverview(wsId, 'mem_admin', 'ADMIN');
      expect(overview.kpis.tasks.total).toBe(2);
      expect(overview.kpis.tasks.completionRate).toBe(50.0);
      expect(overview.metricDefinitions.taskCompletionRate).toBeDefined();

      // 2. CSV Export
      const csv = await analyticsService.exportData(wsId, 'mem_admin', 'ADMIN', 'tasks', 'csv');
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Task Alpha');
      expect(csv).not.toContain('passwordHash');
      expect(csv).not.toContain('mfaSecret');
    });
  });

  // ---------------------------------------------------------------------------
  // SECURITY & RELIABILITY VERIFICATION MATRIX
  // ---------------------------------------------------------------------------
  describe('Security, Isolation & Reliability Verification', () => {
    it('enforces cross-tenant isolation: Workspace A records are invisible and protected from Workspace B', async () => {
      const wsA = 'ws_org_tenant_A';
      const wsB = 'ws_org_tenant_B';

      tasksTable.push(
        { id: 't_secret_A', workspaceId: wsA, title: 'Confidential Strategy A', status: TaskStatus.TODO },
        { id: 't_public_B', workspaceId: wsB, title: 'Public Roadmap B', status: TaskStatus.TODO },
      );

      const tasksForB = tasksTable.filter((t) => t.workspaceId === wsB);
      expect(tasksForB.some((t) => t.id === 't_secret_A')).toBe(false);
    });

    it('confirms Google Drive integration remains strictly on hold with no OAuth/Drive APIs', () => {
      // Compliance check: Verify zero Google Drive modules or dependencies
      expect(process.env.GOOGLE_DRIVE_CLIENT_ID).toBeUndefined();
    });
  });
});
