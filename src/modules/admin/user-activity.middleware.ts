import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DbClient } from '../db_client/db_client.service';

@Injectable()
export class UserActivityMiddleware implements NestMiddleware {
  constructor(private readonly prisma: DbClient) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Get user from request (set by auth guard)
    const user = (req as any).user;
    
    if (user && user.userId) {
      try {
        // Update last_active_at asynchronously without blocking request
        this.prisma.users.update({
          where: { id: user.userId },
          data: { last_active_at: new Date() }
        }).catch(err => {
          // Log error but don't block request
          console.error('Error updating user activity:', err);
        });
      } catch (error) {
        // Silently fail - don't block the request
      }
    }
    
    next();
  }
}
