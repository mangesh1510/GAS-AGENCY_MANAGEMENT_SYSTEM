
import type { Request, Response } from "express";
import prisma from "../config/prisma.js";

export async function getBackupHistory(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const history: Array<{
      id: number;
      fileName: string;
      targetDatabase: string;
      status: "SUCCESS" | "FAILED";
      fileSize: bigint;
      message: string | null;
      createdAt: string;
      createdBy: number | null;
    }> = [];

    for await (const record of prisma.orm.public.BackupLogs.all()) {
      history.push(record);
    }

    history.sort((a, b) => {
      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history.slice(0, 100).map((record) => ({
        ...record,
        fileSize: record.fileSize.toString(),
      })),
    });
  } catch (error) {
    console.error("Get backup history error:", error);

    res.status(500).json({
      success: false,
      message: "Could not retrieve backup history.",
    });
  }
}