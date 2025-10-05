import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { TRACE_HEADER_KEYS } from 'src/shared/constants/request-header';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction) {

    const requestId = req.headers[TRACE_HEADER_KEYS.REQUEST_ID] as string || randomUUID();

    req.requestId = requestId;

    res.setHeader(TRACE_HEADER_KEYS.REQUEST_ID, requestId);

    req.headers[TRACE_HEADER_KEYS.REQUEST_ID] = requestId;

    next();
  }
}
