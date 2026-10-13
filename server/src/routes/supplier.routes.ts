
import { Router } from "express";
import {
  listSuppliers,
  getSupplier,
  addSupplier,
  editSupplier,
} from "../controllers/supplier.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

// List all suppliers
router.get("/", authenticateToken, listSuppliers);

// Get one supplier by ID
router.get("/:id", authenticateToken, getSupplier);

// Create a supplier (admin only)
router.post("/", authenticateToken, requireAdmin, addSupplier);

// Update supplier details (admin only)
router.put("/:id", authenticateToken, requireAdmin, editSupplier);

export default router;
