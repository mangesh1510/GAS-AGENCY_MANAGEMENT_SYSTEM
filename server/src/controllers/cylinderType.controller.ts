
import prisma from "../config/prisma.js";

export const getCylinderTypes = async () => {
  return await prisma.orm.public.CylinderTypes.all();
};

export const getCylinderTypeById = async (id: number) => {
  const cylinderTypes = await prisma.orm.public.CylinderTypes
    .where({ id })
    .all();

  return cylinderTypes[0] ?? null;
};

export const createCylinderType = async (data: {
  name: string;
  capacityKg: number;
  sellingPrice: number;
  purchasePrice: number;
  lowStockThreshold?: number;
}) => {
  const runtime = prisma.runtime();

  const plan = prisma.sql.public.cylinder_types
    .insert([
      {
        name: data.name,
        capacityKg: String(data.capacityKg),
        sellingPrice: String(data.sellingPrice),
        purchasePrice: String(data.purchasePrice),
        lowStockThreshold: data.lowStockThreshold ?? 5,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .returning(
      "id",
      "name",
      "capacityKg",
      "sellingPrice",
      "purchasePrice",
      "lowStockThreshold",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    .build();

  const result = await runtime.query(plan);
  return result[0];
};

export const updateCylinderType = async (
  id: number,
  data: {
    name?: string;
    capacityKg?: number;
    sellingPrice?: number;
    purchasePrice?: number;
    lowStockThreshold?: number;
  }
) => {
  const runtime = prisma.runtime();

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.capacityKg !== undefined) {
    updates.capacityKg = String(data.capacityKg);
  }

  if (data.sellingPrice !== undefined) {
    updates.sellingPrice = String(data.sellingPrice);
  }

  if (data.purchasePrice !== undefined) {
    updates.purchasePrice = String(data.purchasePrice);
  }

  if (data.lowStockThreshold !== undefined) {
    updates.lowStockThreshold = data.lowStockThreshold;
  }

  const plan = prisma.sql.public.cylinder_types
    .update(updates as any)
    .where((f, fns) => fns.eq(f.id, id))
    .returning(
      "id",
      "name",
      "capacityKg",
      "sellingPrice",
      "purchasePrice",
      "lowStockThreshold",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    .build();

  const result = await runtime.query(plan);
  return result[0] ?? null;
};

export const deleteCylinderType = async (id: number) => {
  const runtime = prisma.runtime();

  const plan = prisma.sql.public.cylinder_types
    .delete()
    .where((f, fns) => fns.eq(f.id, id))
    .returning("id")
    .build();

  const result = await runtime.query(plan);
  return result[0] ?? null;
};