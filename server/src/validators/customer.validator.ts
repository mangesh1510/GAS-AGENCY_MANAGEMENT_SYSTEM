import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters"),

  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Invalid mobile number"),

  address: z
    .string()
    .trim()
    .optional(),

  openingBalance: z
    .number()
    .nonnegative("Opening balance cannot be negative")
    .optional()
    .default(0),
});

export const updateCustomerSchema = createCustomerSchema;