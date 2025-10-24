// This file is not used - using jwt-auth.guard.ts with Passport strategy instead
// Commented out to avoid compilation errors

/*
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string;
    const token = authHeader?.replace(/^Bearer\s+/i, '') ?? null;

    console.log('🔑 JWT Guard - Authorization header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'MISSING');

    if (!token) {
      console.log('❌ JWT Guard - No token provided');
      throw new UnauthorizedException('No token provided');
    }

    const payload = await this.auth.validateAccessToken(token);
    if (!payload) {
      console.log('❌ JWT Guard - Invalid token');
      throw new UnauthorizedException('Invalid token');
    }

    console.log('✅ JWT Guard - Token valid, payload:', { sub: payload.sub, sid: payload.sid, role: payload.role });

    // ensure session is valid
    if (!payload.sid) {
      console.log('❌ JWT Guard - No session ID in token');
      throw new UnauthorizedException('Invalid token: missing session ID');
    }

    const session = await this.auth.validateSessionBySid(payload.sid);
    if (!session) {
      console.log('❌ JWT Guard - Session not found or expired for sid:', payload.sid);
      throw new UnauthorizedException('Session not found or expired');
    }

    console.log('✅ JWT Guard - Session valid');

    req.user = { id: payload.sub, role: payload.role };
    return true;
  }
}
*/

export {}; // Make this a module
