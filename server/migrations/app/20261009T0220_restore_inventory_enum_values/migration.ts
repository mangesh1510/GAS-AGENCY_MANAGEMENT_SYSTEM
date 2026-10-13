#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/70a1f26bfbc0c6aee0c2ed79546a740c779c38dff938caef4929740289e05f6a/contract';
import endContract from '../../snapshots/70a1f26bfbc0c6aee0c2ed79546a740c779c38dff938caef4929740289e05f6a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/bade6b1ab66d8349d94ae1ce49a8a61c5f2ac79746cc197cb56d9c313de54397/contract';
import startContract from '../../snapshots/bade6b1ab66d8349d94ae1ce49a8a61c5f2ac79746cc197cb56d9c313de54397/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [];
  }
}

MigrationCLI.run(import.meta.url, M);
