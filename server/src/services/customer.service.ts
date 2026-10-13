
import prisma from "../config/prisma.js";

// Get all customers
export const getCustomers = async () => {
  return await prisma.orm.public.Customers.all();
};

// Get customer by ID
export const getCustomerById = async (id: number) => {
  const customers = await prisma.orm.public.Customers
    .where({ id })
    .all();

  return customers[0] ?? null;
};

// Create customer
export const createCustomer = async (data: {
  name: string;
  mobile: string;
  address?: string;
  openingBalance?: number;
}) => {
  const runtime = prisma.runtime();
  const now = new Date().toISOString();

  const plan = prisma.sql.public.customers
    .insert([
      {
        name: data.name.trim(),
        mobile: data.mobile.trim(),
        address: data.address?.trim() || null,
        openingBalance: String(data.openingBalance ?? 0),
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
      "openingBalance",
      "isActive",
      "createdAt",
      "updatedAt",
    )
    .build();

  const result = await runtime.query(plan);
  return result[0] ?? null;
};

// Update customer
export const updateCustomer = async (
  id: number,
  data: {
    name: string;
    mobile: string;
    address?: string;
    openingBalance?: number;
  },
) => {
  const runtime = prisma.runtime();

  const plan = prisma.sql.public.customers
    .update({
      name: data.name.trim(),
      mobile: data.mobile.trim(),
      address: data.address?.trim() || null,
      openingBalance: String(data.openingBalance ?? 0),
      updatedAt: new Date().toISOString(),
    })
    .where((f, fns) => fns.eq(f.id, id))
    .returning(
      "id",
      "name",
      "mobile",
      "address",
      "openingBalance",
      "isActive",
      "createdAt",
      "updatedAt",
    )
    .build();

  const result = await runtime.query(plan);
  return result[0] ?? null;
};

// Delete customer
export const deleteCustomer = async (id: number) => {
  const runtime = prisma.runtime();

  const plan = prisma.sql.public.customers
    .delete()
    .where((f, fns) => fns.eq(f.id, id))
    .returning("id")
    .build();

  const result = await runtime.query(plan);
  return result[0] ?? null;
};
