import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ArcjetModule } from './arcjet/arcjet.module.js';
import { ArcjetMiddleware } from './arcjet/arcjet.middleware.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [ArcjetModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ArcjetMiddleware).forRoutes('*');
  }
}
