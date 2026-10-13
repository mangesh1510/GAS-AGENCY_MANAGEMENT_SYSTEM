
import { Router } from "express";

import {
  getCylinderTypes,
  getCylinderTypeById,
  createCylinderType,
  updateCylinderType,
  deleteCylinderType,
} from "../controllers/cylinderType.controller.js";

import {
  createCylinderTypeSchema,
  updateCylinderTypeSchema,
} from "../validators/cylinderType.validator.js";

import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

// Validate the cylinder type ID
function parseCylinderTypeId(
  id: string | string[] | undefined
): number | null {
  if (typeof id !== "string") {
    return null;
  }

  const cylinderTypeId = Number(id);

  if (!Number.isInteger(cylinderTypeId) || cylinderTypeId <= 0) {
    return null;
  }

  return cylinderTypeId;
}

// GET ALL CYLINDER TYPES — ADMIN and STAFF
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const cylinderTypes = await getCylinderTypes();

    return res.status(200).json({
      success: true,
      data: cylinderTypes,
    });
  } catch (error) {
    console.error("GET CYLINDER TYPES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cylinder types",
    });
  }
});

// GET CYLINDER TYPE BY ID — ADMIN and STAFF
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseCylinderTypeId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid cylinder type ID",
      });
    }

    const cylinderType = await getCylinderTypeById(id);

    if (!cylinderType) {
      return res.status(404).json({
        success: false,
        message: "Cylinder type not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: cylinderType,
    });
  } catch (error) {
    console.error("GET CYLINDER TYPE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cylinder type",
    });
  }
});

// CREATE CYLINDER TYPE — ADMIN only
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const validatedData = createCylinderTypeSchema.parse(req.body);
    const cylinderType = await createCylinderType(validatedData);

    return res.status(201).json({
      success: true,
      message: "Cylinder type created successfully",
      data: cylinderType,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid cylinder type data",
      });
    }

    console.error("CREATE CYLINDER TYPE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create cylinder type",
    });
  }
});

// UPDATE CYLINDER TYPE — ADMIN only
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseCylinderTypeId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid cylinder type ID",
      });
    }

    const validatedData = updateCylinderTypeSchema.parse(req.body);
    const cylinderType = await updateCylinderType(id, validatedData);

    if (!cylinderType) {
      return res.status(404).json({
        success: false,
        message: "Cylinder type not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cylinder type updated successfully",
      data: cylinderType,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid cylinder type data",
      });
    }

    console.error("UPDATE CYLINDER TYPE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update cylinder type",
    });
  }
});

// DELETE CYLINDER TYPE — ADMIN only
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = parseCylinderTypeId(req.params.id);

      if (id === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid cylinder type ID",
        });
      }

      const cylinderType = await deleteCylinderType(id);

      if (!cylinderType) {
        return res.status(404).json({
          success: false,
          message: "Cylinder type not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Cylinder type deleted successfully",
      });
    } catch (error) {
      console.error("DELETE CYLINDER TYPE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete cylinder type",
      });
    }
  }
);

export default router;
