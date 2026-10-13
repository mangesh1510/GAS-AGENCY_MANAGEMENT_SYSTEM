#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract';
import startContract from '../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4cfc4164deac93e7d506ee25fdd7dfdc2ef1ac3a741a2b49ec6d987ac3cd5578/contract';
import endContract from '../../snapshots/4cfc4164deac93e7d506ee25fdd7dfdc2ef1ac3a741a2b49ec6d987ac3cd5578/contract.json' with { type: 'json' };
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
        typeName: 'PurchaseStatus',
        members: ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'],
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
        table: 'purchase_items',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('cylinderTypeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryStatus', '"InventoryStatus"', {
            notNull: true,
            default: lit('FILLED'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'InventoryStatus' } },
          }),
          col('lineTotal', 'numeric(65,30)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 65, scale: 30 } },
          }),
          col('purchaseId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('unitPurchasePrice', 'numeric(65,30)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 65, scale: 30 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'purchase_items_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'purchases',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('invoiceNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('purchaseDate', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('status', '"PurchaseStatus"', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PurchaseStatus' } },
          }),
          col('supplierId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('totalAmount', 'numeric(65,30)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 65, scale: 30 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'purchases_pkey' })],
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
      this.createTable({
        schema: 'public',
        table: 'suppliers',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('mobile', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'suppliers_pkey' })],
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
        table: 'purchase_items',
        index: 'purchase_items_cylinderTypeId_idx',
        columns: ['cylinderTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase_items',
        index: 'purchase_items_purchaseId_idx',
        columns: ['purchaseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchases',
        index: 'purchases_purchaseDate_idx',
        columns: ['purchaseDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchases',
        index: 'purchases_status_idx',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchases',
        index: 'purchases_supplierId_idx',
        columns: ['supplierId'],
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
      this.createIndex({
        schema: 'public',
        table: 'suppliers',
        index: 'suppliers_name_idx',
        columns: ['name'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase_items',
        foreignKey: {
          name: 'purchase_items_purchaseId_fkey',
          columns: ['purchaseId'],
          references: { schema: 'public', table: 'purchases', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase_items',
        foreignKey: {
          name: 'purchase_items_cylinderTypeId_fkey',
          columns: ['cylinderTypeId'],
          references: { schema: 'public', table: 'cylinder_types', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchases',
        foreignKey: {
          name: 'purchases_supplierId_fkey',
          columns: ['supplierId'],
          references: { schema: 'public', table: 'suppliers', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
