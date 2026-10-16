
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const INDIA_TIME_ZONE = "Asia/Kolkata";

type Customer = {
  id?: number | string;
  name?: string;
  mobile?: string;
};

type Payment = {
  id: number | string;
  customerId?: number | string;
  customerName?: string;
  customer?: Customer | null;
  Customers?: Customer | null;
  customers?: Customer | null;
  amount: number | string;
  paymentMethod?: string;
  paymentDate?: string;
  createdAt?: string;
  note?: string | null;
};

type CustomerMap = Record<string, Customer>;

type PaymentMethodTotal = {
  method: string;
  count: number;
  total: number;
};

const METHODS = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CHEQUE",
];

function getTodayIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function isValidDateString(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function getLocalDate(value?: string) {
  if (!value) return "";

  // Preserve date-only strings without timezone conversion.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getPaymentDate(payment: Payment) {
  return getLocalDate(payment.paymentDate || payment.createdAt);
}

function getMethod(method?: string) {
  return (method || "OTHER")
    .toUpperCase()
    .trim()
    .replaceAll(" ", "_");
}

function getCustomer(payment: Payment): Customer | null {
  return (
    payment.customer ??
    payment.Customers ??
    payment.customers ??
    null
  );
}

function getCustomerName(
  payment: Payment,
  customers: CustomerMap,
) {
  const customer = getCustomer(payment);

  if (customer?.name?.trim()) {
    return customer.name.trim();
  }

  if (payment.customerName?.trim()) {
    return payment.customerName.trim();
  }

  const customerId = payment.customerId ?? customer?.id;

  if (customerId != null) {
    const matchedCustomer = customers[String(customerId)];

    if (matchedCustomer?.name?.trim()) {
      return matchedCustomer.name.trim();
    }
  }

  return "Customer name unavailable";
}

function getCustomerMobile(
  payment: Payment,
  customers: CustomerMap,
) {
  const customer = getCustomer(payment);

  if (customer?.mobile) {
    return customer.mobile;
  }

  const customerId = payment.customerId ?? customer?.id;

  if (customerId != null) {
    return customers[String(customerId)]?.mobile || "—";
  }

  return "—";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    const [, year, month, day] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return value;
}

function getInitialDateRange(searchParams: URLSearchParams) {
  const today = getTodayIndia();

  const requestedStart = searchParams.get("startDate");
  const requestedEnd =
    searchParams.get("endDate") ?? searchParams.get("date");

  const startDate = isValidDateString(requestedStart)
    ? requestedStart
    : today;

  const endDate = isValidDateString(requestedEnd)
    ? requestedEnd
    : today;

  // Correct an invalid reversed range.
  if (startDate > endDate) {
    return {
      startDate: endDate,
      endDate: startDate,
    };
  }

  return { startDate, endDate };
}

export default function DailyPayments() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialRange = useMemo(
    () => getInitialDateRange(searchParams),
    // The initial date range is read when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<CustomerMap>({});

  const [startDate, setStartDate] = useState(
    initialRange.startDate,
  );

  const [endDate, setEndDate] = useState(
    initialRange.endDate,
  );

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        throw new Error(
          "Please log in to view daily payments.",
        );
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // Pass the selected range to the API.
      // Client-side filtering below also keeps the displayed
      // totals correct when the existing API returns all records.
      const paymentUrl = new URL(
        `${API_URL}/payments/`,
        window.location.origin,
      );

      paymentUrl.searchParams.set("startDate", startDate);
      paymentUrl.searchParams.set("endDate", endDate);

      const [paymentsResponse, customersResponse] =
        await Promise.all([
          fetch(paymentUrl.toString(), { headers }),
          fetch(`${API_URL}/customers/`, { headers }),
        ]);

      if (
        paymentsResponse.status === 401 ||
        customersResponse.status === 401
      ) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      if (!paymentsResponse.ok) {
        throw new Error(
          "Unable to load payments. Please try again.",
        );
      }

      const paymentsJson = await paymentsResponse.json();

      const paymentRows: Payment[] = Array.isArray(paymentsJson)
        ? paymentsJson
        : paymentsJson.data ?? paymentsJson.payments ?? [];

      setPayments(paymentRows);

      if (customersResponse.ok) {
        const customersJson = await customersResponse.json();

        const customerRows: Customer[] = Array.isArray(
          customersJson,
        )
          ? customersJson
          : customersJson.data ?? customersJson.customers ?? [];

        const customerMap: CustomerMap = {};

        customerRows.forEach((customer) => {
          if (customer.id != null) {
            customerMap[String(customer.id)] = customer;
          }
        });

        setCustomers(customerMap);
      } else {
        setCustomers({});
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  // Keep the selected range in the URL so the page can be
  // refreshed or shared without losing its date selection.
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    params.set("startDate", startDate);
    params.set("endDate", endDate);

    // Remove the old single-date parameter.
    params.delete("date");

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [
    startDate,
    endDate,
    searchParams,
    setSearchParams,
  ]);

  const dateRangeValid = startDate <= endDate;

  const dailyPayments = useMemo(() => {
    if (!dateRangeValid) return [];

    const query = search.trim().toLowerCase();

    return payments
      .filter((payment) => {
        const date = getPaymentDate(payment);

        return date >= startDate && date <= endDate;
      })
      .filter((payment) => {
        const method = getMethod(payment.paymentMethod);

        if (methodFilter === "ALL") return true;

        if (methodFilter === "OTHER") {
          return !METHODS.includes(method);
        }

        return method === methodFilter;
      })
      .filter((payment) => {
        if (!query) return true;

        return [
          getCustomerName(payment, customers),
          getCustomerMobile(payment, customers),
          String(payment.id),
          payment.note || "",
        ].some((value) =>
          value.toLowerCase().includes(query),
        );
      })
      .sort((a, b) => {
        const aTime = new Date(
          a.paymentDate || a.createdAt || 0,
        ).getTime();

        const bTime = new Date(
          b.paymentDate || b.createdAt || 0,
        ).getTime();

        return bTime - aTime;
      });
  }, [
    payments,
    customers,
    startDate,
    endDate,
    search,
    methodFilter,
    dateRangeValid,
  ]);

  const totalCollection = dailyPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const totalTransactions = dailyPayments.length;

  const uniqueCustomers = new Set(
    dailyPayments.map((payment) => {
      const customer = getCustomer(payment);

      return String(
        payment.customerId ?? customer?.id ?? payment.id,
      );
    }),
  ).size;

  const averagePayment =
    totalTransactions > 0
      ? totalCollection / totalTransactions
      : 0;

  const breakdown = useMemo<PaymentMethodTotal[]>(() => {
    const methods = [...METHODS, "OTHER"];

    return methods
      .map((method) => {
        const methodPayments = dailyPayments.filter(
          (payment) => {
            const paymentMethod = getMethod(
              payment.paymentMethod,
            );

            return method === "OTHER"
              ? !METHODS.includes(paymentMethod)
              : paymentMethod === method;
          },
        );

        return {
          method,
          count: methodPayments.length,
          total: methodPayments.reduce(
            (sum, payment) =>
              sum + Number(payment.amount || 0),
            0,
          ),
        };
      })
      .filter(
        (item) =>
          item.count > 0 || item.method !== "OTHER",
      );
  }, [dailyPayments]);

  const updateStartDate = (value: string) => {
    setStartDate(value);

    if (value > endDate) {
      setEndDate(value);
    }
  };

  const updateEndDate = (value: string) => {
    setEndDate(value);

    if (value < startDate) {
      setStartDate(value);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setMethodFilter("ALL");
  };

  return (
    <div className="daily-payments-page">
      <style>{`
        .daily-payments-page {
          min-height: 100vh;
          padding: 28px;
          background: #f4f6fb;
          color: #1f2937;
          font-family: Inter, Arial, sans-serif;
        }

        .dp-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .dp-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          padding: 30px;
          margin-bottom: 24px;
          color: white;
          border-radius: 20px;
          background: linear-gradient(135deg, #172554, #4f46e5);
          box-shadow: 0 12px 30px rgba(49, 46, 129, .18);
        }

        .dp-hero h1 {
          margin: 0 0 8px;
          font-size: clamp(24px, 3vw, 34px);
        }

        .dp-hero p {
          margin: 0;
          color: #e0e7ff;
          line-height: 1.6;
        }

        .dp-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .dp-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 10px;
          padding: 11px 16px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          transition: opacity .15s ease, transform .15s ease;
        }

        .dp-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .dp-button:disabled {
          cursor: not-allowed;
          opacity: .6;
        }

        .dp-button-light {
          color: #312e81;
          background: white;
        }

        .dp-button-outline {
          color: white;
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.35);
        }

        .dp-card {
          background: white;
          border: 1px solid #e8eaf2;
          border-radius: 16px;
          padding: 22px;
          margin-bottom: 22px;
          box-shadow: 0 5px 18px rgba(15,23,42,.035);
          min-width: 0;
        }

        .dp-filter-grid {
          display: grid;
          grid-template-columns:
            minmax(170px, .8fr)
            minmax(170px, .8fr)
            minmax(220px, 1.3fr)
            minmax(170px, .8fr);
          gap: 16px;
          align-items: end;
        }

        .dp-field {
          min-width: 0;
        }

        .dp-field label {
          display: block;
          margin-bottom: 8px;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
        }

        .dp-field input,
        .dp-field select {
          width: 100%;
          min-height: 44px;
          box-sizing: border-box;
          border: 1px solid #d8deea;
          border-radius: 10px;
          padding: 10px 12px;
          background: white;
          color: #111827;
          font: inherit;
          outline: none;
        }

        .dp-field input:focus,
        .dp-field select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,.12);
        }

        .dp-filter-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .dp-clear-button {
          background: #eef2ff;
          color: #4338ca;
        }

        .dp-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .dp-stat {
          padding: 21px;
          border: 1px solid #e8eaf2;
          border-radius: 15px;
          background: white;
          box-shadow: 0 5px 18px rgba(15,23,42,.035);
          min-width: 0;
        }

        .dp-stat-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .dp-stat-value {
          font-size: clamp(21px, 2vw, 28px);
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .dp-stat-note {
          color: #94a3b8;
          margin-top: 8px;
          font-size: 12px;
        }

        .dp-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .dp-section-heading h2 {
          margin: 0;
          font-size: 19px;
          color: #111827;
        }

        .dp-muted {
          color: #64748b;
          font-size: 13px;
        }

        /* Equal-width boxes: no empty final column or awkward gap. */
        .dp-breakdown {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
        }

        .dp-breakdown-item {
          padding: 17px;
          border: 1px solid #e8eaf2;
          border-radius: 12px;
          background: #fafbff;
          min-width: 0;
          box-sizing: border-box;
        }

        .dp-breakdown-method {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 10px;
          overflow-wrap: anywhere;
        }

        .dp-breakdown-total {
          color: #312e81;
          font-size: clamp(16px, 1.7vw, 20px);
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .dp-breakdown-count {
          margin-top: 7px;
          color: #94a3b8;
          font-size: 12px;
        }

        .dp-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e8eaf2;
          border-radius: 12px;
        }

        .dp-table {
          width: 100%;
          min-width: 850px;
          border-collapse: collapse;
          text-align: left;
        }

        .dp-table th {
          padding: 14px 16px;
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
          white-space: nowrap;
        }

        .dp-table td {
          padding: 15px 16px;
          border-top: 1px solid #eef0f5;
          font-size: 14px;
          vertical-align: middle;
        }

        .dp-customer-name {
          font-weight: 750;
          color: #111827;
          margin-bottom: 4px;
        }

        .dp-customer-mobile {
          color: #64748b;
          font-size: 12px;
        }

        .dp-method-badge {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 20px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .dp-amount {
          color: #047857;
          font-weight: 800;
          white-space: nowrap;
        }

        .dp-link {
          color: #4f46e5;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .dp-link:hover {
          text-decoration: underline;
        }

        .dp-alert {
          padding: 15px 17px;
          margin-bottom: 20px;
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fef2f2;
          color: #991b1b;
          line-height: 1.6;
        }

        .dp-empty {
          padding: 45px 18px;
          text-align: center;
          color: #64748b;
          line-height: 1.6;
        }

        .dp-empty strong {
          display: block;
          color: #1f2937;
          font-size: 16px;
          margin-bottom: 7px;
        }

        @media (max-width: 1100px) {
          .dp-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dp-breakdown {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .dp-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dp-breakdown {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .daily-payments-page {
            padding: 14px;
          }

          .dp-hero {
            padding: 22px;
          }

          .dp-card {
            padding: 16px;
          }

          .dp-stats {
            gap: 10px;
          }

          .dp-stat {
            padding: 15px;
          }

          .dp-filter-grid {
            grid-template-columns: 1fr;
          }

          .dp-breakdown {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .dp-breakdown-item {
            padding: 14px;
          }
        }
      `}</style>

      <div className="dp-container">
        <header className="dp-hero">
          <div>
            <h1>Daily Payments</h1>

            <p>
              View collections, payment methods and customers who paid.
            </p>

            <p style={{ marginTop: 8 }}>
              Selected period:{" "}
              <strong>
                {formatDate(startDate)} – {formatDate(endDate)}
              </strong>
            </p>
          </div>

          <div className="dp-actions">
            <button
              type="button"
              className="dp-button dp-button-outline"
              onClick={() => void fetchPayments()}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>

            <Link
              to="/dashboard"
              className="dp-button dp-button-light"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div className="dp-alert" role="alert">
            <strong>Error:</strong> {error}

            <button
              type="button"
              className="dp-button"
              style={{
                marginLeft: 12,
                background: "#fee2e2",
                color: "#991b1b",
              }}
              onClick={() => void fetchPayments()}
            >
              Try again
            </button>
          </div>
        )}

        <section className="dp-card">
          <div className="dp-section-heading">
            <h2>Filter Payments</h2>

            <span className="dp-muted">
              Select the beginning and closing dates
            </span>
          </div>

          <div className="dp-filter-grid">
            <div className="dp-field">
              <label htmlFor="startDate">Starting date</label>

              <input
                id="startDate"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) =>
                  updateStartDate(event.target.value)
                }
                required
              />
            </div>

            <div className="dp-field">
              <label htmlFor="endDate">Ending date</label>

              <input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) =>
                  updateEndDate(event.target.value)
                }
                required
              />
            </div>

            <div className="dp-field">
              <label htmlFor="paymentSearch">
                Search customer or payment
              </label>

              <input
                id="paymentSearch"
                type="search"
                placeholder="Name, mobile, payment ID or note..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <div className="dp-field">
              <label htmlFor="methodFilter">
                Payment method
              </label>

              <select
                id="methodFilter"
                value={methodFilter}
                onChange={(event) =>
                  setMethodFilter(event.target.value)
                }
              >
                <option value="ALL">All methods</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="dp-filter-actions">
            <button
              type="button"
              className="dp-button dp-clear-button"
              onClick={clearFilters}
            >
              Clear search and method
            </button>
          </div>
        </section>

        <section className="dp-stats">
          <div className="dp-stat">
            <div className="dp-stat-label">Total Collection</div>

            <div
              className="dp-stat-value"
              style={{ color: "#047857" }}
            >
              {formatCurrency(totalCollection)}
            </div>

            <div className="dp-stat-note">
              {formatDate(startDate)} – {formatDate(endDate)}
            </div>
          </div>

          <div className="dp-stat">
            <div className="dp-stat-label">Total Transactions</div>
            <div className="dp-stat-value">
              {totalTransactions}
            </div>
            <div className="dp-stat-note">
              Matching payments
            </div>
          </div>

          <div className="dp-stat">
            <div className="dp-stat-label">Customers Paid</div>
            <div className="dp-stat-value">
              {uniqueCustomers}
            </div>
            <div className="dp-stat-note">
              Unique customers
            </div>
          </div>

          <div className="dp-stat">
            <div className="dp-stat-label">Average Payment</div>
            <div className="dp-stat-value">
              {formatCurrency(averagePayment)}
            </div>
            <div className="dp-stat-note">
              Per transaction
            </div>
          </div>
        </section>

        <section className="dp-card">
          <div className="dp-section-heading">
            <h2>Collection Breakdown</h2>

            <span className="dp-muted">
              {formatDate(startDate)} – {formatDate(endDate)}
            </span>
          </div>

          <div className="dp-breakdown">
            {breakdown.map((item) => (
              <div
                className="dp-breakdown-item"
                key={item.method}
              >
                <div className="dp-breakdown-method">
                  {item.method.replaceAll("_", " ")}
                </div>

                <div className="dp-breakdown-total">
                  {formatCurrency(item.total)}
                </div>

                <div className="dp-breakdown-count">
                  {item.count} transaction
                  {item.count === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="dp-card">
          <div className="dp-section-heading">
            <div>
              <h2>Customers Who Paid</h2>

              <p
                className="dp-muted"
                style={{ marginBottom: 0 }}
              >
                Payments recorded from {formatDate(startDate)} to{" "}
                {formatDate(endDate)}
              </p>
            </div>

            <span className="dp-method-badge">
              {dailyPayments.length} RECORDS
            </span>
          </div>

          {loading ? (
            <div className="dp-empty">
              <strong>Loading payments...</strong>
              Please wait while payment records are fetched.
            </div>
          ) : dailyPayments.length === 0 ? (
            <div className="dp-empty">
              <strong>No payments found</strong>

              There are no matching payments from{" "}
              {formatDate(startDate)} to {formatDate(endDate)}.
              Try another date range or clear your filters.
            </div>
          ) : (
            <div className="dp-table-wrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Payment ID</th>
                    <th>Payment Date</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Note</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {dailyPayments.map((payment) => {
                    const customer = getCustomer(payment);

                    const customerId =
                      payment.customerId ?? customer?.id;

                    return (
                      <tr key={payment.id}>
                        <td>
                          <div className="dp-customer-name">
                            {getCustomerName(payment, customers)}
                          </div>

                          <div className="dp-customer-mobile">
                            {getCustomerMobile(payment, customers)}
                          </div>
                        </td>

                        <td>#{payment.id}</td>

                        <td>
                          {formatDate(getPaymentDate(payment))}
                        </td>

                        <td>
                          <span className="dp-method-badge">
                            {getMethod(
                              payment.paymentMethod,
                            ).replaceAll("_", " ")}
                          </span>
                        </td>

                        <td className="dp-amount">
                          {formatCurrency(
                            Number(payment.amount || 0),
                          )}
                        </td>

                        <td>{payment.note || "—"}</td>

                        <td>
                          {customerId != null ? (
                            <Link
                              className="dp-link"
                              to={`/payments?customerId=${encodeURIComponent(
                                String(customerId),
                              )}`}
                            >
                              View details
                            </Link>
                          ) : (
                            <span className="dp-muted">
                              Unavailable
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "right",
                        fontWeight: 800,
                      }}
                    >
                      Total displayed collection
                    </td>

                    <td className="dp-amount">
                      {formatCurrency(totalCollection)}
                    </td>

                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
