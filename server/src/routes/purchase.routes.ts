
import { Router } from "express";
import {
  listPurchases,
  getPurchase,
  addPurchase,
  receivePurchaseHandler,
  cancelPurchaseHandler,
} from "../controllers/purchase.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/purchases
// ADMIN and STAFF: view all purchases
router.get("/", authenticateToken, listPurchases);

// GET /api/purchases/:id
// ADMIN and STAFF: view a purchase by ID
router.get("/:id", authenticateToken, getPurchase);

// POST /api/purchases
// ADMIN only: create a purchase
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  addPurchase
);

// POST /api/purchases/:id/receive
// ADMIN only: receive a purchase
router.post(
  "/:id/receive",
  authenticateToken,
  requireAdmin,
  receivePurchaseHandler
);

// POST /api/purchases/:id/cancel
// ADMIN only: cancel a purchase
router.post(
  "/:id/cancel",
  authenticateToken,
  requireAdmin,
  cancelPurchaseHandler
);

export default router;
