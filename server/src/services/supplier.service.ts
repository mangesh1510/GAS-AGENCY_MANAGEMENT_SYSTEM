
import prisma from "../config/prisma.js";

export const getSuppliers = async () => {
  return await prisma.orm.public.Suppliers.all();
};

export const getSupplierById = async (id: number) => {
  const suppliers = await prisma.orm.public.Suppliers
    .where({ id })
    .all();

  return suppliers[0] ?? null;
};

export const createSupplier = async (data: {
  name: string;
  mobile?: string;
  address?: string;
}) => {
  const runtime = prisma.runtime();
  const now = new Date().toISOString();

  const plan = prisma.sql.public.suppliers
    .insert([
      {
        name: data.name.trim(),
        mobile: data.mobile?.trim() || null,
        address: data.address?.trim() || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .returning(
      "id",
      "name",
      "mobile",
      "address",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    .build();

  const result = await runtime.query(plan);
  return result[0];
};

export const updateSupplier = async (
  id: number,
  data: {
    name?: string;
    mobile?: string;
    address?: string;
    isActive?: boolean;
  }
) => {
  const runtime = prisma.runtime();

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    updates.name = data.name.trim();
  }

  if (data.mobile !== undefined) {
    updates.mobile = data.mobile.trim() || null;
  }

  if (data.address !== undefined) {
    updates.address = data.address.trim() || null;
  }

  if (data.isActive !== undefined) {
    updates.isActive = data.isActive;
  }

  const plan = prisma.sql.public.suppliers
    .update(updates as any)
    .where((f, fns) => fns.eq(f.id, id))
    .returning(
      "id",
      "name",
      "mobile",
      "address",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    .build();

  const result = await runtime.query(plan);
  return result[0] ?? null;
};
