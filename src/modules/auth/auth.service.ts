import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/services/prisma.service';
import { TwoFactorService } from './services/two-factor.service';
import { MailService } from '../../shared/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly twoFactorService: TwoFactorService,
    private readonly mailService: MailService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name, role: 'USER' },
    });

    const { passwordHash: _, ...result } = user;

    // Send welcome email (async, don't wait)
    this.mailService.sendWelcomeEmail(email, name || 'User').catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return {
      user: result,
      accessToken: this.generateToken(user.id, user.role),
    };
  }

  async login(email: string, password: string, code?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled
    const is2FAEnabled = await this.twoFactorService.is2FAEnabled(user.id);
    
    if (is2FAEnabled) {
      // 2FA is enabled, verify code
      if (!code) {
        return {
          requires2FA: true,
          message: '2FA code required',
        };
      }

      const isCodeValid = await this.twoFactorService.verify2FACode(user.id, code);
      if (!isCodeValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }
    
    const { passwordHash: _, ...result } = user;
    return {
      user: result,
      accessToken: this.generateToken(user.id, user.role),
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        twoFactorAuth: {
          select: {
            enabled: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Add twoFactorEnabled field for easier client access
    const { twoFactorAuth, ...userData } = user;
    return {
      ...userData,
      twoFactorEnabled: twoFactorAuth?.enabled ?? false,
    };
  }

  async updateProfile(userId: number, data: { name?: string; profileImage?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        twoFactorAuth: {
          select: {
            enabled: true,
          },
        },
      },
    });

    // Add twoFactorEnabled field for easier client access
    const { twoFactorAuth, ...userData } = user;
    return {
      ...userData,
      twoFactorEnabled: twoFactorAuth?.enabled ?? false,
    };
  }

  private generateToken(userId: number, role: string): string {
    return this.jwtService.sign({ sub: userId, role });
  }

  // ==================== PASSWORD RESET ====================

  async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    // Always return success message to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Invalidate all previous tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Create new reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send password reset email
    try {
      await this.mailService.sendPasswordResetEmail(
        email,
        user.name || 'User',
        token,
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Still return success to prevent email enumeration
    }

    return { 
      message: 'If the email exists, a reset link has been sent',
      token: process.env.NODE_ENV === 'development' ? token : undefined,
    };
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used) {
      return { valid: false };
    }

    if (resetToken.expiresAt < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      email: resetToken.user.email,
    };
  }

  // ==================== CHANGE PASSWORD (LOGGED-IN USER) ====================

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Get user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Send password changed notification (async, don't wait)
    this.mailService.sendPasswordChangedEmail(
      user.email,
      user.name || 'User',
    ).catch(err => {
      console.error('Failed to send password changed email:', err);
    });

    return { message: 'Password changed successfully' };
  }

  // ==================== RESET PASSWORD (VIA EMAIL TOKEN) ====================

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Validate token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    // Send password changed notification (async, don't wait)
    this.mailService.sendPasswordChangedEmail(
      resetToken.user.email,
      resetToken.user.name || 'User',
    ).catch(err => {
      console.error('Failed to send password changed email:', err);
    });

    return { message: 'Password reset successful' };
  }
}
