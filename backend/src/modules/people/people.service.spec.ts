import { Test, TestingModule } from '@nestjs/testing';
import { PeopleService } from './people.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../infrastructure/mail/mail.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PeopleService - Security & Lifecycle Tests', () => {
  let service: PeopleService;
  let prisma: any;

  const mockPrisma = {
    membership: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    subscription: {
      findFirst: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    workspace: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    team: {
      findMany: jest.fn().mockResolvedValue([]),
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
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock_token'),
  };

  const mockMail = {
    sendInvitationEmail: jest.fn().mockResolvedValue({ delivered: false }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ delivered: false }),
    hasSmtp: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Sole Owner Protection', () => {
    it('should throw BadRequestException when trying to suspend the sole Owner', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_owner',
        workspaceId: 'ws_1',
        accessRole: 'OWNER',
        status: 'ACTIVE',
      });
      mockPrisma.membership.count.mockResolvedValue(1); // Only 1 Owner

      await expect(service.suspendMember('ws_1', 'mem_owner')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when trying to remove the sole Owner', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_owner',
        workspaceId: 'ws_1',
        accessRole: 'OWNER',
        status: 'ACTIVE',
      });
      mockPrisma.membership.count.mockResolvedValue(1);

      await expect(service.removeMember('ws_1', 'mem_owner')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when trying to offboard the sole Owner', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_owner',
        workspaceId: 'ws_1',
        accessRole: 'OWNER',
        status: 'ACTIVE',
      });
      mockPrisma.membership.count.mockResolvedValue(1);

      await expect(
        service.initiateOffboarding('ws_1', 'mem_owner', { lastWorkingDate: '2026-10-10' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Invitation Workflow Security', () => {
    it('should throw BadRequestException if invitation token is expired', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_1',
        token: 'expired_token',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 3600000), // expired 1 hour ago
      });

      await expect(service.verifyInvitationToken('expired_token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invitation token has already been accepted', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_1',
        token: 'used_token',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 3600000),
      });

      await expect(service.acceptInvitation({ token: 'used_token' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if seat count limit is reached', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ seatCount: 2 });
      mockPrisma.membership.count.mockResolvedValue(2); // 2 seats out of 2 used

      await expect(
        service.inviteMember('ws_1', 'user_inviter', {
          email: 'new@company.com',
          firstName: 'New',
          lastName: 'User',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Offboarding Handover & Session Revocation', () => {
    it('should reassign work items, assets, revoke access and increment tokenVersion', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_leaving',
        userId: 'user_leaving',
        workspaceId: 'ws_1',
        accessRole: 'MEMBER',
        status: 'ACTIVE',
      });
      mockPrisma.membership.update.mockResolvedValue({
        id: 'mem_leaving',
        status: 'OFFBOARDED',
        offboardingStatus: 'COMPLETED',
      });

      const result = await service.completeOffboarding('ws_1', 'mem_leaving', {
        reassignToMembershipId: 'mem_replacement',
      });

      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws_1', assigneeMembershipId: 'mem_leaving', status: { not: 'COMPLETED' } },
        data: { assigneeMembershipId: 'mem_replacement' },
      });

      expect(mockPrisma.asset.updateMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws_1', assignedToMembershipId: 'mem_leaving' },
        data: { assignedToMembershipId: null, status: 'AVAILABLE' },
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_leaving' },
        data: { tokenVersion: { increment: 1 } },
      });

      expect(result.membership.status).toBe('OFFBOARDED');
    });
  });

  describe('DataScope Defaults on Invitation & Role Update', () => {
    it('should assign TEAM dataScope when accepting a MANAGER invitation', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_mgr',
        token: 'mgr_token',
        status: 'PENDING',
        email: 'lead@company.com',
        firstName: 'Rameela',
        lastName: 'R',
        accessRole: 'MANAGER',
        roleId: 'role_team_lead',
        workspaceId: 'ws_1',
        expiresAt: new Date(Date.now() + 3600000),
        workspace: { id: 'ws_1', name: 'Vattara Solutions' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_mgr',
        email: 'lead@company.com',
        firstName: 'Rameela',
        lastName: 'R',
        tokenVersion: 1,
      });
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role_team_lead',
        name: 'Team Lead',
      });
      mockPrisma.membership.upsert.mockResolvedValue({
        id: 'mem_mgr',
        accessRole: 'MANAGER',
        dataScope: 'TEAM',
        status: 'ACTIVE',
      });
      mockPrisma.invitation.update.mockResolvedValue({});

      await service.acceptInvitation({ token: 'mgr_token' });

      expect(mockPrisma.membership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ dataScope: 'TEAM', accessRole: 'MANAGER' }),
          create: expect.objectContaining({ dataScope: 'TEAM', accessRole: 'MANAGER' }),
        }),
      );
    });

    it('should promote dataScope to GLOBAL when updating member accessRole to ADMIN without explicit dataScope', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_promote',
        userId: 'user_promote',
        workspaceId: 'ws_1',
        accessRole: 'MEMBER',
        dataScope: 'ASSIGNED',
      });
      mockPrisma.membership.update.mockResolvedValue({
        id: 'mem_promote',
        accessRole: 'ADMIN',
        dataScope: 'GLOBAL',
      });

      await service.updateMemberOrgDetails('ws_1', 'mem_promote', {
        accessRole: 'ADMIN' as any,
      });

      expect(mockPrisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessRole: 'ADMIN',
            dataScope: 'GLOBAL',
          }),
        }),
      );
    });
  });

  describe('Shareable Join Link, Profile Setup & Delegated Invite Ceiling', () => {
    it('acceptJoinLink adds user via safe Staff carrier and sets profileSetupCompleted: false', async () => {
      const wsRecord = {
        id: 'ws_join_1',
        name: 'Alpha Studio',
        slug: 'alpha-studio',
        logoUrl: null,
        settings: {
          shareInviteLink: {
            code: 'joinabc123',
            enabled: true,
            defaultRoleId: 'role_staff_dev',
            defaultDataScope: 'ASSIGNED',
          },
        },
      };
      mockPrisma.workspace.findMany.mockResolvedValue([wsRecord]);
      mockPrisma.workspace.findUnique.mockResolvedValue(wsRecord);
      mockPrisma.workspace.update.mockResolvedValue({});
      mockPrisma.subscription.findFirst.mockResolvedValue({ seatCount: 10 });
      mockPrisma.membership.count.mockResolvedValue(2);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user_new_1',
        email: 'newstaff@alpha.com',
        firstName: 'Sam',
        lastName: 'Patel',
        tokenVersion: 1,
      });
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role_staff_dev',
        name: 'Software Engineer',
        isSystemRole: false,
      });
      mockPrisma.membership.upsert.mockResolvedValue({
        id: 'mem_joined_1',
        workspaceId: 'ws_join_1',
        accessRole: 'MEMBER',
        roleId: 'role_staff_dev',
        dataScope: 'ASSIGNED',
        status: 'ACTIVE',
      });

      const result = await service.acceptJoinLink({
        code: 'joinabc123',
        email: 'newstaff@alpha.com',
        password: 'Password123!',
        firstName: 'Sam',
        lastName: 'Patel',
      });

      expect(result.profileSetupCompleted).toBe(false);
      expect(result.user.profileSetupCompleted).toBe(false);
      expect(result.accessToken).toBe('mock_token');
      expect(mockPrisma.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              profileSetupCompletedByUser: expect.objectContaining({ user_new_1: false }),
            }),
          }),
        }),
      );
    });

    it('enforces delegated inviter permission & role ceiling when a Team Lead invites members', async () => {
      const leadActor = {
        membershipId: 'mem_tl',
        accessRole: 'MEMBER',
        dataScope: 'TEAM',
        teamId: 'team_eng',
        scopedTeamIds: ['team_eng'],
        permissions: ['invitations:manage', 'tasks:view', 'tasks:create'],
      };

      await expect(
        service.inviteMember(
          'ws_1',
          'user_tl',
          {
            email: 'admin@alpha.com',
            firstName: 'Eve',
            lastName: 'Admin',
            accessRole: 'ADMIN' as any,
          },
          leadActor,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.inviteMember(
          'ws_1',
          'user_tl',
          {
            email: 'payroll@alpha.com',
            firstName: 'Max',
            lastName: 'Pay',
            dataScope: 'TEAM',
            permissionCodes: ['payroll:manage'],
          },
          leadActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('persists per-member permissionOverrides via updateMemberOrgDetails', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem_staff_9',
        userId: 'u_9',
        workspaceId: 'ws_1',
        accessRole: 'MEMBER',
        dataScope: 'ASSIGNED',
      });
      mockPrisma.membership.update.mockResolvedValue({
        id: 'mem_staff_9',
        userId: 'u_9',
        workspaceId: 'ws_1',
        accessRole: 'MEMBER',
        dataScope: 'TEAM',
        user: { id: 'u_9', firstName: 'Riya', lastName: 'K', email: 'riya@alpha.com' },
        role: { id: 'r_staff', name: 'Coordinator' },
        department: null,
        team: null,
        designation: null,
      });
      mockPrisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', settings: {} });
      mockPrisma.workspace.update.mockResolvedValue({});

      const updated: any = await service.updateMemberOrgDetails('ws_1', 'mem_staff_9', {
        dataScope: 'TEAM',
        permissionOverrides: { added: ['leave:approve'], revoked: ['tasks:delete'] },
      });

      expect(updated.memberPermissionOverrides).toEqual({
        added: ['leave:approve'],
        revoked: ['tasks:delete'],
      });
    });
  });
});
