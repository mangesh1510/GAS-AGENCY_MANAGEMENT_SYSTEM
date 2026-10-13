#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract';
import startContract from '../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d6d1cfd065c0763443cf109e668e69368498b426253282e927583e7b9677b1ca/contract';
import endContract from '../../snapshots/d6d1cfd065c0763443cf109e668e69368498b426253282e927583e7b9677b1ca/contract.json' with { type: 'json' };
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
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
