
import prisma from "../config/prisma.js";

type CreateDeliveryData = {
  customerId: number;
  cylinderTypeId: number;
  quantity: number;
  unitPrice: number;
  deliveryDate?: string;
  note?: string;
};

type UpdateDeliveryData = CreateDeliveryData;

/* Calculate current filled stock from inventory movements */
const calculateFilledStock = (
  movements: Array<{
    quantity: number;
    type: string;
    status: string;
  }>
): number => {
  let stock = 0;

  for (const movement of movements) {
    if (movement.status !== "FILLED") continue;

    switch (movement.type) {
      case "OPENING":
      case "RECEIVED":
      case "REFILL_RECEIVED":
      case "ADJUSTMENT":
        stock += movement.quantity;
        break;

      case "SOLD":
        stock -= movement.quantity;
        break;
    }
  }

  return stock;
};

/* Validate delivery input */
const validateDeliveryData = (data: CreateDeliveryData) => {
  if (
    !Number.isInteger(data.customerId) ||
    data.customerId <= 0 ||
    !Number.isInteger(data.cylinderTypeId) ||
    data.cylinderTypeId <= 0 ||
    !Number.isInteger(data.quantity) ||
    data.quantity <= 0 ||
    !Number.isFinite(data.unitPrice) ||
    data.unitPrice < 0
  ) {
    throw new Error("INVALID_DELIVERY_DATA");
  }
};

/* GET all deliveries */
export const getDeliveries = async () => {
  const deliveries = await prisma.orm.public.Deliveries.all();
  return deliveries;
};

/* GET delivery by ID */
export const getDeliveryById = async (id: number) => {
  const deliveries = await prisma.orm.public.Deliveries
    .where({ id })
    .all();

  return deliveries[0] ?? null;
};

/* CREATE delivery and update inventory atomically */
export const createDelivery = async (data: CreateDeliveryData) => {
  validateDeliveryData(data);

  return prisma.transaction(async (tx) => {
    const customers = await tx.orm.public.Customers
      .where({ id: data.customerId })
      .all();

    if (customers.length === 0) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    const cylinderTypes = await tx.orm.public.CylinderTypes
      .where({ id: data.cylinderTypeId })
      .all();

    if (cylinderTypes.length === 0) {
      throw new Error("CYLINDER_TYPE_NOT_FOUND");
    }

    const movements = await tx.orm.public.Inventory
      .where({ cylinderTypeId: data.cylinderTypeId })
      .all();

    const filledStock = calculateFilledStock(movements);

    if (filledStock < data.quantity) {
      throw new Error("INSUFFICIENT_FILLED_STOCK");
    }

    const now = new Date().toISOString();
    const unitPrice = data.unitPrice.toFixed(2);
    const totalAmount = (
      data.quantity * data.unitPrice
    ).toFixed(2);

    const deliveryPlan = tx.sql.public.deliveries
      .insert([
        {
          customerId: data.customerId,
          cylinderTypeId: data.cylinderTypeId,
          quantity: data.quantity,
          unitPrice,
          totalAmount,
          deliveryDate: data.deliveryDate ?? now,
          note: data.note ?? null,
          createdAt: now,
          createdBy: null,
        },
      ])
      .returning(
        "id",
        "customerId",
        "cylinderTypeId",
        "quantity",
        "unitPrice",
        "totalAmount",
        "deliveryDate",
        "note",
        "createdAt",
        "createdBy"
      )
      .build();

    const createdRows = await tx.query(deliveryPlan);
    const delivery = createdRows[0];

    if (!delivery) {
      throw new Error("DELIVERY_CREATION_FAILED");
    }

    const inventoryPlan = tx.sql.public.inventory
      .insert([
        {
          cylinderTypeId: data.cylinderTypeId,
          quantity: data.quantity,
          type: "SOLD",
          status: "FILLED",
          note: `Delivery #${delivery.id}`,
          createdAt: now,
        },
      ])
      .returning("id")
      .build();

    await tx.query(inventoryPlan);

    return delivery;
  });
};

