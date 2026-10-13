#!/usr/bin/env -S node

import type { Contract as End } from "../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract";
import endContract from "../../snapshots/02c8775398bd56c23726516dbc2dfcbda5e694e11d5b3ca350b4f1048a094ec7/contract.json" with { type: "json" };

import type { Contract as Start } from "../../snapshots/70a1f26bfbc0c6aee0c2ed79546a740c779c38dff938caef4929740289e05f6a/contract";
import startContract from "../../snapshots/70a1f26bfbc0c6aee0c2ed79546a740c779c38dff938caef4929740289e05f6a/contract.json" with { type: "json" };

import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [];
  }
}

MigrationCLI.run(import.meta.url, M);