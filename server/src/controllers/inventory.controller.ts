import prisma from "../config/prisma.js";

export const getInventory = async () => {
  return await prisma.orm.public.Inventory.all();
};

export const getInventoryById = async (id: number) => {
  const inventory = await prisma.orm.public.Inventory
    .where({
      id,
    })
    .all();

  return inventory[0] ?? null;
};

export const getCurrentStock = async (cylinderTypeId: number) => {
  const movements = await prisma.orm.public.Inventory
    .where({
      cylinderTypeId,
    })
    .all();

  let filledStock = 0;
  let emptyStock = 0;

  for (const movement of movements) {
    switch (movement.type) {
      case "OPENING":
      case "RECEIVED":
      case "REFILL_RECEIVED":
        if (movement.status === "FILLED") {
          filledStock += movement.quantity;
        } else {
          emptyStock += movement.quantity;
        }
        break;

      case "SOLD":
        if (movement.status === "FILLED") {
          filledStock -= movement.quantity;
        } else {
          emptyStock -= movement.quantity;
        }
        break;

      case "EMPTY_RETURNED":
        emptyStock += movement.quantity;
        break;

      case "SENT_FOR_REFILL":
        emptyStock -= movement.quantity;
        break;

      case "ADJUSTMENT":
        if (movement.status === "FILLED") {
          filledStock += movement.quantity;
        } else {
          emptyStock += movement.quantity;
        }
        break;
    }
  }

  return {
    cylinderTypeId,
    filledStock,
    emptyStock,
  };
};

export const createInventory = async (data: {
  cylinderTypeId: number;
  quantity: number;
  type:
    | "OPENING"
    | "RECEIVED"
    | "SOLD"
    | "EMPTY_RETURNED"
    | "SENT_FOR_REFILL"
    | "REFILL_RECEIVED"
    | "ADJUSTMENT";
  status: "FILLED" | "EMPTY";
  note?: string;
}) => {
  const runtime = prisma.runtime();

  const plan = prisma.sql.public.inventory
    .insert([
      {
        cylinderTypeId: data.cylinderTypeId,
        quantity: data.quantity,
        type: data.type,
        status: data.status,
        note: data.note ?? null,
        createdAt: new Date().toISOString(),
      },
    ])
    .returning(
      "id",
      "cylinderTypeId",
      "quantity",
      "type",
      "status",
      "note",
      "createdAt"
    )
    .build();

  const result = await runtime.query(plan);

  return result[0];
};

export const updateInventory = async (
  id: number,
  data: {
    note?: string;
  }
) => {
  const runtime = prisma.runtime();

  const plan = prisma.sql.public.inventory
    .update({
      note: data.note ?? null,
    })
    .where((f, fns) => fns.eq(f.id, id))
    .returning(
      "id",
      "cylinderTypeId",
      "quantity",
      "type",
      "status",
      "note",
      "createdAt"
    )
    .build();

  const result = await runtime.query(plan);

  return result[0] ?? null;
};

export const deleteInventory = async (id: number) => {
  const runtime = prisma.runtime();

  const plan = prisma.sql.public.inventory
    .delete()
    .where((f, fns) => fns.eq(f.id, id))
    .returning("id")
    .build();

  const result = await runtime.query(plan);

  return result[0] ?? null;
};


export const getLowStockAlerts = async (threshold?: number) => {
  const cylinderTypes = await prisma.orm.public.CylinderTypes.all();

  const alerts = [];

  for (const cylinderType of cylinderTypes) {
    if (!cylinderType.isActive) continue;

    const stock = await getCurrentStock(cylinderType.id);

    // Use the cylinder's configured threshold.
    // Fall back to the API threshold if explicitly supplied.
    const lowStockThreshold =
      threshold ?? cylinderType.lowStockThreshold ?? 5;

    if (stock.filledStock <= lowStockThreshold) {
      alerts.push({
        cylinderTypeId: cylinderType.id,
        cylinderTypeName: cylinderType.name,
        capacityKg: cylinderType.capacityKg,
        filledStock: stock.filledStock,
        threshold: lowStockThreshold,
        status:
          stock.filledStock <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
      });
    }
  }

  return alerts;
};

