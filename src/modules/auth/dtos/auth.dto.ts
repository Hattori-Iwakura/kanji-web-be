import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional } from "class-validator";
import { Expose } from "class-transformer";

export class LoginDto {
  @ApiProperty()
  @IsString()
  account: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ required: false, example: '123456', description: '2FA code if enabled' })
  @IsString()
  @IsOptional()
  code?: string;
}

export class RegisterDto {
  @ApiProperty({ 
    example: 'johndoe', 
    description: 'Username (min 3 chars, alphanumeric and underscore only)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Account can only contain letters, numbers, and underscores' })
  account?: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'SecurePass123!', 
    description: 'Password (min 6 chars, flexible format for better UX)' 
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ 
    example: 'John Doe', 
    description: 'Full name (optional)',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  name?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ 
    example: 'John Doe', 
    description: 'Full name',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  name?: string;

  @ApiProperty({ 
    example: 'https://example.com/avatar.jpg', 
    description: 'Profile image URL',
    required: false 
  })
  @IsOptional()
  @IsString()
  profileImage?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123!', description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'NewPass123!', description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
  })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'Email to send reset link' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123xyz789...', description: 'Reset token from email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPass123!', description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
  })
  newPassword: string;
}

export class Enable2FADto {
  @ApiProperty({ example: '123456', description: 'TOTP code from authenticator app' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class Verify2FADto {
  @ApiProperty({ example: '123456', description: 'TOTP code or backup code' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class Disable2FADto {
  @ApiProperty({ example: '123456', description: 'TOTP code to confirm disable' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

export class RefreshDto {
  // cookie-based refresh, no body fields required
}

export class RefreshMobileDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
