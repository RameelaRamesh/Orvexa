import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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

    const isPlatformAdmin = membership.accessRole === 'OWNER' || membership.accessRole === 'ADMIN';
    const isRoleActive = !membership.role?.description?.startsWith('[DEACTIVATED]');
    const assignedPermissions = membership.role?.permissions?.map((rp) => rp.permission.code) || [];

    // Compute effective granted permissions
    let effectivePermissions: string[] = [];
    const permissionSources: Record<string, string> = {};

    if (membership.accessRole === 'OWNER') {
      const allPerms = await this.prisma.permission.findMany({ select: { code: true } });
      effectivePermissions = allPerms.map((p) => p.code);
      effectivePermissions.forEach((code) => {
        permissionSources[code] = 'PLATFORM_OWNER_AUTHORITY (Unrestricted platform authority)';
      });
    } else if (membership.accessRole === 'ADMIN') {
      const allPerms = await this.prisma.permission.findMany({ select: { code: true } });
      effectivePermissions = allPerms.map((p) => p.code);
      effectivePermissions.forEach((code) => {
        permissionSources[code] = 'PLATFORM_ADMIN_AUTHORITY (Full operational administration)';
      });
    } else if (isRoleActive) {
      effectivePermissions = [...assignedPermissions];
      assignedPermissions.forEach((code) => {
        permissionSources[code] = `ACTIVE_ROLE_ASSIGNMENT (Granted via role: ${membership.role?.name})`;
      });
    } else {
      effectivePermissions = [];
    }

    // Data scope description
    const scope = membership.dataScope || 'ASSIGNED';
    let scopeDescription = 'Restricted to records directly assigned to or created by this member';
    if (scope === 'GLOBAL' || scope === 'ALL') {
      scopeDescription = 'Global access to all records across all departments in the organization';
    } else if (scope === 'DEPARTMENT') {
      scopeDescription = `Restricted to records within the member's department: ${membership.department?.name || 'Unassigned'}`;
    } else if (scope === 'TEAM') {
      scopeDescription = `Restricted to records within the member's team (${membership.team?.name || 'Unassigned'}) and direct reports (${membership.directReports?.length || 0} reports)`;
    }

    // Permission evaluation
    let evaluation: any = undefined;
    if (testPermission) {
      const required = testPermission.trim();
      let isAllowed = false;
      let reason = '';

      if (membership.accessRole === 'OWNER') {
        isAllowed = true;
        reason = 'Allowed: Organization Owner holds absolute platform authority';
      } else if (membership.accessRole === 'ADMIN') {
        isAllowed = true;
        reason = 'Allowed: Workspace Administrator holds operational authority';
      } else if (!isRoleActive) {
        isAllowed = false;
        reason = `Denied: Assigned role "${membership.role?.name}" is currently deactivated. All permissions suspended.`;
      } else {
        const [mod, action] = required.split(':');
        const hasDirect = assignedPermissions.includes(required);
        const hasManage = assignedPermissions.includes(`${mod}:manage`) || assignedPermissions.includes(`${mod}:administer`);

        if (hasDirect) {
          isAllowed = true;
          reason = `Allowed: Granted by assigned role "${membership.role?.name}"`;
        } else if (hasManage) {
          isAllowed = true;
          reason = `Allowed: Granted via module administrator permission "${mod}:manage"`;
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
    ];

    for (const r of platformRoles) {
      let existing = await this.prisma.role.findFirst({
        where: { name: r.name, isSystemRole: true },
        include: { permissions: true },
      });

      if (!existing) {
        existing = await this.prisma.role.create({
          data: {
            name: r.name,
            description: r.description,
            isSystemRole: true,
          },
          include: { permissions: true },
        });
      }

      if (existing.permissions.length === 0 && allPermissions.length > 0) {
        let codesToSeed: string[] = [];
        if (r.name === 'OWNER') codesToSeed = allPermissions.map((p) => p.code);
        else if (r.name === 'ADMIN') codesToSeed = adminPermCodes;
        else if (r.name === 'MANAGER') codesToSeed = managerPermCodes;
        else if (r.name === 'MEMBER') codesToSeed = memberPermCodes;

        const permIds = codesToSeed
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
}
