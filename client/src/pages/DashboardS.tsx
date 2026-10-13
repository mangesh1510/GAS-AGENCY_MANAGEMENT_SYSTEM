
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  count?: number;
};

type Customer = { id: number };

type Delivery = {
  id: number;
  totalAmount: number | string;
  deliveryDate: string;
};

type Payment = {
  id: number;
  amount: number | string;
  paymentDate: string;
  paymentMethod?: string;
};

type CylinderType = {
  id: number;
  name?: string;
  type?: string;
  isActive?: boolean;
};

type InventoryMovement = {
  id: number;
  cylinderTypeId: number;
  quantity: number;
  type: string;
  status: string;
};

type StockAlert = {
  cylinderTypeId: number;
  cylinderTypeName: string;
  filledStock: number;
  emptyStock?: number;
  threshold: number;
  status: "LOW_STOCK" | "OUT_OF_STOCK" | string;
};

type PaymentReminder = {
  customerId: number;
  outstandingBalance: number | string;
};

const ICONS: Record<string, string> = {
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  truck:
    "M1 3h15v13H1z M16 8h4l3 3v5h-7z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  calendar: "M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18",
  rupee: "M6 3h12 M6 8h12 M6 13l8.5 8 M6 13h3a4 4 0 0 0 0-8",
  cylinder:
    "M7 7a5 5 0 0 1 10 0v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z M9 2h6 M7 11h10",
  building:
    "M3 21h18 M5 21V7l8-4v18 M19 21V11l-6-4 M9 9v.01 M9 13v.01 M9 17v.01",
  receipt:
    "M4 2v20l3-2 3 2 3-2 3 2 3-2 2 2V2l-2 2-3-2-3 2-3-2-3 2z M8 8h8 M8 12h8 M8 16h5",
  alert:
    "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
  box: "M21 8l-9-5-9 5v8l9 5 9-5z M3.3 7L12 12l8.7-5 M12 22V12",
  wallet:
    "M20 7H5a2 2 0 0 1 0-4h13v4z M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1 M16 14h.01",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5",
  check: "M20 6L9 17l-5-5",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  staff:
    "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6",
  salary:
    "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
};

function Icon({
  name,
  size = 20,
}: {
  name: keyof typeof ICONS;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name].split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : `M${d}`} />
      ))}
    </svg>
  );
}

