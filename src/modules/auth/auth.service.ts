import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { DbClient } from '../db_client/db_client.service';
import { randomToken, hashToken, verifyPassword, hashPassword } from '../../utils/hash.util';
import { JwtService } from '@nestjs/jwt';
import { add } from 'date-fns/add';
import { ErrorCode } from 'src/shared/error';

@Injectable()
export class AuthService {
  constructor(private readonly db: DbClient, private readonly jwtService: JwtService) {}

  async register(account: string, email: string, password: string) {
    // Check if account already exists
    const existingUser = await this.db.users.findFirst({
      where: {
        OR: [
          { account },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.account === account) {
        throw new ConflictException('Tên tài khoản đã được sử dụng');
      }
      if (existingUser.email === email) {
        throw new ConflictException('Email đã được sử dụng');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = await this.db.users.create({
      data: {
        account,
        email,
        hash_password: hashedPassword,
        role: 'USER',
        is_active: true,
        is_first_login: true,
        create_at: new Date(),
        update_at: new Date(),
      }
    });

    return {
      id: newUser.id,
      account: newUser.account,
      email: newUser.email,
      role: newUser.role,
    };
  }

  async login(account: string, password: string, ip?: string, ua?: string) {
    const user = await this.db.users.findFirst({
      where: {
        OR: [
          { account: account },
        ]
      }
    });
    if (!user) throw new UnauthorizedException(ErrorCode.Unauthorized);

    const ok = await verifyPassword(password, user.hash_password);
    if (!ok) throw new UnauthorizedException(ErrorCode.Unauthorized);

    // create session + refresh token
    const sessionId = randomToken(32);
    const refreshPlain = randomToken(64);
    const refreshHash = hashToken(refreshPlain);
    const expiresAt = add(new Date(), { days: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30) });

    await this.db.userSession.create({
      data: {
        sessionId,
        userId: user.id,
        refreshTokenHash: refreshHash,
        ip,
        userAgent: ua,
        expiresAt,
      }
    });

    const payload = { sub: user.id, sid: sessionId, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return { 
      accessToken,
      refreshToken: refreshPlain,
      sessionId,
      user: { 
        id: user.id,
        account: user.account,
        email: user.email,
        profile_image: user.profile_image,
        is_first_login: user.is_first_login,
        create_at: user.create_at,
        role: user.role 
      }, 
      expiresAt 
    };
  }

  async validateAccessToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload as { sub: number; sid: string; role: string; iat?: number; exp?: number };
    } catch {
      return null;
    }
  }

  async validateSessionBySid(sid: string) {
    if (!sid) return null;
    const s = await this.db.userSession.findUnique({ where: { sessionId: sid }, include: { user: true }});
    if (!s || s.revoked) return null;
    if (s.expiresAt < new Date()) return null;
    return s;
  }

  async refresh(sessionId: string, refreshToken: string) {
    const session = await this.db.userSession.findUnique({ where: { sessionId }, include: { user: true }});
    if (!session || session.revoked) throw new UnauthorizedException();

    const incomingHash = hashToken(refreshToken);
    if (incomingHash !== session.refreshTokenHash) {
      // compromise -> revoke all user's sessions
      await this.db.userSession.updateMany({ where: { userId: session.userId }, data: { revoked: true }});
      throw new UnauthorizedException('Refresh token invalid; sessions revoked.');
    }

    // rotate refresh token
    const newRefresh = randomToken(64);
    const newHash = hashToken(newRefresh);
    const newExpires = add(new Date(), { days: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30) });

    await this.db.userSession.update({
      where: { id: session.id },
      data: { 
        refreshTokenHash: newHash,
        expiresAt: newExpires,
        lastActiveAt: new Date() }
    });

    const payload = { 
      sub: session.userId,
      sid: session.sessionId,
      role: session.user.role 
    };

    const newAccess = await this.jwtService.signAsync(payload);

    return { 
      accessToken: newAccess,
      refreshToken: newRefresh,
      expiresAt: newExpires 
    };
  }

  async logout(sessionId: string) {
    await this.db.userSession.updateMany(
      { where: { sessionId }, data: { revoked: true }}
    );
  }
}
