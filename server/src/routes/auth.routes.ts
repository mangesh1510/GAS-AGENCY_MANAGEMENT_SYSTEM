
import { Router } from "express";
import {
  login,
  createStaff,
  getStaff,
  updateStaff,
  updateStaffStatus,
  getMe,
} from "../controllers/auth.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticateToken, getMe);

// Admin-only Staff management
router.get("/staff", authenticateToken, requireAdmin, getStaff);
router.post("/staff", authenticateToken, requireAdmin, createStaff);
router.patch(
  "/staff/:id/status",
  authenticateToken,
  requireAdmin,
  updateStaffStatus,
);
router.patch(
  "/staff/:id",
  authenticateToken,
  requireAdmin,
  updateStaff,
);
export default router;
