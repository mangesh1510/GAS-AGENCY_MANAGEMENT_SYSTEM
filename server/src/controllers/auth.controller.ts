
import type { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const JWT_SECRET = process.env.JWT_SECRET;

// Login
export async function login(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    if (!JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: "Authentication is not configured on the server.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.orm.public.Users
      .where({ email: normalizedEmail })
      .first();

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
}

// Admin-only: create a Staff account
export async function createStaff(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({
        success: false,
        message: "Name cannot exceed 100 characters.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
      return;
    }

    if (password.length < 8 || password.length > 72) {
      res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createdUser = await prisma.transaction(async (tx) => {
      const existingUser = await tx.orm.public.Users
        .where({ email: normalizedEmail })
        .first();

      if (existingUser) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }

      const now = new Date().toISOString();

      const insertPlan = tx.sql.public.users
        .insert([
          {
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: "STAFF",
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .returning("id", "name", "email", "role", "isActive")
        .build();

      const insertResult = await tx.query(insertPlan);

      return insertResult[0];
    });

    if (!createdUser) {
      res.status(500).json({
        success: false,
        message: "Staff account could not be created.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Staff account created successfully.",
      data: createdUser,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    console.error("Create staff error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create Staff account.",
    });
  }
}

// Admin-only: list Staff accounts
export async function getStaff(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const staffUsers = await prisma.orm.public.Users
      .where({ role: "STAFF" })
      .all();

    const safeStaffUsers = staffUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));

    res.status(200).json({
      success: true,
      message: "Staff accounts retrieved successfully.",
      data: safeStaffUsers,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve Staff accounts.",
    });
  }
}

// Admin-only: activate or deactivate a Staff account
export async function updateStaffStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const staffId = Number(req.params.id);
    const { isActive } = req.body as { isActive?: boolean };

    if (!Number.isInteger(staffId) || staffId <= 0) {
      res.status(400).json({
        success: false,
        message: "A valid Staff ID is required.",
      });
      return;
    }

    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be true or false.",
      });
      return;
    }

    const staff = await prisma.orm.public.Users
      .where({ id: staffId })
      .first();

    if (!staff || staff.role !== "STAFF") {
      res.status(404).json({
        success: false,
        message: "Staff account not found.",
      });
      return;
    }

    const now = new Date().toISOString();

    const plan = prisma.sql.public.users
      .update({
        isActive,
        updatedAt: now,
      } as any)
      .where((f: any, fns: any) => fns.eq(f.id, staffId))
      .returning(
        "id",
        "name",
        "email",
        "role",
        "isActive",
        "updatedAt",
      )
      .build();

    const result = await prisma.runtime().query(plan);
    const updatedStaff = result[0];

    if (!updatedStaff) {
      res.status(404).json({
        success: false,
        message: "Staff account not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Staff account ${isActive ? "activated" : "deactivated"} successfully.`,
      data: updatedStaff,
    });
  } catch (error) {
    console.error("Update staff status error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update Staff account status.",
    });
  }
}

// GET CURRENT LOGGED-IN USER
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const users = await prisma.orm.public.Users
      .where({ id: userId })
      .all();

    const user = users[0];

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive or no longer exists.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch current user.",
    });
  }
};


export async function updateStaff(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const staffId = Number(req.params.id);
    const { name, email } = req.body as {
      name?: string;
      email?: string;
    };

    if (!Number.isInteger(staffId) || staffId <= 0) {
      res.status(400).json({
        success: false,
        message: "A valid Staff ID is required.",
      });
      return;
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      !name.trim() ||
      !email.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Name and email are required.",
      });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({
        success: false,
        message: "Name cannot exceed 100 characters.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
      return;
    }

    const staff = await prisma.orm.public.Users
      .where({ id: staffId })
      .first();

    if (!staff || staff.role !== "STAFF") {
      res.status(404).json({
        success: false,
        message: "Staff account not found.",
      });
      return;
    }

    const existingUser = await prisma.orm.public.Users
      .where({ email: normalizedEmail })
      .first();

    if (existingUser && existingUser.id !== staffId) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    const now = new Date().toISOString();

    const plan = prisma.sql.public.users
      .update({
        name: name.trim(),
        email: normalizedEmail,
        updatedAt: now,
      } as any)
      .where((f: any, fns: any) => fns.eq(f.id, staffId))
      .returning(
        "id",
        "name",
        "email",
        "role",
        "isActive",
        "createdAt",
      )
      .build();

    const result = await prisma.runtime().query(plan);
    const updatedStaff = result[0];

    if (!updatedStaff) {
      res.status(404).json({
        success: false,
        message: "Staff account not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Staff details updated successfully.",
      data: updatedStaff,
    });
  } catch (error) {
    console.error("Update staff error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update Staff details.",
    });
  }
}
