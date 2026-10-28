import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import arcjet, { shield, fixedWindow, slidingWindow } from '@arcjet/node';

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

// Sign in gets a much tighter limit to slow down password guessing.
const signInAj = aj.withRule(
  slidingWindow({
    mode: 'LIVE',
    interval: '10m',
    max: 10,
  }),
);

@Injectable()
export class ArcjetMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const client = req.originalUrl.startsWith('/api/auth/sign-in') ? signInAj : aj;
    const decision = await client.protect(req);

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
