import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  buildUserContextFromMembership,
  hasPermission,
  resolveEffectiveScope,
} from '../../common/utils/access-scope.util';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaceRoles(workspaceId: string) {
    await this.ensureSystemPermissions();
    await this.ensureSystemRoles();

    const roles = await this.prisma.role.findMany({
      where: {
        OR: [{ workspaceId }, { isSystemRole: true }],
      },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { memberships: true } },
      },
      orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }],
    });

    return roles.map((r) => {
      const isDeactivated = Boolean(r.description && r.description.startsWith('[DEACTIVATED]'));
      const cleanDesc = isDeactivated
        ? r.description?.replace('[DEACTIVATED]', '').trim()
        : r.description;

      return {
        ...r,
        description: cleanDesc,
        isActive: !isDeactivated,
      };
    });
  }

  async listAllPermissions() {
    await this.ensureSystemPermissions();
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async createRole(workspaceId: string, name: string, description?: string, permissionIds?: string[]) {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new BadRequestException('Role name is required');
    }

    const existing = await this.prisma.role.findFirst({
      where: {
        workspaceId,
        name: { equals: cleanName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new BadRequestException(`Role with name "${cleanName}" already exists in this workspace`);
    }

    const role = await this.prisma.role.create({
      data: {
        workspaceId,
        name: cleanName,
        description: description?.trim() || null,
        isSystemRole: false,
      },
    });

    if (permissionIds && permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    const createdRole = await this.prisma.role.findUnique({
      where: { id: role.id },
      include: { permissions: { include: { permission: true } } },
    });

    return {
      ...createdRole,
      isActive: true,
    };
  }

  async updateRole(
    workspaceId: string,
    roleId: string,
    data: { name?: string; description?: string; permissionIds?: string[] },
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, OR: [{ workspaceId }, { isSystemRole: true }] },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const isCurrentlyDeactivated = Boolean(role.description && role.description.startsWith('[DEACTIVATED]'));

    if (role.isSystemRole) {
      if (data.name && data.name !== role.name) {
        throw new BadRequestException('System roles cannot be renamed');
      }
      if (data.description !== undefined) {
        await this.prisma.role.update({
          where: { id: roleId },
          data: { description: data.description },
        });
      }
    } else {
      let finalDescription = data.description !== undefined ? data.description : role.description;
      if (isCurrentlyDeactivated && finalDescription && !finalDescription.startsWith('[DEACTIVATED]')) {
        finalDescription = `[DEACTIVATED] ${finalDescription}`;
      }

      await this.prisma.role.update({
        where: { id: roleId },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined ? { description: finalDescription } : {}),
        },
      });
    }

    if (data.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId } });
      if (data.permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }
    }

    const updated = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });

    const isDeactivated = Boolean(updated?.description && updated.description.startsWith('[DEACTIVATED]'));
    const cleanDesc = isDeactivated ? updated?.description?.replace('[DEACTIVATED]', '').trim() : updated?.description;

    return {
      ...updated,
      description: cleanDesc,
      isActive: !isDeactivated,
    };
  }

  async deactivateRole(workspaceId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, workspaceId },
    });

    if (!role) {
      throw new NotFoundException('Custom role not found in this workspace');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('Platform system roles cannot be deactivated');
    }

    if (role.description?.startsWith('[DEACTIVATED]')) {
      return { message: 'Role is already deactivated', isActive: false };
    }

    const newDescription = `[DEACTIVATED] ${role.description || ''}`.trim();
    const updated = await this.prisma.role.update({
      where: { id: roleId },
      data: { description: newDescription },
      include: {
        _count: { select: { memberships: true } },
      },
    });

    return {
      message: `Role "${role.name}" has been deactivated. Permissions are suspended for ${updated._count.memberships} assigned member(s).`,
      roleId,
      isActive: false,
      affectedMembersCount: updated._count.memberships,
    };
  }

  async reactivateRole(workspaceId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, workspaceId },
    });

    if (!role) {
      throw new NotFoundException('Custom role not found in this workspace');
    }

    const cleanDescription = (role.description || '').replace('[DEACTIVATED]', '').trim() || null;
    await this.prisma.role.update({
      where: { id: roleId },
      data: { description: cleanDescription },
    });

    return {
      message: `Role "${role.name}" reactivated successfully.`,
      roleId,
      isActive: true,
    };
  }

  async deleteRole(workspaceId: string, roleId: string, reassignRoleId?: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, workspaceId },
      include: { _count: { select: { memberships: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found or is a system role');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('Platform system roles cannot be deleted');
    }

    if (role._count.memberships > 0) {
      if (!reassignRoleId) {
        throw new BadRequestException(
          `Role is assigned to ${role._count.memberships} member(s). Provide a reassignRoleId before deleting to prevent orphaned memberships.`,
        );
      }

      if (reassignRoleId === roleId) {
        throw new BadRequestException('Cannot reassign members to the role being deleted');
      }

      const targetRole = await this.prisma.role.findFirst({
        where: { id: reassignRoleId, OR: [{ workspaceId }, { isSystemRole: true }] },
      });

      if (!targetRole) {
        throw new BadRequestException('Target reassignment role does not exist');
      }

      // Safe migration: reassign all affected members atomically
      await this.prisma.membership.updateMany({
        where: { roleId },
        data: { roleId: reassignRoleId },
      });
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.role.delete({ where: { id: roleId } });

    return {
      message: `Role "${role.name}" deleted successfully. Members safely migrated.`,
      deletedRoleId: roleId,
      migratedMembersCount: role._count.memberships,
    };
  }

  async getRoleMembers(workspaceId: string, roleId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId, roleId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        department: true,
        team: true,
        designation: true,
      },
    });
  }

  /**
   * Diagnostic Access Inspector: reviews effective access and explains WHY a user can or cannot perform an action
   */
  async diagnoseEffectiveAccess(workspaceId: string, membershipId: string, testPermission?: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        department: true,
        team: true,
        designation: true,
        reportsTo: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        directReports: {
          select: { id: true, user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found in workspace');
    }

    const isPlatformAdmin = membership.accessRole === 'OWNER';
    const userCtx = buildUserContextFromMembership(membership);
    const isRoleActive = userCtx.isRoleActive !== false;
    const assignedPermissions = userCtx.permissionCodes || [];

    // Compute effective granted permissions (strictly permission-based for non-OWNER, including ADMIN subtypes)
    let effectivePermissions: string[] = [];
    const permissionSources: Record<string, string> = {};

    if (membership.accessRole === 'OWNER') {
      const allPerms = await this.prisma.permission.findMany({ select: { code: true } });
      effectivePermissions = allPerms.map((p) => p.code);
      effectivePermissions.forEach((code) => {
        permissionSources[code] = 'PLATFORM_OWNER_AUTHORITY (Unrestricted platform authority)';
      });
    } else if (isRoleActive) {
      effectivePermissions = [...assignedPermissions];
      assignedPermissions.forEach((code) => {
        permissionSources[code] = `ACTIVE_ROLE_ASSIGNMENT (Granted via role: ${membership.role?.name})`;
      });
    } else {
      effectivePermissions = [];
    }

    // Data scope derived from OWNER / scope:* permissions with legacy fallback
    const scope = resolveEffectiveScope(userCtx);
    let scopeDescription = 'Restricted to records directly assigned to or created by this member';
    if (scope === 'GLOBAL') {
      scopeDescription = 'Global access to all records across all departments in the organization';
    } else if (scope === 'DEPARTMENT') {
      scopeDescription = `Restricted to records within the member's department: ${membership.department?.name || 'Unassigned'}`;
    } else if (scope === 'TEAM') {
      scopeDescription = `Restricted to records within the member's team (${membership.team?.name || 'Unassigned'}) and direct reports (${membership.directReports?.length || 0} reports)`;
    }

    // Permission evaluation (no hardcoded ADMIN bypass)
    let evaluation: any = undefined;
    if (testPermission) {
      const required = testPermission.trim();
      let isAllowed = false;
      let reason = '';

      if (membership.accessRole === 'OWNER') {
        isAllowed = true;
        reason = 'Allowed: Organization Owner holds absolute platform authority';
      } else if (!isRoleActive) {
        isAllowed = false;
        reason = `Denied: Assigned role "${membership.role?.name}" is currently deactivated. All permissions suspended.`;
      } else {
        const [mod] = required.split(':');
        const isSensitiveOrScopedPerm =
          required === 'people:view_sensitive' ||
          required.startsWith('calendar:view:') ||
          required === 'calendar:holidays:manage';
        const hasDirect = assignedPermissions.includes(required);
        const hasManage =
          mod !== 'scope' &&
          !isSensitiveOrScopedPerm &&
          (assignedPermissions.includes(`${mod}:manage`) || assignedPermissions.includes(`${mod}:administer`));
        const viaUtil = hasPermission(userCtx, required);

        if (hasDirect) {
          isAllowed = true;
          reason = `Allowed: Granted by assigned role "${membership.role?.name}"`;
        } else if (hasManage) {
          isAllowed = true;
          reason = `Allowed: Granted via module administrator permission "${mod}:manage"`;
        } else if (viaUtil) {
          isAllowed = true;
          reason = `Allowed: Granted via aliased permission in role "${membership.role?.name}"`;
        } else {
          isAllowed = false;
          reason = `Denied: Role "${membership.role?.name}" does not grant this permission "${required}"`;
        }
      }

      evaluation = {
        permission: required,
        isAllowed,
        reason,
        dataScopeConstraint: scopeDescription,
      };
    }

    return {
      membership: {
        id: membership.id,
        userId: membership.userId,
        userName: `${membership.user.firstName} ${membership.user.lastName}`,
        userEmail: membership.user.email,
        accessRole: membership.accessRole,
        role: {
          id: membership.role?.id,
          name: membership.role?.name,
          isSystemRole: membership.role?.isSystemRole,
          isActive: isRoleActive,
        },
        department: membership.department ? { id: membership.department.id, name: membership.department.name } : null,
        team: membership.team ? { id: membership.team.id, name: membership.team.name } : null,
        designation: membership.designation ? { id: membership.designation.id, title: membership.designation.title, level: membership.designation.level } : null,
        reportsTo: membership.reportsTo
          ? { id: membership.reportsTo.id, name: `${membership.reportsTo.user?.firstName || ''} ${membership.reportsTo.user?.lastName || ''}`.trim() }
          : null,
        directReportsCount: membership.directReports?.length || 0,
        dataScope: scope,
      },
      isPlatformAdmin,
      effectivePermissionsCount: effectivePermissions.length,
      effectivePermissions,
      permissionSources,
      dataScopePolicy: {
        scope,
        description: scopeDescription,
      },
      evaluation,
      verdict: evaluation ? (evaluation.isAllowed ? 'Allowed' : 'Denied') : undefined,
      hasPermission: evaluation ? evaluation.isAllowed : false,
      reason: evaluation?.reason || '',
    };
  }

  /**
   * 4 Core Platform Roles: OWNER, ADMIN, MANAGER, MEMBER.
   * Decoupled from job designations, departments, and custom permission matrices.
   */
  public async ensureSystemRoles() {
    await this.ensureSystemPermissions();
    const platformRoles = [
      {
        name: 'OWNER',
        description: 'Organization ownership: controls settings, billing, plan management, and delegated authority',
      },
      {
        name: 'ADMIN',
        description: 'Organization administration: invites, departments, module policies, and operations',
      },
      {
        name: 'MANAGER',
        description: 'Team and operations management: workloads, attendance, timesheets, leaves, and quality reviews',
      },
      {
        name: 'MEMBER',
        description: 'Individual contributor: assigned tasks, projects, operational work, attendance, and personal profile',
      },
    ];

    const allPermissions = await this.prisma.permission.findMany();
    const permMap = new Map(allPermissions.map((p) => [p.code, p.id]));

    const adminPermCodes = allPermissions
      .map((p) => p.code)
      .filter((code) => code !== 'billing:manage');

    const managerPermCodes = [
      'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:assign', 'tasks:export',
      'work_items:view', 'work_items:process', 'work_items:assign', 'work_items:export',
      'projects:view', 'projects:create', 'projects:edit',
      'time:view', 'time:log', 'time:edit', 'time:approve', 'time:export',
      'attendance:view', 'attendance:clock', 'attendance:edit', 'attendance:export',
      'leave:view', 'leave:apply', 'leave:approve',
      'approvals:view', 'approvals:approve',
      'quality:view', 'quality:audit', 'quality:review',
      'sla:view',
      'reports:view',
      'people:view',
      // Assets, Inventory, Ledger & Documents (Manager: all except assets:delete, documents:delete, inventory:manage)
      'assets:view', 'assets:create', 'assets:edit', 'assets:assign',
      'inventory:view', 'inventory:move',
      'ledger:view', 'ledger:export',
      'documents:view', 'documents:upload', 'documents:download',
      'scope:team',
      'calendar:view:team', 'calendar:view:schedules', 'calendar:create', 'calendar:invite', 'calendar:manage',
    ];

    const memberPermCodes = [
      'tasks:view', 'tasks:create', 'tasks:edit',
      'projects:view',
      'work_items:view', 'work_items:process',
      'time:view', 'time:log',
      'attendance:view', 'attendance:clock',
      'leave:view', 'leave:apply',
      'approvals:view',
      'people:view',
      'scope:own',
      'calendar:create', 'calendar:invite',
    ];

    for (const r of platformRoles) {
      let existing = await this.prisma.role.findFirst({
        where: { name: r.name, isSystemRole: true },
        include: { permissions: { include: { permission: true } } },
      });

      if (!existing) {
        existing = await this.prisma.role.create({
          data: {
            name: r.name,
            description: r.description,
            isSystemRole: true,
          },
          include: { permissions: { include: { permission: true } } },
        });
      }

      let codesToSeed: string[] = [];
      if (r.name === 'OWNER') codesToSeed = allPermissions.map((p) => p.code);
      else if (r.name === 'ADMIN') codesToSeed = adminPermCodes;
      else if (r.name === 'MANAGER') codesToSeed = managerPermCodes;
      else if (r.name === 'MEMBER') codesToSeed = memberPermCodes;

      const existingCodes = (existing.permissions || [])
        .map((rp: any) => rp.permission?.code || rp.code)
        .filter(Boolean);

      const missingCodes = codesToSeed.filter((code) => !existingCodes.includes(code));
      const permIds = missingCodes
        .map((code) => permMap.get(code))
        .filter((id): id is string => Boolean(id));

      if (permIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permIds.map((permissionId) => ({
            roleId: existing.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  /**
   * Full explicit permission catalog across all modules and actions
   * (view, create, edit, delete, assign, approve, export, manage)
   */
  public async ensureSystemPermissions() {
    const permissions = [
      // People
      { code: 'people:view', name: 'View Employee Directory & Profiles', module: 'People' },
      { code: 'people:create', name: 'Add & Onboard Employees', module: 'People' },
      { code: 'people:edit', name: 'Edit Employee Records & Assignments', module: 'People' },
      { code: 'people:delete', name: 'Deactivate & Offboard Employees', module: 'People' },
      { code: 'people:export', name: 'Export Employee Records', module: 'People' },
      { code: 'people:manage', name: 'Full People Administration', module: 'People' },
      { code: 'onboarding:manage', name: 'Manage Employee Onboarding & Checklists', module: 'People' },
      { code: 'people:view_sensitive', name: 'View Bank Account, PAN, Aadhaar & Compensation PII', module: 'People' },

      // Scope
      { code: 'scope:own', name: 'View Own Records Only', module: 'Scope' },
      { code: 'scope:team', name: 'View Assigned Team & Direct Reports Records', module: 'Scope' },
      { code: 'scope:department', name: 'View Assigned Department Records', module: 'Scope' },
      { code: 'scope:workspace', name: 'View Entire Workspace Records', module: 'Scope' },

      // Calendar
      { code: 'calendar:view:all', name: 'View All Company Calendar Events', module: 'Calendar' },
      { code: 'calendar:view:department', name: 'View Department Calendar Events', module: 'Calendar' },
      { code: 'calendar:view:team', name: 'View Team Calendar Events', module: 'Calendar' },
      { code: 'calendar:view:schedules', name: 'View Individual Employee Schedules', module: 'Calendar' },
      { code: 'calendar:create', name: 'Create Calendar Events & Meetings', module: 'Calendar' },
      { code: 'calendar:invite', name: 'Invite Participants to Meetings', module: 'Calendar' },
      { code: 'calendar:manage', name: 'Edit and Cancel Events', module: 'Calendar' },
      { code: 'calendar:holidays:manage', name: 'Manage Company Holidays', module: 'Calendar' },

      // Restricted Payroll Data
      { code: 'payroll:view', name: 'View Restricted Payroll & Salaries', module: 'Payroll' },
      { code: 'payroll:edit', name: 'Edit Compensation & Deductions', module: 'Payroll' },
      { code: 'payroll:approve', name: 'Approve Payroll Disbursals', module: 'Payroll' },
      { code: 'payroll:export', name: 'Export Sensitive Payroll Reports', module: 'Payroll' },
      { code: 'payroll:manage', name: 'Full Payroll Administration', module: 'Payroll' },

      // Projects
      { code: 'projects:view', name: 'View Work Projects', module: 'Projects' },
      { code: 'projects:create', name: 'Create Projects & Milestones', module: 'Projects' },
      { code: 'projects:edit', name: 'Edit Project Settings', module: 'Projects' },
      { code: 'projects:delete', name: 'Archive & Delete Projects', module: 'Projects' },
      { code: 'projects:manage', name: 'Full Project Administration', module: 'Projects' },

      // Tasks
      { code: 'tasks:view', name: 'View Tasks & Taskboards', module: 'Tasks' },
      { code: 'tasks:create', name: 'Create Tasks', module: 'Tasks' },
      { code: 'tasks:edit', name: 'Update Task Progress & Details', module: 'Tasks' },
      { code: 'tasks:delete', name: 'Delete Tasks', module: 'Tasks' },
      { code: 'tasks:assign', name: 'Assign Tasks to Team Members', module: 'Tasks' },
      { code: 'tasks:export', name: 'Export Tasks & Backlogs', module: 'Tasks' },
      { code: 'tasks:manage', name: 'Full Task Administration', module: 'Tasks' },

      // Operations Queue / Work Items
      { code: 'work_items:view', name: 'View Operations Queues', module: 'WorkQueue' },
      { code: 'work_items:process', name: 'Process Operational Queue Items', module: 'WorkQueue' },
      { code: 'work_items:assign', name: 'Assign & Reorder Work Items', module: 'WorkQueue' },
      { code: 'work_items:export', name: 'Export Queue Data', module: 'WorkQueue' },
      { code: 'work_items:manage', name: 'Full Operations Queue Administration', module: 'WorkQueue' },

      // Time & Attendance
      { code: 'time:view', name: 'View Timesheets & Time Logs', module: 'Time' },
      { code: 'time:log', name: 'Log Work Hours & Timer', module: 'Time' },
      { code: 'time:edit', name: 'Edit Logged Timesheets', module: 'Time' },
      { code: 'time:approve', name: 'Approve Team Timesheets', module: 'Time' },
      { code: 'time:export', name: 'Export Timesheet Logs', module: 'Time' },
      { code: 'time:manage', name: 'Full Time & Shift Administration', module: 'Time' },

      // Attendance
      { code: 'attendance:view', name: 'View Attendance Records & History', module: 'Attendance' },
      { code: 'attendance:clock', name: 'Clock In, Clock Out & Shift Tracker', module: 'Attendance' },
      { code: 'attendance:edit', name: 'Adjust Attendance Records', module: 'Attendance' },
      { code: 'attendance:export', name: 'Export Attendance Reports', module: 'Attendance' },
      { code: 'attendance:manage', name: 'Full Attendance & Shift Administration', module: 'Attendance' },

      // Leave & PTO
      { code: 'leave:view', name: 'View Leave Balances & Team Calendar', module: 'Leave' },
      { code: 'leave:apply', name: 'Apply for Leave & PTO', module: 'Leave' },
      { code: 'leave:approve', name: 'Approve or Reject Leave Requests', module: 'Leave' },
      { code: 'leave:manage', name: 'Full Leave Policy Administration', module: 'Leave' },

      // Approvals
      { code: 'approvals:view', name: 'View Pending Approvals', module: 'Approvals' },
      { code: 'approvals:approve', name: 'Approve or Reject Operational Items', module: 'Approvals' },
      { code: 'approvals:manage', name: 'Configure Approval Chains', module: 'Approvals' },

      // Quality Audit
      { code: 'quality:view', name: 'View Quality Audit Scorecards', module: 'Quality' },
      { code: 'quality:audit', name: 'Perform Quality Audits', module: 'Quality' },
      { code: 'quality:review', name: 'Conduct QA Reviews', module: 'Quality' },
      { code: 'quality:manage', name: 'Configure Quality Scorecards & Thresholds', module: 'Quality' },

      // SLA & Escalations
      { code: 'sla:view', name: 'View SLA Metrics & Breaches', module: 'SLA' },
      { code: 'sla:manage', name: 'Configure SLA Deadlines & Escalation Rules', module: 'SLA' },

      // Clients
      { code: 'clients:view', name: 'View Client Accounts', module: 'Clients' },
      { code: 'clients:create', name: 'Create Client Accounts', module: 'Clients' },
      { code: 'clients:edit', name: 'Edit Client Profiles', module: 'Clients' },
      { code: 'clients:delete', name: 'Archive Client Accounts', module: 'Clients' },
      { code: 'clients:manage', name: 'Full Client Administration', module: 'Clients' },

      // Reports
      { code: 'reports:view', name: 'View Operational Reports & Dashboards', module: 'Reports' },
      { code: 'reports:export', name: 'Export Analytic Reports', module: 'Reports' },

      // Assets, Inventory, Ledger & Documents
      // ASSETS (5)
      { code: 'assets:view', name: 'View company assets', module: 'Assets' },
      { code: 'assets:create', name: 'Register new assets', module: 'Assets' },
      { code: 'assets:edit', name: 'Edit asset details', module: 'Assets' },
      { code: 'assets:assign', name: 'Assign assets to people', module: 'Assets' },
      { code: 'assets:delete', name: 'Delete assets', module: 'Assets' },

      // INVENTORY (3)
      { code: 'inventory:view', name: 'View stock and locations', module: 'Inventory' },
      { code: 'inventory:move', name: 'Move stock between locations', module: 'Inventory' },
      { code: 'inventory:manage', name: 'Manage locations and low-stock rules', module: 'Inventory' },

      // LEDGER (2)
      { code: 'ledger:view', name: 'View movement ledger', module: 'Ledger' },
      { code: 'ledger:export', name: 'Export ledger', module: 'Ledger' },

      // DOCUMENTS (4)
      { code: 'documents:view', name: 'View document vault', module: 'Documents' },
      { code: 'documents:upload', name: 'Upload documents', module: 'Documents' },
      { code: 'documents:download', name: 'Download documents', module: 'Documents' },
      { code: 'documents:delete', name: 'Delete documents', module: 'Documents' },

      // Organization Structure & Administration
      { code: 'org:manage', name: 'Manage Organization Profile', module: 'Organization' },
      { code: 'invitations:manage', name: 'Invite & Manage Team Members', module: 'Invitations' },
      { code: 'roles:manage', name: 'Configure Custom Roles & Permissions', module: 'Roles' },
      { code: 'departments:manage', name: 'Manage Departments & Teams', module: 'Departments' },
      { code: 'settings:manage', name: 'Manage Workspace Settings', module: 'Settings' },
      { code: 'billing:manage', name: 'Manage Subscriptions & Billing', module: 'Billing' },
    ];

    for (const p of permissions) {
      await this.prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, module: p.module },
        create: p,
      });
    }
  }

  async recommendForDesignation(workspaceId: string, designationTitle?: string) {
    const title = (designationTitle || '').trim();
    const lower = title.toLowerCase();

    const [ws, roles, allPermissions] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } }),
      this.listWorkspaceRoles(workspaceId),
      this.listAllPermissions(),
    ]);

    const settings = (ws?.settings as any) || {};
    const savedMap: Record<string, string> = settings.designationRoleMap || {};
    const allCodes = allPermissions.map((p: any) => p.code);
    const nonBillingCodes = allCodes.filter((c: string) => c !== 'billing:manage');

    const templates = [
      {
        key: 'PAYROLL_ADMIN',
        match: ['payroll', 'compensation', 'salary', 'finance admin'],
        suggestedRoleName: 'Payroll Admin',
        accessRole: 'ADMIN',
        dataScope: 'GLOBAL',
        description: 'Manages salary structures, payslip runs, attendance/leave verification, and payroll exports without user/role administration access.',
        permissionCodes: [
          'payroll:view', 'payroll:edit', 'payroll:approve', 'payroll:export', 'payroll:manage',
          'people:view', 'people:view_sensitive',
          'time:view', 'attendance:view', 'leave:view',
          'reports:view', 'reports:export',
          'scope:workspace', 'calendar:create', 'calendar:invite',
        ],
      },
      {
        key: 'RECRUITMENT_ADMIN',
        match: ['recruit', 'talent', 'hiring', 'ta specialist', 'acquisition'],
        suggestedRoleName: 'Recruitment Admin',
        accessRole: 'ADMIN',
        dataScope: 'GLOBAL',
        description: 'Handles invitations, new hire onboarding, and department placement without payroll or existing profile edit rights unless checked.',
        permissionCodes: [
          'invitations:manage', 'onboarding:manage', 'people:view', 'departments:manage',
          'scope:workspace', 'calendar:create', 'calendar:invite',
        ],
      },
      {
        key: 'HR_GENERALIST',
        match: ['generalist', 'hr manager', 'hr executive', 'people ops', 'human resource'],
        suggestedRoleName: 'HR Generalist',
        accessRole: 'ADMIN',
        dataScope: 'GLOBAL',
        description: 'Manages employee directory, profile edits, onboarding, leave policies/approvals, and attendance without payroll disbursement controls.',
        permissionCodes: [
          'people:view', 'people:create', 'people:edit', 'people:delete', 'people:export', 'people:manage',
          'onboarding:manage', 'people:view_sensitive', 'invitations:manage',
          'leave:view', 'leave:approve', 'leave:manage',
          'attendance:view', 'attendance:edit', 'attendance:export', 'time:view',
          'departments:manage', 'assets:view', 'assets:assign',
          'documents:view', 'documents:upload', 'documents:download',
          'reports:view', 'scope:workspace',
          'calendar:view:all', 'calendar:create', 'calendar:invite', 'calendar:holidays:manage',
        ],
      },
      {
        key: 'OPERATIONS_ADMIN',
        match: ['operations head', 'coo', 'workspace admin', 'system admin', 'chief'],
        suggestedRoleName: 'Operations Admin',
        accessRole: 'ADMIN',
        dataScope: 'GLOBAL',
        description: 'Full operational administration across departments, workflows, and modules (excluding subscription billing).',
        permissionCodes: nonBillingCodes,
      },
      {
        key: 'DEPARTMENT_LEAD',
        match: ['department head', 'dept head', 'department lead', 'hod', 'vp ', 'director'],
        suggestedRoleName: 'Department Lead',
        accessRole: 'MANAGER',
        dataScope: 'DEPARTMENT',
        description: 'Full visibility and approvals across their assigned Department (including all teams within that department).',
        permissionCodes: [
          'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:assign', 'tasks:export',
          'work_items:view', 'work_items:process', 'work_items:assign', 'work_items:export',
          'projects:view', 'projects:create', 'projects:edit',
          'time:view', 'time:log', 'time:edit', 'time:approve', 'time:export',
          'attendance:view', 'attendance:clock', 'attendance:edit', 'attendance:export',
          'leave:view', 'leave:apply', 'leave:approve',
          'approvals:view', 'approvals:approve',
          'quality:view', 'quality:audit', 'quality:review', 'sla:view', 'reports:view', 'people:view',
          'assets:view', 'assets:create', 'assets:edit', 'assets:assign',
          'inventory:view', 'inventory:move', 'ledger:view', 'ledger:export',
          'documents:view', 'documents:upload', 'documents:download',
          'scope:department', 'calendar:view:department', 'calendar:view:schedules', 'calendar:create', 'calendar:invite', 'calendar:manage',
        ],
      },
      {
        key: 'TEAM_LEAD',
        match: ['team lead', 'tech lead', 'tl', 'marketing lead', 'engineering lead', 'squad lead', 'manager', 'supervisor'],
        suggestedRoleName: 'Team Lead',
        accessRole: 'MANAGER',
        dataScope: 'TEAM',
        description: 'Restricted strictly to their own Team and direct reports. Check scope:department if they should manage the entire department.',
        permissionCodes: [
          'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:assign', 'tasks:export',
          'work_items:view', 'work_items:process', 'work_items:assign', 'work_items:export',
          'projects:view', 'projects:create', 'projects:edit',
          'time:view', 'time:log', 'time:edit', 'time:approve', 'time:export',
          'attendance:view', 'attendance:clock', 'attendance:edit', 'attendance:export',
          'leave:view', 'leave:apply', 'leave:approve',
          'approvals:view', 'approvals:approve',
          'quality:view', 'quality:audit', 'quality:review', 'sla:view', 'reports:view', 'people:view',
          'assets:view', 'assets:create', 'assets:edit', 'assets:assign',
          'inventory:view', 'inventory:move', 'ledger:view', 'ledger:export',
          'documents:view', 'documents:upload', 'documents:download',
          'scope:team', 'calendar:view:team', 'calendar:view:schedules', 'calendar:create', 'calendar:invite', 'calendar:manage',
        ],
      },
      {
        key: 'QA_AUDITOR',
        match: ['qa', 'quality', 'auditor', 'tester', 'qc'],
        suggestedRoleName: 'QA Auditor',
        accessRole: 'MEMBER',
        dataScope: 'TEAM',
        description: 'Conducts quality scorecards, QA reviews, and audits within assigned team scope.',
        permissionCodes: [
          'tasks:view', 'work_items:view', 'work_items:process',
          'quality:view', 'quality:audit', 'quality:review', 'sla:view',
          'time:view', 'time:log', 'attendance:view', 'attendance:clock', 'leave:view', 'leave:apply',
          'people:view', 'scope:team', 'calendar:create', 'calendar:invite',
        ],
      },
    ];

    const defaultTemplate = {
      key: 'MEMBER',
      suggestedRoleName: 'Member',
      accessRole: 'MEMBER',
      dataScope: 'ASSIGNED',
      description: 'Individual contributor with access to assigned tasks, attendance, leave applications, and own profile.',
      permissionCodes: [
        'tasks:view', 'tasks:create', 'tasks:edit',
        'projects:view', 'work_items:view', 'work_items:process',
        'time:view', 'time:log', 'attendance:view', 'attendance:clock',
        'leave:view', 'leave:apply', 'approvals:view', 'people:view',
        'scope:own', 'calendar:create', 'calendar:invite',
      ],
    };

    const savedRoleId = savedMap[lower];
    const savedRole = savedRoleId ? roles.find((r: any) => r.id === savedRoleId && r.isActive !== false) : null;
    const inferCoreRole = (codes: string[]) => {
      if (codes.some((c: string) => c.startsWith('payroll:') || c.startsWith('invitations:') || c.startsWith('roles:') || c.startsWith('people:manage') || c.startsWith('settings:'))) return 'ADMIN';
      if (codes.some((c: string) => c.includes(':approve') || c === 'scope:team' || c === 'scope:department')) return 'MANAGER';
      return 'MEMBER';
    };

    if (savedRole) {
      const roleCodes = (savedRole.permissions || []).map((rp: any) => rp.permission?.code).filter(Boolean);
      const sysName = savedRole.name?.toUpperCase();
      const mappedCore = savedRole.isSystemRole && ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].includes(sysName) ? sysName : inferCoreRole(roleCodes);
      return {
        source: 'SAVED_WORKSPACE_MAPPING',
        designation: title,
        existingRoleId: savedRole.id,
        existingRoleName: savedRole.name,
        suggestedRoleName: savedRole.name,
        accessRole: mappedCore,
        dataScope: resolveEffectiveScope({ permissionCodes: roleCodes, dataScope: 'ASSIGNED' }),
        permissionCodes: roleCodes,
        description: savedRole.description || `Matched saved workspace role "${savedRole.name}" for "${title}".`,
        templates: templates.map((t) => ({ key: t.key, name: t.suggestedRoleName, accessRole: t.accessRole, dataScope: t.dataScope, description: t.description, permissionCodes: t.permissionCodes })),
      };
    }

    if (lower) {
      const customMatch = roles.find(
        (r: any) => !r.isSystemRole && r.isActive !== false && (r.name.toLowerCase() === lower || lower.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(lower)),
      );
      if (customMatch) {
        const roleCodes = (customMatch.permissions || []).map((rp: any) => rp.permission?.code).filter(Boolean);
        return {
          source: 'EXISTING_CUSTOM_ROLE',
          designation: title,
          existingRoleId: customMatch.id,
          existingRoleName: customMatch.name,
          suggestedRoleName: customMatch.name,
          accessRole: roleCodes.some((c: string) => c.startsWith('payroll:') || c.startsWith('invitations:') || c.startsWith('roles:') || c.startsWith('people:manage')) ? 'ADMIN' : roleCodes.some((c: string) => c.includes(':approve')) ? 'MANAGER' : 'MEMBER',
          dataScope: resolveEffectiveScope({ permissionCodes: roleCodes, dataScope: 'ASSIGNED' }),
          permissionCodes: roleCodes,
          description: customMatch.description || `Matched existing custom role "${customMatch.name}".`,
          templates: templates.map((t) => ({ key: t.key, name: t.suggestedRoleName, accessRole: t.accessRole, dataScope: t.dataScope, description: t.description, permissionCodes: t.permissionCodes })),
        };
      }
    }

    const matched = lower ? templates.find((t) => t.match.some((kw) => lower.includes(kw))) : null;
    const chosen = matched || defaultTemplate;
    const existingSystemOrNamed = roles.find((r: any) => r.name.toLowerCase() === chosen.suggestedRoleName.toLowerCase() && r.isActive !== false);

    return {
      source: matched ? 'SMART_DESIGNATION_TEMPLATE' : 'DEFAULT_TEMPLATE',
      designation: title,
      existingRoleId: existingSystemOrNamed?.id || null,
      existingRoleName: existingSystemOrNamed?.name || null,
      suggestedRoleName: chosen.suggestedRoleName,
      accessRole: chosen.accessRole,
      dataScope: chosen.dataScope,
      permissionCodes: chosen.permissionCodes,
      description: chosen.description,
      templates: templates.map((t) => ({ key: t.key, name: t.suggestedRoleName, accessRole: t.accessRole, dataScope: t.dataScope, description: t.description, permissionCodes: t.permissionCodes })),
    };
  }
}
