
import { Router } from "express";
import {
  getInventory,
  getInventoryById,
  getCurrentStock,
  getLowStockAlerts,
  createInventory,
  updateInventory,
  deleteInventory,
} from "../controllers/inventory.controller.js";
import {
  createInventorySchema,
  updateInventorySchema,
} from "../validators/inventory.validator.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

// Safely parse a positive integer ID from Express route parameters.
function parsePositiveId(
  value: string | string[] | undefined
): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET /api/inventory
// ADMIN and STAFF: view all inventory
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const inventory = await getInventory();

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("GET INVENTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
});

// GET /api/inventory/stock/:cylinderTypeId
// ADMIN and STAFF: view current stock
router.get(
  "/stock/:cylinderTypeId",
  authenticateToken,
  async (req, res) => {
    try {
      const cylinderTypeId = parsePositiveId(
        req.params.cylinderTypeId
      );

      if (cylinderTypeId === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid cylinder type ID",
        });
      }

      const stock = await getCurrentStock(cylinderTypeId);

      return res.status(200).json({
        success: true,
        data: stock,
      });
    } catch (error) {
      console.error("GET CURRENT STOCK ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to calculate current stock",
      });
    }
  }
);

// GET /api/inventory/alerts/low-stock
// ADMIN and STAFF: view low-stock alerts
router.get(
  "/alerts/low-stock",
  authenticateToken,
  async (req, res) => {
    try {
      const rawThreshold = req.query.threshold;
      let threshold: number | undefined;

      // Use each cylinder type's configured threshold when omitted.
      if (rawThreshold !== undefined) {
        if (
          typeof rawThreshold !== "string" ||
          rawThreshold.trim() === ""
        ) {
          return res.status(400).json({
            success: false,
            message: "Threshold must be a non-negative integer",
          });
        }

        threshold = Number(rawThreshold);

        if (
          !Number.isInteger(threshold) ||
          threshold < 0 ||
          threshold > 100000
        ) {
          return res.status(400).json({
            success: false,
            message: "Threshold must be a non-negative integer",
          });
        }
      }

      const alerts = await getLowStockAlerts(threshold);

      return res.status(200).json({
        success: true,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("GET LOW STOCK ALERTS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch low-stock alerts",
      });
    }
  }
);

// GET /api/inventory/:id
// ADMIN and STAFF: view a single inventory record
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory ID",
      });
    }

    const inventory = await getInventoryById(id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("GET INVENTORY RECORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory record",
    });
  }
});

// POST /api/inventory
// ADMIN only: create an inventory movement
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const validatedData = createInventorySchema.parse(req.body);
      const inventory = await createInventory(validatedData);

      return res.status(201).json({
        success: true,
        message: "Inventory movement created successfully",
        data: inventory,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error,
        });
      }

      console.error("CREATE INVENTORY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create inventory movement",
      });
    }
  }
);

// PUT /api/inventory/:id
// ADMIN only: update an inventory record
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = parsePositiveId(req.params.id);

      if (id === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid inventory ID",
        });
      }

      const validatedData = updateInventorySchema.parse(req.body);
      const inventory = await updateInventory(id, validatedData);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory record not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Inventory record updated successfully",
        data: inventory,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error,
        });
      }

      console.error("UPDATE INVENTORY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update inventory record",
      });
    }
  }
);

// DELETE /api/inventory/:id
// ADMIN only: delete an inventory record
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = parsePositiveId(req.params.id);

      if (id === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid inventory ID",
        });
      }

      const inventory = await deleteInventory(id);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory record not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Inventory record deleted successfully",
        data: inventory,
      });
    } catch (error) {
      console.error("DELETE INVENTORY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete inventory record",
      });
    }
  }
);

export default router;
