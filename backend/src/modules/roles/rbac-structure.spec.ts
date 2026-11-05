import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from './roles.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PeopleService } from '../people/people.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

describe('PHASE 5: Configurable Roles, Permissions & Organisation Structure Acceptance Suite', () => {
  let rolesService: RolesService;
  let permissionsGuard: PermissionsGuard;
  let tenantGuard: TenantGuard;
  let peopleService: PeopleService;
  let reflector: Reflector;

  const mockPrisma: any = {
    role: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    permission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    task: {
      updateMany: jest.fn(),
    },
    workItem: {
      updateMany: jest.fn(),
    },
    asset: {
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockMailService = {
    sendInvitationEmail: jest.fn().mockResolvedValue({ delivered: true }),
    hasSmtp: true,
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
    verify: jest.fn().mockReturnValue({ userId: 'u_1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        PermissionsGuard,
        TenantGuard,
        PeopleService,
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    rolesService = module.get<RolesService>(RolesService);
    permissionsGuard = module.get<PermissionsGuard>(PermissionsGuard);
    tenantGuard = module.get<TenantGuard>(TenantGuard);
    peopleService = module.get<PeopleService>(PeopleService);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (request: any, permissions: string[] = []): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === PERMISSIONS_KEY) return permissions;
      if (key === IS_PUBLIC_KEY) return false;
      return undefined;
    });

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  // =========================================================================
  // 1. DYNAMIC CUSTOM ROLE CREATION WITHOUT INDUSTRY PRESETS
  // =========================================================================
  describe('Requirement 1 & 2: Custom Role Creation & Management (Zero Industry Presets)', () => {
    it('should create an arbitrary custom role dynamically without industry templates', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({
        id: 'role_custom_1',
        workspaceId: 'ws_alpha',
        name: 'Regional Logistics Coordinator',
        description: 'Manages multi-warehouse logistics and dispatch',
        isSystemRole: false,
      });
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role_custom_1',
        workspaceId: 'ws_alpha',
        name: 'Regional Logistics Coordinator',
        description: 'Manages multi-warehouse logistics and dispatch',
        isSystemRole: false,
        permissions: [],
      });

      const result = await rolesService.createRole(
        'ws_alpha',
        'Regional Logistics Coordinator',
        'Manages multi-warehouse logistics and dispatch',
        ['perm_tasks_view', 'perm_tasks_edit'],
      );

      expect(result.name).toBe('Regional Logistics Coordinator');
      expect(result.isActive).toBe(true);
      expect(result.isSystemRole).toBe(false);
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'role_custom_1', permissionId: 'perm_tasks_view' },
          { roleId: 'role_custom_1', permissionId: 'perm_tasks_edit' },
        ],
      });
    });

    it('should reject role creation when a role with the same name already exists in the workspace', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role_existing', name: 'Field Dispatcher' });

      await expect(
        rolesService.createRole('ws_alpha', 'Field Dispatcher'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent renaming platform system roles while allowing description updates', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role_sys_owner',
        name: 'Owner',
        isSystemRole: true,
      });

      await expect(
        rolesService.updateRole('ws_alpha', 'role_sys_owner', { name: 'Super CEO' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 2. PERMISSION MODIFICATION AND IMMEDIATE ENFORCEMENT
  // =========================================================================
  describe('Requirement 3 & 4: Permission Configuration & Enforcement', () => {
    it('should update assigned permissions by clearing previous mappings and inserting new ones', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role_custom_qa',
        name: 'Quality Lead',
        isSystemRole: false,
      });
      mockPrisma.role.update.mockResolvedValue({});
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role_custom_qa',
        name: 'Quality Lead',
        permissions: [{ permission: { code: 'quality:manage' } }],
      });

      const updated = await rolesService.updateRole('ws_alpha', 'role_custom_qa', {
        permissionIds: ['perm_quality_manage', 'perm_reports_export'],
      });

      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role_custom_qa' } });
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'role_custom_qa', permissionId: 'perm_quality_manage' },
          { roleId: 'role_custom_qa', permissionId: 'perm_reports_export' },
        ],
      });
      expect(updated.isActive).toBe(true);
    });
  });

  // =========================================================================
  // 3. ROLE DEACTIVATION REVOKES ACCESS IMMEDIATELY IN PERMISSIONS GUARD
  // =========================================================================
  describe('Requirement 5: Safe Role Lifecycle (Deactivation & Reactivation)', () => {
    it('should deactivate a role with prefix [DEACTIVATED] and report affected members count', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role_custom_dev',
        name: 'Junior Developer',
        isSystemRole: false,
        description: 'Software development team member',
      });
      mockPrisma.role.update.mockResolvedValue({
        id: 'role_custom_dev',
        _count: { memberships: 4 },
      });

      const deactivation = await rolesService.deactivateRole('ws_alpha', 'role_custom_dev');
      expect(deactivation.isActive).toBe(false);
      expect(deactivation.affectedMembersCount).toBe(4);
      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: 'role_custom_dev' },
        data: { description: '[DEACTIVATED] Software development team member' },
        include: { _count: { select: { memberships: true } } },
      });
    });

    it('PermissionsGuard should deny access when a user holds a deactivated role', async () => {
      const mockRequest = {
        membership: {
          id: 'mem_dev_1',
          userId: 'u_dev',
          workspaceId: 'ws_alpha',
          accessRole: 'MEMBER',
          role: {
            name: 'Junior Developer',
            description: '[DEACTIVATED] Software development team member',
            permissions: [{ permission: { code: 'tasks:view' } }],
          },
        },
      };

      const context = createMockExecutionContext(mockRequest, ['tasks:view']);
      await expect(permissionsGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should reactivate a deactivated role and restore permissions', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role_custom_dev',
        name: 'Junior Developer',
        isSystemRole: false,
        description: '[DEACTIVATED] Software development team member',
      });

      const reactivation = await rolesService.reactivateRole('ws_alpha', 'role_custom_dev');
      expect(reactivation.isActive).toBe(true);
      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: 'role_custom_dev' },
        data: { description: 'Software development team member' },
      });
    });
  });

  // =========================================================================
  // 4. ROLE DELETION SAFETY REQUIRING REASSIGNMENT TO PREVENT ORPHANED MEMBERS
  // =========================================================================
  describe('Requirement 6: Safe Role Deletion With Mandatory Member Reassignment', () => {
    it('should throw BadRequestException when deleting a role with active members without reassignRoleId', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role_ops',
        name: 'Operations Specialist',
        isSystemRole: false,
        _count: { memberships: 3 },
      });

      await expect(rolesService.deleteRole('ws_alpha', 'role_ops')).rejects.toThrow(BadRequestException);
    });

    it('should atomically reassign members to the target role before role deletion', async () => {
      mockPrisma.role.findFirst
        .mockResolvedValueOnce({
          id: 'role_ops',
          name: 'Operations Specialist',
          isSystemRole: false,
          _count: { memberships: 3 },
        })
        .mockResolvedValueOnce({
          id: 'role_general_staff',
          name: 'General Staff',
          isSystemRole: false,
        });

      const deletion = await rolesService.deleteRole('ws_alpha', 'role_ops', 'role_general_staff');

      expect(mockPrisma.membership.updateMany).toHaveBeenCalledWith({
        where: { roleId: 'role_ops' },
        data: { roleId: 'role_general_staff' },
      });
      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role_ops' } });
      expect(mockPrisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role_ops' } });
      expect(deletion.deletedRoleId).toBe('role_ops');
    });

    it('should prevent deleting platform system roles', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role_sys_admin',
        name: 'Admin',
        isSystemRole: true,
        _count: { memberships: 0 },
      });

      await expect(rolesService.deleteRole('ws_alpha', 'role_sys_admin')).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 5. CONFLICTING / MULTI-TENANT MEMBERSHIPS & TENANT ISOLATION
  // =========================================================================
  describe('Requirement 7 & 8: Multi-tenant Memberships & Cross-Tenant Isolation', () => {
    it('TenantGuard should strictly enforce workspace context matching x-workspace-id header without fallback', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const mockRequest = {
        user: { id: 'user_multi_1' },
        headers: { 'x-workspace-id': 'ws_unauthorized' },
      };

      const context = createMockExecutionContext(mockRequest);
      await expect(tenantGuard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Tenant access denied or inactive membership'),
      );
    });

    it('PermissionsGuard: platform OWNER in Workspace A should bypass fine-grained checks in Workspace A', async () => {
      const mockRequest = {
        membership: {
          id: 'mem_owner_ws_a',
          userId: 'user_multi_1',
          workspaceId: 'ws_alpha',
          accessRole: 'OWNER',
        },
      };

      const context = createMockExecutionContext(mockRequest, ['payroll:view', 'roles:manage']);
      const canActivate = await permissionsGuard.canActivate(context);
      expect(canActivate).toBe(true);
      expect(mockRequest['userContext'].accessRole).toBe('OWNER');
    });

    it('PermissionsGuard: same user in Workspace B with restricted MEMBER role is strictly gated and denied unauthorized actions', async () => {
      const mockRequest = {
        membership: {
          id: 'mem_member_ws_b',
          userId: 'user_multi_1',
          workspaceId: 'ws_beta',
          accessRole: 'MEMBER',
          role: {
            name: 'Viewer',
            description: 'Read-only access',
            permissions: [{ permission: { code: 'tasks:view' } }],
          },
        },
      };

      const context = createMockExecutionContext(mockRequest, ['payroll:view']);
      await expect(permissionsGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 6. MANAGER ACCESS & DATA SCOPE (TEAM / DEPARTMENT / ASSIGNED)
  // =========================================================================
  describe('Requirement 9: Manager Access & Record-level Data Scope Filtering', () => {
    it('listMembers with dataScope: TEAM allows viewing self, assigned team members, and direct reports', async () => {
      mockPrisma.membership.findMany.mockResolvedValue([
        { id: 'mem_mgr', user: { firstName: 'Alice' } },
        { id: 'mem_team_1', user: { firstName: 'Bob' } },
        { id: 'mem_report_1', user: { firstName: 'Charlie' } },
      ]);

      const userContext = {
        membershipId: 'mem_mgr',
        accessRole: 'MEMBER',
        dataScope: 'TEAM',
        teamId: 'team_sales',
      };

      await peopleService.listMembers('ws_alpha', {}, userContext);

      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: 'ws_alpha',
          status: { in: ['ACTIVE', 'SUSPENDED', 'INVITED'] },
          OR: [
            { id: 'mem_mgr' },
            { teamId: 'team_sales' },
            { reportsToId: 'mem_mgr' },
          ],
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('listMembers with dataScope: DEPARTMENT restricts listing to members of the same department', async () => {
      mockPrisma.membership.findMany.mockResolvedValue([]);

      const userContext = {
        membershipId: 'mem_dept_lead',
        accessRole: 'MEMBER',
        dataScope: 'DEPARTMENT',
        departmentId: 'dept_engineering',
      };

      await peopleService.listMembers('ws_alpha', {}, userContext);

      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: 'ws_alpha',
          status: { in: ['ACTIVE', 'SUSPENDED', 'INVITED'] },
          departmentId: 'dept_engineering',
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('listMembers with dataScope: ASSIGNED / OWN restricts listing to only own membership record', async () => {
      mockPrisma.membership.findMany.mockResolvedValue([]);

      const userContext = {
        membershipId: 'mem_individual',
        accessRole: 'MEMBER',
        dataScope: 'ASSIGNED',
      };

      await peopleService.listMembers('ws_alpha', {}, userContext);

      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: 'ws_alpha',
          status: { in: ['ACTIVE', 'SUSPENDED', 'INVITED'] },
          id: 'mem_individual',
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  // =========================================================================
  // 7. RESTRICTED PAYROLL DATA & PERMISSION ENFORCEMENT
  // =========================================================================
  describe('Requirement 10: Restricted Payroll Data Access Control', () => {
    it('getMemberPayroll denies access when user dataScope: OWN attempts to inspect another employee payroll', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_target',
        workspaceId: 'ws_alpha',
        user: { id: 'u_target', firstName: 'Diana', lastName: 'Prince', email: 'diana@orvexa.io' },
      });

      const userContext = {
        membershipId: 'mem_requester',
        accessRole: 'MEMBER',
        dataScope: 'OWN',
      };

      await expect(
        peopleService.getMemberPayroll('ws_alpha', 'mem_target', userContext),
      ).rejects.toThrow(
        new ForbiddenException('Restricted payroll data: Your data scope is restricted to your own record.'),
      );
    });

    it('getMemberPayroll permits access when requester is OWNER or within permissible TEAM scope', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_target',
        workspaceId: 'ws_alpha',
        teamId: 'team_ops',
        reportsToId: 'mem_mgr_1',
        designation: { title: 'Ops Specialist', level: 2 },
        user: { id: 'u_target', firstName: 'Diana', lastName: 'Prince', email: 'diana@orvexa.io' },
      });
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'ws_alpha',
        settings: {
          payroll: {
            mem_target: { baseSalary: 75000, allowances: 8000, deductions: 3000, currency: 'USD' },
          },
        },
      });

      const userContext = {
        membershipId: 'mem_mgr_1',
        accessRole: 'MEMBER',
        dataScope: 'TEAM',
        teamId: 'team_ops',
      };

      const payroll = await peopleService.getMemberPayroll('ws_alpha', 'mem_target', userContext);
      expect(payroll.employeeName).toBe('Diana Prince');
      expect(payroll.netSalary).toBe(80000); // 75000 + 8000 - 3000
      expect(payroll.isRestrictedData).toBe(true);
    });
  });

  // =========================================================================
  // 8. EXPORT PERMISSIONS & ACCESS DIAGNOSTICS INSPECTOR
  // =========================================================================
  describe('Requirement 11 & 12: Exports & Access Diagnostics Tool', () => {
    it('diagnoseEffectiveAccess provides transparent reasoning explaining why action is allowed or denied', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_test',
        userId: 'u_1',
        accessRole: 'MEMBER',
        dataScope: 'DEPARTMENT',
        role: {
          name: 'Accountant',
          description: 'Finance department accountant',
          permissions: [{ permission: { code: 'payroll:view', name: 'View Payroll' } }],
        },
        user: { firstName: 'Frank', lastName: 'Castle', email: 'frank@orvexa.io' },
        department: { name: 'Finance' },
      });

      const allowedDiag = await rolesService.diagnoseEffectiveAccess('ws_alpha', 'mem_test', 'payroll:view');
      expect(allowedDiag.verdict).toBe('Allowed');
      expect(allowedDiag.hasPermission).toBe(true);
      expect(allowedDiag.reason).toContain('Granted by assigned role');

      const deniedDiag = await rolesService.diagnoseEffectiveAccess('ws_alpha', 'mem_test', 'payroll:delete');
      expect(deniedDiag.verdict).toBe('Denied');
      expect(deniedDiag.hasPermission).toBe(false);
      expect(deniedDiag.reason).toContain('does not grant this permission');
    });

    it('PermissionsGuard wildcards: module-level manage permission grants sub-actions', async () => {
      const mockRequest = {
        membership: {
          id: 'mem_lead',
          userId: 'u_lead',
          workspaceId: 'ws_alpha',
          accessRole: 'MEMBER',
          role: {
            name: 'Operations Manager',
            description: 'Manages operations module',
            permissions: [{ permission: { code: 'tasks:manage' } }],
          },
        },
      };

      // tasks:manage should satisfy tasks:view and tasks:edit
      const context = createMockExecutionContext(mockRequest, ['tasks:view']);
      const canActivate = await permissionsGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });
  });

  // =========================================================================
  // 9. HISTORICAL RECORD PRESERVATION ON MEMBER OFFBOARDING
  // =========================================================================
  describe('Requirement 13: Historical Record Preservation (Zero Record Deletion on Member Removal)', () => {
    it('completeOffboarding marks membership OFFBOARDED without deleting database records', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_departing',
        workspaceId: 'ws_alpha',
        userId: 'u_departing',
        accessRole: 'MEMBER',
      });
      mockPrisma.membership.update.mockResolvedValue({
        id: 'mem_departing',
        status: 'OFFBOARDED',
        offboardingStatus: 'COMPLETED',
      });
      mockPrisma.task.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.workItem.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.asset.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.update.mockResolvedValue({ id: 'u_departing', tokenVersion: 2 });

      const result = await peopleService.completeOffboarding('ws_alpha', 'mem_departing', {
        reassignToMembershipId: 'mem_successor',
      });

      // Verify tasks and work items were reassigned to successor
      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws_alpha', assigneeMembershipId: 'mem_departing', status: { not: 'COMPLETED' } },
        data: { assigneeMembershipId: 'mem_successor' },
      });
      expect(mockPrisma.workItem.updateMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws_alpha', assignedMembershipId: 'mem_departing', status: { not: 'COMPLETED' } },
        data: { assignedMembershipId: 'mem_successor' },
      });

      // Verify assets recovered
      expect(mockPrisma.asset.updateMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws_alpha', assignedToMembershipId: 'mem_departing' },
        data: { assignedToMembershipId: null, status: 'AVAILABLE' },
      });

      // CRITICAL: Membership record is updated to OFFBOARDED, NEVER deleted
      expect(mockPrisma.membership.delete).not.toHaveBeenCalled();
      expect(mockPrisma.membership.update).toHaveBeenCalledWith({
        where: { id: 'mem_departing' },
        data: {
          status: 'OFFBOARDED',
          offboardingStatus: 'COMPLETED',
        },
      });

      // User session tokens invalidated
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u_departing' },
        data: { tokenVersion: { increment: 1 } },
      });

      expect(result.membership.status).toBe('OFFBOARDED');
    });
  });
});
