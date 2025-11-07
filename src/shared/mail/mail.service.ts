import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly appUrl: string;
  private readonly frontendUrl: string;
  private readonly appName: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || this.appUrl;
    this.appName = this.configService.get<string>('APP_NAME') || 'Kanji Learning App';
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    // Use API URL for reset password endpoint
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Password Reset Request - ${this.appName}`,
        template: './password-reset',
        context: {
          name: name || 'User',
          resetUrl,
          token,
          appUrl: this.frontendUrl,
        },
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Send 2FA OTP email
   */
  async send2FAOtpEmail(
    email: string,
    name: string,
    otp: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Your Two-Factor Authentication Code - ${this.appName}`,
        template: './2fa-otp',
        context: {
          name: name || 'User',
          otp,
          appUrl: this.frontendUrl,
        },
      });

      this.logger.log(`2FA OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send 2FA OTP email to ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Welcome to ${this.appName}! 🎌`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea;">Welcome to ${this.appName}!</h1>
            <p>Hi ${name || 'there'},</p>
            <p>Thank you for joining our Japanese Kanji learning community! 🎌</p>
            <p>We're excited to help you on your journey to master Japanese characters.</p>
            <h3>Get Started:</h3>
            <ul>
              <li>Explore our comprehensive kanji database</li>
              <li>Create custom study lists</li>
              <li>Practice with flashcards</li>
              <li>Test your knowledge with quizzes</li>
            </ul>
            <p style="margin-top: 30px;">
              <a href="${this.frontendUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Start Learning
              </a>
            </p>
            <p style="color: #666; margin-top: 40px; font-size: 14px;">
              Best regards,<br>
              The ${this.appName} Team
            </p>
          </div>
        `,
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error.stack);
      // Don't throw - welcome email is not critical
    }
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Password Changed - ${this.appName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #28a745;">Password Successfully Changed</h1>
            <p>Hi ${name || 'there'},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Security Alert:</strong> If this wasn't you, your account may be compromised.
              </p>
            </div>
            <p style="margin-top: 30px;">
              <a href="${this.frontendUrl}/auth/login" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Log In to Your Account
              </a>
            </p>
            <p style="color: #666; margin-top: 40px; font-size: 14px;">
              Best regards,<br>
              The ${this.appName} Team
            </p>
          </div>
        `,
      });

      this.logger.log(`Password changed notification sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password changed email to ${email}`, error.stack);
      // Don't throw - notification email is not critical
    }
  }
}
