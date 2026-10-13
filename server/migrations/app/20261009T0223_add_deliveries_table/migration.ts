#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/46ec20944c7d4ce2492409b443c35e1586aa4bb5b464c24a5627b8bca52a9616/contract';
import startContract from '../../snapshots/46ec20944c7d4ce2492409b443c35e1586aa4bb5b464c24a5627b8bca52a9616/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/70a1f26bfbc0c6aee0c2ed79546a740c779c38dff938caef4929740289e05f6a/contract';
import endContract from '../../snapshots/70a1f26bfbc0c6aee0c2ed79546a740c779c38dff938caef4929740289e05f6a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'deliveries',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdBy', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('customerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('cylinderTypeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('deliveryDate', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('totalAmount', 'numeric(65,30)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 65, scale: 30 } },
          }),
          col('unitPrice', 'numeric(65,30)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 65, scale: 30 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'deliveries_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'deliveries',
        index: 'deliveries_createdBy_idx_ba0f792f',
        columns: ['createdBy'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'deliveries',
        index: 'deliveries_customerId_idx',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'deliveries',
        index: 'deliveries_cylinderTypeId_idx',
        columns: ['cylinderTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'deliveries',
        index: 'deliveries_deliveryDate_idx',
        columns: ['deliveryDate'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'deliveries',
        foreignKey: {
          name: 'deliveries_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'customers', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'deliveries',
        foreignKey: {
          name: 'deliveries_cylinderTypeId_fkey',
          columns: ['cylinderTypeId'],
          references: { schema: 'public', table: 'cylinder_types', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'deliveries',
        foreignKey: {
          name: 'deliveries_createdBy_fkey',
          columns: ['createdBy'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
