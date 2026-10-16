
import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import "./DailyClosing.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const API_URL = `${API_BASE_URL}/reports/daily-closing`;

type DailyClosingReport = {
  date: string;
  timezone: string;
  sales: {
    totalAmount: number;
    deliveryCount: number;
    cylindersSold: number;
  };
  collections: {
    totalAmount: number;
    paymentCount: number;
    byMethod: Record<string, number>;
  };
  outstanding: {
    totalAmount: number;
    customerCount: number;
  };
  inventoryMovements: Record<string, number>;
  notes: string[];
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const todayInIndia = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

const navigateTo = (path: string) => {
  window.location.assign(path);
};

export default function DailyClosing() {
  // Both pickers default to today's date in India.
  const [date, setDate] = useState(todayInIndia());
  const [startDate, setStartDate] = useState(todayInIndia());

  const [report, setReport] = useState<DailyClosingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!startDate || !date) {
      setError("Please select both starting and closing dates.");
      return;
    }

    if (startDate > date) {
      setError("Starting date cannot be after the closing date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("gasflow_token");

      const query = new URLSearchParams({
        startDate,
        date,
      });

      const response = await fetch(`${API_URL}?${query.toString()}`, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            "Unable to load the daily closing report."
        );
      }

      setReport(result.data ?? result);
    } catch (err) {
      setReport(null);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the report."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, date]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  // Keyboard support for clickable cards.
  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    path: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateTo(path);
    }
  };

  // Allows the nested metric links to navigate separately.
  const handleMetricClick = (
    event: MouseEvent<HTMLElement>,
    path: string
  ) => {
    event.stopPropagation();
    navigateTo(path);
  };

  const handleMetricKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    path: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      navigateTo(path);
    }
  };

  return (
    <main className="gf-closing-page">
      <div className="gf-closing-container">
        {/* Page header */}
        <header className="gf-closing-header">
          <div>
            <p className="gf-closing-eyebrow">
              GASFLOW / BUSINESS REPORTS
            </p>

            <h1>Daily Business Closing</h1>

            <p className="gf-closing-subtitle">
              Review your daily sales, collections and stock activity.
            </p>
          </div>

          <button
            type="button"
            className="gf-closing-button gf-closing-print closing-no-print"
            onClick={() => window.print()}
            disabled={!report || loading}
          >
            <span aria-hidden="true">▤</span>
            Print / Save PDF
          </button>
        </header>

        {/* Date range filter */}
        <section className="gf-closing-filter closing-no-print">
          {/* Starting date picker */}
          <div className="gf-closing-date-field">
            <label htmlFor="starting-date">
              Select starting date
            </label>

            <input
              id="starting-date"
              type="date"
              value={startDate}
              max={date || todayInIndia()}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          {/* Existing closing date picker */}
          <div className="gf-closing-date-field">
            <label htmlFor="closing-date">
              Select closing date
            </label>

            <input
              id="closing-date"
              type="date"
              value={date}
              min={startDate}
              max={todayInIndia()}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="gf-closing-button gf-closing-refresh"
            onClick={() => void loadReport()}
            disabled={
              loading ||
              !startDate ||
              !date ||
              startDate > date
            }
          >
            {loading ? "Loading report..." : "↻ Refresh Report"}
          </button>
        </section>

        {/* Error message */}
        {error && (
          <div className="gf-closing-alert" role="alert">
            <div>
              <strong>Unable to load report</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              className="gf-closing-button gf-closing-retry"
              onClick={() => void loadReport()}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        )}

        {/* Initial loading indicator */}
        {loading && !report && (
          <div className="gf-closing-loading" role="status">
            <span className="gf-closing-spinner" />
            Loading daily closing report...
          </div>
        )}

        {/* Report content */}
        {report && (
          <>
            <div className="gf-closing-report-heading">
              <div>
                <h2>
                  Closing for {startDate} to {date}
                </h2>
                <p>Time zone: {report.timezone}</p>
              </div>

              <span className="gf-closing-report-badge">
                Daily Summary
              </span>
            </div>

            {/* Summary cards */}
            <section className="gf-closing-summary-grid">
              {/* Daily Sales */}
              <article
                className="gf-closing-card gf-closing-sales gf-closing-clickable"
                role="link"
                tabIndex={0}
                aria-label="Daily Sales. Open Daily Payments."
                onClick={() => navigateTo("/daily-payments")}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, "/daily-payments")
                }
              >
                <div className="gf-closing-card-top">
                  <span className="gf-closing-icon">₹</span>
                  <span className="gf-closing-card-label">
                    Daily Sales
                  </span>
                </div>

                <h3>{currency(report.sales.totalAmount)}</h3>

                <div className="gf-closing-card-divider" />

                <div
                  className="gf-closing-metric-row gf-closing-metric-link"
                  role="link"
                  tabIndex={0}
                  onClick={(event) =>
                    handleMetricClick(event, "/deliveries")
                  }
                  onKeyDown={(event) =>
                    handleMetricKeyDown(event, "/deliveries")
                  }
                >
                  <span>Deliveries</span>
                  <strong>{report.sales.deliveryCount}</strong>
                </div>

                <div
                  className="gf-closing-metric-row gf-closing-metric-link"
                  role="link"
                  tabIndex={0}
                  onClick={(event) =>
                    handleMetricClick(event, "/inventory")
                  }
                  onKeyDown={(event) =>
                    handleMetricKeyDown(event, "/inventory")
                  }
                >
                  <span>Cylinders sold</span>
                  <strong>{report.sales.cylindersSold}</strong>
                </div>
              </article>

              {/* Payments Collected */}
              <article
                className="gf-closing-card gf-closing-collections gf-closing-clickable"
                role="link"
                tabIndex={0}
                aria-label="Payments Collected. Open Daily Payments."
                onClick={() => navigateTo("/daily-payments")}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, "/daily-payments")
                }
              >
                <div className="gf-closing-card-top">
                  <span className="gf-closing-icon">↗</span>
                  <span className="gf-closing-card-label">
                    Payments Collected
                  </span>
                </div>

                <h3>{currency(report.collections.totalAmount)}</h3>

                <div className="gf-closing-card-divider" />

                <div className="gf-closing-metric-row">
                  <span>Payment transactions</span>
                  <strong>{report.collections.paymentCount}</strong>
                </div>
              </article>

              {/* Outstanding Balance */}
              <article
                className="gf-closing-card gf-closing-outstanding gf-closing-clickable"
                role="link"
                tabIndex={0}
                aria-label="Outstanding Balance. Open Payment Reminders."
                onClick={() => navigateTo("/payment-reminders")}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, "/payment-reminders")
                }
              >
                <div className="gf-closing-card-top">
                  <span className="gf-closing-icon">◷</span>
                  <span className="gf-closing-card-label">
                    Outstanding Balance
                  </span>
                </div>

                <h3>{currency(report.outstanding.totalAmount)}</h3>

                <div className="gf-closing-card-divider" />

                <div className="gf-closing-metric-row">
                  <span>Customers in report</span>
                  <strong>{report.outstanding.customerCount}</strong>
                </div>
              </article>
            </section>

            {/* Detailed report cards */}
            <section className="gf-closing-detail-grid">
              {/* Collection Breakdown */}
              <article
                className="gf-closing-card gf-closing-detail-card gf-closing-clickable"
                role="link"
                tabIndex={0}
                aria-label="Collection Breakdown. Open Daily Payments."
                onClick={() => navigateTo("/daily-payments")}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, "/daily-payments")
                }
              >
                <div className="gf-closing-section-heading">
                  <div>
                    <h2>Collection Breakdown</h2>
                    <p>Payments grouped by method</p>
                  </div>

                  <span className="gf-closing-section-icon">₹</span>
                </div>

                {Object.keys(report.collections.byMethod).length ===
                0 ? (
                  <p className="gf-closing-empty">
                    No collections recorded for this period.
                  </p>
                ) : (
                  Object.entries(report.collections.byMethod).map(
                    ([method, amount]) => (
                      <div
                        className="gf-closing-list-row"
                        key={method}
                      >
                        <span>{formatLabel(method)}</span>
                        <strong>{currency(amount)}</strong>
                      </div>
                    )
                  )
                )}
              </article>

              {/* Inventory Movements */}
              <article
                className="gf-closing-card gf-closing-detail-card gf-closing-clickable"
                role="link"
                tabIndex={0}
                aria-label="Inventory Movements. Open Inventory."
                onClick={() => navigateTo("/inventory")}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, "/inventory")
                }
              >
                <div className="gf-closing-section-heading">
                  <div>
                    <h2>Inventory Movements</h2>
                    <p>Stock activity for the selected period</p>
                  </div>

                  <span className="gf-closing-section-icon">▦</span>
                </div>

                {Object.keys(report.inventoryMovements).length ===
                0 ? (
                  <p className="gf-closing-empty">
                    No inventory movements recorded for this period.
                  </p>
                ) : (
                  Object.entries(report.inventoryMovements).map(
                    ([movement, quantity]) => (
                      <div
                        className="gf-closing-list-row"
                        key={movement}
                      >
                        <span>{formatLabel(movement)}</span>
                        <strong>{quantity}</strong>
                      </div>
                    )
                  )
                )}
              </article>
            </section>

            {/* Closing notes */}
            <section className="gf-closing-card gf-closing-notes">
              <div className="gf-closing-section-heading">
                <div>
                  <h2>Closing Notes</h2>
                  <p>Report observations for the selected period</p>
                </div>

                <span className="gf-closing-section-icon">☷</span>
              </div>

              {report.notes.length === 0 ? (
                <p className="gf-closing-empty">
                  No closing notes available.
                </p>
              ) : (
                <ul className="gf-closing-notes-list">
                  {report.notes.map((note, index) => (
                    <li key={`${index}-${note}`}>{note}</li>
                  ))}
                </ul>
              )}

              <div className="gf-closing-footer">
                Generated by GasFlow · {startDate} to {date}
              </div>
            </section>
          </>
        )}

        {/* Back button */}
        <div className="gf-closing-bottom-nav closing-no-print">
          <button
            type="button"
            className="gf-closing-button gf-closing-back"
            onClick={() => navigateTo("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
