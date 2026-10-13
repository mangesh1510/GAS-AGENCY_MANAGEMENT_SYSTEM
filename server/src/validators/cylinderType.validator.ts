
import { z } from "zod";

export const createCylinderTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Cylinder type name must be at least 2 characters"),

  capacityKg: z
    .number()
    .positive("Capacity must be greater than 0"),

  sellingPrice: z
    .number()
    .nonnegative("Selling price cannot be negative"),

  purchasePrice: z
    .number()
    .nonnegative("Purchase price cannot be negative")
    .default(0),

  lowStockThreshold: z
    .number()
    .int("Low-stock threshold must be a whole number")
    .nonnegative("Low-stock threshold cannot be negative")
    .default(5),
});

export const updateCylinderTypeSchema =
  createCylinderTypeSchema.partial();