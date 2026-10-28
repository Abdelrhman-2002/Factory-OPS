import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, openAPI, organization } from 'better-auth/plugins';
import type { PrismaClient } from '../generated/prisma/client.js';

// Better Auth owns sign in, sign out and sessions (HTTP only cookies) under /api/auth.
// Signup is closed: platform admins create organizations and their owners, and
// organization admins create employee accounts (see OrganizationsService / MembersService).
export function createAuth(prisma: PrismaClient) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not set');
  }

  return betterAuth({
    appName: 'Factory OPS',
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [],
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {
        phoneNumber: { type: 'string', required: false },
      },
    },
    plugins: [
      // Platform administrators are users with role = "admin".
      admin(),
      organization({
        allowUserToCreateOrganization: false,
        disableOrganizationDeletion: true,
        schema: {
          organization: {
            additionalFields: {
              description: { type: 'string', required: false },
            },
          },
          member: {
            additionalFields: {
              roleId: { type: 'string', required: false },
              jobTitle: { type: 'string', required: false },
              department: { type: 'string', required: false },
              hiredAt: { type: 'date', required: false },
            },
          },
        },
      }),
      // Only used to merge the auth routes into our OpenAPI document (src/swagger.ts);
      // Better Auth's own reference page stays off.
      openAPI({ disableDefaultReference: true }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth['$Infer']['Session'];

export const AUTH = Symbol('AUTH');
