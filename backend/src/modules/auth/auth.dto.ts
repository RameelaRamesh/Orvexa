import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Enter a valid work email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Organization name is required.' })
  workspaceName: string;

  @IsString()
  @IsNotEmpty({ message: 'Country is required.' })
  country: string;

  @IsString()
  @IsNotEmpty({ message: 'Timezone is required.' })
  timezone: string;

  @IsString()
  @IsOptional()
  businessType?: string;

  @IsString()
  @IsOptional()
  orgSize?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Enter a valid work email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Enter a valid work email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required.' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  newPassword: string;
}

export class VerifyMfaLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'MFA session token is required.' })
  mfaToken: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  recoveryCode?: string;
}

export class ConfirmMfaEnrollmentDto {
  @IsString()
  @IsNotEmpty({ message: '6-digit authentication code is required.' })
  code: string;
}

export class DisableMfaDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required to disable 2FA.' })
  password: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  recoveryCode?: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

