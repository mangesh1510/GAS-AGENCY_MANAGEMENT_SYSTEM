
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { jsPDF } from "jspdf";

const API_URL = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 10;

type Customer = {
  id: number;
  name: string;
  mobile: string;
  openingBalance: number | string;
};

type Delivery = {
  id: number;
  customerId: number;
  quantity: number;
  unitPrice: number | string;
  totalAmount: number | string;
  deliveryDate: string;
  note?: string | null;
};

type Payment = {
  id: number;
  customerId: number;
  amount: number | string;
  paymentMethod: string;
  paymentDate: string;
  note?: string | null;
};

type CustomerAccountSummary = {
  customerId: number;
  customerName: string;
  openingBalance: number;
  totalDelivered: number;
  totalPaid: number;
  outstandingBalance: number;
};

type LedgerEntry = {
  id: string;
  date: string;
  description: string;
  type: "Opening Balance" | "Delivery" | "Payment";
  debit: number;
  credit: number;
  balance: number;
  note?: string | null;
};

type TransactionFilter = "ALL" | "Delivery" | "Payment";

function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateKey(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function displayDate(value: string): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN");
}

function unwrapResponse(response: unknown): unknown {
  let value = response;

  for (let i = 0; i < 4; i++) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "data" in value
    ) {
      value = (value as { data: unknown }).data;
    } else {
      break;
    }
  }

  return value;
}

function getRows<T>(response: unknown): T[] {
  const value = unwrapResponse(response);
  return Array.isArray(value) ? (value as T[]) : [];
}

