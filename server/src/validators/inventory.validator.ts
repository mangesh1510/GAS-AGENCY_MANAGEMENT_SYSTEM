import { z } from "zod";

export const createInventorySchema = z
  .object({
    cylinderTypeId: z
      .number()
      .int()
      .positive("Cylinder type is required"),

    quantity: z
      .number()
      .int()
      .positive("Quantity must be greater than 0"),

    type: z.enum([
      "OPENING",
      "RECEIVED",
      "SOLD",
      "EMPTY_RETURNED",
      "SENT_FOR_REFILL",
      "REFILL_RECEIVED",
      "ADJUSTMENT",
    ]),

    status: z.enum(["FILLED", "EMPTY"]),

    note: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const filledOnlyTypes = [
      "RECEIVED",
      "SOLD",
      "REFILL_RECEIVED",
    ];

    const emptyOnlyTypes = [
      "EMPTY_RETURNED",
      "SENT_FOR_REFILL",
    ];

    if (
      filledOnlyTypes.includes(data.type) &&
      data.status !== "FILLED"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: `${data.type} must have FILLED status`,
      });
    }

    if (
      emptyOnlyTypes.includes(data.type) &&
      data.status !== "EMPTY"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: `${data.type} must have EMPTY status`,
      });
    }
  });

export const updateInventorySchema = z.object({
  note: z.string().trim().optional(),
});