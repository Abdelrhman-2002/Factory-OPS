import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { AUTH, type Auth } from './auth.js';

export interface NewAccount {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  // Platform role (admin plugin). Leave unset for normal users.
  role?: string;
}

// Creates email + password users the same way Better Auth's signup would
// (user row + "credential" account with a hashed password), but inside the
// caller's transaction so the user and their membership are created together.
@Injectable()
export class AccountsService {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  async createCredentialUser(tx: Prisma.TransactionClient, account: NewAccount) {
    const email = account.email.trim().toLowerCase();
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const ctx = await this.auth.$context;
    const passwordHash = await ctx.password.hash(account.password);

    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        name: account.name,
        email,
        emailVerified: true,
        phoneNumber: account.phoneNumber,
        role: account.role ?? 'user',
      },
    });

    await tx.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: passwordHash,
      },
    });

    return user;
  }
}
