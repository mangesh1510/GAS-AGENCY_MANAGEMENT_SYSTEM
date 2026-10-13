
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import prisma from "../config/prisma.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: string;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    res.status(500).json({
      success: false,
      message: "Authentication is not configured on the server.",
    });
    return;
  }

  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "number" ||
      !Number.isInteger(decoded.userId) ||
      decoded.userId <= 0 ||
      typeof decoded.role !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    // Confirm the user still exists and is active.
    const users = await prisma.orm.public.Users
      .where({ id: decoded.userId })
      .all();

    const user = users[0];

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Account is inactive or no longer exists.",
      });
      return;
    }

    // Use the current role from the database, not the old token.
    req.user = {
      userId: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("AUTHENTICATION ERROR:", error);

    res.status(401).json({
      success: false,
      message: "Invalid token or authentication failed.",
    });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Administrator access required.",
    });
    return;
  }

  next();
}
