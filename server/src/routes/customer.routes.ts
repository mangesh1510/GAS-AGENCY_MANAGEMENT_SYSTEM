
import { Router } from "express";

import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../validators/customer.validator.js";

import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../services/customer.service.js";

import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

// Validate customer ID
const parseCustomerId = (
  id: string | string[] | undefined
): number | null => {
  if (typeof id !== "string") {
    return null;
  }

  const customerId = Number(id);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return null;
  }

  return customerId;
};

// GET ALL CUSTOMERS — ADMIN and STAFF
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const customers = await getCustomers();

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
});

// GET CUSTOMER BY ID — ADMIN and STAFF
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseCustomerId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await getCustomerById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("GET CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
    });
  }
});

// CREATE CUSTOMER — ADMIN and STAFF
router.post("/", authenticateToken, async (req, res) => {
  try {
    const validatedData = createCustomerSchema.parse(req.body);
    const customer = await createCustomer(validatedData);

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer data",
        errors: error,
      });
    }

    console.error("CREATE CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
});

// UPDATE CUSTOMER — ADMIN and STAFF
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseCustomerId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const validatedData = updateCustomerSchema.parse(req.body);
    const customer = await updateCustomer(id, validatedData);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer data",
        errors: error,
      });
    }

    console.error("UPDATE CUSTOMER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
});

// DELETE CUSTOMER — ADMIN only
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = parseCustomerId(req.params.id);

      if (id === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const customer = await deleteCustomer(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Customer deleted successfully",
      });
    } catch (error) {
      console.error("DELETE CUSTOMER ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete customer",
      });
    }
  }
);

export default router;