
import prisma from "../config/prisma.js";

type CreatePurchaseItem = {
  cylinderTypeId: number;
  quantity: number;
  inventoryStatus?: "FILLED" | "EMPTY";
  unitPurchasePrice: number;
};

type CreatePurchaseData = {
  supplierId: number;
  invoiceNumber?: string;
  purchaseDate?: string;
  note?: string;
  items: CreatePurchaseItem[];
};

const validatePurchaseData = (data: CreatePurchaseData) => {
  if (
    !Number.isInteger(data.supplierId) ||
    data.supplierId <= 0 ||
    !Array.isArray(data.items) ||
    data.items.length === 0
  ) {
    throw new Error("INVALID_PURCHASE_DATA");
  }

  for (const item of data.items) {
    if (
      !Number.isInteger(item.cylinderTypeId) ||
      item.cylinderTypeId <= 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.unitPurchasePrice) ||
      item.unitPurchasePrice < 0 ||
      (item.inventoryStatus !== undefined &&
        !["FILLED", "EMPTY"].includes(item.inventoryStatus))
    ) {
      throw new Error("INVALID_PURCHASE_ITEM");
    }
  }
};

export const getPurchases = async () => {
  return await prisma.orm.public.Purchases.all();
};

export const getPurchaseById = async (id: number) => {
  const purchases = await prisma.orm.public.Purchases
    .where({ id })
    .all();

  return purchases[0] ?? null;
};

export const createPurchase = async (data: CreatePurchaseData) => {
  validatePurchaseData(data);

  return prisma.transaction(async (tx) => {
    const suppliers = await tx.orm.public.Suppliers
      .where({ id: data.supplierId })
      .all();

    if (suppliers.length === 0 || !suppliers[0].isActive) {
      throw new Error("SUPPLIER_NOT_FOUND");
    }

    let totalAmount = 0;

    for (const item of data.items) {
      const cylinderTypes = await tx.orm.public.CylinderTypes
        .where({ id: item.cylinderTypeId })
        .all();

      if (cylinderTypes.length === 0) {
        throw new Error("CYLINDER_TYPE_NOT_FOUND");
      }

      totalAmount += item.quantity * item.unitPurchasePrice;
    }

    const now = new Date().toISOString();

    const purchasePlan = tx.sql.public.purchases
      .insert([
        {
          supplierId: data.supplierId,
          invoiceNumber: data.invoiceNumber?.trim() || null,
          purchaseDate: data.purchaseDate ?? now,
          totalAmount: totalAmount.toFixed(2),
          status: "DRAFT",
          note: data.note?.trim() || null,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning(
        "id",
        "supplierId",
        "invoiceNumber",
        "purchaseDate",
        "totalAmount",
        "status",
        "note",
        "createdAt",
        "updatedAt"
      )
      .build();

    const purchaseRows = await tx.query(purchasePlan);
    const purchase = purchaseRows[0];

    if (!purchase) {
      throw new Error("PURCHASE_CREATION_FAILED");
    }

    for (const item of data.items) {
      const lineTotal = (
        item.quantity * item.unitPurchasePrice
      ).toFixed(2);

      const itemPlan = tx.sql.public.purchase_items
        .insert([
          {
            purchaseId: purchase.id,
            cylinderTypeId: item.cylinderTypeId,
            quantity: item.quantity,
            inventoryStatus: item.inventoryStatus ?? "FILLED",
            unitPurchasePrice: item.unitPurchasePrice.toFixed(2),
            lineTotal,
            createdAt: now,
          },
        ])
        .returning("id")
        .build();

      await tx.query(itemPlan);
    }

    return purchase;
  });
};

export const receivePurchase = async (id: number) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("INVALID_PURCHASE_ID");
  }

  return prisma.transaction(async (tx) => {
    // 1. Find the purchase.
    const purchases = await tx.orm.public.Purchases
      .where({ id })
      .all();

    const purchase = purchases[0];

    if (!purchase) {
      throw new Error("PURCHASE_NOT_FOUND");
    }

    // 2. Prevent receiving the same purchase twice.
    if (purchase.status === "RECEIVED") {
      throw new Error("PURCHASE_ALREADY_RECEIVED");
    }

    if (
      purchase.status === "CANCELLED"
    ) {
      throw new Error("PURCHASE_CANCELLED");
    }

    // 3. Find all purchase items.
    const items = await tx.orm.public.PurchaseItems
      .where({ purchaseId: id })
      .all();

    if (items.length === 0) {
      throw new Error("PURCHASE_HAS_NO_ITEMS");
    }

    const now = new Date().toISOString();

    // 4. Create inventory movements for every item.
    for (const item of items) {
      const inventoryPlan = tx.sql.public.inventory
        .insert([
          {
            cylinderTypeId: item.cylinderTypeId,
            quantity: item.quantity,
            type: "RECEIVED",
            status: item.inventoryStatus,
            note: `Purchase #${id}`,
            createdAt: now,
          },
        ])
        .returning("id")
        .build();

      await tx.query(inventoryPlan);
    }

    // 5. Mark the purchase as received.
    const updatePlan = tx.sql.public.purchases
      .update({
        status: "RECEIVED",
        updatedAt: now,
      })
      .where((fields, operators) =>
        operators.eq(fields.id, id)
      )
      .returning(
        "id",
        "supplierId",
        "invoiceNumber",
        "purchaseDate",
        "totalAmount",
        "status",
        "note",
        "createdAt",
        "updatedAt"
      )
      .build();

    const updatedRows = await tx.query(updatePlan);
    const updatedPurchase = updatedRows[0];

    if (!updatedPurchase) {
      throw new Error("PURCHASE_UPDATE_FAILED");
    }

    return updatedPurchase;
  });
};

export const cancelPurchase = async (id: number) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("INVALID_PURCHASE_ID");
  }

  return prisma.transaction(async (tx) => {
    const purchases = await tx.orm.public.Purchases
      .where({ id })
      .all();

    const purchase = purchases[0];

    if (!purchase) {
      throw new Error("PURCHASE_NOT_FOUND");
    }

    if (purchase.status === "RECEIVED") {
      throw new Error("PURCHASE_ALREADY_RECEIVED");
    }

    if (purchase.status === "CANCELLED") {
      throw new Error("PURCHASE_ALREADY_CANCELLED");
    }

    const now = new Date().toISOString();

    const updatePlan = tx.sql.public.purchases
      .update({
        status: "CANCELLED",
        updatedAt: now,
      })
      .where((fields, operators) =>
        operators.eq(fields.id, id)
      )
      .returning(
        "id",
        "supplierId",
        "invoiceNumber",
        "purchaseDate",
        "totalAmount",
        "status",
        "note",
        "createdAt",
        "updatedAt"
      )
      .build();

    const updatedRows = await tx.query(updatePlan);
    const cancelledPurchase = updatedRows[0];

    if (!cancelledPurchase) {
      throw new Error("PURCHASE_UPDATE_FAILED");
    }

    return cancelledPurchase;
  });
};
