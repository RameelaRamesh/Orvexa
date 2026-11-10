import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from './roles.service';
import { PeopleService } from '../people/people.service';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { LeaveService } from '../leave/leave.service';
import { TimeService } from '../time/time.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { buildUserContextFromMembership } from '../../common/utils/access-scope.util';

describe('RBAC Strict Permission & Team/Department Isolation Regression Suite', () => {
  let rolesService: RolesService;
  let peopleService: PeopleService;
  let tasksService: TasksService;
  let projectsService: ProjectsService;
  let leaveService: LeaveService;
  let timeService: TimeService;
  let analyticsService: AnalyticsService;
  let permissionsGuard: PermissionsGuard;
  let reflector: Reflector;

  const membershipsDataset = [
    {
      id: 'mem_tech_tl',
      workspaceId: 'ws_1',
      accessRole: 'MANAGER',
      departmentId: 'dept_tech',
      teamId: 'team_tech_a',
      reportsToId: null,
      dataScope: 'TEAM',
      user: { id: 'u_t_tl', firstName: 'Tanya', lastName: 'TechTL', email: 'tanya@co.io' },
      department: { id: 'dept_tech', name: 'Technology' },
      team: { id: 'team_tech_a', name: 'Platform Engineering' },
      designation: { title: 'Tech Lead' },
      emergencyContact: { bankDetails: { accountNo: 'TECH-111' } },
    },
    {
      id: 'mem_tech_dev',
      workspaceId: 'ws_1',
      accessRole: 'MEMBER',
      departmentId: 'dept_tech',
      teamId: 'team_tech_a',
      reportsToId: 'mem_tech_tl',
      dataScope: 'ASSIGNED',
      user: { id: 'u_t_dev', firstName: 'Dev', lastName: 'Engineer', email: 'dev@co.io' },
      department: { id: 'dept_tech', name: 'Technology' },
      team: { id: 'team_tech_a', name: 'Platform Engineering' },
      designation: { title: 'Software Engineer' },
      emergencyContact: { bankDetails: { accountNo: 'DEV-222' }, identityDocs: { pan: 'ABCDE1234F' } },
    },
    {
      id: 'mem_tech_b_dev',
      workspaceId: 'ws_1',
      accessRole: 'MEMBER',
      departmentId: 'dept_tech',
      teamId: 'team_tech_b',
      reportsToId: null,
      dataScope: 'ASSIGNED',
      user: { id: 'u_tb_dev', firstName: 'Bella', lastName: 'MobileDev', email: 'bella@co.io' },
      department: { id: 'dept_tech', name: 'Technology' },
      team: { id: 'team_tech_b', name: 'Mobile Engineering' },
      designation: { title: 'Mobile Engineer' },
      emergencyContact: { bankDetails: { accountNo: 'MOB-333' } },
    },
    {
      id: 'mem_mkt_tl',
      workspaceId: 'ws_1',
      accessRole: 'MANAGER',
      departmentId: 'dept_mkt',
      teamId: 'team_mkt_a',
      reportsToId: null,
      dataScope: 'TEAM',
      user: { id: 'u_m_tl', firstName: 'Marco', lastName: 'MktTL', email: 'marco@co.io' },
      department: { id: 'dept_mkt', name: 'Marketing' },
      team: { id: 'team_mkt_a', name: 'Growth Marketing' },
      designation: { title: 'Marketing Lead' },
      emergencyContact: { bankDetails: { accountNo: 'MKT-444' } },
    },
    {
      id: 'mem_mkt_rep',
      workspaceId: 'ws_1',
      accessRole: 'MEMBER',
      departmentId: 'dept_mkt',
      teamId: 'team_mkt_a',
      reportsToId: 'mem_mkt_tl',
      dataScope: 'ASSIGNED',
      user: { id: 'u_m_rep', firstName: 'Maya', lastName: 'Marketer', email: 'maya@co.io' },
      department: { id: 'dept_mkt', name: 'Marketing' },
      team: { id: 'team_mkt_a', name: 'Growth Marketing' },
      designation: { title: 'Content Strategist' },
      emergencyContact: { bankDetails: { accountNo: 'MKT-555' } },
    },
  ];

  const makeMockPrisma = () => {
    const prisma: any = {
      role: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: `role_${data?.name || 'new'}`, ...data, permissions: [] }),
        ),
        update: jest.fn(),
      },
      permission: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'p_1', code: 'payroll:view', name: 'View Payroll', module: 'Payroll' },
          { id: 'p_2', code: 'payroll:manage', name: 'Manage Payroll', module: 'Payroll' },
          { id: 'p_3', code: 'invitations:manage', name: 'Manage Invitations', module: 'People' },
          { id: 'p_4', code: 'onboarding:manage', name: 'Manage Onboarding', module: 'People' },
          { id: 'p_5', code: 'people:view', name: 'View People', module: 'People' },
          { id: 'p_6', code: 'people:view_sensitive', name: 'View Sensitive Info', module: 'People' },
          { id: 'p_7', code: 'scope:team', name: 'Team Scope', module: 'Scope' },
          { id: 'p_8', code: 'scope:department', name: 'Department Scope', module: 'Scope' },
          { id: 'p_9', code: 'scope:workspace', name: 'Workspace Scope', module: 'Scope' },
          { id: 'p_10', code: 'billing:manage', name: 'Manage Billing', module: 'Billing' },
        ]),
        upsert: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      membership: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      department: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dept_tech', name: 'Technology' },
          { id: 'dept_mkt', name: 'Marketing' },
        ]),
      },
      designation: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue({ seatCount: 25, status: 'ACTIVE' }),
      },
      invitation: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      workspace: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ws_1', settings: {} }),
        update: jest.fn(),
      },
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      workItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      attendance: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      qualityReview: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      asset: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    return prisma;
  };

  let mockPrisma: any;

  const mockMailService = {
    sendInvitationEmail: jest.fn().mockResolvedValue({ delivered: true }),
    hasSmtp: true,
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
  };

  beforeEach(async () => {
    mockPrisma = makeMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        PeopleService,
        TasksService,
        ProjectsService,
        LeaveService,
        TimeService,
        AnalyticsService,
        PermissionsGuard,
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    rolesService = module.get(RolesService);
    peopleService = module.get(PeopleService);
    tasksService = module.get(TasksService);
    projectsService = module.get(ProjectsService);
    leaveService = module.get(LeaveService);
    timeService = module.get(TimeService);
    analyticsService = module.get(AnalyticsService);
    permissionsGuard = module.get(PermissionsGuard);
    reflector = module.get(Reflector);
  });

  const makeExecCtx = (membership: any, requiredPerms: string[]): ExecutionContext => {
    const req: any = { membership };
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === PERMISSIONS_KEY) return requiredPerms;
      if (key === IS_PUBLIC_KEY) return false;
      return undefined;
    });
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  const makeContext = (
    overrides: Partial<{
      id: string;
      userId: string;
      accessRole: string;
      departmentId: string | null;
      teamId: string | null;
      dataScope: string;
      roleName: string;
      codes: string[];
    }>,
  ) => {
    const membership = {
      id: overrides.id || 'mem_x',
      userId: overrides.userId || 'u_x',
      workspaceId: 'ws_1',
      accessRole: overrides.accessRole || 'MEMBER',
      departmentId: overrides.departmentId ?? null,
      teamId: overrides.teamId ?? null,
      dataScope: overrides.dataScope || 'ASSIGNED',
      role: {
        id: `role_${overrides.roleName || 'custom'}`,
        name: overrides.roleName || 'Custom Role',
        isSystemRole: false,
        description: 'Active custom role',
        permissions: (overrides.codes || []).map((code) => ({ permission: { code } })),
      },
    };
    return { membership, userContext: buildUserContextFromMembership(membership) };
  };

  // =========================================================================
  // 1. ZERO ADMIN BYPASS: DISTINCT ADMIN PERSONAS
  // =========================================================================
  describe('Distinct ADMIN Sub-Personas (Zero Automatic ADMIN Bypass)', () => {
    const recruitmentAdmin = makeContext({
      id: 'mem_recruiter',
      userId: 'u_recruiter',
      accessRole: 'ADMIN',
      roleName: 'Recruitment Admin',
      dataScope: 'GLOBAL',
      codes: ['invitations:manage', 'onboarding:manage', 'people:view', 'departments:manage', 'scope:workspace'],
    });

    const payrollAdmin = makeContext({
      id: 'mem_payroll',
      userId: 'u_payroll',
      accessRole: 'ADMIN',
      roleName: 'Payroll Admin',
      dataScope: 'GLOBAL',
      codes: ['payroll:view', 'payroll:edit', 'payroll:approve', 'payroll:manage', 'people:view', 'people:view_sensitive', 'scope:workspace'],
    });

    const hrGeneralist = makeContext({
      id: 'mem_generalist',
      userId: 'u_generalist',
      accessRole: 'ADMIN',
      roleName: 'HR Generalist',
      dataScope: 'GLOBAL',
      codes: ['people:view', 'people:create', 'people:edit', 'people:manage', 'onboarding:manage', 'leave:approve', 'scope:workspace'],
    });

    it('PermissionsGuard enforces exact granted permissions on ADMIN users without ADMIN bypass', async () => {
      // Recruitment Admin allowed invitations & onboarding, denied people:edit & payroll:view & roles:manage
      await expect(permissionsGuard.canActivate(makeExecCtx(recruitmentAdmin.membership, ['invitations:manage']))).resolves.toBe(true);
      await expect(permissionsGuard.canActivate(makeExecCtx(recruitmentAdmin.membership, ['onboarding:manage']))).resolves.toBe(true);
      await expect(permissionsGuard.canActivate(makeExecCtx(recruitmentAdmin.membership, ['people:edit']))).rejects.toThrow(ForbiddenException);
      await expect(permissionsGuard.canActivate(makeExecCtx(recruitmentAdmin.membership, ['payroll:view']))).rejects.toThrow(ForbiddenException);
      await expect(permissionsGuard.canActivate(makeExecCtx(recruitmentAdmin.membership, ['roles:manage']))).rejects.toThrow(ForbiddenException);

      // Payroll Admin allowed payroll:approve & people:view_sensitive, denied invitations:manage & roles:manage
      await expect(permissionsGuard.canActivate(makeExecCtx(payrollAdmin.membership, ['payroll:approve']))).resolves.toBe(true);
      await expect(permissionsGuard.canActivate(makeExecCtx(payrollAdmin.membership, ['people:view_sensitive']))).resolves.toBe(true);
      await expect(permissionsGuard.canActivate(makeExecCtx(payrollAdmin.membership, ['invitations:manage']))).rejects.toThrow(ForbiddenException);
      await expect(permissionsGuard.canActivate(makeExecCtx(payrollAdmin.membership, ['roles:manage']))).rejects.toThrow(ForbiddenException);

      // HR Generalist allowed people:edit & leave:approve, denied payroll:view and explicit people:view_sensitive unless granted
      await expect(permissionsGuard.canActivate(makeExecCtx(hrGeneralist.membership, ['people:edit', 'leave:approve']))).resolves.toBe(true);
      await expect(permissionsGuard.canActivate(makeExecCtx(hrGeneralist.membership, ['payroll:view']))).rejects.toThrow(ForbiddenException);
      await expect(permissionsGuard.canActivate(makeExecCtx(hrGeneralist.membership, ['people:view_sensitive']))).rejects.toThrow(ForbiddenException);

      // calendar:manage does not bypass scoped calendar visibility or holiday administration
      const teamCalendarLead = makeContext({
        id: 'mem_cal_tl',
        userId: 'u_cal_tl',
        accessRole: 'MANAGER',
        roleName: 'Team Lead',
        dataScope: 'TEAM',
        codes: ['calendar:view:team', 'calendar:manage', 'scope:team'],
      });
      await expect(permissionsGuard.canActivate(makeExecCtx(teamCalendarLead.membership, ['calendar:view:team']))).resolves.toBe(true);
      await expect(permissionsGuard.canActivate(makeExecCtx(teamCalendarLead.membership, ['calendar:view:all']))).rejects.toThrow(ForbiddenException);
      await expect(permissionsGuard.canActivate(makeExecCtx(teamCalendarLead.membership, ['calendar:view:department']))).rejects.toThrow(ForbiddenException);
      await expect(permissionsGuard.canActivate(makeExecCtx(teamCalendarLead.membership, ['calendar:holidays:manage']))).rejects.toThrow(ForbiddenException);
    });

    it('Recruitment Admin cannot edit another employee profile and receives redacted PII', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(membershipsDataset[1]);
      await expect(
        peopleService.updateMemberProfile('ws_1', 'mem_tech_dev', { phone: '999999' }, recruitmentAdmin.userContext),
      ).rejects.toThrow(ForbiddenException);

      mockPrisma.membership.findMany.mockResolvedValue(membershipsDataset);
      const visible = await peopleService.listMembers('ws_1', {}, recruitmentAdmin.userContext);
      const devRecord = visible.find((m: any) => m.id === 'mem_tech_dev');
      expect(devRecord.emergencyContact.bankDetails).toEqual({ redacted: true });
      expect(devRecord.emergencyContact.identityDocs).toEqual({ redacted: true });
    });

    it('HR Generalist CAN edit another employee profile inside scope while Payroll Admin CANNOT change roles or edit profiles', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(membershipsDataset[1]);
      mockPrisma.membership.update.mockResolvedValue({ ...membershipsDataset[1], workLocation: 'Remote' });

      const updated = await peopleService.updateMemberProfile(
        'ws_1',
        'mem_tech_dev',
        { workLocation: 'Remote' },
        hrGeneralist.userContext,
      );
      expect(updated.workLocation).toBe('Remote');
      expect(updated.emergencyContact.bankDetails).toEqual({ redacted: true });

      // Submitting redacted banking/KYC placeholders without people:view_sensitive preserves existing PII in DB
      mockPrisma.membership.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...membershipsDataset[1], ...data }),
      );
      const preserved = await peopleService.updateMemberProfile(
        'ws_1',
        'mem_tech_dev',
        {
          emergencyContact: {
            contactName: 'Mom',
            bankDetails: { redacted: true },
            identityDocs: { redacted: true },
          },
        },
        hrGeneralist.userContext,
      );
      expect(mockPrisma.membership.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emergencyContact: expect.objectContaining({
              contactName: 'Mom',
              bankDetails: { accountNo: 'DEV-222' },
              identityDocs: { pan: 'ABCDE1234F' },
            }),
          }),
        }),
      );
      expect(preserved.emergencyContact.bankDetails).toEqual({ redacted: true });
      expect(preserved.emergencyContact.identityDocs).toEqual({ redacted: true });

      // Payroll Admin tries to change member profile -> denied (no people:edit)
      await expect(
        peopleService.updateMemberProfile('ws_1', 'mem_tech_dev', { workLocation: 'HQ' }, payrollAdmin.userContext),
      ).rejects.toThrow(ForbiddenException);

      // Payroll Admin tries to reassign role -> denied (no roles:manage)
      await expect(
        peopleService.updateMemberOrgDetails('ws_1', 'mem_tech_dev', { roleId: 'role_admin' }, payrollAdmin.userContext),
      ).rejects.toThrow(ForbiddenException);

      // Payroll Admin CAN read member payroll & unredacted bankDetails
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        settings: { payroll: { mem_tech_dev: { baseSalary: 120000, allowances: 10000, deductions: 5000, currency: 'USD' } } },
      });
      const payroll = await peopleService.getMemberPayroll('ws_1', 'mem_tech_dev', payrollAdmin.userContext);
      expect(payroll.netSalary).toBe(125000);

      mockPrisma.membership.findMany.mockResolvedValue(membershipsDataset);
      const payrollVisibleList = await peopleService.listMembers('ws_1', {}, payrollAdmin.userContext);
      expect(payrollVisibleList.find((m: any) => m.id === 'mem_tech_dev').emergencyContact.bankDetails).toEqual({ accountNo: 'DEV-222' });
    });
  });

  // =========================================================================
  // 2. TECH TL VS MARKETING TL VS DEPARTMENT LEAD ISOLATION
  // =========================================================================
  describe('Tech TL vs Marketing TL (scope:team) vs Dept Lead (scope:department)', () => {
    const techTl = makeContext({
      id: 'mem_tech_tl',
      userId: 'u_t_tl',
      accessRole: 'MANAGER',
      departmentId: 'dept_tech',
      teamId: 'team_tech_a',
      roleName: 'Tech TL',
      dataScope: 'TEAM',
      codes: ['people:view', 'tasks:view', 'projects:view', 'leave:view', 'leave:approve', 'reports:view', 'scope:team'],
    });

    const mktTl = makeContext({
      id: 'mem_mkt_tl',
      userId: 'u_m_tl',
      accessRole: 'MANAGER',
      departmentId: 'dept_mkt',
      teamId: 'team_mkt_a',
      roleName: 'Marketing TL',
      dataScope: 'TEAM',
      codes: ['people:view', 'tasks:view', 'projects:view', 'leave:view', 'leave:approve', 'reports:view', 'scope:team'],
    });

    const techDeptLead = makeContext({
      id: 'mem_tech_hod',
      userId: 'u_t_hod',
      accessRole: 'MANAGER',
      departmentId: 'dept_tech',
      teamId: 'team_tech_a',
      roleName: 'VP Engineering',
      dataScope: 'DEPARTMENT',
      codes: ['people:view', 'tasks:view', 'projects:view', 'leave:view', 'leave:approve', 'reports:view', 'scope:department'],
    });

    it('PeopleService strictly isolates Tech TL, Marketing TL, and Dept Lead queries & drawer access', async () => {
      mockPrisma.membership.findMany.mockResolvedValue([membershipsDataset[0], membershipsDataset[1]]);
      await peopleService.listMembers('ws_1', {}, techTl.userContext);
      expect(mockPrisma.membership.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ id: 'mem_tech_tl' }, { teamId: 'team_tech_a' }, { reportsToId: 'mem_tech_tl' }],
          }),
        }),
      );

      // Cross-team member drawer inspection is blocked
      mockPrisma.membership.findFirst.mockResolvedValue(membershipsDataset[4]); // Marketing Rep
      await expect(peopleService.getMemberById('ws_1', 'mem_mkt_rep', techTl.userContext)).rejects.toThrow(ForbiddenException);

      // Marketing member is allowed for Marketing TL
      await expect(peopleService.getMemberById('ws_1', 'mem_mkt_rep', mktTl.userContext)).resolves.toBeDefined();

      // Dept Lead queries by departmentId, covering both team_tech_a and team_tech_b, and blocked from Marketing
      mockPrisma.membership.findMany.mockResolvedValue([membershipsDataset[0], membershipsDataset[1], membershipsDataset[2]]);
      await peopleService.listMembers('ws_1', {}, techDeptLead.userContext);
      expect(mockPrisma.membership.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ departmentId: 'dept_tech' }),
        }),
      );
      await expect(peopleService.getMemberById('ws_1', 'mem_mkt_rep', techDeptLead.userContext)).rejects.toThrow(ForbiddenException);
      mockPrisma.membership.findFirst.mockResolvedValue(membershipsDataset[2]); // Team B inside Technology
      await expect(peopleService.getMemberById('ws_1', 'mem_tech_b_dev', techDeptLead.userContext)).resolves.toBeDefined();
    });

    it('TasksService hides Marketing tasks from Tech TL and hides Tech tasks from Marketing TL (even when scope=GLOBAL requested)', async () => {
      const sampleTasks = [
        { id: 'task_tech_a', title: 'API Gateway', assigneeMembershipId: 'mem_tech_dev', assignee: membershipsDataset[1], sla: {} },
        { id: 'task_tech_b', title: 'iOS Push', assigneeMembershipId: 'mem_tech_b_dev', assignee: membershipsDataset[2], sla: {} },
        { id: 'task_mkt_a', title: 'Q4 Ad Campaign', assigneeMembershipId: 'mem_mkt_rep', assignee: membershipsDataset[4], sla: {} },
      ];
      mockPrisma.task.findMany.mockResolvedValue(sampleTasks);

      const techTasks = await tasksService.list('ws_1', { scope: 'GLOBAL' }, techTl.userContext);
      expect(techTasks.map((t: any) => t.id)).toEqual(['task_tech_a']);

      const mktTasks = await tasksService.list('ws_1', { scope: 'GLOBAL' }, mktTl.userContext);
      expect(mktTasks.map((t: any) => t.id)).toEqual(['task_mkt_a']);

      const deptTasks = await tasksService.list('ws_1', {}, techDeptLead.userContext);
      expect(deptTasks.map((t: any) => t.id)).toEqual(['task_tech_a', 'task_tech_b']);
    });

    it('ProjectsService hides Marketing projects from Tech TL and exposes all Technology projects to Dept Lead', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        { id: 'proj_tech', name: 'Core Platform', status: 'ACTIVE' },
        { id: 'proj_mkt', name: 'Brand Refresh', status: 'ACTIVE' },
      ]);
      mockPrisma.task.findMany.mockResolvedValue([
        { id: 't1', projectId: 'proj_tech', status: 'TODO', assigneeMembershipId: 'mem_tech_dev' },
        { id: 't2', projectId: 'proj_mkt', status: 'TODO', assigneeMembershipId: 'mem_mkt_rep' },
      ]);
      mockPrisma.membership.findMany.mockResolvedValue(membershipsDataset);
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_1',
        settings: {
          projectMetadata: {
            proj_tech: { departmentId: 'dept_tech', managerMembershipId: 'mem_tech_tl', memberMembershipIds: ['mem_tech_dev'] },
            proj_mkt: { departmentId: 'dept_mkt', managerMembershipId: 'mem_mkt_tl', memberMembershipIds: ['mem_mkt_rep'] },
          },
        },
      });

      const techProjects = await projectsService.list('ws_1', undefined, techTl.userContext);
      expect(techProjects.map((p: any) => p.id)).toEqual(['proj_tech']);

      const mktProjects = await projectsService.list('ws_1', undefined, mktTl.userContext);
      expect(mktProjects.map((p: any) => p.id)).toEqual(['proj_mkt']);
    });

    it('LeaveService & TimeService isolate attendance, leave requests, and balances per team/department', async () => {
      mockPrisma.leaveRequest.findMany.mockResolvedValue([
        { id: 'lv_tech', membershipId: 'mem_tech_dev', membership: membershipsDataset[1] },
        { id: 'lv_mkt', membershipId: 'mem_mkt_rep', membership: membershipsDataset[4] },
      ]);
      const techLeaves = await leaveService.list('ws_1', {}, techTl.userContext);
      expect(techLeaves.map((l: any) => l.id)).toEqual(['lv_tech']);

      mockPrisma.membership.findFirst.mockResolvedValue(membershipsDataset[4]);
      await expect(leaveService.getMemberBalances('ws_1', 'mem_mkt_rep', 2026, techTl.userContext)).rejects.toThrow(ForbiddenException);

      mockPrisma.attendance.findMany.mockResolvedValue([
        {
          id: 'att_tech',
          membershipId: 'mem_tech_dev',
          membership: membershipsDataset[1],
          date: new Date('2026-11-10T09:00:00Z'),
          clockIn: new Date('2026-11-10T09:00:00Z'),
          clockOut: new Date('2026-11-10T17:00:00Z'),
          totalWorkMinutes: 480,
          totalBreakMinutes: 30,
          status: 'PRESENT',
          breaks: [],
        },
        {
          id: 'att_mkt',
          membershipId: 'mem_mkt_rep',
          membership: membershipsDataset[4],
          date: new Date('2026-11-10T09:00:00Z'),
          clockIn: new Date('2026-11-10T09:00:00Z'),
          clockOut: new Date('2026-11-10T17:00:00Z'),
          totalWorkMinutes: 480,
          totalBreakMinutes: 30,
          status: 'PRESENT',
          breaks: [],
        },
      ]);

      const techAtt = await timeService.listWorkspaceAttendance('ws_1', {}, techTl.userContext);
      expect(techAtt.map((a: any) => a.id)).toEqual(['att_tech']);

      const mktAtt = await timeService.listWorkspaceAttendance('ws_1', {}, mktTl.userContext);
      expect(mktAtt.map((a: any) => a.id)).toEqual(['att_mkt']);
    });

    it('AnalyticsService scopes overview metrics strictly to allowed team/department members', async () => {
      mockPrisma.membership.findMany.mockResolvedValue(membershipsDataset);
      await analyticsService.getOverview('ws_1', 'mem_tech_tl', 'MANAGER', { scope: 'ENTIRE_WORKSPACE' }, techTl.userContext);

      expect(mockPrisma.task.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeMembershipId: { in: ['mem_tech_tl', 'mem_tech_dev'] },
          }),
        }),
      );
    });
  });

  // =========================================================================
  // 3. DESIGNATION AUTO-RECOMMENDATION & BULK INVITATION ROLE PRESERVATION
  // =========================================================================
  describe('Smart Designation Auto-Recommendation & Bulk Invite Role/Scope Preservation', () => {
    it('recommendForDesignation tailors distinct templates for Payroll Admin, Recruitment Admin, HR Generalist, Tech Lead, and Dept Head', async () => {
      const payrollRec = await rolesService.recommendForDesignation('ws_1', 'Payroll Administrator');
      expect(payrollRec.accessRole).toBe('ADMIN');
      expect(payrollRec.suggestedRoleName).toBe('Payroll Admin');
      expect(payrollRec.permissionCodes).toContain('payroll:approve');
      expect(payrollRec.permissionCodes).toContain('people:view_sensitive');
      expect(payrollRec.permissionCodes).not.toContain('invitations:manage');

      const recAdminRec = await rolesService.recommendForDesignation('ws_1', 'Talent Acquisition Lead');
      expect(recAdminRec.accessRole).toBe('ADMIN');
      expect(recAdminRec.suggestedRoleName).toBe('Recruitment Admin');
      expect(recAdminRec.permissionCodes).toContain('invitations:manage');
      expect(recAdminRec.permissionCodes).toContain('onboarding:manage');
      expect(recAdminRec.permissionCodes).not.toContain('people:edit');
      expect(recAdminRec.permissionCodes).not.toContain('payroll:view');

      const generalistRec = await rolesService.recommendForDesignation('ws_1', 'HR Generalist');
      expect(generalistRec.accessRole).toBe('ADMIN');
      expect(generalistRec.permissionCodes).toContain('people:edit');
      expect(generalistRec.permissionCodes).toContain('leave:approve');
      expect(generalistRec.permissionCodes).not.toContain('payroll:approve');

      const techTlRec = await rolesService.recommendForDesignation('ws_1', 'Tech Lead');
      expect(techTlRec.accessRole).toBe('MANAGER');
      expect(techTlRec.dataScope).toBe('TEAM');
      expect(techTlRec.permissionCodes).toContain('scope:team');

      const deptLeadRec = await rolesService.recommendForDesignation('ws_1', 'Department Head');
      expect(deptLeadRec.accessRole).toBe('MANAGER');
      expect(deptLeadRec.dataScope).toBe('DEPARTMENT');
      expect(deptLeadRec.permissionCodes).toContain('scope:department');
    });

    it('bulkInviteMembers invites multiple members with shared custom roleId & dataScope, and acceptInvitation preserves them', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role_recruiter',
        permissions: [{ permission: { code: 'invitations:manage' } }, { permission: { code: 'scope:workspace' } }],
      });
      mockPrisma.designation.findFirst.mockResolvedValue({ id: 'desig_rec', title: 'Talent Executive' });
      let seq = 0;
      mockPrisma.invitation.create.mockImplementation(({ data }: any) => {
        seq += 1;
        return Promise.resolve({
          id: `inv_${seq}`,
          ...data,
          workspace: { id: 'ws_1', name: 'Acme Corp', logoUrl: null },
          invitedBy: { firstName: 'Owner', lastName: 'User', email: 'owner@co.io' },
        });
      });

      const bulkRes = await peopleService.bulkInviteMembers('ws_1', 'u_owner', {
        members: [
          { firstName: 'Ria', lastName: 'Kapoor', email: 'ria@co.io' },
          { firstName: 'Sam', lastName: 'Lee', email: 'sam@co.io' },
        ],
        shared: {
          accessRole: 'ADMIN',
          roleId: 'role_recruiter',
          dataScope: 'GLOBAL',
          designationTitle: 'Talent Executive',
          departmentId: 'dept_hr',
        },
      });

      expect(bulkRes.totalRequested).toBe(2);
      expect(bulkRes.sentCount).toBe(2);
      expect(mockPrisma.invitation.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.invitation.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            roleId: 'role_recruiter',
            accessRole: 'ADMIN',
            dataScope: 'GLOBAL',
          }),
        }),
      );

      // Verify acceptInvitation applies exact roleId and dataScope from invitation
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_1',
        workspaceId: 'ws_1',
        email: 'ria@co.io',
        firstName: 'Ria',
        lastName: 'Kapoor',
        accessRole: 'ADMIN',
        roleId: 'role_recruiter',
        departmentId: 'dept_hr',
        teamId: null,
        designationId: 'desig_rec',
        reportsToId: null,
        dataScope: 'GLOBAL',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
        workspace: { id: 'ws_1', name: 'Acme Corp' },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u_ria',
        email: 'ria@co.io',
        firstName: 'Ria',
        lastName: 'Kapoor',
        tokenVersion: 1,
      });
      mockPrisma.membership.upsert.mockImplementation(({ create }: any) =>
        Promise.resolve({ id: 'mem_ria', ...create }),
      );

      const accepted = await peopleService.acceptInvitation({ token: 'tok_1', password: 'StrongPassword123!' });
      expect(accepted.membership.roleId).toBe('role_recruiter');
      expect(accepted.membership.dataScope).toBe('GLOBAL');
      expect(accepted.membership.accessRole).toBe('ADMIN');
    });
  });
});