function getObject<T>(response: unknown): T | null {
  const value = unwrapResponse(response);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as T;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("gasflow_token");

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const text = await response.text();
  let result: unknown = null;

  if (text.trim()) {
    try {
      result = JSON.parse(text);
    } catch {
      result = text;
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;

    if (result && typeof result === "object") {
      const body = result as {
        message?: unknown;
        error?: unknown;
      };

      if (typeof body.message === "string") {
        message = body.message;
      } else if (typeof body.error === "string") {
        message = body.error;
      }
    } else if (typeof result === "string" && result.trim()) {
      message = result;
    }

    if (response.status === 401) {
      message = "Your session may have expired. Please sign in again.";
    } else if (response.status === 403) {
      message = "You do not have permission to access this information.";
    }

    throw new Error(message);
  }

  return result as T;
}

function escapeCSV(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCSV(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div style={summaryCardStyle}>
      <div style={summaryTitleStyle}>{title}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

export default function CustomerLedger() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accountSummary, setAccountSummary] =
    useState<CustomerAccountSummary | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactionType, setTransactionType] =
    useState<TransactionFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load customers.
  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setLoadingCustomers(true);
      setError("");

      try {
        const result = await apiRequest<unknown>(
          `${API_URL}/customers`
        );

        if (!cancelled) {
          setCustomers(getRows<Customer>(result));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load customers."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCustomers(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the selected customer's ledger.
  useEffect(() => {
    let cancelled = false;

    async function loadLedger() {
      if (!selectedCustomerId) {
        setDeliveries([]);
        setPayments([]);
        setAccountSummary(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setDeliveries([]);
      setPayments([]);
      setAccountSummary(null);

      try {
        const [
          deliveryResult,
          paymentResult,
          summaryResult,
        ] = await Promise.all([
          apiRequest<unknown>(
            `${API_URL}/deliveries/customer/${selectedCustomerId}`
          ),
          apiRequest<unknown>(
            `${API_URL}/payments/customer/${selectedCustomerId}`
          ),
          apiRequest<unknown>(
            `${API_URL}/payments/customer/${selectedCustomerId}/summary`
          ),
        ]);

        if (cancelled) return;

        setDeliveries(getRows<Delivery>(deliveryResult));
        setPayments(getRows<Payment>(paymentResult));
        setAccountSummary(
          getObject<CustomerAccountSummary>(summaryResult)
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the customer ledger."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLedger();

    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCustomerId,
    startDate,
    endDate,
    transactionType,
    searchTerm,
    itemsPerPage,
  ]);

  const selectedCustomer =
    customers.find(
      (customer) => String(customer.id) === selectedCustomerId
    ) ?? null;

  // Calculate the running balance.
  const allEntries: LedgerEntry[] = [];

  if (selectedCustomer) {
    let balance = Number(selectedCustomer.openingBalance) || 0;

    allEntries.push({
      id: "opening",
      date: "",
      description: "Opening Balance",
      type: "Opening Balance",
      debit: balance > 0 ? balance : 0,
      credit: balance < 0 ? Math.abs(balance) : 0,
      balance,
    });

    const transactions: LedgerEntry[] = [
      ...deliveries.map((delivery): LedgerEntry => ({
        id: `delivery-${delivery.id}`,
        date: delivery.deliveryDate,
        description: `Gas delivery (${delivery.quantity})`,
        type: "Delivery",
        debit: Number(delivery.totalAmount) || 0,
        credit: 0,
        balance: 0,
        note: delivery.note,
      })),
      ...payments.map((payment): LedgerEntry => ({
        id: `payment-${payment.id}`,
        date: payment.paymentDate,
        description: `Payment - ${payment.paymentMethod}`,
        type: "Payment",
        debit: 0,
        credit: Number(payment.amount) || 0,
        balance: 0,
        note: payment.note,
      })),
    ];

    transactions.sort((a, b) => {
      const comparison = dateKey(a.date).localeCompare(dateKey(b.date));

      return comparison !== 0
        ? comparison
        : a.id.localeCompare(b.id);
    });

    for (const transaction of transactions) {
      balance += transaction.debit - transaction.credit;

      allEntries.push({ ...transaction, balance });
    }
  }

  // Keep opening balance visible while filtering.
  const entries = allEntries.filter((entry) => {
    if (entry.type === "Opening Balance") return true;

    const transactionDate = dateKey(entry.date);

    if (startDate && transactionDate < startDate) return false;
    if (endDate && transactionDate > endDate) return false;

    if (
      transactionType !== "ALL" &&
      entry.type !== transactionType
    ) {
      return false;
    }

    const searchableText = [
      entry.description,
      entry.note ?? "",
      entry.type,
      entry.date,
    ]
      .join(" ")
      .toLowerCase();

    if (
      searchTerm.trim() &&
      !searchableText.includes(searchTerm.trim().toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(entries.length / itemsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;

  const paginatedEntries = entries.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setTransactionType("ALL");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const exportCSV = () => {
    if (!selectedCustomer) return;

    const headers = [
      "Date",
      "Description",
      "Type",
      "Debit",
      "Credit",
      "Balance",
      "Note",
    ];

    const rows = entries.map((entry) => [
      entry.date ? displayDate(entry.date) : "Opening Balance",
      entry.description,
      entry.type,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2),
      entry.note ?? "",
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    downloadCSV(
      `GasFlow_Ledger_${selectedCustomer.name.replace(/\s+/g, "_")}.csv`,
      csv
    );
  };

  const downloadCustomerStatementPDF = () => {
    if (!selectedCustomer) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let y = 15;

    pdf.setFontSize(18);
    pdf.text("GasFlow - Customer Ledger", 14, y);
    y += 10;

    pdf.setFontSize(10);
    pdf.text(`Customer: ${selectedCustomer.name}`, 14, y);
    y += 6;
    pdf.text(`Mobile: ${selectedCustomer.mobile}`, 14, y);
    y += 6;
    pdf.text(
      `Generated: ${new Date().toLocaleDateString("en-IN")}`,
      14,
      y
    );
    y += 10;

    if (accountSummary) {
      pdf.text(
        `Opening Balance: ${money(accountSummary.openingBalance)}`,
        14,
        y
      );
      y += 6;
      pdf.text(
        `Total Delivered: ${money(accountSummary.totalDelivered)}`,
        14,
        y
      );
      y += 6;
      pdf.text(`Total Paid: ${money(accountSummary.totalPaid)}`, 14, y);
      y += 6;
      pdf.text(
        `Outstanding: ${money(accountSummary.outstandingBalance)}`,
        14,
        y
      );
      y += 10;
    }

    const columns = {
      date: 14,
      description: 42,
      debit: 103,
      credit: 132,
      balance: 161,
    };

    const drawHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);

      pdf.text("Date", columns.date, y);
      pdf.text("Description", columns.description, y);
      pdf.text("Debit", columns.debit, y);
      pdf.text("Credit", columns.credit, y);
      pdf.text("Balance", columns.balance, y);

      y += 3;
      pdf.line(14, y, pageWidth - 14, y);
      y += 6;

      pdf.setFont("helvetica", "normal");
    };

    drawHeader();

    for (const entry of entries) {
      const date = entry.date ? displayDate(entry.date) : "Opening";

      const description = pdf.splitTextToSize(
        entry.description,
        55
      ) as string[];

      const note = entry.note
        ? (pdf.splitTextToSize(`Note: ${entry.note}`, 55) as string[])
        : [];

      const lines = [...description, ...note];
      const rowHeight = Math.max(6, lines.length * 4);

      if (y + rowHeight > pageHeight - 18) {
        pdf.addPage();
        y = 15;
        drawHeader();
      }

      pdf.setFontSize(8);
      pdf.text(date, columns.date, y);
      pdf.text(lines, columns.description, y);

      pdf.text(entry.debit.toFixed(2), columns.debit, y, {
        align: "right",
      });

      pdf.text(entry.credit.toFixed(2), columns.credit, y, {
        align: "right",
      });

      pdf.text(entry.balance.toFixed(2), columns.balance, y, {
        align: "right",
      });

      y += rowHeight + 2;
    }

    pdf.save(
      `GasFlow_Ledger_${selectedCustomer.name.replace(/\s+/g, "_")}.pdf`
    );
  };

  return (
    <main style={pageStyle}>
     <header style={headerStyle}>
  <div>
    <div style={eyebrowStyle}>GASFLOW • ACCOUNT MANAGEMENT</div>

    <h1 style={headingStyle}>Customer Ledger</h1>

    <p style={subtitleStyle}>
      Track deliveries, payments, and outstanding balances.
    </p>
  </div>

  <div style={headerActionsStyle}>
    <Link to="/customers" style={customerPageLinkStyle}>
      ← Back to Customers
    </Link>

    {selectedCustomer && (
      <div style={customerChipStyle}>
        <span style={customerChipDotStyle} />
        {selectedCustomer.name}
      </div>
    )}
  </div>
</header>

      {error && (
        <div role="alert" style={errorStyle}>
          <strong style={{ display: "block", marginBottom: 4 }}>
            Unable to load information
          </strong>
          {error}
        </div>
      )}

      <section style={panelStyle}>
        <div style={sectionHeadingRowStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Choose a customer</h2>
            <p style={sectionSubtitleStyle}>
              Select a customer to view their account activity.
            </p>
          </div>
        </div>

        <label style={labelStyle} htmlFor="customer">
          Customer
        </label>

        <select
          id="customer"
          style={inputStyle}
          value={selectedCustomerId}
          disabled={loadingCustomers}
          onChange={(event) => setSelectedCustomerId(event.target.value)}
        >
          <option value="">
            {loadingCustomers
              ? "Loading customers..."
              : customers.length === 0
                ? "No customers available"
                : "-- Select a customer --"}
          </option>

          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} - {customer.mobile}
            </option>
          ))}
        </select>

        {!loadingCustomers && customers.length === 0 && !error && (
          <p style={hintStyle}>
            No customers were returned by the API. Check your backend
            response and database.
          </p>
        )}
      </section>

      {selectedCustomer && (
        <>
          <section style={summaryGridStyle}>
            <SummaryCard
              title="Opening Balance"
              value={money(
                accountSummary?.openingBalance ??
                  selectedCustomer.openingBalance
              )}
            />

            <SummaryCard
              title="Total Delivered"
              value={money(accountSummary?.totalDelivered ?? 0)}
            />

            <SummaryCard
              title="Total Paid"
              value={money(accountSummary?.totalPaid ?? 0)}
            />

            <SummaryCard
              title="Outstanding Balance"
              value={money(accountSummary?.outstandingBalance ?? 0)}
            />
          </section>

          <section style={panelStyle}>
            <div style={sectionHeadingRowStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Filter transactions</h2>
                <p style={sectionSubtitleStyle}>
                  Narrow the ledger by date, type, or keyword.
                </p>
              </div>
            </div>

            <div style={filtersGridStyle}>
              <div>
                <label style={labelStyle} htmlFor="startDate">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  style={inputStyle}
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="endDate">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  style={inputStyle}
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="type">
                  Transaction Type
                </label>
                <select
                  id="type"
                  style={inputStyle}
                  value={transactionType}
                  onChange={(event) =>
                    setTransactionType(
                      event.target.value as TransactionFilter
                    )
                  }
                >
                  <option value="ALL">All Transactions</option>
                  <option value="Delivery">Deliveries</option>
                  <option value="Payment">Payments</option>
                </select>
              </div>

              <div>
                <label style={labelStyle} htmlFor="search">
                  Search
                </label>
                <input
                  id="search"
                  type="text"
                  style={inputStyle}
                  placeholder="Search notes, payment method..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            <div style={actionsStyle}>
              <button
                type="button"
                style={buttonStyle}
                onClick={resetFilters}
              >
                Reset Filters
              </button>

              <button
                type="button"
                style={primaryButtonStyle}
                onClick={exportCSV}
                disabled={entries.length === 0}
              >
                Export CSV
              </button>

              <button
                type="button"
                style={primaryButtonStyle}
                onClick={downloadCustomerStatementPDF}
                disabled={entries.length === 0}
              >
                Download Statement PDF
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => window.print()}
              >
                Print Ledger
              </button>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionHeadingRowStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Transactions</h2>
                <p style={sectionSubtitleStyle}>
                  {entries.length} ledger entries found.
                </p>
              </div>
            </div>

            {loading ? (
              <p style={hintStyle}>Loading customer ledger...</p>
            ) : (
              <>
                <div style={tableContainerStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={cellStyle}>Date</th>
                        <th style={cellStyle}>Description</th>
                        <th style={cellStyle}>Type</th>
                        <th style={cellStyle}>Debit</th>
                        <th style={cellStyle}>Credit</th>
                        <th style={cellStyle}>Balance</th>
                        <th style={cellStyle}>Note</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td style={cellStyle}>
                            {entry.date ? displayDate(entry.date) : "-"}
                          </td>

                          <td style={cellStyle}>{entry.description}</td>

                          <td style={cellStyle}>
                            <span
                              style={{
                                ...typeBadgeStyle,
                                ...(entry.type === "Delivery"
                                  ? deliveryBadgeStyle
                                  : entry.type === "Payment"
                                    ? paymentBadgeStyle
                                    : openingBadgeStyle),
                              }}
                            >
                              {entry.type}
                            </span>
                          </td>

                          <td style={cellStyle}>
                            {entry.debit > 0 ? money(entry.debit) : "-"}
                          </td>

                          <td style={cellStyle}>
                            {entry.credit > 0 ? money(entry.credit) : "-"}
                          </td>

                          <td style={{ ...cellStyle, fontWeight: 750 }}>
                            {money(entry.balance)}
                          </td>

                          <td style={cellStyle}>{entry.note || "-"}</td>
                        </tr>
                      ))}

                      {paginatedEntries.length === 0 && (
                        <tr>
                          <td style={emptyCellStyle} colSpan={7}>
                            No transactions match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={paginationStyle}>
                  <div style={paginationInfoStyle}>
                    <span>
                      Showing{" "}
                      {entries.length === 0 ? 0 : startIndex + 1}
                      {"–"}
                      {Math.min(
                        startIndex + itemsPerPage,
                        entries.length
                      )}{" "}
                      of {entries.length} transactions
                    </span>

                    <label style={pageSizeLabelStyle} htmlFor="pageSize">
                      Rows per page
                      <select
                        id="pageSize"
                        style={pageSizeSelectStyle}
                        value={itemsPerPage}
                        onChange={(event) =>
                          setItemsPerPage(Number(event.target.value))
                        }
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                  </div>

                  <div style={paginationControlsStyle}>
                    <button
                      type="button"
                      style={{
                        ...buttonStyle,
                        ...(safeCurrentPage <= 1
                          ? disabledButtonStyle
                          : {}),
                      }}
                      disabled={safeCurrentPage <= 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                    >
                      Previous
                    </button>

                    <span style={pageNumberStyle}>
                      Page {safeCurrentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      style={{
                        ...buttonStyle,
                        ...(safeCurrentPage >= totalPages
                          ? disabledButtonStyle
                          : {}),
                      }}
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {!selectedCustomerId && !error && !loadingCustomers && (
        <section style={panelStyle}>
          <p style={emptyMessageStyle}>
            Select a customer above to view their ledger.
          </p>
        </section>
      )}
    </main>
  );
}

// Layout and typography
const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  boxSizing: "border-box",
  padding: "32px",
  background: "#f8fafc",
  color: "#0f172a",
  fontFamily: "Inter, Arial, sans-serif",
  opacity: 1,
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "28px",
};

const eyebrowStyle: CSSProperties = {
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "1.6px",
  marginBottom: "10px",
};

const headingStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "32px",
  fontWeight: 800,
  lineHeight: 1.25,
  letterSpacing: "-0.8px",
  opacity: 1,
  visibility: "visible",
  WebkitTextFillColor: "#0f172a",
};

const subtitleStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
};

const customerChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "9px",
  padding: "10px 15px",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "13px",
  fontWeight: 700,
};

const customerChipDotStyle: CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#2563eb",
};

const panelStyle: CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "22px",
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.045)",
};

const sectionHeadingRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "18px",
  fontWeight: 750,
  lineHeight: 1.4,
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.5,
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 700,
  marginBottom: "9px",
  color: "#334155",
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  minHeight: "44px",
  boxSizing: "border-box",
  padding: "11px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  outlineOffset: "2px",
};

const filtersGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "18px",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "22px",
};

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "40px",
  boxSizing: "border-box",
  padding: "10px 15px",
  borderRadius: "9px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const summaryCardStyle: CSSProperties = {
  minWidth: 0,
  boxSizing: "border-box",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "15px",
  padding: "22px",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.035)",
  borderTop: "3px solid #2563eb",
};

const summaryTitleStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 650,
  marginBottom: "12px",
};

const summaryValueStyle: CSSProperties = {
  color: "#0f172a",
  fontSize: "clamp(18px, 2vw, 24px)",
  lineHeight: 1.4,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const tableContainerStyle: CSSProperties = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
  textAlign: "left",
  background: "#ffffff",
};

const cellStyle: CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
  whiteSpace: "normal",
  color: "#334155",
};

const emptyCellStyle: CSSProperties = {
  ...cellStyle,
  padding: "32px 16px",
  textAlign: "center",
  color: "#64748b",
};

const typeBadgeStyle: CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 750,
  whiteSpace: "nowrap",
};

