
import { Router } from "express";

import { createBackup } from "../controllers/backup.controller.js";
import { getBackupHistory } from "../controllers/backup-history.controller.js";

import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/backups/history
// Retrieve backup history (Admin only)
router.get(
  "/history",
  authenticateToken,
  requireAdmin,
  getBackupHistory,
);

// POST /api/backups
// Create and download a database backup (Admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  createBackup,
);

export default router;