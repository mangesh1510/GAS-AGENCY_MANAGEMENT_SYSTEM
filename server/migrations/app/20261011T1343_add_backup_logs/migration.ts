#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract';
import startContract from '../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ea76070dfb6725d0a12a4ca5f70ecbee4f8754716453470af829a7f6d7f110a1/contract';
import endContract from '../../snapshots/ea76070dfb6725d0a12a4ca5f70ecbee4f8754716453470af829a7f6d7f110a1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'BackupStatus',
        members: ['SUCCESS', 'FAILED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'RestoreStatus',
        members: ['SUCCESS', 'FAILED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'backup_logs',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdBy', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fileSize', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"BackupStatus"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'BackupStatus' } },
          }),
          col('targetDatabase', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'backup_logs_pkey' })],
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
      this.addColumn({
        schema: 'public',
        table: 'cylinder_types',
        column: col('lowStockThreshold', 'int4', {
          notNull: true,
          default: lit(5),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'cylinder_types',
        column: col('purchasePrice', 'numeric(65,30)', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 65, scale: 30 } },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'backup_logs',
        index: 'backup_logs_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'backup_logs',
        index: 'backup_logs_status_idx',
        columns: ['status'],
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
