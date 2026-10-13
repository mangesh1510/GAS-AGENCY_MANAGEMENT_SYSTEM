
import { Router } from "express";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

import { restoreBackup } from "../controllers/restore.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import { getRestoreHistory } from "../controllers/restore-history.controller.js";

const router = Router();

const uploadDirectory = path.join(os.tmpdir(), "gasflow-restore-uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  dest: uploadDirectory,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== ".dump") {
      callback(new Error("Only PostgreSQL .dump files are accepted."));
      return;
    }

    callback(null, true);
  },
});

router.post(
  "/",
  authenticateToken,
  requireAdmin,
  upload.single("backup"),
  restoreBackup,
);
router.get(
  "/history",
  authenticateToken,
  requireAdmin,
  getRestoreHistory,
);

export default router;