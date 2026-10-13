import { Router } from "express";

import {
  getDeliveries,
  getDeliveryById,
  getDeliveriesByCustomer,
  createDelivery,
  updateDelivery,
} from "../controllers/delivery.controller.js";

import {
  createDeliverySchema,
  updateDeliverySchema,
} from "../validators/delivery.validator.js";

import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// Validate a positive integer ID
function parseId(
  value: string | string[] | undefined
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

// GET /api/deliveries
// ADMIN and STAFF: view all deliveries
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const deliveries = await getDeliveries();

    return res.status(200).json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    console.error("GET DELIVERIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch deliveries",
    });
  }
});

// GET /api/deliveries/customer/:customerId
// ADMIN and STAFF: view a customer's deliveries
router.get(
  "/customer/:customerId",
  authenticateToken,
  async (req, res) => {
    try {
      const customerId = parseId(req.params.customerId);

      if (customerId === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      const deliveries = await getDeliveriesByCustomer(customerId);

      return res.status(200).json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      console.error("GET CUSTOMER DELIVERIES ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer deliveries",
      });
    }
  }
);

// GET /api/deliveries/:id
// ADMIN and STAFF: view delivery details
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID",
      });
    }

    const delivery = await getDeliveryById(id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    console.error("GET DELIVERY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch delivery",
    });
  }
});

// POST /api/deliveries
// ADMIN and STAFF: create a delivery
router.post("/", authenticateToken, async (req, res) => {
  const parsed = createDeliverySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.issues,
    });
  }

  try {
    const delivery = await createDelivery(parsed.data);

    return res.status(201).json({
      success: true,
      message: "Delivery created successfully",
      data: delivery,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (message === "CYLINDER_TYPE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Cylinder type not found",
      });
    }

    if (message === "INSUFFICIENT_FILLED_STOCK") {
      return res.status(409).json({
        success: false,
        message: "Insufficient filled-cylinder stock",
      });
    }

    console.error("CREATE DELIVERY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create delivery",
    });
  }
});

// PUT /api/deliveries/:id
// ADMIN and STAFF: update a delivery
router.put("/:id", authenticateToken, async (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid delivery ID",
    });
  }

  const parsed = updateDeliverySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.issues,
    });
  }

  try {
    const delivery = await updateDelivery(id, parsed.data);

    return res.status(200).json({
      success: true,
      message: "Delivery updated successfully",
      data: delivery,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "DELIVERY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    if (
      message === "CUSTOMER_NOT_FOUND" ||
      message === "CYLINDER_TYPE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          message === "CUSTOMER_NOT_FOUND"
            ? "Customer not found"
            : "Cylinder type not found",
      });
    }

    if (message === "INSUFFICIENT_FILLED_STOCK") {
      return res.status(409).json({
        success: false,
        message: "Insufficient filled-cylinder stock",
      });
    }

    if (message === "ORIGINAL_STOCK_MOVEMENT_NOT_FOUND") {
      return res.status(409).json({
        success: false,
        message:
          "Cannot safely edit this delivery because its inventory movement could not be verified.",
      });
    }

    if (message === "INVALID_DELIVERY_DATA") {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery data",
      });
    }

    console.error("UPDATE DELIVERY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update delivery",
    });
  }
});

export default router;
