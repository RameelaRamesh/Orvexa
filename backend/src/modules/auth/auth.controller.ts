import { Controller, Post, Get, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
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
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('mfa/verify-login')
  async verifyMfaLogin(@Body() dto: VerifyMfaLoginDto) {
    return this.authService.verifyMfaLogin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enroll')
  async enrollMfa(@CurrentUser('id') userId: string) {
    return this.authService.enrollMfa(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/confirm-enrollment')
  async confirmMfaEnrollment(@CurrentUser('id') userId: string, @Body() dto: ConfirmMfaEnrollmentDto) {
    return this.authService.confirmMfaEnrollment(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  async disableMfa(@CurrentUser('id') userId: string, @Body() dto: DisableMfaDto) {
    return this.authService.disableMfa(userId, dto);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('people:manage')
  @Post('admin/trigger-reset/:userId')
  async adminTriggerReset(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser('id') adminUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.authService.adminTriggerReset(workspaceId, adminUserId, targetUserId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('people:manage')
  @Post('admin/require-reset/:userId')
  async adminRequireReset(
    @CurrentWorkspace() workspaceId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.authService.adminRequireReset(workspaceId, targetUserId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('people:manage')
  @Post('admin/revoke-sessions/:userId')
  async adminRevokeSessions(
    @CurrentWorkspace() workspaceId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.authService.adminRevokeSessions(workspaceId, targetUserId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('people:manage')
  @Post('admin/reset-mfa/:userId')
  async adminResetMfa(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser('id') adminUserId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.authService.adminResetMfa(workspaceId, adminUserId, targetUserId);
  }
}
