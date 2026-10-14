import { Test, TestingModule } from '@nestjs/testing';
import { PeopleService } from './people.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../infrastructure/mail/mail.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('PeopleService - Invitation Lifecycle & Account Activation (Phase 4 Acceptance Tests)', () => {
  let service: PeopleService;
  let prisma: any;
  let jwtService: any;
  let mailService: any;

  const mockWorkspace = {
    id: 'ws_alpha',
    name: 'Alpha Operations',
    slug: 'alpha-ops',
  };

  const mockInviter = {
    id: 'user_inviter',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'operations@vattara.com',
  };

  beforeEach(async () => {
    prisma = {
      subscription: { findFirst: jest.fn() },
      membership: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      invitation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      task: { updateMany: jest.fn() },
      workItem: { updateMany: jest.fn() },
      asset: { updateMany: jest.fn() },
    };

    jwtService = {
      sign: jest.fn(() => 'mock_access_token_invited_user'),
    };

    mailService = {
      hasSmtp: true,
      sendInvitationEmail: jest.fn().mockResolvedValue({ delivered: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
  });

  describe('1. Invitation Dispatch & Sender Identification', () => {
    it('should create PENDING invitation and dispatch email using inviter credentials as sender', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ seatCount: 10 });
      prisma.membership.count.mockResolvedValue(2);
      prisma.invitation.count.mockResolvedValue(1);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findFirst.mockResolvedValue({ id: 'role_member', name: 'MEMBER' });
      prisma.invitation.updateMany.mockResolvedValue({ count: 0 });
      prisma.invitation.create.mockResolvedValue({
        id: 'inv_123',
        workspaceId: 'ws_alpha',
        email: 'newhire@acme.com',
        firstName: 'Taylor',
        lastName: 'Swift',
        accessRole: 'MEMBER',
        token: 'cryptographic_token_32_bytes',
        status: 'PENDING',
        workspace: mockWorkspace,
        invitedBy: mockInviter,
      });

      const result = await service.inviteMember('ws_alpha', 'user_inviter', {
        email: 'newhire@acme.com',
        firstName: 'Taylor',
        lastName: 'Swift',
        accessRole: 'MEMBER',
      });

      expect(mailService.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newhire@acme.com',
          senderName: 'Jordan Lee',
          senderEmail: 'operations@vattara.com',
          workspaceName: 'Alpha Operations',
        }),
      );
      expect(result.senderEmail).toBe('operations@vattara.com');
      expect(result.invitation.status).toBe('PENDING');
    });

    it('should prevent invitations beyond subscription seat limit', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ seatCount: 3 });
      prisma.membership.count.mockResolvedValue(2);
      prisma.invitation.count.mockResolvedValue(1); // 2 + 1 = 3 >= maxSeats (3)

      await expect(
        service.inviteMember('ws_alpha', 'user_inviter', {
          email: 'overflow@acme.com',
          firstName: 'Extra',
          lastName: 'User',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Invitation Verification & Token Security', () => {
    it('should verify valid PENDING invitation token', async () => {
      const validInvitation = {
        id: 'inv_1',
        token: 'token_valid',
        status: 'PENDING',
        email: 'invitee@orvexa.io',
        expiresAt: new Date(Date.now() + 86400000), // tomorrow
        workspace: mockWorkspace,
        invitedBy: mockInviter,
      };

      prisma.invitation.findUnique.mockResolvedValue(validInvitation);
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await service.verifyInvitationToken('token_valid');

      expect(res.invitation.status).toBe('PENDING');
      expect(res.userExists).toBe(false);
    });

    it('should reject expired invitation token and transition status to EXPIRED', async () => {
      const expiredInvitation = {
        id: 'inv_expired',
        token: 'token_expired',
        status: 'PENDING',
        email: 'invitee@orvexa.io',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      prisma.invitation.findUnique.mockResolvedValue(expiredInvitation);
      prisma.invitation.update.mockResolvedValue({});

      await expect(service.verifyInvitationToken('token_expired')).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv_expired' },
        data: { status: 'EXPIRED' },
      });
    });

    it('should reject revoked or already accepted invitation tokens', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_accepted',
        token: 'token_used',
        status: 'ACCEPTED',
      });

      await expect(service.verifyInvitationToken('token_used')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('3. Account Activation & Token Reuse Prevention', () => {
    it('should activate account with secure password, provision membership, mark token ACCEPTED, and return session', async () => {
      const pendingInvitation = {
        id: 'inv_accept',
        token: 'token_accept_123',
        status: 'PENDING',
        email: 'newmember@orvexa.io',
        firstName: 'Sam',
        lastName: 'Altman',
        accessRole: 'MEMBER',
        roleId: 'role_member_id',
        workspaceId: 'ws_alpha',
        expiresAt: new Date(Date.now() + 86400000),
        workspace: mockWorkspace,
      };

      prisma.invitation.findUnique.mockResolvedValue(pendingInvitation);
      prisma.user.findUnique.mockResolvedValue(null); // New user
      prisma.user.create.mockResolvedValue({
        id: 'user_sam',
        email: 'newmember@orvexa.io',
        firstName: 'Sam',
        lastName: 'Altman',
        tokenVersion: 1,
      });
      prisma.membership.upsert.mockResolvedValue({
        id: 'mem_sam',
        userId: 'user_sam',
        workspaceId: 'ws_alpha',
        accessRole: 'MEMBER',
        status: 'ACTIVE',
      });
      prisma.invitation.update.mockResolvedValue({});

      const response = await service.acceptInvitation({
        token: 'token_accept_123',
        password: 'SecurePassword123!',
        firstName: 'Sam',
        lastName: 'Altman',
      });

      expect(response.accessToken).toBe('mock_access_token_invited_user');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newmember@orvexa.io',
            isEmailVerified: true,
          }),
        }),
      );
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv_accept' },
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      });
    });

    it('should reject password shorter than 8 characters during account activation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_short',
        token: 'token_short',
        status: 'PENDING',
        email: 'shortpass@orvexa.io',
        expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvitation({
          token: 'token_short',
          password: 'short',
        }),
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should prevent token reuse once invitation is ACCEPTED', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_reused',
        token: 'token_reused',
        status: 'ACCEPTED',
      });

      await expect(
        service.acceptInvitation({
          token: 'token_reused',
          password: 'ValidPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Suspension & Preservation of Customer Data', () => {
    it('should update membership status to SUSPENDED without deleting user or tasks', async () => {
      prisma.membership.findFirst.mockResolvedValue({
        id: 'mem_suspend',
        workspaceId: 'ws_alpha',
        accessRole: 'MEMBER',
        status: 'ACTIVE',
      });
      prisma.membership.update.mockResolvedValue({
        id: 'mem_suspend',
        status: 'SUSPENDED',
      });

      const res = await service.suspendMember('ws_alpha', 'mem_suspend');

      expect(res.status).toBe('SUSPENDED');
      expect(prisma.membership.update).toHaveBeenCalledWith({
        where: { id: 'mem_suspend' },
        data: { status: 'SUSPENDED' },
      });
    });

    it('should update membership status to DEACTIVATED without deleting records on member removal', async () => {
      prisma.membership.findFirst.mockResolvedValue({
        id: 'mem_remove',
        workspaceId: 'ws_alpha',
        accessRole: 'MEMBER',
        status: 'ACTIVE',
      });
      prisma.membership.update.mockResolvedValue({
        id: 'mem_remove',
        status: 'DEACTIVATED',
      });

      const res = await service.removeMember('ws_alpha', 'mem_remove');

      expect(res.status).toBe('DEACTIVATED');
      expect(prisma.membership.update).toHaveBeenCalledWith({
        where: { id: 'mem_remove' },
        data: { status: 'DEACTIVATED' },
      });
    });

    it('should reassign tasks, reclaim assets, and revoke active sessions on offboarding without deleting data', async () => {
      prisma.membership.findFirst.mockResolvedValue({
        id: 'mem_offboard',
        workspaceId: 'ws_alpha',
        userId: 'user_leaving',
        accessRole: 'MEMBER',
      });
      prisma.task.updateMany.mockResolvedValue({ count: 4 });
      prisma.workItem.updateMany.mockResolvedValue({ count: 2 });
      prisma.asset.updateMany.mockResolvedValue({ count: 1 });
      prisma.membership.update.mockResolvedValue({
        id: 'mem_offboard',
        status: 'OFFBOARDED',
      });
      prisma.user.update.mockResolvedValue({});

      await service.completeOffboarding('ws_alpha', 'mem_offboard', {
        reassignToMembershipId: 'mem_replacement',
      });

      // Tasks reassigned, NOT deleted
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws_alpha', assigneeMembershipId: 'mem_offboard', status: { not: 'COMPLETED' } },
        data: { assigneeMembershipId: 'mem_replacement' },
      });
      // Sessions revoked
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_leaving' },
        data: { tokenVersion: { increment: 1 } },
      });
    });
  });

  describe('5. Tenant Isolation Boundaries', () => {
    it('should prevent membership operations across different workspace boundaries', async () => {
      // Member belongs to ws_alpha, but request specifies ws_beta
      prisma.membership.findFirst.mockResolvedValue(null);

      await expect(
        service.getMemberById('ws_beta', 'mem_from_alpha'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent invitation revocation across different workspace boundaries', async () => {
      prisma.invitation.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeInvitation('ws_beta', 'inv_from_alpha'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
