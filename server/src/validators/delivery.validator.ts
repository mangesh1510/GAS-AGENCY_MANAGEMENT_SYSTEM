
import { z } from "zod";

export const createDeliverySchema = z
  .object({
    customerId: z.number().int().positive("Customer is required"),

    cylinderTypeId: z
      .number()
      .int()
      .positive("Cylinder type is required"),

    quantity: z
      .number()
      .int()
      .positive("Quantity must be greater than 0"),

    unitPrice: z
      .number()
      .nonnegative("Unit price cannot be negative"),

    deliveryDate: z.string().datetime().optional(),

    note: z.string().trim().optional(),
  })
  .strict()
  .refine(
    (data) =>
      Math.abs(
        data.quantity * data.unitPrice -
          Number((data.quantity * data.unitPrice).toFixed(2))
      ) < 0.000001,
    {
      message: "Invalid delivery amount",
      path: ["unitPrice"],
    }
  );


export const updateDeliverySchema = z.object({
  customerId: z.number().int().positive("Customer is required"),
  cylinderTypeId: z.number().int().positive("Cylinder type is required"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  deliveryDate: z.string().datetime().optional(),
  note: z.string().trim().optional(),
}).strict();


  /*
  What this validates

customerId and cylinderTypeId must be positive integers.

quantity must be a positive integer.

unitPrice cannot be negative.

deliveryDate, if supplied, must be a valid ISO datetime.

note is optional.

Updates can change only the note; they cannot silently change the quantity or price of an existing delivery.
*/