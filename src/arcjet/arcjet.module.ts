import { Module } from '@nestjs/common';
import { ArcjetMiddleware } from './arcjet.middleware.js';

@Module({
  providers: [ArcjetMiddleware],
  exports: [ArcjetMiddleware],
})
export class ArcjetModule {}
