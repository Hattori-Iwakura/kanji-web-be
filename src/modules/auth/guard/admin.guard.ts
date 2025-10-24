import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('🔒 AdminGuard - User:', user);

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== 'ADMIN') {
      console.log('❌ AdminGuard - Access denied. User role:', user.role);
      throw new ForbiddenException('Admin access required');
    }

    console.log('✅ AdminGuard - Access granted');
    return true;
  }
}
