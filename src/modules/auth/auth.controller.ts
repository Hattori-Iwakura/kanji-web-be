import { Controller, Post, Body, Req, Res, UseGuards, Get, Patch, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TwoFactorService } from './services/two-factor.service';
import { 
  LoginDto, 
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  Enable2FADto,
  Verify2FADto,
  Disable2FADto,
  UpdateProfileDto,
} from './dtos';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guard/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns access token and user info' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    // LoginDto uses 'account' which can be email
    const result = await this.auth.login(dto.account, dto.password, dto.code);
    return result;  // Don't wrap - let interceptor handle it
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto) {
    // RegisterDto has email, password, account, and name (all optional except email & password)
    const result = await this.auth.register(dto.email, dto.password, dto.name);
    return result;  // Don't wrap - let interceptor handle it
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id;
    const result = await this.auth.getProfile(userId);
    return result;  // Don't wrap - let interceptor handle it
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Req() req: any, @Body() updateData: UpdateProfileDto) {
    const userId = req.user?.id;
    const result = await this.auth.updateProfile(userId, updateData);
    return result;  // Don't wrap - let interceptor handle it
  }

  // ==================== PASSWORD RESET ====================

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({ status: 200, description: 'Reset link sent if email exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.auth.forgotPassword(dto.email);
    return result;
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.auth.resetPassword(dto.token, dto.newPassword);
    return result;
  }

  @Get('validate-reset-token/:token')
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateResetToken(@Param('token') token: string) {
    const result = await this.auth.validateResetToken(token);
    return result;
  }

  // ==================== TWO-FACTOR AUTHENTICATION ====================

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Setup 2FA - Generate secret and QR code' })
  @ApiResponse({ status: 200, description: 'Returns secret, QR code, and backup codes' })
  async setup2FA(@Req() req: any) {
    const userId = req.user?.id;
    const result = await this.twoFactorService.setup2FA(userId);
    return result;
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable 2FA after verifying code' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  async enable2FA(@Req() req: any, @Body() dto: Enable2FADto) {
    const userId = req.user?.id;
    const result = await this.twoFactorService.enable2FA(userId, dto.code);
    return result;
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code or password' })
  async disable2FA(@Req() req: any, @Body() body: { password: string; code: string }) {
    const userId = req.user?.id;
    const result = await this.twoFactorService.disable2FA(userId, body.password, body.code);
    return result;
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify 2FA code during login' })
  @ApiResponse({ status: 200, description: 'Code verified, returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid code' })
  async verify2FA(@Body() body: { email: string; password: string; code: string }) {
    // This is handled in the login endpoint with the code field
    return { message: 'Use /auth/login with code field instead' };
  }

  @Post('2fa/send-email-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Send 2FA OTP via email' })
  @ApiResponse({ status: 200, description: 'OTP sent to email' })
  async sendEmailOTP(@Req() req: any) {
    const userId = req.user?.id;
    const result = await this.twoFactorService.sendEmailOTP(userId);
    return result;
  }

  @Post('2fa/verify-email-otp')
  @ApiOperation({ summary: 'Verify email OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified' })
  @ApiResponse({ status: 401, description: 'Invalid OTP' })
  async verifyEmailOTP(@Body() body: { email: string; password: string; otp: string }) {
    // Similar to verify2FA, this should be integrated into login
    return { message: 'Use /auth/login with code field instead' };
  }
}
