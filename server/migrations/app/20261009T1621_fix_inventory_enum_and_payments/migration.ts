#!/usr/bin/env -S node

import type { Contract as Start } from "../../snapshots/bade6b1ab66d8349d94ae1ce49a8a61c5f2ac79746cc197cb56d9c313de54397/contract";

import startContract from "../../snapshots/bade6b1ab66d8349d94ae1ce49a8a61c5f2ac79746cc197cb56d9c313de54397/contract.json" with { type: "json" };

import type { Contract as End } from "../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract";

import endContract from "../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract.json" with { type: "json" };

import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    // TODO: Add operations using the supported Prisma 8 migration API.
    // Do not leave this empty and assume the database schema will update.
    return [];
  }
}

MigrationCLI.run(import.meta.url, M);