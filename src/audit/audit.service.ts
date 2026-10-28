import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuditAction } from '../generated/prisma/enums.js';

export interface AuditEntry {
  organizationId?: string | null;
  authorId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changeDescription: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  // Takes the caller's transaction so the log row commits or rolls back with the change.
  log(tx: Prisma.TransactionClient, entry: AuditEntry) {
    return tx.auditLog.create({ data: entry });
  }
}
