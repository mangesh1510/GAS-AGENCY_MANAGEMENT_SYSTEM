
import { Router } from "express";
import { 
  getReportSummary,
  getReportSales,
  getReportPayments,
  getDailyBusinessClosing,
  getReportProfit,
 } from "../controllers/report.controller.js";

const router = Router();

/* GET REPORT SUMMARY */
router.get("/summary", async (req, res) => {
  try {
    const startDate =
      typeof req.query.startDate === "string"
        ? req.query.startDate
        : undefined;

    const endDate =
      typeof req.query.endDate === "string"
        ? req.query.endDate
        : undefined;

    if (
      (startDate && Number.isNaN(Date.parse(startDate))) ||
      (endDate && Number.isNaN(Date.parse(endDate)))
    ) {
      res.status(400).json({
        error: "INVALID_DATE_RANGE",
      });
      return;
    }

    if (
      startDate &&
      endDate &&
      new Date(startDate) > new Date(endDate)
    ) {
      res.status(400).json({
        error: "START_DATE_AFTER_END_DATE",
      });
      return;
    }

    const report = await getReportSummary(
      startDate,
      endDate
    );

    res.json(report);
  } catch (error) {
    console.error("Failed to generate report:", error);

    res.status(500).json({
      error: "FAILED_TO_GENERATE_REPORT",
    });
  }
});

/* GET SALES TRANSACTIONS FOR EXPORT */
router.get("/sales", async (req, res) => {
  try {
    const startDate =
      typeof req.query.startDate === "string"
        ? req.query.startDate
        : undefined;

    const endDate =
      typeof req.query.endDate === "string"
        ? req.query.endDate
        : undefined;

    if (
      (startDate && Number.isNaN(Date.parse(startDate))) ||
      (endDate && Number.isNaN(Date.parse(endDate)))
    ) {
      res.status(400).json({ error: "INVALID_DATE_RANGE" });
      return;
    }

    if (
      startDate &&
      endDate &&
      new Date(startDate) > new Date(endDate)
    ) {
      res.status(400).json({ error: "START_DATE_AFTER_END_DATE" });
      return;
    }

    res.json(await getReportSales(startDate, endDate));
  } catch (error) {
    console.error("Failed to fetch sales report:", error);
    res.status(500).json({ error: "FAILED_TO_FETCH_SALES_REPORT" });
  }
});

/* GET PAYMENT TRANSACTIONS FOR EXPORT */
router.get("/payments", async (req, res) => {
  try {
    const startDate =
      typeof req.query.startDate === "string"
        ? req.query.startDate
        : undefined;

    const endDate =
      typeof req.query.endDate === "string"
        ? req.query.endDate
        : undefined;

    if (
      (startDate && Number.isNaN(Date.parse(startDate))) ||
      (endDate && Number.isNaN(Date.parse(endDate)))
    ) {
      res.status(400).json({ error: "INVALID_DATE_RANGE" });
      return;
    }

    if (
      startDate &&
      endDate &&
      new Date(startDate) > new Date(endDate)
    ) {
      res.status(400).json({ error: "START_DATE_AFTER_END_DATE" });
      return;
    }

    res.json(await getReportPayments(startDate, endDate));
  } catch (error) {
    console.error("Failed to fetch payment report:", error);
    res.status(500).json({ error: "FAILED_TO_FETCH_PAYMENT_REPORT" });
  }
});

router.get("/daily-closing", async (req, res) => {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const startDate =
    typeof req.query.startDate === "string"
      ? req.query.startDate
      : today;

  const endDate =
    typeof req.query.endDate === "string"
      ? req.query.endDate
      : typeof req.query.date === "string"
        ? req.query.date
        : today;

  const isValidDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  };

  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate) ||
    startDate > endDate
  ) {
    return res.status(400).json({
      error: "INVALID_CLOSING_DATE_RANGE",
      message:
        "Provide valid dates with startDate less than or equal to endDate.",
    });
  }

  try {
    const report = await getDailyBusinessClosing(
      startDate,
      endDate
    );

    return res.json(report);
  } catch (error) {
    console.error("Daily closing report error:", error);

    return res.status(500).json({
      error: "DAILY_CLOSING_FAILED",
      message: "Unable to generate the daily closing report.",
    });
  }
});


/* GET DAILY BUSINESS CLOSING */
/*router.get("/daily-closing", async (req, res) => {
  try {
    const date =
      typeof req.query.date === "string"
        ? req.query.date
        : new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
          });

    // Require an actual YYYY-MM-DD calendar date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        error: "INVALID_CLOSING_DATE",
      });
      return;
    }

    const parsed = new Date(`${date}T00:00:00Z`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      res.status(400).json({
        error: "INVALID_CLOSING_DATE",
      });
      return;
    }

    const report = await getDailyBusinessClosing(date);
    res.json(report);
  } catch (error) {
    console.error("Failed to generate daily closing:", error);
    res.status(500).json({
      error: "FAILED_TO_GENERATE_DAILY_CLOSING",
    });
  }
});
*/

/* GET PROFIT ANALYSIS */
router.get("/profit", async (req, res) => {
  try {
    const startDate =
      typeof req.query.startDate === "string"
        ? req.query.startDate
        : undefined;

    const endDate =
      typeof req.query.endDate === "string"
        ? req.query.endDate
        : undefined;

    const isValidDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const parsed = new Date(`${value}T00:00:00Z`);

      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    };

    if (
      (startDate && !isValidDate(startDate)) ||
      (endDate && !isValidDate(endDate))
    ) {
      res.status(400).json({ error: "INVALID_DATE_RANGE" });
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      res.status(400).json({
        error: "START_DATE_AFTER_END_DATE",
      });
      return;
    }

    const report = await getReportProfit(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error("Failed to generate profit report:", error);

    res.status(500).json({
      error: "FAILED_TO_GENERATE_PROFIT_REPORT",
    });
  }
});


export default router;

