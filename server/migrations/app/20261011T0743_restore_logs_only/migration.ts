#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/bf6ba08e39585e867e613928c37b1e56729829e952704c1789861ef38799acbe/contract';
import startContract from '../../snapshots/bf6ba08e39585e867e613928c37b1e56729829e952704c1789861ef38799acbe/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c856249c8e91cc3d05085f782915212f215158c80496bc8afd3e6d15d6c0a22d/contract';
import endContract from '../../snapshots/c856249c8e91cc3d05085f782915212f215158c80496bc8afd3e6d15d6c0a22d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'RestoreStatus',
        members: ['SUCCESS', 'FAILED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'restore_logs',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('restoredBy', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', '"RestoreStatus"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'RestoreStatus' } },
          }),
          col('targetDatabase', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'restore_logs_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restore_logs',
        index: 'restore_logs_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restore_logs',
        index: 'restore_logs_status_idx',
        columns: ['status'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
