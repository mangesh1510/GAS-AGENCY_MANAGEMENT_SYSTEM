
import type { Request, Response } from "express";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

import prisma from "../config/prisma.js";

const PG_DUMP =
  "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe";

type BackupRequest = Request & {
  user?: {
    userId: number;
    role: string;
  };
};

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured in the server environment.",
    );
  }

  const url = new URL(databaseUrl);

  if (
    url.protocol !== "postgresql:" &&
    url.protocol !== "postgres:"
  ) {
    throw new Error("DATABASE_URL must use PostgreSQL.");
  }

  return {
    host: url.hostname || "localhost",
    port: url.port || "5432",
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(
      url.pathname.replace(/^\/+/, ""),
    ),
  };
}

async function writeBackupLog(
  fileName: string,
  targetDatabase: string,
  status: "SUCCESS" | "FAILED",
  fileSize: number,
  message: string,
  createdBy: number | null,
): Promise<void> {
  try {
    const plan = prisma.sql.public.backup_logs
      .insert([
        {
          fileName: fileName.slice(0, 255),
          targetDatabase,
          status,
          fileSize: BigInt(fileSize),
          message: message.slice(0, 500),
          createdBy,
        },
      ])
      .build();

    await prisma.runtime().query(plan);
  } catch (error) {
    console.error("Could not write backup history:", error);
  }
}

export async function createBackup(
  req: BackupRequest,
  res: Response,
): Promise<void> {
  let backupPath: string | undefined;
  let backupLogged = false;
  let childStarted = false;

  const filename = `gasflow-backup-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.dump`;

  const createdBy = req.user?.userId ?? null;

  let databaseName = "unknown";

  const logFailure = async (message: string): Promise<void> => {
    if (backupLogged) return;

    backupLogged = true;

    await writeBackupLog(
      filename,
      databaseName,
      "FAILED",
      0,
      message,
      createdBy,
    );
  };

  try {
    const config = getDatabaseConfig();
    databaseName = config.database;

    if (!fs.existsSync(PG_DUMP)) {
      await logFailure("pg_dump.exe was not found.");

      res.status(500).json({
        success: false,
        message:
          "pg_dump.exe was not found at the configured PostgreSQL path.",
      });
      return;
    }

    backupPath = path.join(
      os.tmpdir(),
      `gasflow-${randomUUID()}.dump`,
    );

    const args = [
      "--host",
      config.host,
      "--port",
      config.port,
      "--username",
      config.username,
      "--dbname",
      config.database,
      "--format=custom",
      "--no-password",
      "--file",
      backupPath,
    ];

    const child = spawn(PG_DUMP, args, {
      env: {
        ...process.env,
        PGPASSWORD: config.password,
      },
      windowsHide: true,
    });

    childStarted = true;

    let stderr = "";
    let processError: Error | undefined;

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      processError = error;
      console.error("Backup process error:", error.message);
    });

    child.on("close", async (code) => {
      try {
        if (code !== 0 || processError) {
          console.error(
            "pg_dump failed:",
            stderr || processError?.message,
          );

          await logFailure("Database backup failed.");

          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message:
                "Database backup failed. Check the server terminal.",
            });
          }

          return;
        }

        if (
          !backupPath ||
          !fs.existsSync(backupPath)
        ) {
          await logFailure("The backup file was not created.");

          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: "The backup file was not created.",
            });
          }

          return;
        }

        const stats = await fs.promises.stat(backupPath);

        await writeBackupLog(
          filename,
          databaseName,
          "SUCCESS",
          stats.size,
          "Database backup created successfully.",
          createdBy,
        );

        backupLogged = true;

        res.download(backupPath, filename, (error) => {
          if (error) {
            console.error(
              "Backup download error:",
              error.message,
            );

            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                message:
                  "Backup was created but could not be downloaded.",
              });
            }
          }

          if (backupPath) {
            fs.promises
              .rm(backupPath, { force: true })
              .catch(console.error);
          }
        });
      } catch (error) {
        console.error("Backup completion error:", error);

        await logFailure(
          "Could not complete the backup operation.",
        );

        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Could not complete the database backup.",
          });
        }

        if (backupPath) {
          fs.promises
            .rm(backupPath, { force: true })
            .catch(console.error);
        }
      }
    });
  } catch (error) {
    console.error("Create backup error:", error);

    await logFailure(
      childStarted
        ? "Could not complete the backup operation."
        : "Could not create the database backup.",
    );

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Could not create the database backup.",
      });
    }

    if (backupPath) {
      fs.promises
        .rm(backupPath, { force: true })
        .catch(console.error);
    }
  }
}