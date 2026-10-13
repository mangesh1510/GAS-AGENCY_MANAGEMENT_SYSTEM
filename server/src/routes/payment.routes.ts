
import { Router } from "express";
import prisma from "../config/prisma.js";

import {
  getPayments,
  getPaymentsByCustomer,
  createPayment,
  getCustomerAccountSummary,
} from "../controllers/payment.controller.js";

const router = Router();

/* GET all payments */
router.get("/", async (_req, res) => {
  try {
    res.json(await getPayments());
  } catch {
    res.status(500).json({
      error: "FAILED_TO_FETCH_PAYMENTS",
    });
  }
});

/* GET outstanding balances for all customers */
router.get("/balances", async (_req, res) => {
  try {
    const customers = await prisma.orm.public.Customers.all();

    const balances = await Promise.all(
      customers.map((customer) =>
        getCustomerAccountSummary(customer.id)
      )
    );

    res.json(balances);
  } catch {
    res.status(500).json({
      error: "FAILED_TO_FETCH_CUSTOMER_BALANCES",
    });
  }
});

/* GET account summary for one customer */
router.get("/customer/:customerId/summary", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    res.json(
      await getCustomerAccountSummary(customerId)
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    const status =
      message === "CUSTOMER_NOT_FOUND" ? 404 : 400;

    res.status(status).json({ error: message });
  }
});

/* GET payment history for one customer */
router.get("/customer/:customerId", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    res.json(
      await getPaymentsByCustomer(customerId)
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    const status =
      message === "CUSTOMER_NOT_FOUND" ? 404 : 400;

    res.status(status).json({ error: message });
  }
});

/* RECORD a payment */
router.post("/", async (req, res) => {
  try {
    const payment = await createPayment(req.body);

    res.status(201).json(payment);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    const status =
      message === "CUSTOMER_NOT_FOUND" ? 404 : 400;

    res.status(status).json({ error: message });
  }
});

export default router;

