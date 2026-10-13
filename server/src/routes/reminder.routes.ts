
import { Router } from "express";
import { getPaymentRemindersController } from "../controllers/reminder.controller.js";

const router = Router();

router.get("/payments", getPaymentRemindersController);

export default router;
