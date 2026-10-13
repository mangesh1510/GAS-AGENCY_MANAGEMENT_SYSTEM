
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  Plus,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import "./StaffPayments.css";

const API = "http://localhost:5000/api";

type PaymentMethod =
  | "CASH"
  | "UPI"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "OTHER";

type SalaryStatus = "UNPAID" | "PARTIAL" | "PAID";

interface StaffMember {
  id: number;
  name: string;
  email?: string;
  role: string;
  isActive?: boolean;
}

interface SalaryPayment {
  id: number;
  salaryPeriodId: number;
  staffId: number;
  staffName: string;
  salaryMonth: string;
  amount: number | string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
}

interface SalaryPeriod {
  id: number;
  staffId: number;
  staffName: string;
  staffEmail?: string;
  salaryMonth: string;
  salaryDue: number | string;
  totalPaid: number | string;
  balance: number | string;
  status: SalaryStatus;
  payments?: SalaryPayment[];
}

interface ApiResult<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

interface SalaryForm {
  staffId: string;
  salaryMonth: string;
  salaryDue: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes: string;
}

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const today = () => {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const currency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMonth = (value: string) => {
  const match = value.slice(0, 7).match(/^(\d{4})-(\d{2})$/);

  if (!match) return value;

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    1,
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const emptyForm = (): SalaryForm => ({
  staffId: "",
  salaryMonth: currentMonth(),
  salaryDue: "",
  amount: "",
  paymentDate: today(),
  paymentMethod: "UPI",
  referenceNumber: "",
  notes: "",
});

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }

  throw new Error("The API returned an unexpected list format.");
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("gasflow_token");

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  let response: Response;

  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to GasFlow API. Check that your Express server is running on port 5000.",
    );
  }

  // Read the response as text first. Never blindly call response.json().
  const text = await response.text();

  let result: ApiResult<T>;

  try {
    result = text ? (JSON.parse(text) as ApiResult<T>) : {};
  } catch {
    const preview = text.slice(0, 100).replace(/\s+/g, " ");

    throw new Error(
      `Endpoint ${path} returned HTML or invalid JSON (HTTP ${response.status}). ` +
        `Check the Express route and API mounting. Response: ${preview}`,
    );
  }

  if (!response.ok || result.success === false) {
    if (response.status === 401) {
      throw new Error("Your login has expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("You do not have permission to access this resource.");
    }

    if (response.status === 404) {
      throw new Error(
        `API endpoint not found: ${path}. Add or correct this Express route.`,
      );
    }

    throw new Error(
      result.message || `Request failed with HTTP ${response.status}.`,
    );
  }

  if (result.success === true && "data" in result) {
    return result.data as T;
  }

  // Support APIs that return a raw array or object.
  return result as T;
}

