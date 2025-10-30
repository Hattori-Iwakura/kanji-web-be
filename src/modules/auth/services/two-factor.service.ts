import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../shared/services/prisma.service';
import { MailService } from '../../../shared/mail/mail.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Generate 2FA secret and QR code for user
   */
  async setup2FA(userId: number): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if 2FA already exists
    let twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    // Generate new secret
    const secret = speakeasy.generateSecret({
      name: `Kanji App (${user.email})`,
      length: 32,
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(8);

    if (twoFactorAuth) {
      // Update existing
      twoFactorAuth = await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          secret: secret.base32,
          backupCodes,
          enabled: false, // Reset to disabled until verified
        },
      });
    } else {
      // Create new
      twoFactorAuth = await this.prisma.twoFactorAuth.create({
        data: {
          userId,
          secret: secret.base32,
          backupCodes,
          enabled: false,
        },
      });
    }

    // Generate QR code - Return otpauth URL instead of data URL
    // Client will generate QR code from this URL
    const otpauthUrl = secret.otpauth_url!;

    return {
      secret: secret.base32,
      qrCodeUrl: otpauthUrl,  // Return otpauth URL for client to generate QR
      backupCodes,
    };
  }

  /**
   * Enable 2FA after verifying the code
   */
  async enable2FA(userId: number, code: string): Promise<{ enabled: boolean }> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('2FA not set up');
    }

    // Verify the code
    const isValid = this.verifyTOTP(twoFactorAuth.secret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid code');
    }

    // Enable 2FA
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: true },
    });

    return { enabled: true };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: number, password: string, code: string): Promise<{ enabled: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('2FA not set up');
    }

    // Verify code or backup code
    const isValid = this.verifyTOTP(twoFactorAuth.secret, code) || 
                    twoFactorAuth.backupCodes.includes(code);
    
    if (!isValid) {
      throw new BadRequestException('Invalid code');
    }

    // Disable 2FA
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: false },
    });

    return { enabled: false };
  }

  /**
   * Verify TOTP code
   */
  async verify2FACode(userId: number, code: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.enabled) {
      return false;
    }

    // Check TOTP code
    const isTOTPValid = this.verifyTOTP(twoFactorAuth.secret, code);
    if (isTOTPValid) {
      return true;
    }

    // Check backup code
    if (twoFactorAuth.backupCodes.includes(code)) {
      // Remove used backup code
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes: twoFactorAuth.backupCodes.filter(bc => bc !== code),
        },
      });
      return true;
    }

    return false;
  }

  /**
   * Generate and send email OTP
   */
  async sendEmailOTP(userId: number): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 600000); // 10 minutes

    // Invalidate previous OTPs
    await this.prisma.twoFactorOtp.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });

    // Create new OTP
    await this.prisma.twoFactorOtp.create({
      data: {
        userId,
        code: otp,
        expiresAt,
      },
    });

    // Send email with OTP
    try {
      await this.mailService.send2FAOtpEmail(
        user.email,
        user.name || 'User',
        otp,
      );
    } catch (error) {
      console.error('Failed to send 2FA OTP email:', error);
      throw new BadRequestException('Failed to send OTP email');
    }

    return {
      message: 'OTP sent to email',
    };
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOTP(userId: number, otp: string): Promise<boolean> {
    const otpRecord = await this.prisma.twoFactorOtp.findFirst({
      where: {
        userId,
        code: otp,
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!otpRecord) {
      return false;
    }

    // Mark as used
    await this.prisma.twoFactorOtp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    return true;
  }

  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId: number): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    return twoFactorAuth?.enabled || false;
  }

  // ==================== PRIVATE METHODS ====================

  private verifyTOTP(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps before and after
    });
  }

  private generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