function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);
  const [inventory, setInventory] = useState<InventoryMovement[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentReminders, setPaymentReminders] =
    useState<PaymentReminder[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("gasflow_token");

        if (!token) {
          throw new Error("Your session has expired. Please log in again.");
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          customerRes,
          deliveryRes,
          cylinderRes,
          inventoryRes,
          stockAlertRes,
          paymentReminderRes,
          paymentRes,
        ] = await Promise.all([
          fetch(`${API_URL}/customers`, { headers }),
          fetch(`${API_URL}/deliveries`, { headers }),
          fetch(`${API_URL}/cylinder-types`, { headers }),
          fetch(`${API_URL}/inventory`, { headers }),
          fetch(`${API_URL}/inventory/alerts/low-stock`, { headers }),
          fetch(`${API_URL}/reminders/payments`, { headers }),
          fetch(`${API_URL}/payments`, { headers }),
        ]);

        if (
          !customerRes.ok ||
          !deliveryRes.ok ||
          !cylinderRes.ok ||
          !inventoryRes.ok ||
          !stockAlertRes.ok ||
          !paymentReminderRes.ok ||
          !paymentRes.ok
        ) {
          throw new Error(
            "Failed to load dashboard data. Please try again."
          );
        }

        const [
          customerJson,
          deliveryJson,
          cylinderJson,
          inventoryJson,
          stockAlertJson,
          paymentReminderJson,
          paymentJson,
        ] = await Promise.all([
          customerRes.json() as Promise<ApiResponse<Customer[]>>,
          deliveryRes.json() as Promise<ApiResponse<Delivery[]>>,
          cylinderRes.json() as Promise<ApiResponse<CylinderType[]>>,
          inventoryRes.json() as Promise<ApiResponse<InventoryMovement[]>>,
          stockAlertRes.json() as Promise<
            ApiResponse<StockAlert[]> | StockAlert[]
          >,
          paymentReminderRes.json() as Promise<
            ApiResponse<PaymentReminder[]> | PaymentReminder[]
          >,
          paymentRes.json() as Promise<ApiResponse<Payment[]> | Payment[]>,
        ]);

        setCustomers(customerJson.data ?? []);
        setDeliveries(deliveryJson.data ?? []);
        setCylinderTypes(cylinderJson.data ?? []);
        setInventory(inventoryJson.data ?? []);

        setPayments(
          Array.isArray(paymentJson)
            ? paymentJson
            : paymentJson.data ?? []
        );

        const alerts = Array.isArray(stockAlertJson)
          ? stockAlertJson
          : stockAlertJson.data ?? [];

        const reminders = Array.isArray(paymentReminderJson)
          ? paymentReminderJson
          : paymentReminderJson.data ?? [];

        setStockAlerts(alerts);
        setPaymentReminders(reminders);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const calculateStock = (
    cylinderTypeId: number,
    status: "FILLED" | "EMPTY"
  ) => {
    return inventory
      .filter(
        (movement) =>
          movement.cylinderTypeId === cylinderTypeId &&
          movement.status === status
      )
      .reduce((total, movement) => {
        switch (movement.type) {
          case "OPENING":
          case "RECEIVED":
          case "REFILL_RECEIVED":
          case "EMPTY_RETURNED":
          case "ADJUSTMENT":
            return total + movement.quantity;

          case "SOLD":
          case "SENT_FOR_REFILL":
            return total - movement.quantity;

          default:
            return total;
        }
      }, 0);
  };

  const totalRevenue = deliveries.reduce(
    (total, delivery) => total + Number(delivery.totalAmount || 0),
    0
  );

  const getDateKey = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  };

  const now = new Date();

  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const todaysDeliveries = deliveries.filter(
    (delivery) => getDateKey(delivery.deliveryDate) === todayKey
  );

  const todaysDeliveryValue = todaysDeliveries.reduce(
    (total, delivery) => total + Number(delivery.totalAmount || 0),
    0
  );

  const todaysPayments = payments.filter(
    (payment) => getDateKey(payment.paymentDate) === todayKey
  );

  const todaysPaymentsCollected = todaysPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  const outOfStockCount = stockAlerts.filter(
    (alert) =>
      alert.status === "OUT_OF_STOCK" || Number(alert.filledStock) <= 0
  ).length;

  const lowStockCount = stockAlerts.filter(
    (alert) =>
      alert.status === "LOW_STOCK" && Number(alert.filledStock) > 0
  ).length;

  const pendingCustomerCount = paymentReminders.length;

  const totalOutstanding = paymentReminders.reduce(
    (total, reminder) =>
      total + Number(reminder.outstandingBalance || 0),
    0
  );

  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="gf">
        <style>{dashboardStyles}</style>
        <div className="gf-hero skeleton-hero" />
        <div className="gf-grid gf-grid-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="gf-card skeleton-card" />
          ))}
        </div>
        <div className="gf-grid gf-grid-4" style={{ marginTop: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="gf-card skeleton-card short" />
          ))}
        </div>
        <p className="gf-loading-text">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="gf">
      <style>{dashboardStyles}</style>

      <header className="gf-hero">
        <div className="gf-hero-text">
          <span className="gf-hero-date">{todayLabel}</span>
          <h1>GasFlow Dashboard</h1>
          <p>Overview of your gas agency operations.</p>
        </div>

        <button
          type="button"
          className="gf-hero-btn"
          onClick={() => window.location.reload()}
        >
          <Icon name="refresh" size={16} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="gf-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="gf-error-btn"
          >
            Retry
          </button>
        </div>
      )}

      <section className="gf-section">
        <div className="gf-section-head">
          <h2>Today</h2>
          <span className="gf-pill">Live</span>
        </div>

        <div className="gf-grid gf-grid-3">
          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-green">
                <Icon name="calendar" />
              </span>
              <Link to="/deliveries" className="gf-link">
                View <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="gf-stat-label">Today's Deliveries</div>
            <div className="gf-stat-value">{todaysDeliveries.length}</div>
            <p className="gf-note">Deliveries recorded for today</p>
          </div>

          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-teal">
                <Icon name="wallet" />
              </span>
              <Link to="/daily-payments" className="gf-link">
                View <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="gf-stat-label">Payments Collected</div>
            <div className="gf-stat-value money">
              {formatCurrency(todaysPaymentsCollected)}
            </div>
            <p className="gf-note">
              {todaysPayments.length} payment
              {todaysPayments.length === 1 ? "" : "s"} recorded for today
            </p>
          </div>

          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-blue">
                <Icon name="rupee" />
              </span>
              <Link to="/daily-closing" className="gf-link">
                Daily Closing <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="gf-stat-label">Today's Delivery Value</div>
            <div className="gf-stat-value money">
              {formatCurrency(todaysDeliveryValue)}
            </div>
            <p className="gf-note">
              Value of today's deliveries, not payments collected
            </p>
          </div>
        </div>
      </section>

      <section className="gf-section">
        <div className="gf-section-head">
          <h2>Overview</h2>
        </div>

        <div className="gf-grid gf-grid-4">
          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-blue">
                <Icon name="users" />
              </span>
              <Link to="/customers" className="gf-link">
                View <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="gf-stat-label">Total Customers</div>
            <div className="gf-stat-value">{customers.length}</div>
          </div>

          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-green">
                <Icon name="truck" />
              </span>
              <Link to="/deliveries" className="gf-link">
                View <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="gf-stat-label">Total Deliveries</div>
            <div className="gf-stat-value">{deliveries.length}</div>
          </div>

          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-purple">
                <Icon name="cylinder" />
              </span>
              <Link to="/cylinder-types" className="gf-link">
                View <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="gf-stat-label">Cylinder Types</div>
            <div className="gf-stat-value">{cylinderTypes.length}</div>
          </div>

          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-teal">
                <Icon name="rupee" />
              </span>
              <Link to="/reports" className="gf-link">
                View Reports <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="gf-stat-label">Total Delivery Revenue</div>
            <div className="gf-stat-value money">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="gf-note">Based on recorded deliveries</p>
          </div>
        </div>
      </section>

      {/* Agency Operations: four cards in one desktop row */}
      <section className="gf-section">
        <div className="gf-section-head">
          <h2>Agency Operations</h2>
        </div>

        <p className="gf-section-desc">
          Manage staff, suppliers, purchases, and cylinder inventory from one place.
        </p>

        <div className="gf-grid gf-grid-4 gf-action-grid">
          <Link to="/staff" className="gf-card gf-action action-teal">
            <span className="gf-icon tone-teal">
              <Icon name="staff" />
            </span>
            <div className="gf-action-content">
              <h3>Staff Management</h3>
              <p>
                Add staff members, update their details, and manage staff accounts.
              </p>
              <span className="gf-link">
                Manage Staff <Icon name="arrow" size={14} />
              </span>
            </div>
          </Link>

          <Link to="/suppliers" className="gf-card gf-action action-blue">
            <span className="gf-icon tone-blue">
              <Icon name="building" />
            </span>
            <div className="gf-action-content">
              <h3>Supplier Management</h3>
              <p>
                View suppliers, manage their details, and maintain supplier records.
              </p>
              <span className="gf-link">
                View Suppliers <Icon name="arrow" size={14} />
              </span>
            </div>
          </Link>

          <Link to="/purchases" className="gf-card gf-action action-purple">
            <span className="gf-icon tone-purple">
              <Icon name="receipt" />
            </span>
            <div className="gf-action-content">
              <h3>Purchase Management</h3>
              <p>
                Create purchase records, track purchases, and manage incoming cylinder stock.
              </p>
              <span className="gf-link">
                Manage Purchases <Icon name="arrow" size={14} />
              </span>
            </div>
          </Link>

          <Link to="/inventory" className="gf-card gf-action action-blue">
            <span className="gf-icon tone-teal">
              <Icon name="box" />
            </span>
            <div className="gf-action-content">
              <h3>Manage Inventory</h3>
              <p>
                Monitor filled and empty cylinders, review stock movements, and check stock levels.
              </p>
              <span className="gf-link">
                Open Inventory <Icon name="arrow" size={14} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Payment Management: four cards in one desktop row */}
      <section className="gf-section">
        <div className="gf-section-head">
          <h2>Payment Management</h2>
        </div>

        <p className="gf-section-desc">
          Track staff salaries, customer balances, pending dues, and individual ledgers.
        </p>

        <div className="gf-grid gf-grid-4 gf-action-grid">
          <Link to="/staff-payments" className="gf-card gf-action action-teal">
            <span className="gf-icon tone-teal">
              <Icon name="salary" />
            </span>
            <div className="gf-action-content">
              <h3>Staff Payments</h3>
              <p>
                Record monthly staff salaries, track partial payments, and review outstanding balances.
              </p>
              <span className="gf-link">
                Manage Staff Payments <Icon name="arrow" size={14} />
              </span>
            </div>
          </Link>

          <Link
            to="/customer-balances"
            className="gf-card gf-action action-blue"
          >
            <span className="gf-icon tone-blue">
              <Icon name="wallet" />
            </span>
            <div className="gf-action-content">
              <h3>Customer Balances</h3>
              <p>
                View customer account balances and track outstanding amounts.
              </p>
              <span className="gf-link">
                View Balances <Icon name="arrow" size={14} />
              </span>
            </div>
          </Link>

          <Link
            to="/payment-reminders"
            className="gf-card gf-action action-purple"
          >
            <span className="gf-icon tone-amber">
              <Icon name="alert" />
            </span>
            <div className="gf-action-content">
              <h3>Customers With Dues</h3>
              <p>
                Check pending customer payments and follow up on outstanding dues.
              </p>
              <span className="gf-link">
                View Customers With Dues <Icon name="arrow" size={14} />
              </span>
            </div>
          </Link>

          <Link
            to="/customer-ledger"
            className="gf-card gf-action action-blue"
          >
            <span className="gf-icon tone-teal">
              <Icon name="receipt" />
            </span>
            <div className="gf-action-content">
              <h3>Customer Ledger</h3>
              <p>
                Review customer delivery history, payments, and outstanding balances.
              </p>
              <span className="gf-link">
                Open Ledger <Icon name="arrow" size={14} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section className="gf-section">
        <div className="gf-section-head">
          <h2>Alerts &amp; Reminders</h2>
        </div>

        <div className="gf-grid gf-grid-3">
          <div className="gf-card gf-alert alert-out">
            <div className="gf-alert-head">
              <span className="gf-icon tone-red">
                <Icon name="alert" />
              </span>
              <h3>Out of Stock</h3>
            </div>
            <div className="gf-stat-value">{outOfStockCount}</div>
            <p className="gf-note">Cylinder types with no filled stock</p>
            <Link to="/inventory" className="gf-link">
              Check Inventory <Icon name="arrow" size={14} />
            </Link>
          </div>

          <div className="gf-card gf-alert alert-low">
            <div className="gf-alert-head">
              <span className="gf-icon tone-amber">
                <Icon name="box" />
              </span>
              <h3>Low Stock</h3>
            </div>
            <div className="gf-stat-value">{lowStockCount}</div>
            <p className="gf-note">
              Cylinder types at or below their configured threshold
            </p>
            <Link to="/inventory" className="gf-link">
              Review Stock <Icon name="arrow" size={14} />
            </Link>
          </div>

          <div className="gf-card gf-alert alert-dues">
            <div className="gf-alert-head">
              <span className="gf-icon tone-blue">
                <Icon name="wallet" />
              </span>
              <h3>Customers With Dues</h3>
            </div>
            <div className="gf-stat-value">{pendingCustomerCount}</div>
            <p className="gf-note">
              Total outstanding: {formatCurrency(totalOutstanding)}
            </p>
            <Link to="/payment-reminders" className="gf-link">
              View Payment Reminders <Icon name="arrow" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="gf-section">
        <div className="gf-two-col">
          <div>
            <div className="gf-section-head">
              <h2>Low-Stock Alerts</h2>
            </div>

            {stockAlerts.length === 0 ? (
              <div className="gf-empty">
                <span className="gf-empty-icon">
                  <Icon name="check" size={16} />
                </span>
                <p>All cylinder types are above their stock thresholds.</p>
              </div>
            ) : (
              <div className="gf-table-wrap">
                <table className="gf-table">
                  <thead>
                    <tr>
                      <th>Cylinder Type</th>
                      <th>Filled</th>
                      <th>Threshold</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAlerts.map((alert) => {
                      const outOfStock =
                        alert.status === "OUT_OF_STOCK" ||
                        Number(alert.filledStock) <= 0;

                      return (
                        <tr key={alert.cylinderTypeId}>
                          <td className="strong">{alert.cylinderTypeName}</td>
                          <td>{alert.filledStock}</td>
                          <td>{alert.threshold}</td>
                          <td>
                            <span
                              className={`gf-badge ${
                                outOfStock ? "badge-out" : "badge-low"
                              }`}
                            >
                              {outOfStock ? "OUT OF STOCK" : "LOW STOCK"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="gf-section-head">
              <h2>Current Stock</h2>
            </div>

            {cylinderTypes.length === 0 ? (
              <div className="gf-empty">
                <p>No cylinder types found.</p>
              </div>
            ) : (
              <div className="gf-table-wrap">
                <table className="gf-table">
                  <thead>
                    <tr>
                      <th>Cylinder Type</th>
                      <th>Filled</th>
                      <th>Empty</th>
                      <th className="bar-col">Filled share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cylinderTypes.map((cylinder) => {
                      const filled = calculateStock(cylinder.id, "FILLED");
                      const empty = calculateStock(cylinder.id, "EMPTY");

                      const total =
                        Math.max(filled, 0) + Math.max(empty, 0);

                      const pct =
                        total > 0
                          ? Math.round(
                              (Math.max(filled, 0) / total) * 100
                            )
                          : 0;

                      return (
                        <tr key={cylinder.id}>
                          <td className="strong">
                            {cylinder.name ??
                              cylinder.type ??
                              `Type #${cylinder.id}`}
                          </td>
                          <td>{filled}</td>
                          <td>{empty}</td>
                          <td className="bar-col">
                            <div className="gf-bar" title={`${pct}% filled`}>
                              <span style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const dashboardStyles = `
  .gf {
    --ink: #0f172a;
    --text: #334155;
    --muted: #64748b;
    --line: #e5e9f0;
    --bg: #f4f6fb;
    --card: #ffffff;
    --brand: #4f46e5;
    --brand-dark: #4338ca;

    box-sizing: border-box;
    width: 100%;
    min-height: 100%;
    padding: clamp(16px, 2.4vw, 32px);
    background: var(--bg);
    color: var(--text);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.55;
  }

  .gf *, .gf *::before, .gf *::after {
    box-sizing: border-box;
  }

  .gf h1, .gf h2, .gf h3 {
    margin: 0;
    color: var(--ink);
  }

  .gf p { margin: 0; }
  .gf a { text-decoration: none; }

  .gf-hero {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 28px 30px;
    margin-bottom: 8px;
    color: #fff;
    border-radius: 20px;
    background: linear-gradient(120deg, #1e1b4b 0%, #3730a3 55%, #4f46e5 100%);
    box-shadow: 0 16px 34px rgba(55, 48, 163, .22);
  }

  .gf-hero::before, .gf-hero::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    background: rgba(255,255,255,.07);
  }

  .gf-hero::before {
    width: 260px;
    height: 260px;
    right: -70px;
    top: -120px;
  }

  .gf-hero::after {
    width: 160px;
    height: 160px;
    right: 120px;
    bottom: -110px;
  }

  .gf-hero-text { position: relative; z-index: 1; }

  .gf-hero-date {
    display: inline-block;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .4px;
    color: rgba(255,255,255,.75);
  }

  .gf .gf-hero h1 {
    color: #fff;
    font-size: clamp(24px, 3vw, 33px);
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -.8px;
  }

  .gf .gf-hero p {
    margin-top: 6px;
    color: rgba(255,255,255,.8);
  }

  .gf-hero-btn {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 16px;
    font: inherit;
    font-weight: 700;
    font-size: 13px;
    color: #fff;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.28);
    border-radius: 11px;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: background .15s ease;
  }

  .gf-hero-btn:hover { background: rgba(255,255,255,.24); }

  .gf-section { margin-top: 30px; }

  .gf-section-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .gf-section-head h2 {
    font-size: 18px;
    font-weight: 750;
    letter-spacing: -.3px;
  }

  .gf-section-desc {
    margin: -6px 0 14px;
    color: var(--muted);
    font-size: 13px;
  }

  .gf-pill {
    padding: 3px 9px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .6px;
    text-transform: uppercase;
    color: #047857;
    background: #d1fae5;
    border-radius: 999px;
  }

  .gf-grid {
    display: grid;
    gap: 16px;
    width: 100%;
  }

  .gf-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gf-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .gf-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  .gf-two-col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    align-items: start;
  }

  .gf-card {
    min-width: 0;
    padding: 20px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .035);
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }

  .gf-card:hover {
    transform: translateY(-2px);
    border-color: #d2d9e6;
    box-shadow: 0 12px 26px rgba(15, 23, 42, .08);
  }

  .gf-stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }

  .gf-stat-label {
    font-size: 13px;
    font-weight: 650;
    color: var(--muted);
  }

  .gf-stat-value {
    margin-top: 4px;
    font-size: clamp(28px, 2.3vw, 36px);
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -1px;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .gf-stat-value.money {
    font-size: clamp(21px, 1.9vw, 28px);
    letter-spacing: -.6px;
  }

  .gf-note {
    margin-top: 6px;
    font-size: 12px;
    color: var(--muted);
  }

  .gf-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }

  .tone-blue { background: #e0e7ff; color: #4338ca; }
  .tone-green { background: #dcfce7; color: #15803d; }
  .tone-purple { background: #f3e8ff; color: #7e22ce; }
  .tone-teal { background: #ccfbf1; color: #0f766e; }
  .tone-red { background: #fee2e2; color: #b91c1c; }
  .tone-amber { background: #fef3c7; color: #b45309; }

  .gf-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 750;
    color: var(--brand);
    transition: gap .15s ease, color .15s ease;
  }

  .gf-link:hover {
    gap: 7px;
    color: var(--brand-dark);
  }

  /* Four-card action sections */
  .gf-action-grid {
    align-items: stretch;
  }

  .gf-action-grid > .gf-action {
    min-width: 0;
    height: 100%;
    padding: 18px 14px;
    gap: 12px;
  }

  .gf-action {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 22px;
    color: inherit;
    border-left: 4px solid;
  }

  .gf-action-content {
    flex: 1;
    min-width: 0;
  }

  .gf-action h3 {
    font-size: 14px;
    line-height: 1.4;
    font-weight: 750;
    margin-bottom: 6px;
    overflow-wrap: anywhere;
  }

  .gf-action p {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.55;
    margin-bottom: 12px;
    overflow-wrap: anywhere;
  }

  .gf-action .gf-link {
    font-size: 11px;
    flex-wrap: wrap;
  }

  .action-blue { border-left-color: #6366f1; }
  .action-purple { border-left-color: #a855f7; }
  .action-teal { border-left-color: #0d9488; }

  .gf-alert { border-top: 3px solid; }

  .gf-alert-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .gf-alert-head h3 {
    font-size: 14px;
    font-weight: 700;
  }

  .gf-alert .gf-link { margin-top: 12px; }

  .alert-out {
    border-top-color: #ef4444;
    background: linear-gradient(#fff7f7, #fff 70%);
  }

  .alert-out .gf-stat-value { color: #b91c1c; }

  .alert-low {
    border-top-color: #f59e0b;
    background: linear-gradient(#fffbf0, #fff 70%);
  }

  .alert-low .gf-stat-value { color: #b45309; }

  .alert-dues {
    border-top-color: #6366f1;
    background: linear-gradient(#f6f7ff, #fff 70%);
  }

  .alert-dues .gf-stat-value { color: #4338ca; }

  .gf-table-wrap {
    overflow-x: auto;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .gf-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 13px;
  }

  .gf-table th {
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

  .gf-table td {
    padding: 14px 16px;
    color: var(--text);
    border-bottom: 1px solid #eef1f6;
    vertical-align: middle;
  }

  .gf-table tbody tr:last-child td { border-bottom: 0; }
  .gf-table tbody tr:hover td { background: #fafbff; }
  .gf-table td.strong { color: var(--ink); font-weight: 700; }
  .bar-col { min-width: 110px; }

  .gf-bar {
    height: 8px;
    overflow: hidden;
    background: #e8ecf4;
    border-radius: 999px;
  }

  .gf-bar span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #6366f1, #22c1a5);
  }

  .gf-badge {
    display: inline-flex;
    padding: 4px 10px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .3px;
    white-space: nowrap;
    border-radius: 999px;
  }

  .badge-out { color: #991b1b; background: #fee2e2; }
  .badge-low { color: #92400e; background: #fef3c7; }

  .gf-empty {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 22px;
    background: var(--card);
    border: 1px dashed #cfd8e6;
    border-radius: 16px;
  }

  .gf-empty p { color: var(--muted); }

  .gf-empty-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #15803d;
    background: #dcfce7;
    border-radius: 50%;
  }

  .gf-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 16px;
    padding: 14px 16px;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
  }

  .gf-error-btn {
    padding: 8px 14px;
    font: inherit;
    font-weight: 700;
    color: #fff;
    background: #dc2626;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
  }

  .gf-error-btn:hover { background: #b91c1c; }

  .skeleton-hero, .skeleton-card {
    background: linear-gradient(90deg, #e9edf5 25%, #f4f6fb 50%, #e9edf5 75%);
    background-size: 200% 100%;
    animation: gf-shimmer 1.3s infinite linear;
    border: 0;
    box-shadow: none;
  }

  .skeleton-hero {
    height: 112px;
    margin-bottom: 30px;
  }

  .skeleton-card { height: 140px; }
  .skeleton-card.short { height: 110px; }
  .skeleton-card:hover { transform: none; box-shadow: none; }

  .gf-loading-text {
    margin-top: 22px;
    text-align: center;
    color: var(--muted);
    font-weight: 600;
  }

  @keyframes gf-shimmer {
    to { background-position: -200% 0; }
  }

  /* Medium screens */
  @media (max-width: 1180px) {
    .gf-grid-4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .gf-two-col {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 860px) {
    .gf-grid-3 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  /* Mobile */
  @media (max-width: 640px) {
    .gf { padding: 14px; }

    .gf-hero {
      padding: 22px 20px;
      border-radius: 16px;
    }

    .gf-hero-btn { display: none; }

    .gf-grid-2,
    .gf-grid-3,
    .gf-grid-4 {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .gf-section { margin-top: 24px; }

    .gf-action-grid > .gf-action {
      padding: 16px;
    }

    .gf-table th,
    .gf-table td {
      padding: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-card,
    .gf-link,
    .skeleton-hero,
    .skeleton-card {
      transition: none;
      animation: none;
    }
  }
`;

export default Dashboard;
