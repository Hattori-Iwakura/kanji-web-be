import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ResetPasswordController } from './reset-password.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TwoFactorService } from './services/two-factor.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/services/prisma.service';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('JWT_SECRET') || 'kanji-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController, ResetPasswordController],
  providers: [AuthService, TwoFactorService, JwtStrategy, PrismaService],
  exports: [AuthService, TwoFactorService, JwtStrategy, PassportModule],
})
export class AuthModule {}

