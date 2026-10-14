import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../infrastructure/mail/mail.service';
import { TotpUtil } from './totp.util';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService & TOTP MFA (Phase 4 Acceptance Tests)', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let emailService: any;
  let configService: any;

  const mockUser = {
    id: 'user_123',
    email: 'admin@orvexa.io',
    passwordHash: '',
    firstName: 'Alex',
    lastName: 'Vance',
    avatarUrl: null,
    mfaEnabled: false,
    mfaSecret: null,
    tokenVersion: 1,
    mustResetPassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('SecurePassword123!', 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      membership: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      workspace: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
      },
      invitation: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      passwordReset: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    jwtService = {
      sign: jest.fn((payload) => `mock_jwt_token_${payload.sub}`),
      verify: jest.fn(),
    };

    emailService = {
      sendPasswordReset: jest.fn(),
      sendWelcomeEmail: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.secret') return 'test_jwt_secret_12345';
        if (key === 'jwt.expiresIn') return '15m';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('1. RFC 6238 TOTP Utility Verification', () => {
    it('should generate a 32-character Base32 secret', () => {
      const secret = TotpUtil.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBe(32);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('should generate and verify 6-digit TOTP codes within time window', () => {
      const secret = TotpUtil.generateSecret();
      const code = TotpUtil.generateToken(secret);
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);

      const isValid = TotpUtil.verifyToken(secret, code, 1);
      expect(isValid).toBe(true);
    });

    it('should reject invalid or tampered TOTP codes', () => {
      const secret = TotpUtil.generateSecret();
      const isValid = TotpUtil.verifyToken(secret, '999999', 1);
      expect(isValid).toBe(false);
    });

    it('should generate exactly 8 unique single-use emergency recovery codes', () => {
      const codes = TotpUtil.generateRecoveryCodes(8);
      expect(codes).toHaveLength(8);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(8);
      codes.forEach((c) => expect(c).toHaveLength(8));
    });
  });

  describe('2. Two-Factor Authentication Enrollment & Confirmation', () => {
    it('should initiate 2FA enrollment returning secret, otpauth URL, and 8 recovery codes', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaEnabled: false });
      prisma.user.update.mockResolvedValue({});

      const enrollment = await service.enrollMfa('user_123');

      expect(enrollment.secret).toBeDefined();
      expect((enrollment as any).otpAuthUrl || (enrollment as any).otpauthUrl).toContain('otpauth://totp/ORVEXA:admin%40orvexa.io');
      expect(enrollment.recoveryCodes).toHaveLength(8);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_123' },
          data: expect.objectContaining({
            mfaSecret: expect.stringContaining(enrollment.secret),
          }),
        }),
      );
    });

    it('should throw BadRequestException if user already has 2FA enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      await expect(service.enrollMfa('user_123')).rejects.toThrow(BadRequestException);
    });

    it('should confirm 2FA enrollment with valid 6-digit code and activate mfaEnabled: true', async () => {
      const secret = TotpUtil.generateSecret();
      const validCode = TotpUtil.generateToken(secret);
      const recoveryCodes = TotpUtil.generateRecoveryCodes(8);

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        mfaSecret: JSON.stringify({ secret, recoveryCodes, isVerified: false }),
      });
      prisma.user.update.mockResolvedValue({});

      const res = await service.confirmMfaEnrollment('user_123', validCode);

      expect(res.mfaEnabled).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          mfaEnabled: true,
          mfaSecret: JSON.stringify({ secret, recoveryCodes, isVerified: true }),
        },
      });
    });

    it('should reject 2FA confirmation with incorrect code', async () => {
      const secret = TotpUtil.generateSecret();
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        mfaSecret: JSON.stringify({ secret, recoveryCodes: [], isVerified: false }),
      });

      await expect(service.confirmMfaEnrollment('user_123', '000000')).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Login Flow & 2FA Interception', () => {
    it('should issue standard accessToken on password match when MFA is NOT enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaEnabled: false });
      prisma.membership.findMany.mockResolvedValue([]);

      const result = await service.login({ email: 'admin@orvexa.io', password: 'SecurePassword123!' });

      expect(result.mfaRequired).toBeUndefined();
      expect(result.accessToken).toBeDefined();
    });

    it('should intercept login with mfaRequired: true and 5-min temporary token when MFA IS enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      const result = await service.login({ email: 'admin@orvexa.io', password: 'SecurePassword123!' });

      expect(result.mfaRequired).toBe(true);
      expect(result.mfaToken).toBeDefined();
      expect(result.accessToken).toBeUndefined();
    });

    it('should complete login and return accessToken upon providing valid 6-digit TOTP code', async () => {
      const secret = TotpUtil.generateSecret();
      const code = TotpUtil.generateToken(secret);

      jwtService.verify.mockReturnValue({ sub: 'user_123', mfaPending: true });
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: JSON.stringify({ secret, recoveryCodes: ['rec12345'], isVerified: true }),
      });
      prisma.membership.findMany.mockResolvedValue([]);

      const result = await service.verifyMfaLogin({ mfaToken: 'temp_mfa_token', code });

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('admin@orvexa.io');
    });

    it('should allow login via single-use emergency recovery code and BURN it immediately', async () => {
      const secret = TotpUtil.generateSecret();
      const recoveryCodes = ['code1111', 'code2222', 'code3333'];

      jwtService.verify.mockReturnValue({ sub: 'user_123', mfaPending: true });
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: JSON.stringify({ secret, recoveryCodes, isVerified: true }),
      });
      prisma.membership.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue({});

      const result = await service.verifyMfaLogin({ mfaToken: 'temp_mfa_token', code: 'code2222' });

      expect(result.accessToken).toBeDefined();
      // Verify code2222 was removed from the recovery codes array
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          mfaSecret: JSON.stringify({
            secret,
            recoveryCodes: ['code1111', 'code3333'],
            isVerified: true,
          }),
        },
      });
    });
  });

  describe('4. Disabling 2FA & Secure Admin Reset', () => {
    it('should disable 2FA when verified with correct password and TOTP code', async () => {
      const secret = TotpUtil.generateSecret();
      const code = TotpUtil.generateToken(secret);

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: JSON.stringify({ secret, recoveryCodes: [], isVerified: true }),
      });
      prisma.user.update.mockResolvedValue({});

      const res = await service.disableMfa('user_123', { password: 'SecurePassword123!', code });

      expect(res.mfaEnabled).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { mfaEnabled: false, mfaSecret: null },
      });
    });

    it('should allow workspace Admin/Owner to reset 2FA for locked-out member and revoke sessions', async () => {
      prisma.membership.findFirst = jest.fn().mockResolvedValue({
        id: 'mem_admin',
        accessRole: 'OWNER',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_locked',
        email: 'locked@orvexa.io',
        tokenVersion: 2,
        mfaEnabled: true,
      });
      prisma.user.update.mockResolvedValue({});

      const res = await service.adminResetMfa('ws_1', 'admin_user', 'user_locked');

      expect(res.message).toContain('Two-factor authentication reset successfully');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_locked' },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          tokenVersion: 3, // Sessions invalidated
        },
      });
    });
  });

  describe('5. Password Reset Expiry & Session Revocation', () => {
    it('should reject expired password reset tokens', async () => {
      prisma.passwordReset.findFirst.mockResolvedValue({
        id: 'reset_1',
        token: 'expired_token',
        userId: 'user_123',
        used: false,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      await expect(
        service.resetPassword({ token: 'expired_token', newPassword: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject already used password reset tokens', async () => {
      prisma.passwordReset.findFirst.mockResolvedValue({
        id: 'reset_2',
        token: 'used_token',
        userId: 'user_123',
        used: true,
        expiresAt: new Date(Date.now() + 3600000),
      });

      await expect(
        service.resetPassword({ token: 'used_token', newPassword: 'NewPassword123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should increment tokenVersion when resetting password to invalidate prior sessions', async () => {
      prisma.passwordReset.findFirst.mockResolvedValue({
        id: 'reset_3',
        token: 'valid_token',
        userId: 'user_123',
        used: false,
        expiresAt: new Date(Date.now() + 3600000),
      });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, tokenVersion: 5 });
      prisma.user.update.mockResolvedValue({});
      prisma.passwordReset.update.mockResolvedValue({});

      await service.resetPassword({ token: 'valid_token', newPassword: 'BrandNewPassword123!' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_123' },
          data: expect.objectContaining({
            tokenVersion: 6,
            mustResetPassword: false,
          }),
        }),
      );
    });
  });
});
