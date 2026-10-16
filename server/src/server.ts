
import express from "express";
import cors from "cors";
import prisma from "./config/prisma.js";

import customerRoutes from "./routes/customer.routes.js";
import cylinderTypeRoutes from "./routes/cylinderType.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import reportRoutes from "./routes/report.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import backupRoutes from "./routes/backup.routes.js";
import authRoutes from "./routes/auth.routes.js";
import restoreRoutes from "./routes/restore.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json());

// API routes
app.use("/api/customers", customerRoutes);
app.use("/api/cylinder-types", cylinderTypeRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/restore", restoreRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);

// Root endpoint
app.get("/", (_req, res) => {
  res.send("GasFlow API is running 🚀");
});

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.orm.public.Users.all();

    res.json({
      success: true,
      message: "GasFlow API and Database are connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Start the local development server.
// Vercel uses a separate serverless entry point.
if (process.env.VERCEL !== "1") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GasFlow API running at http://localhost:${PORT}`);
  });
}

export default app;
