import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../shared/mail/mail.service';
import { TwoFactorService } from './services/two-factor.service';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock bcryptjs
jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let mailService: MailService;
  let twoFactorService: TwoFactorService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (operations) => {
      if (typeof operations === 'function') {
        return operations(mockPrismaService);
      }
      return Promise.all(operations);
    }),
  };

  const mockJwtService = {
    sign: jest.fn(() => 'mock-jwt-token'),
  };

  const mockMailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockTwoFactorService = {
    is2FAEnabled: jest.fn(),
    verify2FACode: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    name: 'Test User',
    role: 'USER',
    profileImage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    mailService = module.get<MailService>(MailService);
    twoFactorService = module.get<TwoFactorService>(TwoFactorService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'Password123!';
      const name = 'New User';

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email,
        name,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.register(email, password, name);

      expect(result.user.email).toBe(email);
      expect(result).toHaveProperty('accessToken');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email,
          passwordHash: 'hashedPassword',
          name,
          role: 'USER',
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register('existing@example.com', 'Password123!'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login with correct credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTwoFactorService.is2FAEnabled.mockResolvedValue(false);

      const result = await service.login('test@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe(mockUser.email);
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('invalid@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should require 2FA code when 2FA is enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTwoFactorService.is2FAEnabled.mockResolvedValue(true);

      const result = await service.login('test@example.com', 'password123');

      expect(result.requires2FA).toBe(true);
      expect(result.message).toBe('2FA code required');
    });

    it('should verify 2FA code when provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTwoFactorService.is2FAEnabled.mockResolvedValue(true);
      mockTwoFactorService.verify2FACode.mockResolvedValue(true);

      const result = await service.login('test@example.com', 'password123', '123456');

      expect(result.user).toBeDefined();
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateData = { name: 'Updated Name' };
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateData,
      });

      const result = await service.updateProfile(mockUser.id, updateData);

      expect(result.name).toBe(updateData.name);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: updateData,
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPassword123!';
      const hashedToken = 'hashed-token';

      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 1,
        userId: mockUser.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
        user: mockUser,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.passwordResetToken.update.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      const result = await service.resetPassword(token, newPassword);

      expect(result.message).toBe('Password reset successful');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockMailService.sendPasswordChangedEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

      await expect(
        service.resetPassword('invalid-token', 'NewPassword123!'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
