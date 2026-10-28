import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessService } from './access.service.js';
import { AccountsService } from './accounts.service.js';
import { AUTH, createAuth } from './auth.js';
import { AuthController, MeController } from './auth.controller.js';
import { AccessGuard } from './guards/access.guard.js';
import { SessionGuard } from './guards/session.guard.js';

@Global()
@Module({
  controllers: [AuthController, MeController],
  providers: [
    { provide: AUTH, useFactory: createAuth, inject: [PrismaService] },
    AccessService,
    AccountsService,
    // Order matters: the session is resolved before access rules are checked.
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [AUTH, AccessService, AccountsService],
})
export class AuthModule {}
