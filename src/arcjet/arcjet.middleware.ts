import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import arcjet, { shield, fixedWindow } from '@arcjet/node';

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  // Fingerprint each request by IP address
  characteristics: ['ip.src'],
  rules: [
    // Block common attacks: SQLi, XSS, path traversal, etc.
    shield({ mode: 'LIVE' }),
    // 60 requests per minute per IP across all routes
    fixedWindow({
      mode: 'LIVE',
      window: '1m',
      max: 60,
    }),
  ],
});

@Injectable()
export class ArcjetMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new HttpException('Too Many Requests', 429);
      }
      if (decision.reason.isShield()) {
        throw new HttpException('Forbidden', 403);
      }
      throw new HttpException('Forbidden', 403);
    }

    next();
  }
}
