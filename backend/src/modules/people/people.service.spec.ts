import { Test, TestingModule } from '@nestjs/testing';
import { PeopleService } from './people.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../infrastructure/mail/mail.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

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
});
