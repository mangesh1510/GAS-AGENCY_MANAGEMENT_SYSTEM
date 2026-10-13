
import type { Request, Response } from "express";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

import prisma from "../config/prisma.js";

const PG_RESTORE =
  "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_restore.exe";

const RESTORE_TEST_DATABASE = "gasflow_restore_test";
const MAX_BACKUP_SIZE = 100 * 1024 * 1024;

type UploadedBackupFile = {
  path: string;
  originalname: string;
  size: number;
};

type RequestWithUploadedFile = Request & {
  file?: UploadedBackupFile;
};

function isSafeRestoreTarget(databaseName: string): boolean {
  return databaseName === RESTORE_TEST_DATABASE;
}

async function writeRestoreLog(
  fileName: string,
  status: "SUCCESS" | "FAILED",
  message: string,
  restoredBy: number | null = null,
): Promise<void> {
  try {
    const plan = prisma.sql.public.restore_logs
      .insert([
        {
          fileName: fileName.slice(0, 255),
          targetDatabase: RESTORE_TEST_DATABASE,
          status,
          message: message.slice(0, 500),
          restoredBy,
        },
      ])
      .build();

    await prisma.runtime().query(plan);
  } catch (error) {
    // Audit-log failure must not hide the actual restore result.
    console.error("Could not write restore audit log:", error);
  }
}

function validateBackupArchive(backupPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    let output = "";
    let finished = false;

    const child = spawn(PG_RESTORE, ["--list", backupPath], {
      windowsHide: true,
      timeout: 15_000,
    });

    const finish = (isValid: boolean) => {
      if (finished) return;
      finished = true;
      resolve(isValid);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();

      if (output.length > 2 * 1024 * 1024) {
        child.kill();
        finish(false);
      }
    });

    child.on("error", () => finish(false));
    child.on("close", (code) => {
      finish(code === 0 && output.trim().length > 0);
    });
  });
}

export async function restoreBackup(
  req: Request,
  res: Response,
): Promise<void> {
  let uploadedPath: string | undefined;
  let fileName = "(no file uploaded)";
  let responseSent = false;

  const fail = async (
    statusCode: number,
    message: string,
  ): Promise<void> => {
    await writeRestoreLog(fileName, "FAILED", message);

    if (!responseSent) {
      responseSent = true;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  };

  try {
    const file = (req as RequestWithUploadedFile).file;

    if (!file) {
      await fail(400, "Please upload a PostgreSQL .dump backup file.");
      return;
    }

    uploadedPath = file.path;
    fileName = path.basename(file.originalname);

    if (path.extname(fileName).toLowerCase() !== ".dump") {
      await fail(400, "Only .dump backup files are accepted.");
      return;
    }

    if (file.size <= 0 || file.size > MAX_BACKUP_SIZE) {
      await fail(
        413,
        "Backup file must be greater than 0 bytes and no larger than 100 MB.",
      );
      return;
    }

    if (!fs.existsSync(PG_RESTORE)) {
      await fail(500, "pg_restore.exe was not found at the configured path.");
      return;
    }

    if (!fs.existsSync(uploadedPath)) {
      await fail(400, "The uploaded backup file could not be found.");
      return;
    }

    const isValidArchive = await validateBackupArchive(uploadedPath);

    if (!isValidArchive) {
      await fail(400, "The uploaded file is not a valid PostgreSQL backup archive.");
      return;
    }

    const targetDatabase = RESTORE_TEST_DATABASE;

    if (!isSafeRestoreTarget(targetDatabase)) {
      await fail(403, "Restore target is not permitted.");
      return;
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      await fail(500, "Database configuration is missing.");
      return;
    }

    const parsedUrl = new URL(databaseUrl);
    const configuredDatabase = decodeURIComponent(
      parsedUrl.pathname.replace(/^\/+/, ""),
    );

    if (configuredDatabase !== "gasflow") {
      await fail(403, "Unexpected source database configuration.");
      return;
    }

    const username = decodeURIComponent(parsedUrl.username);
    const password = decodeURIComponent(parsedUrl.password);

    const restoreEnv = {
      ...process.env,
      PGPASSWORD: password,
    };

    const restoreArgs = [
      "--username", username,
      "--host", parsedUrl.hostname,
      "--port", parsedUrl.port || "5432",
      "--dbname", targetDatabase,
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
      uploadedPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(PG_RESTORE, restoreArgs, {
        env: restoreEnv,
        windowsHide: true,
      });

      let errorOutput = "";

      child.stderr.on("data", (chunk: Buffer) => {
        errorOutput += chunk.toString();
      });

      child.on("error", reject);

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(errorOutput || "Restore process failed."));
        }
      });
    });

    await writeRestoreLog(
      fileName,
      "SUCCESS",
      `Backup restored successfully into ${targetDatabase}.`,
    );

    responseSent = true;
    res.status(200).json({
      success: true,
      message:
        `Backup restored successfully into "${targetDatabase}". ` +
        'Your original "gasflow" database was not changed.',
    });
  } catch (error) {
    console.error("Restore backup error:", error);

    const safeMessage = "Restore failed. Check the server logs for details.";
    await writeRestoreLog(fileName, "FAILED", safeMessage);

    if (!responseSent && !res.headersSent) {
      responseSent = true;
      res.status(500).json({
        success: false,
        message: safeMessage,
      });
    }
  } finally {
    if (uploadedPath) {
      await fs.promises
        .rm(uploadedPath, { force: true })
        .catch((error) => {
          console.error("Temporary file cleanup failed:", error);
        });
    }
  }
}

