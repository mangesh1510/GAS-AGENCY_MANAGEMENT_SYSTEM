
import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";

async function createAdmin(): Promise<void> {
  console.log("Starting GasFlow admin creation...");

  // 1. Read admin credentials from server/.env
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in server/.env."
    );
  }

  if (password.length < 12) {
    throw new Error("Admin password must be at least 12 characters long.");
  }

  // 2. Check whether this email already exists
  const existingUser = await prisma.orm.public.Users
    .where({ email })
    .first();

  if (existingUser) {
    throw new Error(
      "This email already exists. No user was created or modified."
    );
  }

  // 3. Hash the password
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  // 4. Build the INSERT statement
  const plan = prisma.sql.public.users
    .insert([
      {
        name,
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .build();

  // 5. Execute the SQL operation
  const result = await prisma.runtime().execute(plan);

  console.log("Insert execution completed.");
  console.log("Rows inserted:", result.affectedRows);

  // 6. Verify the new admin using the ORM
  const createdUser = await prisma.orm.public.Users
    .where({ email })
    .first();

  if (!createdUser) {
    throw new Error(
      "The admin was not found after the insert. Check the database connection."
    );
  }

  // 7. Display confirmation without revealing the password
  console.log("Administrator created successfully.");
  console.log("Name:", createdUser.name);
  console.log("Email:", createdUser.email);
  console.log("Role:", createdUser.role);
}

createAdmin().catch((error: unknown) => {
  console.error(
    "Could not create administrator:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});


/*

to give the roll run this script 
npx tsx src/scripts/createAdmin.ts

*/