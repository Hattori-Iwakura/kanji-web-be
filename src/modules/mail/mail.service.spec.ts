import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../../shared/mail/mail.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

describe('MailService', () => {
  let service: MailService;
  let mailerService: MailerService;
  let configService: ConfigService;

  const mockMailerService = {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        APP_URL: 'http://localhost:3000',
        APP_NAME: 'Kanji Learning App',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get<MailerService>(MailerService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const userEmail = 'newuser@example.com';
      const userName = 'Test User';

      await service.sendWelcomeEmail(userEmail, userName);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userEmail,
          subject: expect.stringContaining('Welcome'),
          html: expect.stringContaining(userName),
        }),
      );
    });

    it('should not throw on email sending failure', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

      // Should not throw - welcome email is not critical
      await expect(
        service.sendWelcomeEmail('user@example.com', 'User'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with token', async () => {
      const userEmail = 'user@example.com';
      const userName = 'Test User';
      const resetToken = 'reset-token-123';

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.sendPasswordResetEmail(userEmail, userName, resetToken);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userEmail,
          subject: expect.stringContaining('Password Reset'),
          template: './password-reset',
          context: expect.objectContaining({
            name: userName,
            token: resetToken,
          }),
        }),
      );
    });

    it('should include reset URL in email', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });
      
      await service.sendPasswordResetEmail('user@example.com', 'User', 'token123');

      const emailCall = mockMailerService.sendMail.mock.calls[0][0];
      expect(emailCall.context.resetUrl).toContain('http://localhost:3000');
      expect(emailCall.context.resetUrl).toContain('token123');
    });

    it('should throw error on failure', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendPasswordResetEmail('user@example.com', 'User', 'token'),
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('sendPasswordChangedEmail', () => {
    it('should send password changed confirmation', async () => {
      const userEmail = 'user@example.com';
      const userName = 'Test User';

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.sendPasswordChangedEmail(userEmail, userName);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userEmail,
          subject: expect.stringContaining('Password Changed'),
          html: expect.stringContaining(userName),
        }),
      );
    });

    it('should include security warning', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });
      
      await service.sendPasswordChangedEmail('user@example.com', 'User');

      const emailCall = mockMailerService.sendMail.mock.calls[0][0];
      expect(emailCall.html).toMatch(/security|compromised/i);
    });

    it('should not throw on failure', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

      // Should not throw - notification email is not critical
      await expect(
        service.sendPasswordChangedEmail('user@example.com', 'User'),
      ).resolves.not.toThrow();
    });
  });

  describe('send2FAOtpEmail', () => {
    it('should send 2FA OTP email', async () => {
      const userEmail = 'user@example.com';
      const userName = 'Test User';
      const otp = '123456';

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.send2FAOtpEmail(userEmail, userName, otp);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userEmail,
          subject: expect.stringContaining('Two-Factor Authentication'),
          template: './2fa-otp',
          context: expect.objectContaining({
            name: userName,
            otp: otp,
          }),
        }),
      );
    });

    it('should throw error on failure', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.send2FAOtpEmail('user@example.com', 'User', '123456'),
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('Configuration', () => {
    it('should use configured APP_URL', async () => {
      await service.sendWelcomeEmail('user@example.com', 'User');

      const emailCall = mockMailerService.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('http://localhost:3000');
    });

    it('should use configured APP_NAME', async () => {
      await service.sendWelcomeEmail('user@example.com', 'User');

      const emailCall = mockMailerService.sendMail.mock.calls[0][0];
      expect(emailCall.subject).toContain('Kanji Learning App');
    });
  });
});
