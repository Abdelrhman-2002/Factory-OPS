import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PermissionAction, PermissionResource } from '../src/generated/prisma/enums.js';

// Seeds the global permission catalogue: one row per resource x BREAD action.
// Safe to run again; existing rows are left as they are.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ACTION_VERBS: Record<PermissionAction, string> = {
  BROWSE: 'List',
  READ: 'View',
  EDIT: 'Edit',
  ADD: 'Create',
  DELETE: 'Delete',
};

async function main() {
  const rows = Object.values(PermissionResource).flatMap((resource) =>
    Object.values(PermissionAction).map((action) => ({
      resource,
      action,
      name: `${resource.toLowerCase()}:${action.toLowerCase()}`,
      description: `${ACTION_VERBS[action]} ${resource.toLowerCase().replace('_', ' ')}`,
    })),
  );

  const { count } = await prisma.permission.createMany({ data: rows, skipDuplicates: true });
  console.log(`Permissions: ${count} added, ${rows.length - count} already present`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
