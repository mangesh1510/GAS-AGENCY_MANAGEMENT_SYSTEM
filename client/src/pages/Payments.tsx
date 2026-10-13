
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API = "http://localhost:5000/api";

type Customer = {
  id: number;
  name: string;
  mobile: string;
  openingBalance: number | string;
  address?: string;
};

type Payment = {
  id: number;
  customerId: number;
  amount: number | string;
  paymentMethod: string;
  paymentDate: string;
  note: string | null;
};

type AccountSummary = {
  customerId: number;
  customerName: string;
  openingBalance: number;
  totalDelivered: number;
  totalPaid: number;
  outstandingBalance: number;
};

const styles = `
  * { box-sizing: border-box; }

  .payments-page {
    min-height: 100vh;
    padding: 30px;
    background: #f5f7fb;
    color: #172033;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .payments-container {
    max-width: 1240px;
    margin: 0 auto;
  }

  .payments-hero {
    position: relative;
    overflow: hidden;
    padding: 30px;
    border-radius: 22px;
    color: white;
    background: linear-gradient(120deg, #111827 0%, #312e81 60%, #6d28d9 100%);
    box-shadow: 0 15px 35px rgba(49, 46, 129, .18);
  }

  .payments-hero::after {
    content: "";
    position: absolute;
    width: 240px;
    height: 240px;
    right: -70px;
    top: -115px;
    border: 35px solid rgba(255,255,255,.08);
    border-radius: 50%;
    pointer-events: none;
  }

  .payments-breadcrumbs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 25px;
    color: #ddd6fe;
    font-size: 13px;
  }

  .payments-breadcrumbs a {
    color: #ede9fe;
    text-decoration: none;
  }

  .payments-breadcrumbs a:hover { text-decoration: underline; }

  .payments-hero h1 {
    margin: 0 0 10px;
    font-size: clamp(27px, 4vw, 38px);
    letter-spacing: -.8px;
  }

  .payments-hero p {
    margin: 0;
    max-width: 650px;
    color: #e0e7ff;
    line-height: 1.7;
  }

  .payments-section {
    margin-top: 25px;
    padding: 25px;
    border: 1px solid #e8ebf2;
    border-radius: 18px;
    background: white;
    box-shadow: 0 5px 20px rgba(15,23,42,.035);
  }

  .payments-section h2 {
    margin: 0 0 8px;
    font-size: 20px;
    color: #172033;
  }

  .payments-muted {
    margin: 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
  }

  .payments-label {
    display: block;
    margin-bottom: 8px;
    color: #334155;
    font-size: 13px;
    font-weight: 700;
  }

  .payments-input {
    width: 100%;
    min-height: 45px;
    padding: 11px 13px;
    border: 1px solid #dbe1eb;
    border-radius: 10px;
    outline: none;
    background: #fff;
    color: #172033;
    font: inherit;
    transition: border-color .2s, box-shadow .2s;
  }

  .payments-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,.12);
  }

  .payments-input:disabled { background: #f1f5f9; }

  .payments-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-top: 22px;
  }

  .payments-stat {
    min-width: 0;
    padding: 21px;
    border: 1px solid #e8ebf2;
    border-radius: 16px;
    background: white;
    box-shadow: 0 5px 20px rgba(15,23,42,.035);
  }

  .payments-stat-label {
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
  }

  .payments-stat-value {
    margin: 12px 0 0;
    overflow-wrap: anywhere;
    color: #172033;
    font-size: clamp(20px, 2.3vw, 27px);
    font-weight: 800;
    letter-spacing: -.5px;
  }

  .payments-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    margin-bottom: 17px;
    border-radius: 12px;
    background: #eef2ff;
    color: #4f46e5;
    font-size: 21px;
  }

  .payments-stat.purple .payments-stat-icon {
    background: #f3e8ff;
    color: #7e22ce;
  }

  .payments-stat.green .payments-stat-icon {
    background: #dcfce7;
    color: #15803d;
  }

  .payments-stat.orange .payments-stat-icon {
    background: #ffedd5;
    color: #c2410c;
  }

  .payments-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 19px;
    margin-top: 22px;
  }

  .payments-field { min-width: 0; }

  .payments-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 46px;
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(110deg, #4338ca, #7c3aed);
    color: white;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: transform .2s, box-shadow .2s, opacity .2s;
  }

  .payments-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(79,70,229,.22);
  }

  .payments-submit:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .payments-secondary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 8px 12px;
    border: 1px solid #c7d2fe;
    border-radius: 9px;
    background: #eef2ff;
    color: #4338ca;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }

  .payments-secondary-button:hover { background: #e0e7ff; }

  .payments-alert {
    margin-top: 20px;
    padding: 13px 16px;
    border: 1px solid;
    border-radius: 11px;
    font-size: 14px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .payments-alert.error {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }

  .payments-alert.success {
    border-color: #bbf7d0;
    background: #f0fdf4;
    color: #166534;
  }

  .payments-table-wrapper {
    width: 100%;
    margin-top: 20px;
    overflow-x: auto;
    border: 1px solid #e8ebf2;
    border-radius: 12px;
  }

  .payments-table {
    width: 100%;
    border-collapse: collapse;
    white-space: nowrap;
    font-size: 13px;
  }

  .payments-table thead { background: #f8fafc; }

  .payments-table th {
    padding: 15px 16px;
    border-bottom: 1px solid #e8ebf2;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .5px;
    text-align: left;
    text-transform: uppercase;
  }

  .payments-table td {
    padding: 15px 16px;
    border-bottom: 1px solid #eef1f6;
    color: #334155;
  }

  .payments-table tbody tr:last-child td { border-bottom: none; }
  .payments-table tbody tr:hover { background: #fafaff; }

  .payments-amount {
    color: #15803d !important;
    font-weight: 800;
  }

  .payments-badge {
    display: inline-block;
    padding: 5px 9px;
    border-radius: 7px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 11px;
    font-weight: 700;
  }

  .payments-empty {
    padding: 35px 20px;
    color: #64748b;
    text-align: center;
    line-height: 1.7;
  }

  .payments-empty strong {
    display: block;
    margin-bottom: 5px;
    color: #334155;
  }

  .payments-loading {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 25px;
    color: #4338ca;
    font-weight: 700;
  }

  .payments-form-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 22px;
  }

  .payments-count {
    color: #64748b;
    font-size: 13px;
  }

  @media (max-width: 900px) {
    .payments-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 600px) {
    .payments-page { padding: 15px; }
    .payments-hero { padding: 22px; border-radius: 16px; }
    .payments-section { padding: 18px; }
    .payments-summary-grid { gap: 10px; }
    .payments-stat { padding: 15px; }
    .payments-stat-icon { margin-bottom: 12px; }
    .payments-form-grid { grid-template-columns: 1fr; }
    .payments-form-footer { align-items: stretch; flex-direction: column; }
    .payments-submit { width: 100%; }
  }
`;

