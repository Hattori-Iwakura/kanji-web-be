import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbClient } from '../db_client/db_client.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: cs.get<string>('JWT_ACCESS_EXPIRES_IN') as import('@nestjs/jwt').JwtSignOptions['expiresIn'] || '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, DbClient],
  exports: [AuthService],
})
export class AuthModule {}
