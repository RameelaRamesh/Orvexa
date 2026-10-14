import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { MailService } from '../../infrastructure/mail/mail.service';

describe('AuthService - Password & Session Security Tests', () => {
  let service: AuthService;
  let prisma: any;

  const mockMailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ delivered: true }),
    sendMfaCodeEmail: jest.fn().mockResolvedValue({ delivered: true }),
    hasSmtp: true,
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    workspace: {
      create: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    membership: {
      create: jest.fn(),
    },
    plan: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('jwt_token_sample'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Password Security & Reset Token Invalidation', () => {
    it('should throw BadRequestException if password reset token is invalid or expired', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid_token', newPassword: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if logging into suspended account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u_1',
        email: 'test@orvexa.io',
        status: 'SUSPENDED',
      });

      await expect(
        service.login({ email: 'test@orvexa.io', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should increment tokenVersion when admin revokes active sessions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u_target', tokenVersion: 3 });
      mockPrisma.user.update.mockResolvedValue({ id: 'u_target', tokenVersion: 4 });

      await service.adminRevokeSessions('u_target');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u_target' },
        data: { tokenVersion: 4 },
      });
    });
  });
});
