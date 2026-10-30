import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../infrastructure/mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyMfaLoginDto,
  ConfirmMfaEnrollmentDto,
  DisableMfaDto,
  UpdateProfileDto,
} from './auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { generateMfaSecret, generateRecoveryCodes, verifyTOTP } from './totp.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private validatePasswordPolicy(password: string) {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
  }

  async register(dto: RegisterDto) {
    this.validatePasswordPolicy(dto.password);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        tokenVersion: 1,
      },
    });

    let workspace = null;
    let membership = null;

    if (dto.workspaceName) {
      const slug =
        dto.workspaceName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-') +
        '-' +
        Math.floor(1000 + Math.random() * 9000);

      const defaultModules = ['people', 'projects', 'tasks', 'time'];

      workspace = await this.prisma.workspace.create({
        data: {
          name: dto.workspaceName,
          slug,
          businessType: dto.businessType || 'GENERAL',
          settings: {
            country: dto.country || 'US',
            timezone: dto.timezone || 'UTC',
            orgSize: dto.orgSize || '10-50',
            enabledModules: defaultModules,
            onboarding: {
              isCompleted: false,
              completedSteps: ['profile'],
              currentStep: 'schedule',
              mandatorySteps: ['profile', 'schedule'],
              optionalSteps: ['holidays', 'locations', 'departments'],
            },
          },
        },
      });

      // Auto-provision initial Free Tier subscription
      let freePlan = await this.prisma.plan.findFirst({ where: { code: 'FREE' } });
      if (!freePlan) {
        freePlan = await this.prisma.plan.create({
          data: {
            name: 'Free Tier',
            code: 'FREE',
            priceMonthly: 0,
            priceYearly: 0,
            entitlements: {
              maxUsers: 5,
              maxStorageMb: 1000,
              features: defaultModules,
              description: 'Essential organization and core work tracking for small teams.',
              conditions: 'Up to 5 team members. 1 GB storage. Core work management.',
            },
          },
        });
      }

      await this.prisma.subscription.create({
        data: {
          workspaceId: workspace.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          seatCount: 5,
        },
      });

      let ownerRole = await this.prisma.role.findFirst({
        where: { name: 'OWNER', isSystemRole: true },
      });

      if (!ownerRole) {
        ownerRole = await this.prisma.role.create({
          data: {
            name: 'OWNER',
            description: 'Workspace Owner with full administrative privileges',
            isSystemRole: true,
          },
        });
      }

      membership = await this.prisma.membership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          roleId: ownerRole.id,
          accessRole: 'OWNER',
          status: 'ACTIVE',
        },
      });
    }

    const token = this.generateToken(user.id, user.email, user.tokenVersion);

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mustChangePassword: user.mustChangePassword,
      },
      workspace,
      membership,
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            workspace: true,
            role: true,
            department: true,
            team: true,
            designation: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Enter a valid work email address and password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account is currently suspended or inactive.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Enter a valid work email address and password');
    }

    // Two-Step Authentication Interception
    if (user.mfaEnabled) {
      const mfaToken = this.jwtService.sign(
        { sub: user.id, mfaPending: true },
        { expiresIn: '5m' },
      );

      return {
        mfaRequired: true,
        mfaToken,
        message: 'Two-step verification code required',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
        },
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(user.id, user.email, user.tokenVersion);

    return {
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        mustChangePassword: user.mustChangePassword,
        mfaEnabled: user.mfaEnabled,
        lastLoginAt: user.lastLoginAt,
      },
      memberships: user.memberships,
      accessToken: token,
    };
  }

  /**
   * Enrol user in Two-Step Authentication (generates secret & recovery codes)
   */
  async enrollMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const secret = generateMfaSecret();
    const recoveryCodes = generateRecoveryCodes(8);
    const otpAuthUrl = `otpauth://totp/ORVEXA:${encodeURIComponent(user.email)}?secret=${secret}&issuer=ORVEXA`;

    // Save temporary enrollment state
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: JSON.stringify({ secret, recoveryCodes, isVerified: false }),
      },
    });

    return {
      secret,
      otpAuthUrl,
      recoveryCodes,
      message: 'Scan the QR code or enter the secret key in your authenticator app, then confirm with a 6-digit code.',
    };
  }

  /**
   * Confirm and activate Two-Step Authentication with verified 6-digit code
   */
  async confirmMfaEnrollment(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA enrollment has not been initiated');
    }

    let secretData: { secret: string; recoveryCodes: string[]; isVerified?: boolean };
    try {
      secretData = JSON.parse(user.mfaSecret);
    } catch {
      throw new BadRequestException('Invalid MFA enrollment state');
    }

    const isValid = verifyTOTP(secretData.secret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid authentication code. Please check your authenticator clock and try again.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: JSON.stringify({ secret: secretData.secret, recoveryCodes: secretData.recoveryCodes, isVerified: true }),
      },
    });

    this.logger.log(`Two-step authentication successfully activated for user ${user.id}`);

    return {
      message: 'Two-factor authentication enabled successfully. Store your recovery codes safely.',
      mfaEnabled: true,
      recoveryCodes: secretData.recoveryCodes,
    };
  }

  /**
   * Complete login by verifying 6-digit TOTP code or single-use recovery code
   */
  async verifyMfaLogin(dto: VerifyMfaLoginDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.mfaToken);
    } catch {
      throw new UnauthorizedException('Two-factor session has expired. Please log in again.');
    }

    if (!payload?.mfaPending || !payload?.sub) {
      throw new UnauthorizedException('Invalid two-factor session token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: {
            workspace: true,
            role: true,
            department: true,
            team: true,
            designation: true,
          },
        },
      },
    });

    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('User or MFA configuration not found');
    }

    let secretData: { secret: string; recoveryCodes: string[] };
    try {
      secretData = JSON.parse(user.mfaSecret);
    } catch {
      throw new UnauthorizedException('MFA configuration error');
    }

    let isSuccess = false;

    // Check TOTP code
    if (dto.code && verifyTOTP(secretData.secret, dto.code)) {
      isSuccess = true;
    }

    // Check single-use recovery code
    if (!isSuccess && dto.recoveryCode) {
      const cleanRecovery = dto.recoveryCode.trim().toUpperCase();
      const codeIndex = secretData.recoveryCodes.findIndex((c) => c.toUpperCase() === cleanRecovery);

      if (codeIndex !== -1) {
        isSuccess = true;
        // Burn single-use recovery code
        secretData.recoveryCodes.splice(codeIndex, 1);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { mfaSecret: JSON.stringify(secretData) },
        });
        this.logger.log(`Single-use recovery code consumed for user ${user.id}. Remaining: ${secretData.recoveryCodes.length}`);
      }
    }

    if (!isSuccess) {
      throw new UnauthorizedException('Invalid verification code or recovery code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateToken(user.id, user.email, user.tokenVersion);

    return {
      message: 'Two-step authentication verified successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        mustChangePassword: user.mustChangePassword,
        mfaEnabled: user.mfaEnabled,
        lastLoginAt: user.lastLoginAt,
      },
      memberships: user.memberships,
      accessToken,
    };
  }

  /**
   * Disable Two-Step Authentication with password and 2FA verification
   */
  async disableMfa(userId: string, dto: DisableMfaDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Password verification failed');
    }

    if (user.mfaSecret) {
      let secretData: { secret: string; recoveryCodes: string[] };
      try {
        secretData = JSON.parse(user.mfaSecret);
      } catch {
        secretData = { secret: '', recoveryCodes: [] };
      }

      let verified = false;
      if (dto.code && verifyTOTP(secretData.secret, dto.code)) {
        verified = true;
      }
      if (!verified && dto.recoveryCode) {
        const cleanCode = dto.recoveryCode.trim().toUpperCase();
        if (secretData.recoveryCodes.some((c) => c.toUpperCase() === cleanCode)) {
          verified = true;
        }
      }

      if (!verified && (dto.code || dto.recoveryCode)) {
        throw new BadRequestException('Invalid two-factor code or recovery code');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    this.logger.log(`MFA disabled for user ${userId}`);

    return { message: 'Two-step authentication has been disabled successfully', mfaEnabled: false };
  }

  /**
   * Workspace Admin/Owner reset of user's second factor (account recovery)
   */
  async adminResetMfa(workspaceId: string, adminUserId: string, targetUserId: string) {
    if (workspaceId) {
      const adminMembership = await this.prisma.membership.findFirst({
        where: {
          userId: adminUserId,
          workspaceId,
          status: 'ACTIVE',
          accessRole: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (!adminMembership) {
        throw new ForbiddenException('Only workspace Owners and Admins can reset user two-factor authentication');
      }
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('Target user not found');

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        tokenVersion: targetUser.tokenVersion + 1, // Revoke active sessions for security
      },
    });

    this.logger.log(`Admin ${adminUserId} reset MFA for user ${targetUserId} in workspace ${workspaceId}`);

    return { message: 'Two-step authentication has been securely reset for the user' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const genericResponse = {
      message: 'If an account with that email exists, a password reset link has been sent to your inbox.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || user.status !== 'ACTIVE') {
      return genericResponse;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: expiresAt,
      },
    });

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://orvexa-lemon.vercel.app';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetLink,
    });

    return {
      ...genericResponse,
      resetToken, // Included for verification
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    this.validatePasswordPolicy(dto.newPassword);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        mustChangePassword: false,
        tokenVersion: user.tokenVersion + 1,
      },
    });

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    this.validatePasswordPolicy(dto.newPassword);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        tokenVersion: user.tokenVersion + 1,
      },
    });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        isEmailVerified: true,
        mustChangePassword: true,
        lastLoginAt: true,
        mfaEnabled: true,
        createdAt: true,
        memberships: {
          include: {
            workspace: true,
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            department: true,
            team: true,
            designation: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        isEmailVerified: true,
        mfaEnabled: true,
      },
    });

    return { message: 'Profile updated successfully', user: updated };
  }

  async adminTriggerReset(workspaceId: string, adminUserId: string, targetUserId: string) {
    if (workspaceId) {
      const membership = await this.prisma.membership.findFirst({
        where: { userId: targetUserId, workspaceId, status: 'ACTIVE' },
      });
      if (!membership) {
        throw new ForbiddenException('User is not an active member of this workspace');
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Target user not found');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000);

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordResetToken: resetToken, passwordResetExpires: expiresAt },
    });

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://orvexa-lemon.vercel.app';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetLink,
    });

    return { message: 'Password reset link generated and emailed to user', resetToken };
  }

  async adminRequireReset(workspaceId: string, targetUserId: string) {
    if (workspaceId) {
      const membership = await this.prisma.membership.findFirst({
        where: { userId: targetUserId, workspaceId, status: 'ACTIVE' },
      });
      if (!membership) {
        throw new ForbiddenException('User is not an active member of this workspace');
      }
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { mustChangePassword: true },
    });
    return { message: 'User will be required to change password at next login' };
  }

  async adminRevokeSessions(workspaceId: string, targetUserId?: string) {
    const actualUserId = targetUserId || workspaceId;
    const actualWsId = targetUserId ? workspaceId : '';
    if (actualWsId) {
      const membership = await this.prisma.membership.findFirst({
        where: { userId: actualUserId, workspaceId: actualWsId, status: 'ACTIVE' },
      });
      if (!membership) {
        throw new ForbiddenException('User is not an active member of this workspace');
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: actualUserId } });
    if (!user) throw new NotFoundException('Target user not found');

    await this.prisma.user.update({
      where: { id: actualUserId },
      data: { tokenVersion: user.tokenVersion + 1 },
    });

    return { message: 'Active sessions revoked successfully' };
  }

  private generateToken(userId: string, email: string, tokenVersion: number = 1): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      tokenVersion,
    });
  }
}
