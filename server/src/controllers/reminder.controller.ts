
import { getPaymentReminders } from "../services/reminder.service.js";

export const getPaymentRemindersController = async (
  _req: import("express").Request,
  res: import("express").Response
) => {
  try {
    const reminders = await getPaymentReminders();

    return res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (error) {
    console.error("Failed to fetch payment reminders:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment reminders",
    });
  }
};

