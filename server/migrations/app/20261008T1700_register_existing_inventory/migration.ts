#!/usr/bin/env -S node

import type { Contract as Start } from '../../snapshots/4650e7255e5d96d6b1956b3b5ff9b112104f6be247876e4fd2299272d6f165f7/contract';
import startContract from '../../snapshots/4650e7255e5d96d6b1956b3b5ff9b112104f6be247876e4fd2299272d6f165f7/contract.json' with { type: 'json' };

import type { Contract as End } from '../../snapshots/bade6b1ab66d8349d94ae1ce49a8a61c5f2ac79746cc197cb56d9c313de54397/contract';
import endContract from '../../snapshots/bade6b1ab66d8349d94ae1ce49a8a61c5f2ac79746cc197cb56d9c313de54397/contract.json' with { type: 'json' };

import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [];
  }
}

MigrationCLI.run(import.meta.url, M);