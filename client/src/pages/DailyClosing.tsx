
import { useCallback, useEffect, useState } from "react";
import "./DailyClosing.css";

const API_URL = "http://localhost:5000/api/reports/daily-closing";

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

export default function DailyClosing() {
  const [date, setDate] = useState(todayInIndia());
  const [report, setReport] = useState<DailyClosingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!date) {
      setError("Please select a date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("gasflow_token");

      const response = await fetch(
        `${API_URL}?date=${encodeURIComponent(date)}`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

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
  }, [date]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return (
    <main className="gf-closing-page">
      <div className="gf-closing-container">
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

        <section className="gf-closing-filter closing-no-print">
          <div className="gf-closing-date-field">
            <label htmlFor="closing-date">Select closing date</label>
            <input
              id="closing-date"
              type="date"
              value={date}
              max={todayInIndia()}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="gf-closing-button gf-closing-refresh"
            onClick={() => void loadReport()}
            disabled={loading || !date}
          >
            {loading ? "Loading report..." : "↻ Refresh Report"}
          </button>
        </section>

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

        {loading && !report && (
          <div className="gf-closing-loading" role="status">
            <span className="gf-closing-spinner" />
            Loading daily closing report...
          </div>
        )}

        {report && (
          <>
            <div className="gf-closing-report-heading">
              <div>
                <h2>Closing for {report.date}</h2>
                <p>Time zone: {report.timezone}</p>
              </div>
              <span className="gf-closing-report-badge">
                Daily Summary
              </span>
            </div>

            <section className="gf-closing-summary-grid">
              <article className="gf-closing-card gf-closing-sales">
                <div className="gf-closing-card-top">
                  <span className="gf-closing-icon">₹</span>
                  <span className="gf-closing-card-label">Daily Sales</span>
                </div>
                <h3>{currency(report.sales.totalAmount)}</h3>
                <div className="gf-closing-card-divider" />
                <div className="gf-closing-metric-row">
                  <span>Deliveries</span>
                  <strong>{report.sales.deliveryCount}</strong>
                </div>
                <div className="gf-closing-metric-row">
                  <span>Cylinders sold</span>
                  <strong>{report.sales.cylindersSold}</strong>
                </div>
              </article>

              <article className="gf-closing-card gf-closing-collections">
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

              <article className="gf-closing-card gf-closing-outstanding">
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

            <section className="gf-closing-detail-grid">
              <article className="gf-closing-card gf-closing-detail-card">
                <div className="gf-closing-section-heading">
                  <div>
                    <h2>Collection Breakdown</h2>
                    <p>Payments grouped by method</p>
                  </div>
                  <span className="gf-closing-section-icon">₹</span>
                </div>

                {Object.keys(report.collections.byMethod).length === 0 ? (
                  <p className="gf-closing-empty">
                    No collections recorded for this date.
                  </p>
                ) : (
                  Object.entries(report.collections.byMethod).map(
                    ([method, amount]) => (
                      <div className="gf-closing-list-row" key={method}>
                        <span>{formatLabel(method)}</span>
                        <strong>{currency(amount)}</strong>
                      </div>
                    )
                  )
                )}
              </article>

              <article className="gf-closing-card gf-closing-detail-card">
                <div className="gf-closing-section-heading">
                  <div>
                    <h2>Inventory Movements</h2>
                    <p>Stock activity for the selected date</p>
                  </div>
                  <span className="gf-closing-section-icon">▦</span>
                </div>

                {Object.keys(report.inventoryMovements).length === 0 ? (
                  <p className="gf-closing-empty">
                    No inventory movements recorded for this date.
                  </p>
                ) : (
                  Object.entries(report.inventoryMovements).map(
                    ([movement, quantity]) => (
                      <div className="gf-closing-list-row" key={movement}>
                        <span>{formatLabel(movement)}</span>
                        <strong>{quantity}</strong>
                      </div>
                    )
                  )
                )}
              </article>
            </section>

            <section className="gf-closing-card gf-closing-notes">
              <div className="gf-closing-section-heading">
                <div>
                  <h2>Closing Notes</h2>
                  <p>Report observations for the selected date</p>
                </div>
                <span className="gf-closing-section-icon">☷</span>
              </div>

              {report.notes.length === 0 ? (
                <p className="gf-closing-empty">No closing notes available.</p>
              ) : (
                <ul className="gf-closing-notes-list">
                  {report.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              )}

              <div className="gf-closing-footer">
                Generated by GasFlow · {report.date}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
