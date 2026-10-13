#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract';
import startContract from '../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bf6ba08e39585e867e613928c37b1e56729829e952704c1789861ef38799acbe/contract';
import endContract from '../../snapshots/bf6ba08e39585e867e613928c37b1e56729829e952704c1789861ef38799acbe/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
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
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
