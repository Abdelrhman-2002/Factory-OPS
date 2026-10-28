import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express, { type NextFunction, type Request, type Response } from 'express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createOpenApiDocument } from './swagger.js';

async function bootstrap() {
  // Body parsing is set up below so Better Auth can read its own raw request bodies.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const json = express.json();
  const urlencoded = express.urlencoded({ extended: true });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api/auth')) return next();
    json(req, res, (err?: unknown) => (err ? next(err) : urlencoded(req, res, next)));
  });

  // The Next.js frontend sends the session cookie cross origin.
  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // Swagger UI at /docs and the raw document at /docs/openapi.json (not in production).
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, await createOpenApiDocument(app), {
      jsonDocumentUrl: 'docs/openapi.json',
      swaggerOptions: { withCredentials: true, persistAuthorization: true },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