export default function StaffPayments() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [periods, setPeriods] = useState<SalaryPeriod[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [historyStaff, setHistoryStaff] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SalaryForm>(emptyForm());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [staffResult, periodsResult, paymentsResult] =
        await Promise.all([
          apiRequest<unknown>("/auth/staff"),
          apiRequest<unknown>("/staff-payments/periods"),
          apiRequest<unknown>("/staff-payments"),
        ]);

      const staffList = unwrapList<StaffMember>(staffResult);
      const periodList = unwrapList<SalaryPeriod>(periodsResult);
      const paymentList = unwrapList<SalaryPayment>(paymentsResult);

      setStaff(
        staffList.filter(
          (member) =>
            member.role?.toUpperCase() === "STAFF" &&
            member.isActive !== false,
        ),
      );

      setPeriods(periodList);

      setPayments(
        paymentList.sort(
          (a, b) =>
            new Date(b.paymentDate).getTime() -
            new Date(a.paymentDate).getTime(),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load staff salary data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredPeriods = useMemo(() => {
    const query = search.trim().toLowerCase();

    return periods.filter((period) => {
      const name = (period.staffName || "").toLowerCase();
      const email = (period.staffEmail || "").toLowerCase();

      const matchesSearch = !query || name.includes(query) || email.includes(query);
      const matchesMonth =
        !monthFilter || period.salaryMonth.slice(0, 7) === monthFilter;
      const matchesStaff =
        staffFilter === "ALL" || String(period.staffId) === staffFilter;

      return matchesSearch && matchesMonth && matchesStaff;
    });
  }, [periods, search, monthFilter, staffFilter]);

  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const matchesStaff =
          historyStaff === "ALL" ||
          String(payment.staffId) === historyStaff;

        const matchesMonth =
          !monthFilter ||
          payment.salaryMonth.slice(0, 7) === monthFilter;

        return matchesStaff && matchesMonth;
      }),
    [payments, historyStaff, monthFilter],
  );

  const totalDue = filteredPeriods.reduce(
    (sum, period) => sum + Number(period.salaryDue || 0),
    0,
  );

  const totalPaid = filteredPeriods.reduce(
    (sum, period) => sum + Number(period.totalPaid || 0),
    0,
  );

  const totalBalance = filteredPeriods.reduce(
    (sum, period) => sum + Number(period.balance || 0),
    0,
  );

  const updateForm = (field: keyof SalaryForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const selectedPeriod = periods.find(
    (period) =>
      period.staffId === Number(form.staffId) &&
      period.salaryMonth.slice(0, 7) === form.salaryMonth,
  );

  const alreadyPaid = Number(selectedPeriod?.totalPaid || 0);

  const existingDue = selectedPeriod
    ? Number(selectedPeriod.salaryDue)
    : Number(form.salaryDue || 0);

  const remainingBalance = Math.max(0, existingDue - alreadyPaid);

  const savePayment = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const staffId = Number(form.staffId);
    const amount = Number(form.amount);
    const due = Number(form.salaryDue);

    if (!staffId) {
      setError("Please select a staff member.");
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.salaryMonth)) {
      setError("Select a valid salary month.");
      return;
    }

    if (!selectedPeriod && (!Number.isFinite(due) || due <= 0)) {
      setError("Enter a valid monthly salary amount.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (!form.paymentDate) {
      setError("Select the payment date.");
      return;
    }

    if (selectedPeriod && amount > remainingBalance) {
      setError(
        `Payment exceeds the remaining balance of ${currency(remainingBalance)}.`,
      );
      return;
    }

    if (!selectedPeriod && amount > due) {
      setError("Payment cannot exceed the monthly salary due.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/staff-payments", {
        method: "POST",
        body: JSON.stringify({
          staffId,
          salaryMonth: `${form.salaryMonth}-01`,
          salaryDue: selectedPeriod ? undefined : due,
          amount,
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          referenceNumber: form.referenceNumber.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      setMessage("Staff salary payment recorded successfully.");
      setForm(emptyForm());
      setShowForm(false);

      // Keep the successful save message even if a subsequent refresh fails.
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not record payment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const statusClass = (status: SalaryStatus) =>
    `sp-badge sp-${status.toLowerCase()}`;

  return (
    <main className="staff-payments-page">
      <header className="sp-header">
        <div>
          <span className="sp-eyebrow">PAYROLL MANAGEMENT</span>
          <h1>Staff Payments</h1>
          <p>
            Manage monthly salaries, outstanding balances, and payment history.
          </p>
        </div>

        <div className="sp-header-actions">
          <button
            type="button"
            className="sp-btn sp-btn-secondary"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="sp-btn sp-btn-primary"
            onClick={() => {
              setError("");
              setMessage("");
              setForm(emptyForm());
              setShowForm(true);
            }}
          >
            <Plus size={17} />
            Record payment
          </button>
        </div>
      </header>

      {error && (
        <div className="sp-alert sp-alert-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="sp-alert sp-alert-success" role="status">
          {message}
        </div>
      )}

      <section className="sp-stats">
        <article className="sp-stat-card">
          <div className="sp-stat-icon sp-blue">
            <Wallet size={20} />
          </div>
          <span>Salary due</span>
          <strong>{currency(totalDue)}</strong>
          <small>Selected month and staff</small>
        </article>

        <article className="sp-stat-card">
          <div className="sp-stat-icon sp-green">
            <CheckCircle2 size={20} />
          </div>
          <span>Paid</span>
          <strong>{currency(totalPaid)}</strong>
          <small>Salary amount paid</small>
        </article>

        <article className="sp-stat-card">
          <div className="sp-stat-icon sp-orange">
            <Clock size={20} />
          </div>
          <span>Outstanding</span>
          <strong>{currency(totalBalance)}</strong>
          <small>Remaining salary balance</small>
        </article>

        <article className="sp-stat-card">
          <div className="sp-stat-icon sp-purple">
            <History size={20} />
          </div>
          <span>Transactions</span>
          <strong>{filteredPayments.length}</strong>
          <small>Salary payments recorded</small>
        </article>
      </section>

      <section className="sp-panel">
        <div className="sp-panel-heading">
          <div>
            <h2>Monthly salary overview</h2>
            <p>One row per staff member and salary month.</p>
          </div>
        </div>

        <div className="sp-filters">
          <label className="sp-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff name or email"
            />
          </label>

          <label className="sp-filter-field">
            <CalendarDays size={16} />
            <input
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              aria-label="Filter salary month"
            />
          </label>

          <select
            value={staffFilter}
            onChange={(event) => setStaffFilter(event.target.value)}
            aria-label="Filter salary overview by staff"
          >
            <option value="ALL">All staff</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="sp-empty">Loading salary records…</div>
        ) : filteredPeriods.length === 0 ? (
          <div className="sp-empty">
            No salary periods found for these filters.
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Salary month</th>
                  <th>Salary due</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredPeriods.map((period) => (
                  <tr key={period.id}>
                    <td>
                      <strong>{period.staffName}</strong>
                      <small>
                        {period.staffEmail || `Staff ID: ${period.staffId}`}
                      </small>
                    </td>
                    <td>{formatMonth(period.salaryMonth)}</td>
                    <td>{currency(period.salaryDue)}</td>
                    <td className="sp-amount-paid">
                      {currency(period.totalPaid)}
                    </td>
                    <td>{currency(period.balance)}</td>
                    <td>
                      <span className={statusClass(period.status)}>
                        {period.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="sp-panel">
        <div className="sp-panel-heading">
          <div>
            <h2>Payment history</h2>
            <p>Every recorded salary transaction, newest first.</p>
          </div>
        </div>

        <div className="sp-filters">
          <select
            value={historyStaff}
            onChange={(event) => setHistoryStaff(event.target.value)}
            aria-label="Filter payment history by staff"
          >
            <option value="ALL">All staff history</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="sp-empty">Loading payment history…</div>
        ) : filteredPayments.length === 0 ? (
          <div className="sp-empty">
            No payments found for the selected filters.
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Salary month</th>
                  <th>Payment date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.staffName}</strong>
                    </td>
                    <td>{formatMonth(payment.salaryMonth)}</td>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>
                      {payment.paymentMethod.replaceAll("_", " ")}
                    </td>
                    <td>{payment.referenceNumber || "—"}</td>
                    <td className="sp-amount-paid">
                      {currency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="sp-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="sp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sp-form-title"
          >
            <header className="sp-modal-header">
              <div>
                <h2 id="sp-form-title">Record salary payment</h2>
                <p>Enter the salary period and payment details.</p>
              </div>

              <button
                type="button"
                className="sp-icon-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close payment form"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={savePayment}>
              <div className="sp-form-grid">
                <label>
                  Staff member *
                  <select
                    required
                    value={form.staffId}
                    onChange={(event) =>
                      updateForm("staffId", event.target.value)
                    }
                  >
                    <option value="">Select staff</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Salary month *
                  <input
                    type="month"
                    required
                    value={form.salaryMonth}
                    onChange={(event) =>
                      updateForm("salaryMonth", event.target.value)
                    }
                  />
                </label>

                {!selectedPeriod && (
                  <label>
                    Monthly salary due (₹) *
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={form.salaryDue}
                      onChange={(event) =>
                        updateForm("salaryDue", event.target.value)
                      }
                      placeholder="e.g. 18000"
                    />
                  </label>
                )}

                <label>
                  Payment amount (₹) *
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(event) =>
                      updateForm("amount", event.target.value)
                    }
                    placeholder="Enter amount paid"
                  />
                </label>

                <label>
                  Payment date *
                  <input
                    type="date"
                    required
                    value={form.paymentDate}
                    onChange={(event) =>
                      updateForm("paymentDate", event.target.value)
                    }
                  />
                </label>

                <label>
                  Payment method *
                  <select
                    value={form.paymentMethod}
                    onChange={(event) =>
                      updateForm("paymentMethod", event.target.value)
                    }
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>

                <label>
                  Reference number
                  <input
                    value={form.referenceNumber}
                    onChange={(event) =>
                      updateForm("referenceNumber", event.target.value)
                    }
                    placeholder="Transaction ID or cheque number"
                  />
                </label>

                <label className="sp-form-full">
                  Notes
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      updateForm("notes", event.target.value)
                    }
                    placeholder="Optional payment notes"
                  />
                </label>
              </div>

              {selectedPeriod && (
                <div className="sp-balance-preview">
                  <span>Remaining before this payment</span>
                  <strong>{currency(remainingBalance)}</strong>
                </div>
              )}

              <footer className="sp-modal-actions">
                <button
                  type="button"
                  className="sp-btn sp-btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sp-btn sp-btn-primary"
                  disabled={saving || staff.length === 0}
                >
                  <Banknote size={17} />
                  {saving ? "Saving…" : "Save payment"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
