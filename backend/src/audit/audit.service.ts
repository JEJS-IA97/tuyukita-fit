import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type AuditEntry = {
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
};

@Injectable()
export class AuditService {
  record(tx: Prisma.TransactionClient, entry: AuditEntry) {
    return tx.auditLog.create({
      data: {
        userId: entry.userId,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        oldValue: entry.oldValue as Prisma.InputJsonValue | undefined,
        newValue: entry.newValue as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
