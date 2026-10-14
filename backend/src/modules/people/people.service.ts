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
    userContext?: { membershipId?: string; dataScope?: string; accessRole?: string; departmentId?: string; teamId?: string },
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
        // Manager / Team Lead access: can view own record, assigned team members, and direct reports
        where.OR = [
          { id: userContext.membershipId },
          ...(userContext.teamId ? [{ teamId: userContext.teamId }] : []),
          { reportsToId: userContext.membershipId },
        ];
      }
      // If scope === 'GLOBAL' or 'ALL', global access across all departments is preserved
    }

    return this.prisma.membership.findMany({
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

    return membership;
  }

  async updateMemberProfile(
    workspaceId: string,
    membershipId: string,
    data: {
      firstName?: string;
      lastName?: string;
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
    if (data.firstName || data.lastName || data.phone || data.avatarUrl !== undefined) {
      await this.prisma.user.update({
        where: { id: membership.userId },
        data: {
          ...(data.firstName ? { firstName: data.firstName } : {}),
          ...(data.lastName ? { lastName: data.lastName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        },
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
      accessRole?: SystemAccessRole;
      roleId?: string;
      departmentId?: string;
      teamId?: string;
      designationId?: string;
      designationTitle?: string;
      reportsToId?: string;
      dataScope?: string;
    },
  ) {
    const cleanId = (id?: string) => (id && id.trim().length > 0 ? id.trim() : null);

    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
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

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(data.accessRole ? { accessRole: data.accessRole } : {}),
        ...(data.roleId ? { roleId: data.roleId } : {}),
        ...(data.departmentId !== undefined ? { departmentId: cleanId(data.departmentId) } : {}),
        ...(data.teamId !== undefined ? { teamId: cleanId(data.teamId) } : {}),
        ...(finalDesignationId !== undefined ? { designationId: finalDesignationId } : {}),
        ...(data.reportsToId !== undefined ? { reportsToId: cleanId(data.reportsToId) } : {}),
        ...(data.dataScope ? { dataScope: data.dataScope } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        role: true,
        department: true,
        team: true,
        designation: true,
      },
    });
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
    },
  ) {
    const emailLower = data.email.toLowerCase().trim();

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

    // Resolve Role ID
    let roleId = data.roleId;
    if (!roleId) {
      const targetRoleName = data.accessRole || 'MEMBER';
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

    const cleanId = (id?: string) => (id && id.trim().length > 0 ? id.trim() : null);

    // Resolve designation from manual title or designationId
    let designationId = cleanId(data.designationId);
    if (data.designationTitle && data.designationTitle.trim()) {
      const cleanTitle = data.designationTitle.trim();
      let desig = await this.prisma.designation.findFirst({
        where: { workspaceId, title: { equals: cleanTitle, mode: 'insensitive' } },
      });
      if (!desig) {
        desig = await this.prisma.designation.create({
          data: { workspaceId, title: cleanTitle, level: 1 },
        });
      }
      designationId = desig.id;
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
        accessRole: data.accessRole || 'MEMBER',
        roleId,
        departmentId: cleanId(data.departmentId),
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
      roleName: data.accessRole || 'MEMBER',
    });

    return {
      message: mailResult.delivered
        ? 'Invitation email delivered successfully to ' + emailLower
        : 'Invitation created. Email dispatch recorded (SMTP credentials can be added to backend/.env)',
      invitation: {
        ...invitation,
        inviteLink,
      },
      inviteLink,
      senderName: inviterName,
      senderEmail: inviterEmail,
      emailDelivered: mailResult.delivered,
      hasSmtp: this.mailService.hasSmtp,
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

    return {
      invitation,
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
        status: 'ACTIVE',
      },
      include: {
        workspace: true,
        role: true,
      },
    });

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
      },
      membership,
      workspace: invitation.workspace,
      accessToken,
    };
  }

  async listInvitations(workspaceId: string) {
    const list = await this.prisma.invitation.findMany({
      where: { workspaceId },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://orvexa-lemon.vercel.app';
    return list.map((inv) => ({
      ...inv,
      inviteLink: `${frontendUrl}/accept-invitation?token=${inv.token}`,
    }));
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
      roleName: updated.accessRole || 'MEMBER',
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
      if (
        scope === 'TEAM' &&
        userContext.membershipId !== membershipId &&
        membership.reportsToId !== userContext.membershipId &&
        userContext.teamId !== membership.teamId
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
