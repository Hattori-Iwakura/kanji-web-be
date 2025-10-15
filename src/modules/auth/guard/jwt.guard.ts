import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string;
    const token = authHeader?.replace(/^Bearer\s+/i, '') ?? null;

    if (!token) throw new UnauthorizedException();

    const payload = await this.auth.validateAccessToken(token);
    if (!payload) throw new UnauthorizedException();

    // ensure session is valid
    const session = await this.auth.validateSessionBySid(payload.sid);
    if (!session) throw new UnauthorizedException();

    req.user = { id: payload.sub, role: payload.role };
    return true;
  }
}