function Payments() {
  const [searchParams] = useSearchParams();
  const customerIdFromUrl = searchParams.get("customerId");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState(
    customerIdFromUrl ?? ""
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date();
    const localDate = new Date(
      now.getTime() - now.getTimezoneOffset() * 60_000
    );
    return localDate.toISOString().slice(0, 10);
  });
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Stores the refreshed current balance for the selected customer's receipt.
  const [receiptBalance, setReceiptBalance] = useState<number | null>(null);

  const getToken = () => localStorage.getItem("gasflow_token");

  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ) => {
    const token = getToken();

    if (!token) {
      window.location.assign("/login");
      throw new Error("Your session has expired. Please log in again.");
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem("gasflow_token");
      window.location.assign("/login");
      throw new Error("Your session has expired. Please log in again.");
    }

    return response;
  };

  const readJson = async (response: Response) => {
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.error ??
        data?.message ??
        `Request failed (${response.status})`;

      throw new Error(message);
    }

    return data;
  };

  const money = (value: number | string | null | undefined) => {
    const numericValue = Number(value ?? 0);

    return `₹${(Number.isFinite(numericValue) ? numericValue : 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authenticatedFetch(`${API}/customers`);
      const data = await readJson(response);

      const list: Customer[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setCustomers(list);

      setSelectedCustomer((current) => {
        if (
          current &&
          list.some((customer) => String(customer.id) === current)
        ) {
          return current;
        }

        const requestedCustomerExists = list.some(
          (customer) => String(customer.id) === customerIdFromUrl
        );

        if (requestedCustomerExists && customerIdFromUrl) {
          return customerIdFromUrl;
        }

        return list.length > 0 ? String(list[0].id) : "";
      });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load customers."));
      setCustomers([]);
      setSelectedCustomer("");
    } finally {
      setLoading(false);
    }
  }, [customerIdFromUrl]);

  const loadCustomerAccount = useCallback(async (customerId: string) => {
    if (!customerId) {
      setSummary(null);
      setPayments([]);
      setReceiptBalance(null);
      return;
    }

    setAccountLoading(true);
    setError("");

    try {
      const [summaryResponse, paymentsResponse] = await Promise.all([
        authenticatedFetch(
          `${API}/payments/customer/${encodeURIComponent(customerId)}/summary`
        ),
        authenticatedFetch(
          `${API}/payments/customer/${encodeURIComponent(customerId)}`
        ),
      ]);

      const [summaryData, paymentsData] = await Promise.all([
        readJson(summaryResponse),
        readJson(paymentsResponse),
      ]);

      const paymentList: Payment[] = Array.isArray(paymentsData)
        ? paymentsData
        : Array.isArray(paymentsData?.data)
          ? paymentsData.data
          : [];

      setSummary(summaryData);
      setPayments(paymentList);
      setReceiptBalance(
        Number(summaryData?.outstandingBalance ?? 0)
      );
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load customer account."));
      setSummary(null);
      setPayments([]);
      setReceiptBalance(null);
    } finally {
      setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (selectedCustomer) {
      void loadCustomerAccount(selectedCustomer);
    } else {
      setSummary(null);
      setPayments([]);
      setReceiptBalance(null);
    }
  }, [selectedCustomer, loadCustomerAccount]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid payment amount greater than zero.");
      return;
    }

    if (!Number.isFinite(Number(selectedCustomer)) || !selectedCustomer) {
      setError("Please select a customer.");
      return;
    }

    if (!paymentDate) {
      setError("Please select the payment date.");
      return;
    }

    if (Number.isNaN(new Date(`${paymentDate}T12:00:00`).getTime())) {
      setError("Please enter a valid payment date.");
      return;
    }

    setSaving(true);

    try {
      const response = await authenticatedFetch(`${API}/payments`, {
        method: "POST",
        body: JSON.stringify({
          customerId: Number(selectedCustomer),
          amount: numericAmount,
          paymentMethod,
          paymentDate: new Date(
            `${paymentDate}T12:00:00`
          ).toISOString(),
          note: note.trim() || undefined,
        }),
      });

      await readJson(response);

      setAmount("");
      setNote("");
      setMessage("Payment recorded successfully.");

      // Refresh history and summary so the dashboard reflects the payment.
      await loadCustomerAccount(selectedCustomer);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to record payment."));
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = (payment: Payment) => {
    const customer = customers.find(
      (item) => item.id === payment.customerId
    );

    const receiptWindow = window.open(
      "",
      "_blank",
      "width=800,height=700"
    );

    if (!receiptWindow) {
      setError("Please allow pop-ups to print the payment receipt.");
      return;
    }

    const receiptDate = new Date(payment.paymentDate).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };

        return entities[character];
      });

    const paymentMethodLabel = payment.paymentMethod.replaceAll("_", " ");

    // This is the latest account balance, not a historical balance snapshot
    // captured at the time of every individual payment.
    const currentBalance = receiptBalance ?? summary?.outstandingBalance ?? 0;

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>GasFlow Payment Receipt #${payment.id}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            font-family: Arial, sans-serif;
            color: #1e293b;
            background: #f1f5f9;
          }
          .receipt {
            max-width: 680px;
            margin: 0 auto;
            padding: 36px;
            background: white;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #4f46e5;
          }
          .header h1 {
            margin: 0 0 8px;
            color: #4338ca;
            font-size: 30px;
          }
          .header p { margin: 4px 0; color: #64748b; }
          .paid {
            margin: 24px 0;
            padding: 20px;
            text-align: center;
            background: #dcfce7;
            border-radius: 8px;
          }
          .paid span { color: #166534; font-size: 12px; font-weight: bold; }
          .paid h2 {
            margin: 8px 0 0;
            color: #15803d;
            font-size: 30px;
          }
          .details {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .details td {
            padding: 12px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            overflow-wrap: anywhere;
          }
          .details td:first-child {
            width: 43%;
            color: #64748b;
          }
          .footer {
            margin-top: 28px;
            text-align: center;
            color: #64748b;
            font-size: 13px;
            line-height: 1.6;
          }
          .print-button {
            display: block;
            margin: 24px auto 0;
            padding: 12px 24px;
            border: 0;
            border-radius: 6px;
            color: white;
            background: #4f46e5;
            font-size: 15px;
            cursor: pointer;
          }
          @media print {
            body { padding: 0; background: white; }
            .receipt {
              max-width: none;
              border: none;
              border-radius: 0;
              padding: 16px;
            }
            .print-button { display: none; }
          }
          @media (max-width: 500px) {
            body { padding: 10px; }
            .receipt { padding: 18px; }
          }
        </style>
      </head>
      <body>
        <article class="receipt">
          <header class="header">
            <h1>GasFlow</h1>
            <p>Customer Payment Receipt</p>
            <p>Receipt No: GF-${payment.id}</p>
          </header>

          <section class="paid">
            <span>PAYMENT RECEIVED</span>
            <h2>${escapeHtml(money(payment.amount))}</h2>
          </section>

          <table class="details">
            <tr>
              <td>Customer Name</td>
              <td><strong>${escapeHtml(customer?.name ?? "Customer")}</strong></td>
            </tr>
            <tr>
              <td>Mobile Number</td>
              <td>${escapeHtml(customer?.mobile ?? "—")}</td>
            </tr>
            <tr>
              <td>Receipt Number</td>
              <td>GF-${payment.id}</td>
            </tr>
            <tr>
              <td>Payment Date</td>
              <td>${escapeHtml(receiptDate)}</td>
            </tr>
            <tr>
              <td>Payment Method</td>
              <td>${escapeHtml(paymentMethodLabel)}</td>
            </tr>
            <tr>
              <td>Transaction Note</td>
              <td>${escapeHtml(payment.note ?? "—")}</td>
            </tr>
            <tr>
              <td>Current Outstanding Balance</td>
              <td><strong>${escapeHtml(money(currentBalance))}</strong></td>
            </tr>
          </table>

          <footer class="footer">
            <p>This receipt confirms the payment recorded in GasFlow.</p>
            <p>Thank you!</p>
          </footer>

          <button class="print-button" onclick="window.print()">
            Print Receipt
          </button>
        </article>
      </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.focus();
  };

  const sortedPayments = [...payments].sort(
    (a, b) =>
      new Date(b.paymentDate).getTime() -
      new Date(a.paymentDate).getTime()
  );

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="payments-loading">Loading GasFlow payments...</div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <main className="payments-page">
        <div className="payments-container">
          <header className="payments-hero">
            <nav className="payments-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <span>Payments</span>
              <span>/</span>
              <Link to="/customer-balances">Outstanding Balances</Link>
            </nav>

            <h1>Customer Payments</h1>
            <p>
              Record customer payments, track collections, review outstanding
              balances, and print payment receipts from one place.
            </p>
          </header>

          {error && (
            <div className="payments-alert error" role="alert">
              <strong>Something went wrong.</strong> {error}
            </div>
          )}

          {message && (
            <div className="payments-alert success" role="status">
              {message}
            </div>
          )}

          <section className="payments-section">
            <h2>Choose Customer</h2>
            <p className="payments-muted">
              Select the customer whose account you want to manage.
            </p>

            <div style={{ marginTop: 20, maxWidth: 520 }}>
              <label className="payments-label" htmlFor="customer">
                Customer
              </label>

              <select
                className="payments-input"
                id="customer"
                value={selectedCustomer}
                onChange={(event) => {
                  setSelectedCustomer(event.target.value);
                  setError("");
                  setMessage("");
                }}
                disabled={customers.length === 0 || saving}
              >
                <option value="">Select a customer</option>

                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} — {customer.mobile}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {customers.length === 0 ? (
            <section className="payments-section">
              <div className="payments-empty">
                <strong>No customers found</strong>
                Add a customer before recording a payment.
                <div style={{ marginTop: 16 }}>
                  <Link to="/customers">Go to Customers</Link>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section
                aria-label="Customer account summary"
                className="payments-summary-grid"
              >
                <article className="payments-stat">
                  <div className="payments-stat-icon">₹</div>
                  <div className="payments-stat-label">Opening Balance</div>
                  <p className="payments-stat-value">
                    {money(summary?.openingBalance ?? 0)}
                  </p>
                </article>

                <article className="payments-stat purple">
                  <div className="payments-stat-icon">▣</div>
                  <div className="payments-stat-label">Total Delivered</div>
                  <p className="payments-stat-value">
                    {money(summary?.totalDelivered ?? 0)}
                  </p>
                </article>

                <article className="payments-stat green">
                  <div className="payments-stat-icon">✓</div>
                  <div className="payments-stat-label">Total Paid</div>
                  <p className="payments-stat-value">
                    {money(summary?.totalPaid ?? 0)}
                  </p>
                </article>

                <article className="payments-stat orange">
                  <div className="payments-stat-icon">◷</div>
                  <div className="payments-stat-label">
                    Outstanding Balance
                  </div>
                  <p className="payments-stat-value">
                    {money(summary?.outstandingBalance ?? 0)}
                  </p>
                </article>
              </section>

              {accountLoading && (
                <p className="payments-muted" style={{ marginTop: 16 }}>
                  Refreshing customer account...
                </p>
              )}

              <section className="payments-section">
                <h2>Record Payment</h2>
                <p className="payments-muted">
                  Enter the amount received and the payment details.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="payments-form-grid">
                    <div className="payments-field">
                      <label className="payments-label" htmlFor="amount">
                        Amount (₹)
                      </label>
                      <input
                        className="payments-input"
                        id="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="Enter payment amount"
                        disabled={saving || !selectedCustomer}
                      />
                    </div>

                    <div className="payments-field">
                      <label
                        className="payments-label"
                        htmlFor="paymentMethod"
                      >
                        Payment Method
                      </label>
                      <select
                        className="payments-input"
                        id="paymentMethod"
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(event.target.value)
                        }
                        disabled={saving || !selectedCustomer}
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>

                    <div className="payments-field">
                      <label className="payments-label" htmlFor="paymentDate">
                        Payment Date
                      </label>
                      <input
                        className="payments-input"
                        id="paymentDate"
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(event) =>
                          setPaymentDate(event.target.value)
                        }
                        disabled={saving || !selectedCustomer}
                      />
                    </div>

                    <div className="payments-field">
                      <label className="payments-label" htmlFor="note">
                        Note (Optional)
                      </label>
                      <input
                        className="payments-input"
                        id="note"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="e.g. Partial payment"
                        maxLength={500}
                        disabled={saving || !selectedCustomer}
                      />
                    </div>
                  </div>

                  <div className="payments-form-footer">
                    <span className="payments-muted">
                      Confirm the amount before recording the payment.
                    </span>

                    <button
                      className="payments-submit"
                      type="submit"
                      disabled={
                        saving ||
                        accountLoading ||
                        !selectedCustomer ||
                        customers.length === 0
                      }
                    >
                      {saving ? "Recording Payment..." : "＋ Record Payment"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="payments-section">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <h2>Payment History</h2>
                    <p className="payments-muted">
                      View recorded payments and print receipts.
                    </p>
                  </div>

                  <span className="payments-count">
                    {payments.length} payment{payments.length === 1 ? "" : "s"}
                  </span>
                </div>

                {sortedPayments.length === 0 ? (
                  <div className="payments-empty">
                    <strong>No payments recorded</strong>
                    Payment records for this customer will appear here.
                  </div>
                ) : (
                  <div className="payments-table-wrapper">
                    <table className="payments-table">
                      <thead>
                        <tr>
                          <th>Receipt ID</th>
                          <th>Payment Date</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Note</th>
                          <th>Receipt</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sortedPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td>
                              <strong>GF-{payment.id}</strong>
                            </td>

                            <td>
                              {new Date(
                                payment.paymentDate
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>

                            <td className="payments-amount">
                              {money(payment.amount)}
                            </td>

                            <td>
                              <span className="payments-badge">
                                {payment.paymentMethod.replaceAll("_", " ")}
                              </span>
                            </td>

                            <td>{payment.note || "—"}</td>

                            <td>
                              <button
                                type="button"
                                className="payments-secondary-button"
                                onClick={() => printReceipt(payment)}
                              >
                                Print Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default Payments;