const deliveryBadgeStyle: CSSProperties = {
  background: "#dbeafe",
  color: "#1d4ed8",
};

const paymentBadgeStyle: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
};

const openingBadgeStyle: CSSProperties = {
  background: "#f1f5f9",
  color: "#475569",
};

const paginationStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const paginationInfoStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  color: "#64748b",
  fontSize: "13px",
};

const pageSizeLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#475569",
  fontWeight: 650,
};

const pageSizeSelectStyle: CSSProperties = {
  padding: "7px 9px",
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "13px",
};

const paginationControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const pageNumberStyle: CSSProperties = {
  padding: "0 8px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#334155",
  whiteSpace: "nowrap",
};

const disabledButtonStyle: CSSProperties = {
  opacity: 0.45,
  cursor: "not-allowed",
};

const errorStyle: CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "14px 16px",
  marginBottom: "20px",
  color: "#b91c1c",
  fontSize: "14px",
  lineHeight: 1.5,
};

const hintStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.6,
  margin: "12px 0 0",
};

const emptyMessageStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  textAlign: "center",
  fontSize: "14px",
  lineHeight: 1.7,
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const customerPageLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 16px",
  borderRadius: "10px",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  boxShadow: "0 4px 10px rgba(37, 99, 235, 0.18)",
};