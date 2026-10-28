import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { AccountsService } from '../auth/accounts.service.js';
import { createAuth } from '../auth/auth.js';
import { PLATFORM_ADMIN_ROLE } from '../auth/auth.types.js';
import { PrismaClient } from '../generated/prisma/client.js';

// Signup is closed, so the first platform administrator is created from the command line:
//   ADMIN_NAME="Jane" ADMIN_EMAIL=jane@example.com ADMIN_PASSWORD=... npm run admin:create
const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (and optionally ADMIN_NAME).');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const accounts = new AccountsService(createAuth(prisma));

try {
  const user = await prisma.$transaction((tx) =>
    accounts.createCredentialUser(tx, {
      name: ADMIN_NAME ?? 'Administrator',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: PLATFORM_ADMIN_ROLE,
    }),
  );
  console.log(`Platform admin created: ${user.email} (${user.id})`);
} finally {
  await prisma.$disconnect();
}