/* UPDATE delivery and reconcile inventory atomically */
export const updateDelivery = async (
  id: number,
  data: UpdateDeliveryData
) => {
  validateDeliveryData(data);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("INVALID_DELIVERY_DATA");
  }

  return prisma.transaction(async (tx) => {
    // 1. Find the delivery
    const existingRows = await tx.orm.public.Deliveries
      .where({ id })
      .all();

    const existing = existingRows[0];

    if (!existing) {
      throw new Error("DELIVERY_NOT_FOUND");
    }

    // 2. Verify customer
    const customers = await tx.orm.public.Customers
      .where({ id: data.customerId })
      .all();

    if (customers.length === 0) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    // 3. Verify cylinder type
    const cylinderTypes = await tx.orm.public.CylinderTypes
      .where({ id: data.cylinderTypeId })
      .all();

    if (cylinderTypes.length === 0) {
      throw new Error("CYLINDER_TYPE_NOT_FOUND");
    }

    const stockRelevantChange =
      existing.quantity !== data.quantity ||
      existing.cylinderTypeId !== data.cylinderTypeId;

    if (stockRelevantChange) {
      // 4. Find all inventory movements.
      // The latest matching sale is the active sale for this delivery.
      const allMovements = await tx.orm.public.Inventory.all();

      const baseNote = `Delivery #${id}`;

      const salesForDelivery = allMovements
        .filter(
          (movement) =>
            movement.type === "SOLD" &&
            movement.status === "FILLED" &&
            (
              movement.note === baseNote ||
              movement.note?.startsWith(
                `${baseNote} | revised sale |`
              ) === true
            )
        )
        .sort((a, b) => b.id - a.id);
        
        
        if (salesForDelivery.length === 0) {
            throw new Error("ORIGINAL_STOCK_MOVEMENT_NOT_FOUND");
        }

      const currentSale = salesForDelivery[0];

      // Do not modify stock if we cannot verify the active sale.
      if (
        !currentSale ||
        currentSale.cylinderTypeId !== existing.cylinderTypeId ||
        currentSale.quantity !== existing.quantity
      ) {
        throw new Error("ORIGINAL_STOCK_MOVEMENT_NOT_FOUND");
      }

      // 5. Calculate stock for the destination cylinder type.
      const targetMovements =
        existing.cylinderTypeId === data.cylinderTypeId
          ? allMovements.filter(
              (movement) =>
                movement.cylinderTypeId === data.cylinderTypeId
            )
          : allMovements.filter(
              (movement) =>
                movement.cylinderTypeId === data.cylinderTypeId
            );

      const targetStock = calculateFilledStock(targetMovements);

      // If editing the same cylinder type, restore the old quantity
      // when calculating how much stock is available for the new sale.
      const availableForEdit =
        existing.cylinderTypeId === data.cylinderTypeId
          ? targetStock + existing.quantity
          : targetStock;

      if (availableForEdit < data.quantity) {
        throw new Error("INSUFFICIENT_FILLED_STOCK");
      }

      const now = new Date().toISOString();

      // 6. Add a compensating movement to reverse the previous sale.
      // Do not delete or update historical inventory rows.
      const reverseOldSale = tx.sql.public.inventory
        .insert([
          {
            cylinderTypeId: existing.cylinderTypeId,
            quantity: existing.quantity,
            type: "ADJUSTMENT",
            status: "FILLED",
            note: `Edit Delivery #${id}: reverse previous sale`,
            createdAt: now,
          },
        ])
        .returning("id")
        .build();

      await tx.query(reverseOldSale);

      // 7. Add the revised sale with a distinct note.
      // The revised-sale prefix lets future edits identify it.
      const recordNewSale = tx.sql.public.inventory
        .insert([
          {
            cylinderTypeId: data.cylinderTypeId,
            quantity: data.quantity,
            type: "SOLD",
            status: "FILLED",
            note: `Delivery #${id} | revised sale | ${now}`,
            createdAt: now,
          },
        ])
        .returning("id")
        .build();

      await tx.query(recordNewSale);
    }

    // 8. Update the delivery record.
    const unitPrice = data.unitPrice.toFixed(2);
    const totalAmount = (
      data.quantity * data.unitPrice
    ).toFixed(2);

    const updatePlan = tx.sql.public.deliveries
      .update({
        customerId: data.customerId,
        cylinderTypeId: data.cylinderTypeId,
        quantity: data.quantity,
        unitPrice,
        totalAmount,
        deliveryDate: data.deliveryDate ?? existing.deliveryDate,
        note: data.note ?? existing.note,
      })
      .where((fields, operators) =>
        operators.eq(fields.id, id)
      )
      .returning(
        "id",
        "customerId",
        "cylinderTypeId",
        "quantity",
        "unitPrice",
        "totalAmount",
        "deliveryDate",
        "note",
        "createdAt",
        "createdBy"
      )
      .build();

    const updatedRows = await tx.query(updatePlan);
    const updatedDelivery = updatedRows[0];

    if (!updatedDelivery) {
      throw new Error("DELIVERY_UPDATE_FAILED");
    }

    return updatedDelivery;
  });
};



/* GET deliveries by customer ID */
export const getDeliveriesByCustomer = async (
  customerId: number
) => {
  const deliveries = await prisma.orm.public.Deliveries
    .where({ customerId })
    .all();

  return deliveries;
};