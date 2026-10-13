import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type ReportSummary = {
  startDate: string | null;
  endDate: string | null;
  totalCustomers: number;
  totalSales: number;
  totalPayments: number;
  totalCylindersSold: number;
  totalDeliveries: number;
  totalOutstanding: number;
};

type SalesRow = {
  deliveryDate: string;
  totalAmount: number | string;
};

type PaymentRow = {
  paymentDate: string;
  amount: number | string;
};

type DailyChartData = {
  date: string;
  sales: number;
  payments: number;
};

type ProfitBreakdownRow = {
  cylinderTypeId: number;
  cylinderTypeName: string;
  quantitySold: number;
  salesRevenue: number;
  estimatedCost: number;
  estimatedGrossProfit: number;
};

type ProfitReport = {
  startDate: string | null;
  endDate: string | null;
  totalDeliveries: number;
  totalCylindersSold: number;
  totalSales: number;
  estimatedCost: number;
  estimatedGrossProfit: number;
  estimatedProfitMargin: number;
  cylinderBreakdown: ProfitBreakdownRow[];
  notes: string[];
};

const API_URL = "http://localhost:5000/api/reports";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/* DOWNLOAD CSV FILE */
function downloadCSV(
  filename: string,
  rows: Record<string, unknown>[]
) {
  if (rows.length === 0) {
    alert("No records available to export.");
    return;
  }

  const headers = Object.keys(rows[0]);

  const escapeCSV = (value: unknown) => {
    let text = String(value ?? "");

    if (/^[\t\r ]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCSV(row[header])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* CONVERT DATE TO YYYY-MM-DD WITHOUT UTC DATE SHIFT */
function getDateKey(value: string) {
  const datePart = value.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* COMBINE DAILY SALES AND PAYMENTS */
function buildDailyChartData(
  salesRows: SalesRow[],
  paymentRows: PaymentRow[],
  startDate: string,
  endDate: string
): DailyChartData[] {
  const dailyTotals = new Map<string, DailyChartData>();

  const addDate = (date: string) => {
    if (!dailyTotals.has(date)) {
      dailyTotals.set(date, {
        date,
        sales: 0,
        payments: 0,
      });
    }

    return dailyTotals.get(date)!;
  };

  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    addDate(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  for (const row of salesRows) {
    const date = getDateKey(row.deliveryDate);

    if (date && date >= startDate && date <= endDate) {
      addDate(date).sales += Number(row.totalAmount) || 0;
    }
  }

  for (const row of paymentRows) {
    const date = getDateKey(row.paymentDate);

    if (date && date >= startDate && date <= endDate) {
      addDate(date).payments += Number(row.amount) || 0;
    }
  }

  return Array.from(dailyTotals.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export default function Reports() {
  const today = new Date();

  const firstDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const toDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(toDateInput(firstDay));
  const [endDate, setEndDate] = useState(toDateInput(today));

  const [report, setReport] = useState<ReportSummary | null>(null);
  const [chartData, setChartData] = useState<DailyChartData[]>([]);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<
    "sales" | "payments" | null
  >(null);
  const [error, setError] = useState("");

  /* LOAD SUMMARY, CHARTS AND PROFIT DATA */
  async function loadReport() {
    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const [
        summaryResponse,
        salesResponse,
        paymentsResponse,
        profitResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/summary?${params.toString()}`),
        fetch(`${API_URL}/sales?${params.toString()}`),
        fetch(`${API_URL}/payments?${params.toString()}`),
        fetch(`${API_URL}/profit?${params.toString()}`),
      ]);

      if (
        !summaryResponse.ok ||
        !salesResponse.ok ||
        !paymentsResponse.ok ||
        !profitResponse.ok
      ) {
        throw new Error("Unable to load report data.");
      }

      const summaryData: ReportSummary =
        await summaryResponse.json();

      const salesRows: SalesRow[] =
        await salesResponse.json();

      const paymentRows: PaymentRow[] =
        await paymentsResponse.json();

      const profitData: ProfitReport =
        await profitResponse.json();

      if (
        !Array.isArray(salesRows) ||
        !Array.isArray(paymentRows) ||
        !Array.isArray(profitData.cylinderBreakdown) ||
        !Array.isArray(profitData.notes)
      ) {
        throw new Error("Invalid report data received.");
      }

      setReport(summaryData);
      setProfitReport(profitData);

      setChartData(
        buildDailyChartData(
          salesRows,
          paymentRows,
          startDate,
          endDate
        )
      );
    } catch (error) {
      console.error("Report loading failed:", error);

      setError(
        "Could not load reports. Check the backend and ensure the summary, sales, payments and profit API routes are available."
      );

      setReport(null);
      setProfitReport(null);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }

  /* EXPORT SALES OR PAYMENT TRANSACTIONS */
  async function exportTransactions(
    type: "sales" | "payments"
  ) {
    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    setExporting(type);
    setError("");

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(
        `${API_URL}/${type}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to export ${type} report.`);
      }

      const rows: Record<string, unknown>[] =
        await response.json();

      if (!Array.isArray(rows)) {
        throw new Error("Invalid report data.");
      }

      downloadCSV(
        `gasflow-${type}-${startDate}-to-${endDate}.csv`,
        rows
      );
    } catch (error) {
      console.error("Report export failed:", error);

      setError(
        `Could not export the ${type} report. Check that the backend export route is available.`
      );
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  /* ---------- Presentation only ---------- */

  const cards = [
    {
      title: "Total Sales",
      value: formatCurrency(report?.totalSales ?? 0),
      tone: "blue",
    },
    {
      title: "Payments Collected",
      value: formatCurrency(report?.totalPayments ?? 0),
      tone: "green",
    },
    {
      title: "Outstanding Balance",
      value: formatCurrency(report?.totalOutstanding ?? 0),
      tone: "red",
    },
    {
      title: "Total Customers",
      value: String(report?.totalCustomers ?? 0),
      tone: "purple",
    },
    {
      title: "Deliveries",
      value: String(report?.totalDeliveries ?? 0),
      tone: "amber",
    },
    {
      title: "Cylinders Sold",
      value: String(report?.totalCylindersSold ?? 0),
      tone: "teal",
    },
  ];

  const profitCards = [
    {
      title: "Sales Revenue",
      value: profitReport?.totalSales ?? 0,
      tone: "blue",
    },
    {
      title: "Estimated Cylinder Cost",
      value: profitReport?.estimatedCost ?? 0,
      tone: "amber",
    },
    {
      title: "Estimated Gross Profit",
      value: profitReport?.estimatedGrossProfit ?? 0,
      tone: (profitReport?.estimatedGrossProfit ?? 0) >= 0 ? "green" : "red",
    },
  ];

  const axisStyle = {
    fill: "#64748b",
    fontSize: 11,
  };

  const tooltipStyle = {
    contentStyle: {
      background: "#ffffff",
      border: "1px solid #e5e9f0",
      borderRadius: 10,
      color: "#0f172a",
      boxShadow: "0 8px 20px rgba(15, 23, 42, .1)",
    },
    labelStyle: { color: "#0f172a", fontWeight: 700 },
  };

  const SALES_COLOR = "#4f46e5";
  const PAYMENTS_COLOR = "#10b981";

  const margin = profitReport?.estimatedProfitMargin ?? 0;

  return (
    <main className="rp">
      <style>{reportStyles}</style>

      <div className="rp-inner">
        {/* Hero */}
        <header className="rp-hero">
          <div className="rp-hero-text">
            <span className="rp-hero-tag">
              {startDate} → {endDate}
            </span>
            <h1>Reports &amp; Analytics</h1>
            <p>
              Track gas sales, collections, deliveries, customer dues and
              estimated profit.
            </p>
          </div>
        </header>

        {/* Filters and actions */}
        <section className="rp-filters">
          <div className="rp-filter-fields">
            <label className="rp-field">
              <span>Start date</span>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="rp-field">
              <span>End date</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading || exporting !== null}
              className="rp-btn rp-btn-primary"
            >
              {loading ? "Loading..." : "Generate Report"}
            </button>
          </div>

          <div className="rp-filter-actions">
            <button
              type="button"
              onClick={() => window.print()}
              className="rp-btn rp-btn-outline"
            >
              Print Report
            </button>

            <button
              type="button"
              onClick={() => void exportTransactions("sales")}
              disabled={exporting !== null || loading}
              className="rp-btn rp-btn-green"
            >
              {exporting === "sales"
                ? "Exporting Sales..."
                : "Export Sales CSV"}
            </button>

            <button
              type="button"
              onClick={() => void exportTransactions("payments")}
              disabled={exporting !== null || loading}
              className="rp-btn rp-btn-purple"
            >
              {exporting === "payments"
                ? "Exporting Payments..."
                : "Export Payments CSV"}
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <p role="alert" className="rp-error">
            {error}
          </p>
        )}

        {loading && <p className="rp-loading">Loading report data...</p>}

        {/* Summary cards */}
        <section className="rp-grid rp-grid-summary">
          {cards.map((card) => (
            <article key={card.title} className={`rp-card rp-tone-${card.tone}`}>
              <p className="rp-card-title">{card.title}</p>
              <h2 className="rp-card-value">{card.value}</h2>
            </article>
          ))}
        </section>

        {/* Profit analysis */}
        <section className="rp-panel">
          <div className="rp-panel-head">
            <div>
              <h2>Profit Analysis</h2>
              <p className="rp-sub">
                Estimated gross profit for {startDate} to {endDate}
              </p>
            </div>
            <span
              className={`rp-margin ${margin >= 0 ? "margin-pos" : "margin-neg"}`}
            >
              Margin {margin.toFixed(2)}%
            </span>
          </div>

          <div className="rp-grid rp-grid-profit">
            {profitCards.map((item) => (
              <article
                key={item.title}
                className={`rp-mini rp-tone-${item.tone}`}
              >
                <p className="rp-card-title">{item.title}</p>
                <h3 className="rp-mini-value">{formatCurrency(item.value)}</h3>
              </article>
            ))}
          </div>

          <p className="rp-meta">
            Deliveries: {profitReport?.totalDeliveries ?? 0} · Cylinders sold:{" "}
            {profitReport?.totalCylindersSold ?? 0}
          </p>

          <h3 className="rp-subtitle">Cylinder-wise Breakdown</h3>

          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  {[
                    "Cylinder Type",
                    "Quantity Sold",
                    "Sales Revenue",
                    "Estimated Cost",
                    "Estimated Gross Profit",
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(profitReport?.cylinderBreakdown ?? []).map((row) => (
                  <tr key={row.cylinderTypeId}>
                    <td className="strong">{row.cylinderTypeName}</td>
                    <td>{row.quantitySold}</td>
                    <td>{formatCurrency(row.salesRevenue)}</td>
                    <td>{formatCurrency(row.estimatedCost)}</td>
                    <td
                      className={
                        row.estimatedGrossProfit >= 0 ? "pos" : "neg"
                      }
                    >
                      {formatCurrency(row.estimatedGrossProfit)}
                    </td>
                  </tr>
                ))}

                {profitReport &&
                  profitReport.cylinderBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={5} className="rp-table-empty">
                        No deliveries found for this period.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {profitReport?.notes.map((note, index) => (
            <p key={`${index}-${note}`} className="rp-note">
              • {note}
            </p>
          ))}
        </section>

        {/* Charts */}
        <section className="rp-grid rp-grid-charts">
          {/* Daily sales */}
          <article className="rp-panel rp-chart">
            <h3>Daily Sales</h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#e5e9f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={axisStyle} minTickGap={25} />
                <YAxis
                  tick={axisStyle}
                  tickFormatter={(value: number) =>
                    `₹${Number(value).toLocaleString("en-IN")}`
                  }
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Sales",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="sales"
                  name="Sales"
                  fill={SALES_COLOR}
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </article>

          {/* Daily payments */}
          <article className="rp-panel rp-chart">
            <h3>Daily Payments Collected</h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#e5e9f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={axisStyle} minTickGap={25} />
                <YAxis
                  tick={axisStyle}
                  tickFormatter={(value: number) =>
                    `₹${Number(value).toLocaleString("en-IN")}`
                  }
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Payments",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="payments"
                  name="Payments"
                  fill={PAYMENTS_COLOR}
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </article>

          {/* Sales vs payments */}
          <article className="rp-panel rp-chart rp-chart-wide">
            <h3>Sales vs Payments Collected</h3>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e5e9f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={axisStyle} minTickGap={25} />
                <YAxis
                  tick={axisStyle}
                  tickFormatter={(value: number) =>
                    `₹${Number(value).toLocaleString("en-IN")}`
                  }
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    String(name),
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke={SALES_COLOR}
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="payments"
                  name="Payments"
                  stroke={PAYMENTS_COLOR}
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </article>
        </section>

        {/* Report period */}
        <section className="rp-panel rp-period">
          <h3>Report Period</h3>
          <p className="rp-period-range">
            {startDate} to {endDate}
          </p>
          <p className="rp-sub">
            Sales and payments use the selected dates. Outstanding balance
            reflects all recorded transactions to date.
          </p>
        </section>
      </div>
    </main>
  );
}

const reportStyles = `
  .rp {
    --ink: #0f172a;
    --text: #334155;
    --muted: #64748b;
    --line: #e5e9f0;
    --bg: #f4f6fb;
    --brand: #4f46e5;
    --brand-dark: #4338ca;
    box-sizing: border-box;
    width: 100%;
    min-height: 100vh;
    padding: clamp(16px, 2.4vw, 32px);
    background: var(--bg);
    color: var(--text);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.55;
  }
  .rp *, .rp *::before, .rp *::after { box-sizing: border-box; }
  .rp-inner { max-width: 1240px; margin: 0 auto; }
  .rp h1, .rp h2, .rp h3 { margin: 0; color: var(--ink); }
  .rp p { margin: 0; }

  /* Hero */
  .rp-hero {
    position: relative;
    overflow: hidden;
    padding: 28px 30px;
    color: #fff;
    border-radius: 20px;
    background: linear-gradient(120deg, #1e1b4b 0%, #3730a3 55%, #4f46e5 100%);
    box-shadow: 0 16px 34px rgba(55, 48, 163, .22);
  }
  .rp-hero::before, .rp-hero::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    background: rgba(255,255,255,.07);
  }
  .rp-hero::before { width: 260px; height: 260px; right: -70px; top: -120px; }
  .rp-hero::after { width: 150px; height: 150px; right: 150px; bottom: -105px; }
  .rp-hero-text { position: relative; z-index: 1; }
  .rp-hero-tag {
    display: inline-block;
    margin-bottom: 10px;
    padding: 4px 11px;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    background: rgba(255,255,255,.16);
    border: 1px solid rgba(255,255,255,.24);
    border-radius: 999px;
  }
  .rp .rp-hero h1 {
    color: #fff;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -.8px;
  }
  .rp .rp-hero p { margin-top: 6px; color: rgba(255,255,255,.82); }

  /* Filters */
  .rp-filters {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 20px;
    padding: 18px 20px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .035);
  }
  .rp-filter-fields, .rp-filter-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px;
  }
  .rp-field { display: grid; gap: 6px; }
  .rp-field span { font-size: 12px; font-weight: 700; color: var(--muted); }
  .rp-field input {
    padding: 10px 12px;
    font: inherit;
    color: var(--ink);
    background: #f8fafc;
    border: 1px solid var(--line);
    border-radius: 10px;
    outline: none;
    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
  }
  .rp-field input:focus {
    background: #fff;
    border-color: var(--brand);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, .15);
  }

  .rp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 11px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    border: 1px solid transparent;
    border-radius: 10px;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, transform .15s ease, opacity .15s ease;
  }
  .rp-btn:disabled { opacity: .55; cursor: not-allowed; }
  .rp-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .rp-btn-primary { color: #fff; background: var(--brand); }
  .rp-btn-primary:hover:not(:disabled) { background: var(--brand-dark); }
  .rp-btn-outline { color: #3b4a73; background: #fff; border-color: var(--line); }
  .rp-btn-outline:hover:not(:disabled) { background: #eef0ff; border-color: #c7cdf5; }
  .rp-btn-green { color: #fff; background: #059669; }
  .rp-btn-green:hover:not(:disabled) { background: #047857; }
  .rp-btn-purple { color: #fff; background: #7c3aed; }
  .rp-btn-purple:hover:not(:disabled) { background: #6d28d9; }

  .rp-error {
    margin-top: 16px;
    padding: 14px 16px;
    color: #991b1b;
    font-weight: 600;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
  }
  .rp-loading { margin-top: 16px; color: var(--muted); font-weight: 600; }

  /* Grids */
  .rp-grid { display: grid; gap: 16px; }
  .rp-grid-summary {
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    margin-top: 20px;
  }
  .rp-grid-profit {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    margin-top: 18px;
  }
  .rp-grid-charts {
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    margin-top: 22px;
  }

  /* Tone colors */
  .rp-tone-blue   { --tone: #4f46e5; --tone-soft: #eef0ff; }
  .rp-tone-green  { --tone: #059669; --tone-soft: #e8f8f1; }
  .rp-tone-red    { --tone: #dc2626; --tone-soft: #fef0f0; }
  .rp-tone-purple { --tone: #7c3aed; --tone-soft: #f4edff; }
  .rp-tone-amber  { --tone: #d97706; --tone-soft: #fff7e6; }
  .rp-tone-teal   { --tone: #0d9488; --tone-soft: #e6f8f5; }

  /* Summary cards */
  .rp-card {
    min-width: 0;
    padding: 20px 22px;
    background: linear-gradient(var(--tone-soft), #fff 75%);
    border: 1px solid var(--line);
    border-top: 3px solid var(--tone);
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .035);
    transition: transform .18s ease, box-shadow .18s ease;
  }
  .rp-card:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(15, 23, 42, .08); }
  .rp-card-title { font-size: 13px; font-weight: 650; color: var(--muted); }
  .rp-card-value {
    margin-top: 10px !important;
    font-size: clamp(22px, 2vw, 27px);
    font-weight: 800;
    letter-spacing: -.7px;
    color: var(--tone) !important;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  /* Panels */
  .rp-panel {
    min-width: 0;
    margin-top: 22px;
    padding: 22px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 2px 10px rgba(15, 23, 42, .04);
  }
  .rp-grid-charts .rp-panel { margin-top: 0; }
  .rp-panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  .rp-panel h2 { font-size: 19px; font-weight: 780; letter-spacing: -.4px; }
  .rp-panel h3 { font-size: 16px; font-weight: 750; }
  .rp-sub { margin-top: 4px; font-size: 13px; color: var(--muted); }

  .rp-margin {
    padding: 6px 13px;
    font-size: 12.5px;
    font-weight: 800;
    border-radius: 999px;
  }
  .margin-pos { color: #047857; background: #d1fae5; }
  .margin-neg { color: #b91c1c; background: #fee2e2; }

  .rp-mini {
    padding: 16px 18px;
    background: var(--tone-soft);
    border: 1px solid var(--line);
    border-left: 4px solid var(--tone);
    border-radius: 13px;
  }
  .rp-mini-value {
    margin-top: 8px !important;
    font-size: 21px !important;
    font-weight: 800;
    letter-spacing: -.5px;
    color: var(--tone) !important;
    overflow-wrap: anywhere;
  }
  .rp-meta { margin-top: 16px; font-size: 13px; color: var(--muted); }
  .rp-subtitle { margin-top: 24px !important; margin-bottom: 12px !important; }

  /* Table */
  .rp-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 14px;
  }
  .rp-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  .rp-table th {
    padding: 13px 16px;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: .7px;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--muted);
    background: #f8fafc;
    border-bottom: 1px solid var(--line);
  }
  .rp-table td {
    padding: 14px 16px;
    color: var(--text);
    white-space: nowrap;
    border-bottom: 1px solid #eef1f6;
    font-variant-numeric: tabular-nums;
  }
  .rp-table tbody tr:last-child td { border-bottom: 0; }
  .rp-table tbody tr:hover td { background: #fafbff; }
  .rp-table td.strong { color: var(--ink); font-weight: 700; }
  .rp-table td.pos { color: #047857; font-weight: 750; }
  .rp-table td.neg { color: #b91c1c; font-weight: 750; }
  .rp-table td.rp-table-empty {
    padding: 26px;
    text-align: center;
    white-space: normal;
    color: var(--muted);
  }

  .rp-note {
    margin-top: 12px;
    padding: 10px 14px;
    font-size: 13px;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 10px;
  }

  /* Charts */
  .rp-chart h3 { margin-bottom: 18px; }
  .rp-chart-wide { grid-column: 1 / -1; }

  /* Period */
  .rp-period h3 { margin-bottom: 8px; }
  .rp-period-range { font-weight: 700; color: var(--ink); margin-bottom: 4px; }

  /* Responsive */
  @media (max-width: 720px) {
    .rp { padding: 14px; }
    .rp-hero { padding: 22px 20px; border-radius: 16px; }
    .rp-filters { padding: 16px; }
    .rp-filter-fields, .rp-filter-actions { width: 100%; }
    .rp-field { flex: 1 1 140px; }
    .rp-filter-fields .rp-btn, .rp-filter-actions .rp-btn { flex: 1 1 100%; }
    .rp-panel { padding: 16px; border-radius: 15px; }
    .rp-grid-charts { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rp-card, .rp-btn { transition: none; }
  }

  /* Print */
  @media print {
    body { background: white !important; }
    .rp { background: white !important; padding: 12px !important; }
    .rp-hero { background: #1e1b4b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .rp button, .rp input { display: none !important; }
    .rp-filters { display: none !important; }
    .rp-card, .rp-panel, .rp-mini { break-inside: avoid; box-shadow: none !important; }
  }
`;
