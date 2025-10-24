import { Controller, Post, Body, Req, Res, UseGuards, Get, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { 
  LoginDto, 
  RegisterDto, 
} from './dtos';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guard/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    // private readonly passwordService: PasswordService,
    // private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns access token and user info' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    // LoginDto uses 'account' which can be email
    const result = await this.auth.login(dto.account, dto.password);
    return result;  // Don't wrap - let interceptor handle it
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto) {
    // RegisterDto has email, password, and account
    const result = await this.auth.register(dto.email, dto.password);
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
  async updateProfile(@Req() req: any, @Body() updateData: { name?: string; profileImage?: string }) {
    const userId = req.user?.id;
    const result = await this.auth.updateProfile(userId, updateData);
    return result;  // Don't wrap - let interceptor handle it
  }
}
