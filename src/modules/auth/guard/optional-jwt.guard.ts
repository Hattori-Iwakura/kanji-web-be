import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * Optional JWT Guard - allows requests with or without authentication
 * If token is present and valid, req.user will be populated
 * If token is missing or invalid, req.user will be undefined and request continues
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string;
    const token = authHeader?.replace(/^Bearer\s+/i, '') ?? null;

    if (!token) {
      // No token provided - allow request to continue without user info
      return true;
    }

    try {
      const payload = await this.auth.validateAccessToken(token);
      if (!payload) {
        // Invalid token - allow request but no user info
        return true;
      }

      // Ensure session is valid
      const session = await this.auth.validateSessionBySid(payload.sid);
      if (!session) {
        // Session expired - allow request but no user info
        return true;
      }

      // Valid token and session - populate user info
      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch (error) {
      // Any error during validation - allow request but no user info
      return true;
    }
  }
}
