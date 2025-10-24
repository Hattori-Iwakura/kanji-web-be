import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Only log for auth/register endpoint
    if (req.path.includes('/auth/register')) {
      console.log('🔍 [REQUEST LOGGER]');
      console.log('Method:', req.method);
      console.log('Path:', req.path);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Body:', JSON.stringify(req.body, null, 2));
      console.log('Content-Type:', req.get('content-type'));
    }
    next();
  }
}
