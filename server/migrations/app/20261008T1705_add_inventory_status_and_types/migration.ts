#!/usr/bin/env -S node

import type { Contract as Start } from '../../snapshots/bade6b1ab66d8349d94ae1ce49a8a61c5f2ac79746cc197cb56d9c313de54397/contract';
import startContract from '../../snapshots/bade6b1ab66d8349d94ae1ce49a8a61c5f2ac79746cc197cb56d9c313de54397/contract.json' with { type: 'json' };

import type { Contract as End } from '../../snapshots/46ec20944c7d4ce2492409b443c35e1586aa4bb5b464c24a5627b8bca52a9616/contract';
import endContract from '../../snapshots/46ec20944c7d4ce2492409b443c35e1586aa4bb5b464c24a5627b8bca52a9616/contract.json' with { type: 'json' };

import {
  Migration,
  MigrationCLI,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'inventory.add-status-enum-values',
        label: 'Add new inventory movement types',
        operationClass: 'additive',
        target: { id: 'postgres' },

        precheck: [
          {
            description: 'new InventoryType values do not both exist',
            sql: `
              SELECT NOT (
                EXISTS (
                  SELECT 1
                  FROM pg_enum e
                  JOIN pg_type t ON t.oid = e.enumtypid
                  JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public'
                    AND t.typname = 'InventoryType'
                    AND e.enumlabel = 'SENT_FOR_REFILL'
                )
                AND
                EXISTS (
                  SELECT 1
                  FROM pg_enum e
                  JOIN pg_type t ON t.oid = e.enumtypid
                  JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public'
                    AND t.typname = 'InventoryType'
                    AND e.enumlabel = 'REFILL_RECEIVED'
                )
              )
            `,
          },
        ],

        execute: [
          {
            description: 'add SENT_FOR_REFILL',
            sql: `
              ALTER TYPE "public"."InventoryType"
              ADD VALUE IF NOT EXISTS 'SENT_FOR_REFILL'
              BEFORE 'ADJUSTMENT'
            `,
          },
          {
            description: 'add REFILL_RECEIVED',
            sql: `
              ALTER TYPE "public"."InventoryType"
              ADD VALUE IF NOT EXISTS 'REFILL_RECEIVED'
              BEFORE 'ADJUSTMENT'
            `,
          },
        ],

        postcheck: [
          {
            description: 'new InventoryType values exist',
            sql: `
              SELECT
                EXISTS (
                  SELECT 1
                  FROM pg_enum e
                  JOIN pg_type t ON t.oid = e.enumtypid
                  JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public'
                    AND t.typname = 'InventoryType'
                    AND e.enumlabel = 'SENT_FOR_REFILL'
                )
                AND
                EXISTS (
                  SELECT 1
                  FROM pg_enum e
                  JOIN pg_type t ON t.oid = e.enumtypid
                  JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public'
                    AND t.typname = 'InventoryType'
                    AND e.enumlabel = 'REFILL_RECEIVED'
                )
            `,
          },
        ],
      }),

      rawSql({
        id: 'inventory.add-status-column',
        label: 'Add inventory status',
        operationClass: 'additive',
        target: { id: 'postgres' },

        precheck: [
          {
            description: 'InventoryStatus and status column do not both exist',
            sql: `
              SELECT NOT (
                EXISTS (
                  SELECT 1
                  FROM pg_type t
                  JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public'
                    AND t.typname = 'InventoryStatus'
                )
                AND
                EXISTS (
                  SELECT 1
                  FROM information_schema.columns
                  WHERE table_schema = 'public'
                    AND table_name = 'inventory'
                    AND column_name = 'status'
                )
              )
            `,
          },
        ],

        execute: [
          {
            description: 'create InventoryStatus enum',
            sql: `
              CREATE TYPE "public"."InventoryStatus" AS ENUM (
                'FILLED',
                'EMPTY'
              )
            `,
          },
          {
            description: 'add status column',
            sql: `
              ALTER TABLE "public"."inventory"
              ADD COLUMN "status" "public"."InventoryStatus"
              NOT NULL
              DEFAULT 'FILLED'
            `,
          },
        ],

        postcheck: [
          {
            description: 'inventory status column exists',
            sql: `
              SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'inventory'
                  AND column_name = 'status'
              )
            `,
          },
        ],
      }),

      rawSql({
        id: 'inventory.add-status-index',
        label: 'Add inventory status index',
        operationClass: 'additive',
        target: { id: 'postgres' },

        precheck: [
          {
            description: 'inventory status index does not exist',
            sql: `
              SELECT NOT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname = 'inventory_cylinderType_status_idx'
              )
            `,
          },
        ],

        execute: [
          {
            description: 'create inventory status index',
            sql: `
              CREATE INDEX "inventory_cylinderType_status_idx"
              ON "public"."inventory" ("cylinderTypeId", "status")
            `,
          },
        ],

        postcheck: [
          {
            description: 'inventory status index exists',
            sql: `
              SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname = 'inventory_cylinderType_status_idx'
              )
            `,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);