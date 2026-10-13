
import type { Request, Response } from "express";
import prisma from "../config/prisma.js";

export async function getRestoreHistory(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const records = await prisma.orm.public.RestoreLogs.all();

    const history = [...records]
      .sort(
        (a, b) =>
          new Date(String(b.createdAt)).getTime() -
          new Date(String(a.createdAt)).getTime(),
      )
      .slice(0, 100);

    //console.log("Restore history row count:", history.length);
   // console.log("First restore history row:", history[0]);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Get restore history error:", error);

    res.status(500).json({
      success: false,
      message: "Could not fetch restore history.",
    });
  }
}

