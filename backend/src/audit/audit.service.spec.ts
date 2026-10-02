import { AuditService } from './audit.service';

describe('AuditService record (RF-022)', () => {
  it('writes the audit entry with the given transaction client', async () => {
    const service = new AuditService();
    const tx = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    } as any;

    const result = await service.record(tx, {
      userId: 'user-1',
      entity: 'expense',
      entityId: 'exp-1',
      action: 'ANULAR',
      oldValue: { isActive: true },
      newValue: { isActive: false },
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        entity: 'expense',
        entityId: 'exp-1',
        action: 'ANULAR',
        oldValue: { isActive: true },
        newValue: { isActive: false },
      },
    });
    expect(result).toEqual({ id: 'log-1' });
  });

  it('omits old and new values when they are not provided', async () => {
    const service = new AuditService();
    const tx = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-2' }),
      },
    } as any;

    await service.record(tx, {
      userId: 'user-2',
      entity: 'inventory_movement',
      entityId: 'mov-1',
      action: 'DELETE',
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-2',
        entity: 'inventory_movement',
        entityId: 'mov-1',
        action: 'DELETE',
        oldValue: undefined,
        newValue: undefined,
      },
    });
  });
});
