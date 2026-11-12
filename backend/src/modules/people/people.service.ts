import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SystemAccessRole, MembershipStatus, InvitationStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../infrastructure/mail/mail.service';
import {
  resolveMemberScopeContext,
  resolveMemberEffectivePermissions,
  satisfiesPermissionCode,
  getScopeRank,
} from '../../common/utils/scope.util';

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async listMembers(
    workspaceId: string,
    query?: {
      departmentId?: string;
      teamId?: string;
      accessRole?: string;
      status?: string;
      search?: string;
    },
    userContext?: {
      membershipId?: string;
      dataScope?: string;
      accessRole?: string;
      departmentId?: string;
      teamId?: string;
      scopedTeamIds?: string[];
    },
  ) {
    const where: any = { workspaceId };

    if (query?.status) {
      where.status = query.status as MembershipStatus;
    } else {
      where.status = { in: ['ACTIVE', 'SUSPENDED', 'INVITED'] };
    }

    if (query?.departmentId) where.departmentId = query.departmentId;
    if (query?.teamId) where.teamId = query.teamId;
    if (query?.accessRole) where.accessRole = query.accessRole as SystemAccessRole;

    if (query?.search) {
      where.user = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    // Data scope enforcement for non-Admins/Owners
    if (
      userContext &&
      userContext.accessRole !== 'OWNER' &&
      userContext.accessRole !== 'ADMIN'
    ) {
      const scope = userContext.dataScope || 'ASSIGNED';
      if (scope === 'ASSIGNED' || scope === 'OWN') {
        where.id = userContext.membershipId;
      } else if (scope === 'DEPARTMENT') {
        if (userContext.departmentId) {
          where.departmentId = userContext.departmentId;
        } else {
          where.id = userContext.membershipId;
        }
      } else if (scope === 'TEAM') {
        // Manager / Team Lead access: can view own record, assigned/permitted team members, and direct reports
        const allowedTeamIds = Array.from(
          new Set(
            [
              ...(Array.isArray(userContext.scopedTeamIds) ? userContext.scopedTeamIds : []),
              ...(userContext.teamId ? [userContext.teamId] : []),
            ].filter(Boolean),
          ),
        );
        const teamClause =
          allowedTeamIds.length === 1
            ? [{ teamId: allowedTeamIds[0] }]
            : allowedTeamIds.length > 1
            ? [{ teamId: { in: allowedTeamIds } }]
            : [];
        where.OR = [
          { id: userContext.membershipId },
          ...teamClause,
          { reportsToId: userContext.membershipId },
        ];
      }
      // If scope === 'GLOBAL' or 'ALL', global access across all departments is preserved
    }

    const members = await this.prisma.membership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            phone: true,
            lastLoginAt: true,
            mfaEnabled: true,
          },
        },
        role: true,
        department: true,
        team: true,
        designation: true,
        reportsTo: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        _count: {
          select: { assignedTasks: true, assignedWorkItems: true, assignedAssets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wsRec = await (this.prisma as any).workspace
      ?.findUnique?.({ where: { id: workspaceId }, select: { settings: true } })
      ?.catch?.(() => null);
    if (!wsRec?.settings) {
      return members;
    }

    const wsSettings = (wsRec.settings as Record<string, any>) || {};
    const memberCustomTeamsMap: Record<string, string[]> = wsSettings.memberScopedTeams || {};
    return Promise.all(
      members.map(async (m: any) => {
        const resolved = await resolveMemberScopeContext(this.prisma, workspaceId, m, wsSettings);
        const roleCodes = Array.isArray(m.role?.permissions)
          ? m.role.permissions.map((rp: any) => rp?.permission?.code || rp?.code).filter(Boolean)
          : [];
        const effectivePermissions = resolveMemberEffectivePermissions(roleCodes, m.id, wsSettings);
        return {
          ...m,
          dataScope: resolved.effectiveDataScope,
          scopedTeamIds: resolved.scopedTeamIds,
          customScopedTeamIds: Array.isArray(memberCustomTeamsMap[m.id]) ? memberCustomTeamsMap[m.id] : [],
          ledTeamIds: resolved.ledTeamIds,
          memberPermissionOverrides: wsSettings.memberPermissionOverrides?.[m.id] || null,
          effectivePermissions,
        };
      }),
    );
  }

  async getMemberById(workspaceId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            phone: true,
            isEmailVerified: true,
            lastLoginAt: true,
            mfaEnabled: true,
            createdAt: true,
          },
        },
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        department: true,
        team: true,
        designation: true,
        reportsTo: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        directReports: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        assignedTasks: { take: 10, orderBy: { createdAt: 'desc' } },
        assignedWorkItems: { take: 10, orderBy: { createdAt: 'desc' } },
        leaveBalances: true,
        assignedAssets: true,
        attendances: { take: 5, orderBy: { date: 'desc' } },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in workspace');
    }

    const wsRec = await (this.prisma as any).workspace
      ?.findUnique?.({ where: { id: workspaceId }, select: { settings: true } })
      ?.catch?.(() => null);
    if (wsRec?.settings) {
      const wsSettings = wsRec.settings as Record<string, any>;
      const resolved = await resolveMemberScopeContext(this.prisma, workspaceId, membership, wsSettings);
      const customTeams = Array.isArray(wsSettings.memberScopedTeams?.[membership.id])
        ? wsSettings.memberScopedTeams[membership.id]
        : [];
      const roleCodes = Array.isArray(membership.role?.permissions)
        ? membership.role.permissions.map((rp: any) => rp?.permission?.code || rp?.code).filter(Boolean)
        : [];
      const effectivePermissions = resolveMemberEffectivePermissions(roleCodes, membership.id, wsSettings);
      return {
        ...membership,
        dataScope: resolved.effectiveDataScope,
        scopedTeamIds: resolved.scopedTeamIds,
        customScopedTeamIds: customTeams,
        ledTeamIds: resolved.ledTeamIds,
        memberPermissionOverrides: wsSettings.memberPermissionOverrides?.[membership.id] || null,
        effectivePermissions,
      };
    }

    return membership;
  }

  async updateMemberProfile(
    workspaceId: string,
    membershipId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      avatarUrl?: string;
      employeeId?: string;
      employmentType?: string;
      joiningDate?: string | Date;
      workLocation?: string;
      probationEndDate?: string | Date;
      emergencyContact?: any;
      dataScope?: string;
    },
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    // Update user info
    const userUpdates: { firstName?: string; lastName?: string; email?: string; phone?: string; avatarUrl?: string } = {};
    if (data.firstName !== undefined && data.firstName.trim().length > 0) {
      userUpdates.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      userUpdates.lastName = data.lastName.trim();
    }
    if (data.phone !== undefined) {
      userUpdates.phone = data.phone;
    }
    if (data.avatarUrl !== undefined) {
      userUpdates.avatarUrl = data.avatarUrl;
    }
    if (data.email !== undefined && data.email.trim().length > 0) {
      const emailLower = data.email.trim().toLowerCase();
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: { equals: emailLower, mode: 'insensitive' },
          id: { not: membership.userId },
        },
      });
      if (existingUser) {
        throw new ConflictException('A user with this email address already exists.');
      }
      userUpdates.email = emailLower;
    }

    if (Object.keys(userUpdates).length > 0) {
      await this.prisma.user.update({
        where: { id: membership.userId },
        data: userUpdates,
      });
    }

    // Update membership employee info
    return this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(data.employeeId !== undefined ? { employeeId: data.employeeId } : {}),
        ...(data.employmentType !== undefined ? { employmentType: data.employmentType } : {}),
        ...(data.joiningDate ? { joiningDate: new Date(data.joiningDate) } : {}),
        ...(data.workLocation !== undefined ? { workLocation: data.workLocation } : {}),
        ...(data.probationEndDate ? { probationEndDate: new Date(data.probationEndDate) } : {}),
        ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact } : {}),
        ...(data.dataScope ? { dataScope: data.dataScope } : {}),
      },
      include: {
        user: true,
        role: true,
        department: true,
        team: true,
        designation: true,
      },
    });
  }

  async updateMemberOrgDetails(
    workspaceId: string,
    membershipId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      accessRole?: SystemAccessRole;
      roleId?: string;
      departmentId?: string;
      teamId?: string;
      designationId?: string;
      designationTitle?: string;
      reportsToId?: string;
      dataScope?: string;
      scopedTeamIds?: string[];
      permissionOverrides?: { added?: string[]; revoked?: string[] };
    },
    actorContext?: any,
  ) {
    const cleanId = (id?: string) => (id && id.trim().length > 0 ? id.trim() : null);

    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    // Delegated admin ceiling when actor is not OWNER/ADMIN
    if (actorContext && actorContext.accessRole !== 'OWNER' && actorContext.accessRole !== 'ADMIN') {
      const targetSysUpper = (membership.accessRole || '').toUpperCase();
      if (targetSysUpper === 'OWNER' || targetSysUpper === 'ADMIN') {
        throw new ForbiddenException('You cannot modify Owner or Admin accounts.');
      }
      if (data.accessRole && ['OWNER', 'ADMIN'].includes(String(data.accessRole).toUpperCase())) {
        throw new ForbiddenException('Only Organization Owners and Admins can grant Owner or Admin system roles.');
      }
      const actorPerms: string[] = Array.isArray(actorContext.permissions) ? actorContext.permissions : [];
      if (data.permissionOverrides?.added) {
        for (const code of data.permissionOverrides.added) {
          if (!satisfiesPermissionCode(actorPerms, code)) {
            throw new ForbiddenException(`Cannot grant permission "${code}" beyond your own authority.`);
          }
        }
      }
      if (data.dataScope && getScopeRank(data.dataScope) > getScopeRank(actorContext.dataScope)) {
        throw new ForbiddenException('Cannot assign a data scope broader than your own.');
      }
      if (data.departmentId && actorContext.dataScope === 'DEPARTMENT' && actorContext.departmentId && data.departmentId !== actorContext.departmentId) {
        throw new ForbiddenException('You can only place members inside your own department.');
      }
      const allowedTeams = Array.from(
        new Set([...(actorContext.scopedTeamIds || []), ...(actorContext.ledTeamIds || []), ...(actorContext.teamId ? [actorContext.teamId] : [])]),
      );
      if (data.teamId && actorContext.dataScope === 'TEAM' && allowedTeams.length > 0 && !allowedTeams.includes(data.teamId)) {
        throw new ForbiddenException('You can only place members inside your own permitted team(s).');
      }
    }

    // Protect sole Owner demotion
    if (membership.accessRole === 'OWNER' && data.accessRole && data.accessRole !== 'OWNER') {
      const ownerCount = await this.prisma.membership.count({
        where: { workspaceId, accessRole: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the sole workspace Owner. Transfer workspace ownership first.',
        );
      }
    }

    // Handle user personal info updates (firstName, lastName, email)
    const userUpdates: { firstName?: string; lastName?: string; email?: string } = {};
    if (data.firstName !== undefined && data.firstName.trim().length > 0) {
      userUpdates.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      userUpdates.lastName = data.lastName.trim();
    }
    if (data.email !== undefined && data.email.trim().length > 0) {
      const emailLower = data.email.trim().toLowerCase();
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: { equals: emailLower, mode: 'insensitive' },
          id: { not: membership.userId },
        },
      });
      if (existingUser) {
        throw new ConflictException('A user with this email address already exists.');
      }
      userUpdates.email = emailLower;
    }

    if (Object.keys(userUpdates).length > 0) {
      await this.prisma.user.update({
        where: { id: membership.userId },
        data: userUpdates,
      });
    }

    let finalDesignationId = data.designationId !== undefined ? cleanId(data.designationId) : undefined;
    if (data.designationTitle !== undefined) {
      const cleanTitle = data.designationTitle.trim();
      if (cleanTitle) {
        let desig = await this.prisma.designation.findFirst({
          where: { workspaceId, title: { equals: cleanTitle, mode: 'insensitive' } },
        });
        if (!desig) {
          desig = await this.prisma.designation.create({
            data: { workspaceId, title: cleanTitle, level: 1 },
          });
        }
        finalDesignationId = desig.id;
      } else {
        finalDesignationId = null;
      }
    }

    let resolvedDataScope = data.dataScope;
    if (!resolvedDataScope && data.accessRole && data.accessRole !== membership.accessRole) {
      const nextRole = data.accessRole.toUpperCase();
      if (nextRole === 'OWNER' || nextRole === 'ADMIN') {
        resolvedDataScope = 'GLOBAL';
      } else if (nextRole === 'MANAGER' && (!membership.dataScope || membership.dataScope === 'ASSIGNED')) {
        resolvedDataScope = 'TEAM';
      }
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(data.accessRole ? { accessRole: data.accessRole } : {}),
        ...(data.roleId ? { roleId: data.roleId } : {}),
        ...(data.departmentId !== undefined ? { departmentId: cleanId(data.departmentId) } : {}),
        ...(data.teamId !== undefined ? { teamId: cleanId(data.teamId) } : {}),
        ...(finalDesignationId !== undefined ? { designationId: finalDesignationId } : {}),
        ...(data.reportsToId !== undefined ? { reportsToId: cleanId(data.reportsToId) } : {}),
        ...(resolvedDataScope ? { dataScope: resolvedDataScope } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        role: true,
        department: true,
        team: true,
        designation: true,
      },
    });

    if (
      (data.dataScope !== undefined || data.scopedTeamIds !== undefined || data.permissionOverrides !== undefined) &&
      (this.prisma as any).workspace?.findUnique &&
      (this.prisma as any).workspace?.update
    ) {
      const wsRec = await (this.prisma as any).workspace
        .findUnique({ where: { id: workspaceId }, select: { settings: true } })
        .catch(() => null);
      if (wsRec) {
        const wsSettings: any = (wsRec.settings as any) || {};
        const nextMemberDataScopes = { ...(wsSettings.memberDataScopes || {}) };
        if (data.dataScope) {
          nextMemberDataScopes[membershipId] = data.dataScope;
        }
        const nextMemberScopedTeams = { ...(wsSettings.memberScopedTeams || {}) };
        if (Array.isArray(data.scopedTeamIds)) {
          const finalScopeCheck = data.dataScope || resolvedDataScope || updated.dataScope;
          nextMemberScopedTeams[membershipId] =
            finalScopeCheck === 'TEAM'
              ? Array.from(new Set(data.scopedTeamIds.filter(Boolean)))
              : [];
        } else if (data.dataScope && data.dataScope !== 'TEAM') {
          nextMemberScopedTeams[membershipId] = [];
        }
        const nextMemberPermOverrides = { ...(wsSettings.memberPermissionOverrides || {}) };
        if (data.permissionOverrides !== undefined) {
          const added = Array.isArray(data.permissionOverrides?.added)
            ? Array.from(new Set(data.permissionOverrides.added.filter(Boolean)))
            : [];
          const revoked = Array.isArray(data.permissionOverrides?.revoked)
            ? Array.from(new Set(data.permissionOverrides.revoked.filter(Boolean)))
            : [];
          if (added.length > 0 || revoked.length > 0) {
            nextMemberPermOverrides[membershipId] = { added, revoked };
          } else {
            delete nextMemberPermOverrides[membershipId];
          }
        }
        await (this.prisma as any).workspace
          .update({
            where: { id: workspaceId },
            data: {
              settings: {
                ...wsSettings,
                memberDataScopes: nextMemberDataScopes,
                memberScopedTeams: nextMemberScopedTeams,
                memberPermissionOverrides: nextMemberPermOverrides,
              },
            },
          })
          .catch(() => null);

        const resolved = await resolveMemberScopeContext(this.prisma, workspaceId, updated, {
          ...wsSettings,
          memberDataScopes: nextMemberDataScopes,
          memberScopedTeams: nextMemberScopedTeams,
        });
        return {
          ...updated,
          dataScope: resolved.effectiveDataScope,
          scopedTeamIds: resolved.scopedTeamIds,
          customScopedTeamIds: nextMemberScopedTeams[membershipId] || [],
          ledTeamIds: resolved.ledTeamIds,
          memberPermissionOverrides: nextMemberPermOverrides[membershipId] || null,
        };
      }
    }

    return updated;
  }

  // INVITATIONS WORKFLOW

  async inviteMember(
    workspaceId: string,
    invitedByUserId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      accessRole?: SystemAccessRole;
      roleId?: string;
      departmentId?: string;
      teamId?: string;
      designationId?: string;
      designationTitle?: string;
      reportsToId?: string;
      dataScope?: string;
      scopedTeamIds?: string[];
      permissionCodes?: string[];
      permissionOverrides?: { added?: string[]; revoked?: string[] };
    },
    actorContext?: any,
  ) {
    const emailLower = data.email.toLowerCase().trim();

    if (actorContext && actorContext.accessRole !== 'OWNER' && actorContext.accessRole !== 'ADMIN') {
      if (data.accessRole && ['OWNER', 'ADMIN'].includes(String(data.accessRole).toUpperCase())) {
        throw new ForbiddenException('Only Organization Owners and Admins can invite Owners or Admins.');
      }
      if (data.roleId) {
        const targetRole = await (this.prisma as any).role
          ?.findFirst?.({ where: { id: data.roleId } })
          ?.catch?.(() => null);
        if (targetRole?.isSystemRole && ['OWNER', 'ADMIN'].includes((targetRole.name || '').toUpperCase())) {
          throw new ForbiddenException('Only Organization Owners and Admins can invite members with Admin or Owner system roles.');
        }
      }
      if (data.dataScope && getScopeRank(data.dataScope) > getScopeRank(actorContext.dataScope)) {
        throw new ForbiddenException(
          `Delegated invite ceiling: you cannot invite with data scope "${data.dataScope}" broader than your own (${actorContext.dataScope || 'ASSIGNED'}).`,
        );
      }
      const actorPerms: string[] = Array.isArray(actorContext.permissions) ? actorContext.permissions : [];
      const checkPerms = [
        ...(Array.isArray(data.permissionCodes) ? data.permissionCodes : []),
        ...(Array.isArray(data.permissionOverrides?.added) ? data.permissionOverrides!.added : []),
      ];
      for (const code of checkPerms) {
        if (!satisfiesPermissionCode(actorPerms, code)) {
          throw new ForbiddenException(`Delegated invite ceiling: you cannot grant permission "${code}" that you do not hold.`);
        }
      }
      if (
        data.departmentId &&
        actorContext.dataScope === 'DEPARTMENT' &&
        actorContext.departmentId &&
        data.departmentId !== actorContext.departmentId
      ) {
        throw new ForbiddenException('You can only invite members into your own department.');
      }
      const allowedTeams = Array.from(
        new Set([...(actorContext.scopedTeamIds || []), ...(actorContext.ledTeamIds || []), ...(actorContext.teamId ? [actorContext.teamId] : [])]),
      );
      if (
        data.teamId &&
        actorContext.dataScope === 'TEAM' &&
        allowedTeams.length > 0 &&
        !allowedTeams.includes(data.teamId)
      ) {
        throw new ForbiddenException('You can only invite members into your own permitted team(s).');
      }
    }

    // Check seat count limit against active subscription
    const activeSub = await this.prisma.subscription.findFirst({
      where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
    });

    const activeMembersCount = await this.prisma.membership.count({
      where: { workspaceId, status: 'ACTIVE' },
    });

    const pendingInvitationsCount = await this.prisma.invitation.count({
      where: { workspaceId, status: 'PENDING' },
    });

    const maxSeats = activeSub?.seatCount || 5;
    if (activeMembersCount + pendingInvitationsCount >= maxSeats) {
      throw new BadRequestException(
        `Workspace has reached its maximum seat limit (${maxSeats}) including pending invitations (${pendingInvitationsCount}). Please upgrade your subscription to add more members.`,
      );
    }

    // Check if user is already an active member of this workspace
    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: existingUser.id, workspaceId } },
      });

      if (existingMembership && existingMembership.status === 'ACTIVE') {
        throw new ConflictException('User is already an active member of this workspace');
      }
    }

    const cleanId = (id?: string) => (id && id.trim().length > 0 ? id.trim() : null);

    // Resolve designation from manual title or designationId
    let designationId = cleanId(data.designationId);
    let resolvedDesignationTitle = data.designationTitle?.trim() || undefined;
    const desigModel = (this.prisma as any).designation;
    if (resolvedDesignationTitle && desigModel) {
      let desig = await desigModel.findFirst({
        where: { workspaceId, title: { equals: resolvedDesignationTitle, mode: 'insensitive' } },
      }).catch(() => null);
      if (!desig) {
        desig = await desigModel.create({
          data: { workspaceId, title: resolvedDesignationTitle, level: 1 },
        }).catch(() => null);
      }
      if (desig?.id) designationId = desig.id;
    } else if (designationId && desigModel && !resolvedDesignationTitle) {
      const desigRec = await desigModel.findFirst({ where: { id: designationId, workspaceId } }).catch(() => null);
      if (desigRec?.title) resolvedDesignationTitle = desigRec.title;
    }

    // Safely load workspace settings to honor designation configs & role scopes
    const wsRecord = await (this.prisma as any).workspace?.findUnique?.({
      where: { id: workspaceId },
      select: { settings: true },
    })?.catch(() => null);
    const wsSettings: any = (wsRecord?.settings as any) || {};
    const desigConfigs: Record<string, any> = wsSettings.designationConfigs || {};
    const desigConfig = designationId ? desigConfigs[designationId] : undefined;

    const effectiveAccessRole = (data.accessRole || desigConfig?.defaultAccessRole || 'MEMBER') as SystemAccessRole;
    const effectiveDepartmentId = cleanId(data.departmentId) || desigConfig?.departmentId || null;
    const effectiveDataScope = data.dataScope || desigConfig?.defaultDataScope || undefined;

    // Resolve Role ID (prefers explicit Organization Role -> designation defaultRoleId -> internal fallback DB carrier)
    let roleId = cleanId(data.roleId) || undefined;
    if (!roleId && desigConfig?.defaultRoleId) {
      roleId = desigConfig.defaultRoleId;
    }

    if (!roleId) {
      // LEGACY_ROLE_COMMENTED_OUT: MEMBER is used solely as internal DB carrier when no Organization Role is chosen
      const targetRoleName = effectiveAccessRole || 'MEMBER';
      let role = await this.prisma.role.findFirst({
        where: { name: targetRoleName, isSystemRole: true },
      });
      if (!role) {
        role = await this.prisma.role.create({
          data: {
            name: targetRoleName,
            description: `System ${targetRoleName} Role`,
            isSystemRole: true,
          },
        });
      }
      roleId = role.id;
    }

    // Compute per-member permissionOverrides relative to selected Role instead of spawning noisy "Title (email)" roles
    let computedOverrides: { added?: string[]; revoked?: string[] } | undefined = data.permissionOverrides;
    let resolvedRoleDisplayName = resolvedDesignationTitle || 'Team Member';
    if (roleId) {
      const assignedRoleRec: any = await (this.prisma as any).role
        ?.findFirst?.({
          where: { id: roleId },
          include: { permissions: { include: { permission: true } } },
        })
        ?.catch?.(() => null);
      if (assignedRoleRec?.name && !['MEMBER', 'MANAGER'].includes(String(assignedRoleRec.name).toUpperCase())) {
        resolvedRoleDisplayName = assignedRoleRec.name;
      } else if (effectiveAccessRole === 'ADMIN' || effectiveAccessRole === 'OWNER') {
        resolvedRoleDisplayName = effectiveAccessRole === 'OWNER' ? 'Owner' : 'Admin';
      }
      if (!computedOverrides && Array.isArray(data.permissionCodes)) {
        const baseCodes: string[] = Array.isArray(assignedRoleRec?.permissions)
          ? assignedRoleRec.permissions
              .map((rp: any) => rp?.permission?.code || rp?.code)
              .filter(Boolean)
          : [];
        const baseSet = new Set(baseCodes);
        const requestedSet = new Set(data.permissionCodes.filter(Boolean));
        const added = Array.from(requestedSet).filter((c) => !baseSet.has(c));
        const revoked = Array.from(baseSet).filter((c) => !requestedSet.has(c));
        if (added.length > 0 || revoked.length > 0) {
          computedOverrides = { added, revoked };
        }
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    // Revoke any previous pending invitations for this email in this workspace
    await this.prisma.invitation.updateMany({
      where: { workspaceId, email: emailLower, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    const invitation = await this.prisma.invitation.create({
      data: {
        workspaceId,
        email: emailLower,
        firstName: data.firstName,
        lastName: data.lastName,
        accessRole: effectiveAccessRole,
        roleId,
        departmentId: effectiveDepartmentId,
        teamId: cleanId(data.teamId),
        designationId,
        reportsToId: cleanId(data.reportsToId),
        token,
        status: 'PENDING',
        invitedByUserId,
        expiresAt,
      },
      include: {
        workspace: { select: { id: true, name: true, logoUrl: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    // Store optional invitation metadata (dataScope, scopedTeamIds, custom permissionOverrides, designationTitle) safely
    if (
      (this.prisma as any).workspace?.update &&
      wsRecord &&
      (effectiveDataScope ||
        Array.isArray(data.scopedTeamIds) ||
        Array.isArray(data.permissionCodes) ||
        computedOverrides ||
        resolvedDesignationTitle)
    ) {
      const nextRoleDataScopes = { ...(wsSettings.roleDataScopes || {}) };
      if (effectiveDataScope && roleId && !nextRoleDataScopes[roleId]) {
        nextRoleDataScopes[roleId] = effectiveDataScope;
      }
      const normalizedScopedTeams = Array.isArray(data.scopedTeamIds)
        ? Array.from(new Set(data.scopedTeamIds.filter(Boolean)))
        : undefined;
      const nextInvitationMeta = {
        ...(wsSettings.invitationMeta || {}),
        [invitation.id]: {
          ...(effectiveDataScope ? { dataScope: effectiveDataScope } : {}),
          ...(normalizedScopedTeams ? { scopedTeamIds: normalizedScopedTeams } : {}),
          ...(Array.isArray(data.permissionCodes) ? { permissionCodes: data.permissionCodes } : {}),
          ...(computedOverrides ? { permissionOverrides: computedOverrides } : {}),
          ...(resolvedDesignationTitle ? { designationTitle: resolvedDesignationTitle } : {}),
        },
      };
      await (this.prisma as any).workspace.update({
        where: { id: workspaceId },
        data: {
          settings: {
            ...wsSettings,
            roleDataScopes: nextRoleDataScopes,
            invitationMeta: nextInvitationMeta,
          },
        },
      }).catch(() => null);
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'https://orvexa-lemon.vercel.app'}/accept-invitation?token=${token}`;
    const inviterName = `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`.trim();
    const inviterEmail = invitation.invitedBy.email;

    const mailResult = await this.mailService.sendInvitationEmail({
      to: emailLower,
      firstName: data.firstName,
      workspaceName: invitation.workspace.name,
      inviteLink,
      invitedByName: inviterName,
      senderName: inviterName,
      senderEmail: inviterEmail,
      roleName: resolvedRoleDisplayName,
    });

    return {
      message: mailResult.delivered
        ? 'Invitation email delivered successfully to ' + emailLower
        : 'Invitation created. Email dispatch recorded (SMTP credentials can be added to backend/.env)',
      invitation: {
        ...invitation,
        roleDisplayName: resolvedRoleDisplayName,
        dataScope: effectiveDataScope,
        scopedTeamIds: Array.isArray(data.scopedTeamIds) ? data.scopedTeamIds : undefined,
        permissionOverrides: computedOverrides,
        designationTitle: resolvedDesignationTitle,
        inviteLink,
      },
      inviteLink,
      senderName: inviterName,
      senderEmail: inviterEmail,
      emailDelivered: mailResult.delivered,
      hasSmtp: this.mailService.hasSmtp,
    };
  }

  async inviteMembersBulk(
    workspaceId: string,
    invitedByUserId: string,
    data: {
      invitations: Array<{
        email: string;
        firstName: string;
        lastName?: string;
        accessRole?: SystemAccessRole;
        roleId?: string;
        departmentId?: string;
        teamId?: string;
        designationId?: string;
        designationTitle?: string;
        reportsToId?: string;
        dataScope?: string;
        scopedTeamIds?: string[];
        permissionCodes?: string[];
        permissionOverrides?: { added?: string[]; revoked?: string[] };
      }>;
    },
    actorContext?: any,
  ) {
    const entries = Array.isArray(data?.invitations) ? data.invitations : [];
    const results: Array<{
      email: string;
      status: 'SENT' | 'FAILED';
      error?: string;
      invitation?: any;
      inviteLink?: string;
    }> = [];

    for (const entry of entries) {
      const email = (entry?.email || '').trim().toLowerCase();
      if (!email) continue;
      try {
        const res = await this.inviteMember(
          workspaceId,
          invitedByUserId,
          {
            ...entry,
            email,
            firstName: (entry.firstName || email.split('@')[0] || 'Member').trim(),
            lastName: (entry.lastName || '').trim(),
          },
          actorContext,
        );
        results.push({
          email,
          status: 'SENT',
          invitation: res.invitation,
          inviteLink: res.inviteLink,
        });
      } catch (err: any) {
        results.push({
          email,
          status: 'FAILED',
          error: err?.message || 'Failed to send invitation',
        });
      }
    }

    const sentCount = results.filter((r) => r.status === 'SENT').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;

    return {
      message: `Processed ${results.length} invitation(s): ${sentCount} sent, ${failedCount} failed.`,
      total: results.length,
      sentCount,
      failedCount,
      results,
    };
  }

  async verifyInvitationToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true, logoUrl: true, slug: true } },
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation token is invalid');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`This invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('This invitation token has expired');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const [dept, team, desig, roleRec, wsRec] = await Promise.all([
      invitation.departmentId
        ? (this.prisma as any).department?.findFirst?.({ where: { id: invitation.departmentId } })?.catch?.(() => null)
        : Promise.resolve(null),
      invitation.teamId
        ? (this.prisma as any).team?.findFirst?.({ where: { id: invitation.teamId } })?.catch?.(() => null)
        : Promise.resolve(null),
      invitation.designationId
        ? (this.prisma as any).designation?.findFirst?.({ where: { id: invitation.designationId } })?.catch?.(() => null)
        : Promise.resolve(null),
      invitation.roleId
        ? (this.prisma as any).role?.findFirst?.({ where: { id: invitation.roleId } })?.catch?.(() => null)
        : Promise.resolve(null),
      (this.prisma as any).workspace?.findUnique?.({ where: { id: invitation.workspaceId }, select: { settings: true } })?.catch?.(() => null),
    ]);

    const invMeta = (wsRec?.settings as any)?.invitationMeta?.[invitation.id] || {};
    const roleName =
      roleRec?.name && !['MEMBER', 'MANAGER'].includes(String(roleRec.name).toUpperCase())
        ? roleRec.name
        : desig?.title || invMeta?.designationTitle || (invitation.accessRole === 'OWNER' || invitation.accessRole === 'ADMIN' ? invitation.accessRole : 'Team Member');

    return {
      invitation: {
        ...invitation,
        department: dept ? { id: dept.id, name: dept.name } : undefined,
        team: team ? { id: team.id, name: team.name } : undefined,
        designation: desig ? { id: desig.id, title: desig.title } : invMeta?.designationTitle ? { title: invMeta.designationTitle } : undefined,
        role: roleRec ? { id: roleRec.id, name: roleRec.name } : undefined,
        roleDisplayName: roleName,
        dataScope: invMeta?.dataScope || undefined,
      },
      userExists: !!existingUser,
      user: existingUser,
    };
  }

  async acceptInvitation(dto: { token: string; password?: string; firstName?: string; lastName?: string }) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
      include: { workspace: true },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user) {
      if (!dto.password) {
        throw new BadRequestException('Password is required for account creation');
      }
      if (dto.password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);

      user = await this.prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName || invitation.firstName,
          lastName: dto.lastName || invitation.lastName,
          isEmailVerified: true,
          status: 'ACTIVE',
        },
      });
    }

    // Resolve or create role
    let roleId = invitation.roleId;
    if (!roleId) {
      const defaultRole = await this.prisma.role.findFirst({
        where: { name: invitation.accessRole, isSystemRole: true },
      });
      roleId = defaultRole ? defaultRole.id : (
        await this.prisma.role.create({
          data: { name: invitation.accessRole, isSystemRole: true },
        })
      ).id;
    }

    let assignedRoleRecord: any = null;
    if (roleId) {
      try {
        assignedRoleRecord = await this.prisma.role.findFirst({ where: { id: roleId } });
      } catch {
        assignedRoleRecord = null;
      }
    }
    const roleUpper = (invitation.accessRole || 'MEMBER').toUpperCase();
    const roleNameUpper = (assignedRoleRecord?.name || '').toUpperCase();
    let wsSettings: any = (invitation.workspace as any)?.settings || {};
    if (!wsSettings?.invitationMeta && (this.prisma as any).workspace?.findUnique) {
      try {
        const wsRec = await (this.prisma as any).workspace.findUnique({
          where: { id: invitation.workspaceId },
          select: { settings: true },
        });
        if (wsRec?.settings) wsSettings = wsRec.settings;
      } catch {
        // ignore in mock contexts
      }
    }
    const invitationMeta = wsSettings?.invitationMeta?.[invitation.id];
    const roleDataScope = roleId ? wsSettings?.roleDataScopes?.[roleId] : undefined;
    // LEGACY_ROLE_COMMENTED_OUT: Keep explicit invitation.accessRole === 'MANAGER' compatibility for legacy tests; new invites resolve via Organization Role or dataScope
    const defaultDataScope =
      invitationMeta?.dataScope ||
      roleDataScope ||
      (roleUpper === 'OWNER' || roleUpper === 'ADMIN' || roleNameUpper.includes('ADMIN')
        ? 'GLOBAL'
        : roleUpper === 'MANAGER' ||
          roleNameUpper.includes('MANAGER') ||
          roleNameUpper.includes('LEAD') ||
          roleNameUpper.includes('DIRECTOR') ||
          roleNameUpper.includes('HEAD')
        ? 'TEAM'
        : 'ASSIGNED');

    // Upsert membership
    const membership = await this.prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId } },
      update: {
        roleId,
        accessRole: invitation.accessRole,
        departmentId: invitation.departmentId,
        teamId: invitation.teamId,
        designationId: invitation.designationId,
        reportsToId: invitation.reportsToId,
        dataScope: defaultDataScope,
        status: 'ACTIVE',
      },
      create: {
        userId: user.id,
        workspaceId: invitation.workspaceId,
        roleId,
        accessRole: invitation.accessRole,
        departmentId: invitation.departmentId,
        teamId: invitation.teamId,
        designationId: invitation.designationId,
        reportsToId: invitation.reportsToId,
        invitedByUserId: invitation.invitedByUserId,
        dataScope: defaultDataScope,
        status: 'ACTIVE',
      },
      include: {
        workspace: true,
        role: true,
      },
    });

    // Persist custom member scope / team / permission overrides & mark first-time profile setup pending
    if (membership?.id && (this.prisma as any).workspace?.update) {
      const nextMemberScopedTeams = { ...(wsSettings.memberScopedTeams || {}) };
      if (Array.isArray(invitationMeta?.scopedTeamIds) && invitationMeta.scopedTeamIds.length > 0) {
        nextMemberScopedTeams[membership.id] = invitationMeta.scopedTeamIds;
      }
      const nextMemberDataScopes = { ...(wsSettings.memberDataScopes || {}) };
      if (invitationMeta?.dataScope) {
        nextMemberDataScopes[membership.id] = invitationMeta.dataScope;
      }
      const nextMemberPermOverrides = { ...(wsSettings.memberPermissionOverrides || {}) };
      if (invitationMeta?.permissionOverrides) {
        nextMemberPermOverrides[membership.id] = invitationMeta.permissionOverrides;
      }
      const nextProfileSetupMap = {
        ...(wsSettings.profileSetupCompletedByUser || {}),
        [user.id]: false,
      };
      try {
        await (this.prisma as any).workspace.update({
          where: { id: invitation.workspaceId },
          data: {
            settings: {
              ...wsSettings,
              memberScopedTeams: nextMemberScopedTeams,
              memberDataScopes: nextMemberDataScopes,
              memberPermissionOverrides: nextMemberPermOverrides,
              profileSetupCompletedByUser: nextProfileSetupMap,
            },
          },
        });
      } catch {
        // ignore in mock contexts
      }
    }

    // Mark invitation ACCEPTED
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    return {
      message: 'Invitation accepted successfully!',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileSetupCompleted: false,
      },
      membership,
      workspace: invitation.workspace,
      accessToken,
      profileSetupCompleted: false,
    };
  }

  async verifyJoinLink(code: string) {
    const cleanCode = (code || '').trim();
    if (!cleanCode) {
      throw new BadRequestException('Invalid invite code');
    }

    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true, name: true, slug: true, logoUrl: true, settings: true },
    });

    const ws = workspaces.find((w: any) => (w?.settings as any)?.shareInviteLink?.code === cleanCode);
    if (!ws) {
      throw new NotFoundException('Shareable workspace invite link is invalid or has been reset');
    }

    const shareConfig: any = (ws.settings as any)?.shareInviteLink || {};
    if (shareConfig.enabled === false) {
      throw new BadRequestException('Shareable invite link is currently disabled for this workspace');
    }

    const [defaultRole, defaultDepartment, defaultTeam] = await Promise.all([
      shareConfig.defaultRoleId
        ? (this.prisma as any).role?.findFirst?.({ where: { id: shareConfig.defaultRoleId } })?.catch?.(() => null)
        : Promise.resolve(null),
      shareConfig.defaultDepartmentId
        ? (this.prisma as any).department?.findFirst?.({ where: { id: shareConfig.defaultDepartmentId } })?.catch?.(() => null)
        : Promise.resolve(null),
      shareConfig.defaultTeamId
        ? (this.prisma as any).team?.findFirst?.({ where: { id: shareConfig.defaultTeamId } })?.catch?.(() => null)
        : Promise.resolve(null),
    ]);

    return {
      valid: true,
      workspace: { id: ws.id, name: ws.name, slug: ws.slug, logoUrl: ws.logoUrl },
      defaultRole: defaultRole ? { id: defaultRole.id, name: defaultRole.name } : undefined,
      defaultDepartment: defaultDepartment ? { id: defaultDepartment.id, name: defaultDepartment.name } : undefined,
      defaultTeam: defaultTeam ? { id: defaultTeam.id, name: defaultTeam.name } : undefined,
      defaultDataScope: shareConfig.defaultDataScope || 'ASSIGNED',
    };
  }

  async acceptJoinLink(dto: {
    code: string;
    email: string;
    password?: string;
    firstName: string;
    lastName?: string;
  }) {
    const verified = await this.verifyJoinLink(dto.code);
    const emailLower = (dto.email || '').trim().toLowerCase();
    if (!emailLower) {
      throw new BadRequestException('Work email is required');
    }

    const workspaceId = verified.workspace.id;

    // Seat limit check
    const activeSub = await this.prisma.subscription.findFirst({
      where: { workspaceId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
    });
    const activeMembersCount = await this.prisma.membership.count({
      where: { workspaceId, status: 'ACTIVE' },
    });
    const maxSeats = activeSub?.seatCount || 5;

    let user = await this.prisma.user.findUnique({ where: { email: emailLower } });
    if (user) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: user.id, workspaceId } },
      });
      if (existingMembership && existingMembership.status === 'ACTIVE') {
        throw new ConflictException('You are already an active member of this workspace. Please sign in instead.');
      }
      if (activeMembersCount >= maxSeats) {
        throw new BadRequestException(`Workspace has reached its maximum seat limit (${maxSeats}).`);
      }
    } else {
      if (activeMembersCount >= maxSeats) {
        throw new BadRequestException(`Workspace has reached its maximum seat limit (${maxSeats}).`);
      }
      if (!dto.password || dto.password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }
      const passwordHash = await bcrypt.hash(dto.password, 10);
      user = await this.prisma.user.create({
        data: {
          email: emailLower,
          passwordHash,
          firstName: (dto.firstName || emailLower.split('@')[0]).trim(),
          lastName: (dto.lastName || '').trim(),
          isEmailVerified: true,
          status: 'ACTIVE',
        },
      });
    }

    const wsFull = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    const wsSettings: any = (wsFull?.settings as any) || {};
    const shareConfig: any = wsSettings.shareInviteLink || {};

    // Never elevate public link signups to Owner/Admin
    let roleId: string | undefined = shareConfig.defaultRoleId || undefined;
    if (roleId) {
      let rCheck: any = null;
      try {
        rCheck = await this.prisma.role.findFirst({ where: { id: roleId } });
      } catch {
        rCheck = null;
      }
      if (!rCheck || (rCheck.isSystemRole && ['OWNER', 'ADMIN'].includes((rCheck.name || '').toUpperCase()))) {
        roleId = undefined;
      }
    }
    if (!roleId) {
      const fallbackStaffRole = await this.prisma.role.findFirst({
        where: { workspaceId, isSystemRole: false },
      });
      if (fallbackStaffRole) {
        roleId = fallbackStaffRole.id;
      } else {
        let memberCarrier = await this.prisma.role.findFirst({
          where: { name: 'MEMBER', isSystemRole: true },
        });
        if (!memberCarrier) {
          memberCarrier = await this.prisma.role.create({
            data: { name: 'MEMBER', description: 'Internal default carrier', isSystemRole: true },
          });
        }
        roleId = memberCarrier.id;
      }
    }

    const safeDefaultScope =
      shareConfig.defaultDataScope && ['OWN', 'ASSIGNED', 'TEAM', 'DEPARTMENT'].includes(shareConfig.defaultDataScope)
        ? shareConfig.defaultDataScope
        : 'ASSIGNED';

    const membership = await this.prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      update: {
        roleId,
        accessRole: 'MEMBER' as SystemAccessRole,
        departmentId: shareConfig.defaultDepartmentId || null,
        teamId: shareConfig.defaultTeamId || null,
        dataScope: safeDefaultScope,
        status: 'ACTIVE',
      },
      create: {
        userId: user.id,
        workspaceId,
        roleId,
        accessRole: 'MEMBER' as SystemAccessRole,
        departmentId: shareConfig.defaultDepartmentId || null,
        teamId: shareConfig.defaultTeamId || null,
        dataScope: safeDefaultScope,
        status: 'ACTIVE',
      },
      include: { workspace: true, role: true },
    });

    if ((this.prisma as any).workspace?.update) {
      try {
        await (this.prisma as any).workspace.update({
          where: { id: workspaceId },
          data: {
            settings: {
              ...wsSettings,
              profileSetupCompletedByUser: {
                ...(wsSettings.profileSetupCompletedByUser || {}),
                [user.id]: false,
              },
            },
          },
        });
      } catch {
        // ignore in mock contexts
      }
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    return {
      message: 'Joined workspace successfully!',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileSetupCompleted: false,
      },
      membership,
      workspace: wsFull,
      accessToken,
      profileSetupCompleted: false,
    };
  }

  async listInvitations(workspaceId: string) {
    // Automatically transition any PENDING invitations past their expiry date to EXPIRED
    const now = new Date();
    await this.prisma.invitation.updateMany({
      where: {
        workspaceId,
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    const list = await this.prisma.invitation.findMany({
      where: { workspaceId },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wsRec = await (this.prisma as any).workspace
      ?.findUnique?.({ where: { id: workspaceId }, select: { settings: true } })
      ?.catch(() => null);
    const invitationMetaMap: Record<string, any> = (wsRec?.settings as any)?.invitationMeta || {};

    const [depts, teams, desigs, roles] = await Promise.all([
      (this.prisma as any).department?.findMany?.({ where: { workspaceId } })?.catch(() => []) || [],
      (this.prisma as any).team?.findMany?.({ where: { workspaceId } })?.catch(() => []) || [],
      (this.prisma as any).designation?.findMany?.({ where: { workspaceId } })?.catch(() => []) || [],
      (this.prisma as any).role?.findMany?.({ where: { OR: [{ workspaceId }, { isSystemRole: true }] } })?.catch(() => []) || [],
    ]);
    const deptMap = new Map<string, any>((depts || []).map((d: any) => [d.id, d]));
    const teamMap = new Map<string, any>((teams || []).map((t: any) => [t.id, t]));
    const desigMap = new Map<string, any>((desigs || []).map((dg: any) => [dg.id, dg]));
    const roleMap = new Map<string, any>((roles || []).map((r: any) => [r.id, r]));

    const frontendUrl = process.env.FRONTEND_URL || 'https://orvexa-lemon.vercel.app';
    return list.map((inv: any) => {
      const meta = invitationMetaMap[inv.id] || {};
      const dept = inv.departmentId ? deptMap.get(inv.departmentId) : undefined;
      const team = inv.teamId ? teamMap.get(inv.teamId) : undefined;
      const desig = inv.designationId ? desigMap.get(inv.designationId) : undefined;
      const role = inv.roleId ? roleMap.get(inv.roleId) : undefined;
      return {
        ...inv,
        department: dept ? { id: dept.id, name: dept.name } : undefined,
        team: team ? { id: team.id, name: team.name } : undefined,
        designation: desig ? { id: desig.id, title: desig.title } : meta.designationTitle ? { title: meta.designationTitle } : undefined,
        role: role ? { id: role.id, name: role.name } : undefined,
        dataScope: meta.dataScope || undefined,
        scopedTeamIds: meta.scopedTeamIds || undefined,
        permissionCodes: meta.permissionCodes || undefined,
        permissionOverrides: meta.permissionOverrides || undefined,
        inviteLink: `${frontendUrl}/accept-invitation?token=${inv.token}`,
      };
    });
  }

  async resendInvitation(workspaceId: string, invitationId: string, resendByUserId?: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, workspaceId },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('This invitation has already been accepted and the account is active');
    }

    let senderUser = invitation.invitedBy;
    if (resendByUserId) {
      const activeUser = await this.prisma.user.findUnique({
        where: { id: resendByUserId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (activeUser) {
        senderUser = activeUser;
      }
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const roleRec = updated.roleId
      ? await (this.prisma as any).role?.findFirst?.({ where: { id: updated.roleId } })?.catch?.(() => null)
      : null;
    const resolvedRoleDisplayName =
      roleRec?.name && !['MEMBER', 'MANAGER'].includes(String(roleRec.name).toUpperCase())
        ? roleRec.name
        : updated.accessRole === 'OWNER' || updated.accessRole === 'ADMIN'
        ? updated.accessRole
        : 'Team Member';

    const inviteLink = `${process.env.FRONTEND_URL || 'https://orvexa-lemon.vercel.app'}/accept-invitation?token=${newToken}`;
    const senderName = senderUser
      ? `${senderUser.firstName} ${senderUser.lastName}`.trim()
      : 'Workspace Administrator';
    const senderEmail = senderUser?.email;

    const mailResult = await this.mailService.sendInvitationEmail({
      to: updated.email,
      firstName: updated.firstName,
      workspaceName: updated.workspace.name,
      inviteLink,
      invitedByName: senderName,
      senderName,
      senderEmail,
      roleName: resolvedRoleDisplayName,
    });

    return {
      message: mailResult.delivered
        ? 'Invitation email resent successfully to ' + updated.email
        : 'Invitation link refreshed',
      invitation: {
        ...updated,
        inviteLink,
      },
      inviteLink,
      senderName,
      senderEmail,
      emailDelivered: mailResult.delivered,
      hasSmtp: this.mailService.hasSmtp,
    };
  }

  async revokeInvitation(workspaceId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) throw new NotFoundException('Invitation not found');

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });

    return { message: 'Invitation revoked successfully' };
  }

  // SUSPENSION & REMOVAL

  async suspendMember(workspaceId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) throw new NotFoundException('Member not found');

    if (membership.accessRole === 'OWNER') {
      const ownerCount = await this.prisma.membership.count({
        where: { workspaceId, accessRole: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot suspend the sole Owner of the workspace');
      }
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: 'SUSPENDED' },
    });
  }

  async reactivateMember(workspaceId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) throw new NotFoundException('Member not found');

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: 'ACTIVE' },
    });
  }

  async removeMember(workspaceId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) throw new NotFoundException('Member not found');

    if (membership.accessRole === 'OWNER') {
      const ownerCount = await this.prisma.membership.count({
        where: { workspaceId, accessRole: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the sole Owner from the workspace');
      }
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: 'DEACTIVATED' },
    });
  }

  // OFFBOARDING WORKFLOW

  async initiateOffboarding(
    workspaceId: string,
    membershipId: string,
    data: { lastWorkingDate: string | Date; exitReason?: string; notes?: string },
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) throw new NotFoundException('Member not found');

    if (membership.accessRole === 'OWNER') {
      const ownerCount = await this.prisma.membership.count({
        where: { workspaceId, accessRole: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot initiate offboarding for the sole Owner. Transfer ownership first.',
        );
      }
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        lastWorkingDate: new Date(data.lastWorkingDate),
        exitReason: data.exitReason,
        offboardingStatus: 'IN_PROGRESS',
        offboardingHandover: { notes: data.notes || '', initiatedAt: new Date() },
      },
    });
  }

  async completeOffboarding(
    workspaceId: string,
    membershipId: string,
    data?: { reassignToMembershipId?: string } | string,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) throw new NotFoundException('Member not found');

    if (membership.accessRole === 'OWNER') {
      const ownerCount = await this.prisma.membership.count({
        where: { workspaceId, accessRole: 'OWNER', status: 'ACTIVE' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot offboard sole workspace Owner.');
      }
    }

    const reassignId = typeof data === 'string' ? data : data?.reassignToMembershipId;

    if (reassignId) {
      // Reassign open tasks
      await this.prisma.task.updateMany({
        where: { workspaceId, assigneeMembershipId: membershipId, status: { not: 'COMPLETED' } },
        data: { assigneeMembershipId: reassignId },
      });

      // Reassign open work items
      await this.prisma.workItem.updateMany({
        where: { workspaceId, assignedMembershipId: membershipId, status: { not: 'COMPLETED' } },
        data: { assignedMembershipId: reassignId },
      });
    }

    // Recover / unassign company assets
    await this.prisma.asset.updateMany({
      where: { workspaceId, assignedToMembershipId: membershipId },
      data: { assignedToMembershipId: null, status: 'AVAILABLE' },
    });

    // Revoke access
    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: 'OFFBOARDED',
        offboardingStatus: 'COMPLETED',
      },
    });

    // Revoke target user's active sessions by incrementing token version
    await this.prisma.user.update({
      where: { id: membership.userId },
      data: { tokenVersion: { increment: 1 } },
    });

    return {
      message: 'Offboarding completed successfully. Work reassigned and access revoked.',
      membership: updated,
    };
  }

  async transferOwnership(workspaceId: string, currentUserId: string, newOwnerMembershipId: string) {
    const currentMembership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: currentUserId, workspaceId } },
    });

    if (!currentMembership || currentMembership.accessRole !== 'OWNER') {
      throw new ForbiddenException('Only the current Workspace Owner can transfer ownership.');
    }

    const targetMembership = await this.prisma.membership.findFirst({
      where: { id: newOwnerMembershipId, workspaceId, status: 'ACTIVE' },
    });

    if (!targetMembership) {
      throw new NotFoundException('Target new owner membership not found or not active.');
    }

    // Promote new owner
    await this.prisma.membership.update({
      where: { id: targetMembership.id },
      data: { accessRole: 'OWNER' },
    });

    // Demote current owner to ADMIN
    await this.prisma.membership.update({
      where: { id: currentMembership.id },
      data: { accessRole: 'ADMIN' },
    });

    return { message: 'Ownership transferred successfully.' };
  }

  // ---------------------------------------------------------------------------
  // PROFILE COMPLETENESS & ONBOARDING TASKS (PHASE 10 REQUIREMENT 2)
  // ---------------------------------------------------------------------------

  async getProfileCompleteness(workspaceId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: { user: true, designation: true, department: true, team: true },
    });
    if (!membership) throw new NotFoundException('Member not found');

    const fieldsToCheck: Array<{ field: string; label: string; value: any }> = [
      { field: 'firstName', label: 'First Name', value: membership.user?.firstName },
      { field: 'lastName', label: 'Last Name', value: membership.user?.lastName },
      { field: 'email', label: 'Email Address', value: membership.user?.email },
      { field: 'phone', label: 'Contact Phone', value: membership.user?.phone },
      { field: 'employeeId', label: 'Employee ID', value: membership.employeeId },
      { field: 'joiningDate', label: 'Joining Date', value: membership.joiningDate },
      { field: 'workLocation', label: 'Work Location', value: membership.workLocation },
      { field: 'emergencyContact', label: 'Emergency Contact', value: membership.emergencyContact },
      { field: 'designation', label: 'Designation / Job Title', value: membership.designationId },
      { field: 'department', label: 'Department Assignment', value: membership.departmentId },
    ];

    const completedFields = fieldsToCheck.filter((f) => !!f.value).map((f) => f.label);
    const missingFields = fieldsToCheck.filter((f) => !f.value).map((f) => f.label);
    const completionPercentage = Math.round((completedFields.length / fieldsToCheck.length) * 100);

    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings: any = (ws?.settings as object) || {};
    const onboardingTasksMap = settings.employeeOnboardingTasks || {};
    const memberTasks = onboardingTasksMap[membershipId] || [
      { id: 'task_profile', title: 'Complete personal and contact details', completed: completionPercentage >= 80 },
      { id: 'task_emergency', title: 'Submit emergency contact information', completed: !!membership.emergencyContact },
      { id: 'task_documents', title: 'Upload verification documents & signed agreement', completed: false },
      { id: 'task_bank', title: 'Configure salary disbursement / bank account', completed: false },
    ];

    return {
      membershipId,
      completionPercentage,
      completedFields,
      missingFields,
      isComplete: completionPercentage === 100,
      onboardingTasks: memberTasks,
    };
  }

  async sendIncompleteProfileReminder(workspaceId: string, membershipId: string, actorMembershipId: string) {
    const completeness = await this.getProfileCompleteness(workspaceId, membershipId);
    const member = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    const missingList = completeness.missingFields.slice(0, 3).join(', ');

    await this.prisma.notification.create({
      data: {
        workspaceId,
        recipientMembershipId: membershipId,
        title: 'Action Required: Complete Your Employee Profile',
        message: `Your profile is ${completeness.completionPercentage}% complete. Please update: ${missingList || 'profile details'}.`,
        link: '/app/people',
      },
    }).catch(() => null);

    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorMembershipId,
        action: 'PROFILE_REMINDER_SENT',
        entity: 'Membership',
        entityId: membershipId,
        metadata: { completionPercentage: completeness.completionPercentage, missingFields: completeness.missingFields },
      },
    }).catch(() => null);

    return {
      message: `Reminder sent to ${member.user.firstName} (${completeness.completionPercentage}% complete)`,
      completeness,
    };
  }

  async updateOnboardingTasks(workspaceId: string, membershipId: string, tasks: any[]) {
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
    const settings: any = (ws?.settings as object) || {};
    const onboardingTasksMap = settings.employeeOnboardingTasks || {};

    onboardingTasksMap[membershipId] = tasks;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { ...settings, employeeOnboardingTasks: onboardingTasksMap } },
    });

    return { membershipId, onboardingTasks: tasks };
  }

  // EXPORTS & RESTRICTED PAYROLL DATA

  async exportMembers(workspaceId: string, userContext?: any) {
    const members = await this.listMembers(workspaceId, {}, userContext);
    return members.map((m) => ({
      membershipId: m.id,
      employeeId: m.employeeId || 'N/A',
      name: `${m.user.firstName} ${m.user.lastName}`,
      email: m.user.email,
      role: m.role?.name || m.accessRole,
      department: m.department?.name || 'Unassigned',
      team: m.team?.name || 'Unassigned',
      designation: m.designation?.title || 'Unassigned',
      status: m.status,
      joiningDate: m.joiningDate ? m.joiningDate.toISOString().split('T')[0] : 'N/A',
    }));
  }

  async getMemberPayroll(workspaceId: string, membershipId: string, userContext?: any) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        designation: true,
        department: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in workspace');
    }

    // Strict record-level data scope enforcement on sensitive payroll data
    if (
      userContext &&
      userContext.accessRole !== 'OWNER' &&
      userContext.accessRole !== 'ADMIN'
    ) {
      const scope = userContext.dataScope || 'ASSIGNED';
      if ((scope === 'ASSIGNED' || scope === 'OWN') && userContext.membershipId !== membershipId) {
        throw new ForbiddenException(
          'Restricted payroll data: Your data scope is restricted to your own record.',
        );
      }
      if (scope === 'DEPARTMENT' && userContext.departmentId !== membership.departmentId) {
        throw new ForbiddenException(
          'Restricted payroll data: Member is outside your department boundary.',
        );
      }
      const allowedTeams = Array.from(
        new Set(
          [
            ...(Array.isArray(userContext.scopedTeamIds) ? userContext.scopedTeamIds : []),
            ...(userContext.teamId ? [userContext.teamId] : []),
          ].filter(Boolean),
        ),
      );
      if (
        scope === 'TEAM' &&
        userContext.membershipId !== membershipId &&
        membership.reportsToId !== userContext.membershipId &&
        !(membership.teamId && allowedTeams.includes(membership.teamId))
      ) {
        throw new ForbiddenException(
          'Restricted payroll data: Member is outside your assigned team or direct reports.',
        );
      }
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    const settings: any = (workspace?.settings as object) || {};
    const payrollStorage: any = settings.payroll || {};
    const memberRecord = payrollStorage[membershipId] || {};

    const level = membership.designation?.level || 1;
    const baseSalary = memberRecord.baseSalary || 50000 * level;
    const allowances = memberRecord.allowances || 5000 * level;
    const deductions = memberRecord.deductions || 2500;
    const netSalary = baseSalary + allowances - deductions;

    return {
      membershipId,
      employeeName: `${membership.user.firstName} ${membership.user.lastName}`,
      email: membership.user.email,
      designation: membership.designation?.title || 'Team Member',
      currency: memberRecord.currency || 'USD',
      baseSalary,
      allowances,
      deductions,
      netSalary,
      bankAccountMasked: memberRecord.bankAccount ? `****${memberRecord.bankAccount.slice(-4)}` : '****8842',
      taxId: memberRecord.taxId || 'TAX-***-99',
      effectiveDate: memberRecord.effectiveDate || new Date().toISOString().split('T')[0],
      isRestrictedData: true,
    };
  }

  async updateMemberPayroll(workspaceId: string, membershipId: string, data: any) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    const settings: any = (workspace?.settings as object) || {};
    const currentPayroll = settings.payroll || {};

    const updatedPayroll = {
      ...currentPayroll,
      [membershipId]: {
        baseSalary: Number(data.baseSalary) || 50000,
        allowances: Number(data.allowances) || 0,
        deductions: Number(data.deductions) || 0,
        currency: data.currency || 'USD',
        bankAccount: data.bankAccount || '1234567890',
        taxId: data.taxId || 'TAX-DEF-001',
        effectiveDate: data.effectiveDate || new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      },
    };

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...settings,
          payroll: updatedPayroll,
        },
      },
    });

    return this.getMemberPayroll(workspaceId, membershipId);
  }

  async exportPayroll(workspaceId: string, userContext?: any) {
    const members = await this.listMembers(workspaceId, {}, userContext);
    const records = await Promise.all(
      members.map(async (m) => {
        try {
          return await this.getMemberPayroll(workspaceId, m.id, userContext);
        } catch {
          return null; // Omit if dataScope restricts this specific record
        }
      }),
    );

    return records.filter(Boolean);
  }
}
