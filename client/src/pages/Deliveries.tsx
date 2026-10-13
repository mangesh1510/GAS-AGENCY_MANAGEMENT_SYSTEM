import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api";
const PAGE_SIZE = 10;

type Delivery = {
  id: number;
  customerId: number;
  cylinderTypeId: number;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  deliveryDate: string;
  note: string | null;
  createdAt: string;
  createdBy: number | null;
};

type Customer = {
  id: number;
  name: string;
};

type CylinderType = {
  id: number;
  name: string;
  capacityKg: string;
};

function Icon({
  name,
  size = 20,
}: {
  name:
    | "truck"
    | "plus"
    | "search"
    | "calendar"
    | "rupee"
    | "arrow"
    | "eye"
    | "edit"
    | "refresh"
    | "box";
  size?: number;
}) {
  const paths: Record<string, string[]> = {
    truck: [
      "M1 3h15v13H1z",
      "M16 8h4l3 3v5h-7z",
      "M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
      "M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    ],
    plus: ["M12 5v14", "M5 12h14"],
    search: [
      "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
      "M21 21l-4.35-4.35",
    ],
    calendar: ["M3 4h18v17H3z", "M16 2v4", "M8 2v4", "M3 10h18"],
    rupee: ["M6 3h12", "M6 8h12", "M6 13l8.5 8", "M6 13h3a4 4 0 0 0 0-8"],
    arrow: ["M5 12h14", "M13 6l6 6-6 6"],
    eye: [
      "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z",
      "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    ],
    edit: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4z"],
    refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
    box: ["M21 8l-9-5-9 5v8l9 5 9-5z", "M3.3 7L12 12l8.7-5", "M12 22V12"],
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(paths[name] ?? []).map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Sort by delivery date, newest first.
 * Use createdAt as a tie-breaker when delivery dates are equal,
 * then use the ID as a final tie-breaker.
 */
function getDeliveryTimestamp(delivery: Delivery) {
  const deliveryTime = new Date(delivery.deliveryDate).getTime();

  return Number.isNaN(deliveryTime) ? 0 : deliveryTime;
}

function Deliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
      };

      const [deliveryResponse, customerResponse, cylinderResponse] =
        await Promise.all([
          fetch(`${API_URL}/deliveries`, { headers }),
          fetch(`${API_URL}/customers`, { headers }),
          fetch(`${API_URL}/cylinder-types`, { headers }),
        ]);

      const [deliveryData, customerData, cylinderData] = await Promise.all([
        deliveryResponse.json(),
        customerResponse.json(),
        cylinderResponse.json(),
      ]);

      if (!deliveryResponse.ok) {
        throw new Error(
          deliveryData.message || "Failed to load deliveries."
        );
      }

      if (!customerResponse.ok) {
        throw new Error(
          customerData.message || "Failed to load customers."
        );
      }

      if (!cylinderResponse.ok) {
        throw new Error(
          cylinderData.message || "Failed to load cylinder types."
        );
      }

      setDeliveries(deliveryData.data ?? []);
      setCustomers(customerData.data ?? []);
      setCylinderTypes(cylinderData.data ?? []);
    } catch (err) {
      console.error("Failed to load delivery data:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load delivery data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const getCustomerName = (customerId: number) =>
    customers.find((customer) => customer.id === customerId)?.name ??
    `Unknown customer (#${customerId})`;

  const getCylinderName = (cylinderTypeId: number) => {
    const cylinder = cylinderTypes.find(
      (item) => item.id === cylinderTypeId
    );

    return cylinder
      ? `${cylinder.name} (${cylinder.capacityKg} kg)`
      : `Unknown cylinder (#${cylinderTypeId})`;
  };

  // Sort all deliveries newest first, without mutating React state.
  const sortedDeliveries = useMemo(() => {
    return [...deliveries].sort((a, b) => {
      const dateDifference =
        getDeliveryTimestamp(b) - getDeliveryTimestamp(a);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      const createdA = new Date(a.createdAt).getTime() || 0;
      const createdB = new Date(b.createdAt).getTime() || 0;

      if (createdA !== createdB) {
        return createdB - createdA;
      }

      return b.id - a.id;
    });
  }, [deliveries]);

  // Apply search and date filters before pagination.
  const filteredDeliveries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sortedDeliveries.filter((delivery) => {
      const customerName = getCustomerName(delivery.customerId).toLowerCase();
      const cylinderName = getCylinderName(
        delivery.cylinderTypeId
      ).toLowerCase();

      const matchesSearch =
        !query ||
        String(delivery.id).includes(query) ||
        customerName.includes(query) ||
        cylinderName.includes(query) ||
        String(delivery.note ?? "").toLowerCase().includes(query);

      const matchesDate =
        !dateFilter ||
        delivery.deliveryDate.slice(0, 10) === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [
    sortedDeliveries,
    customers,
    cylinderTypes,
    search,
    dateFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeliveries.length / PAGE_SIZE)
  );

  // Keep the selected page valid when filters or data change.
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const paginatedDeliveries = filteredDeliveries.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const firstRecord =
    filteredDeliveries.length === 0 ? 0 : startIndex + 1;

  const lastRecord = Math.min(
    startIndex + PAGE_SIZE,
    filteredDeliveries.length
  );

  // Summary cards use the full dataset, except filtered totals.
  const totalQuantity = filteredDeliveries.reduce(
    (total, delivery) => total + Number(delivery.quantity || 0),
    0
  );

  const totalValue = filteredDeliveries.reduce(
    (total, delivery) => total + Number(delivery.totalAmount || 0),
    0
  );

  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const todaysCount = deliveries.filter(
    (delivery) => delivery.deliveryDate.slice(0, 10) === todayKey
  ).length;

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  return (
    <div className="gf-deliveries">
      <style>{styles}</style>

      {/* Page header */}
      <header className="gd-hero">
        <div className="gd-hero-content">
          <Link to="/" className="gd-back">
            <Icon name="arrow" size={15} />
            Back to Dashboard
          </Link>

          <div className="gd-title-row">
            <span className="gd-hero-icon">
              <Icon name="truck" size={29} />
            </span>

            <div>
              <span className="gd-eyebrow">GASFLOW • OPERATIONS</span>
              <h1>Deliveries</h1>
              <p>Track cylinder deliveries and customer orders.</p>
            </div>
          </div>
        </div>

        <Link to="/deliveries/new" className="gd-primary-btn">
          <Icon name="plus" size={18} />
          Add Delivery
        </Link>
      </header>

      {/* Error */}
      {error && (
        <div className="gd-error" role="alert">
          <div>
            <strong>Unable to load deliveries</strong>
            <p>{error}</p>
          </div>

          {error.toLowerCase().includes("authentication") ||
          error.toLowerCase().includes("token") ? (
            <Link to="/login" className="gd-retry-btn">
              Go to Login
            </Link>
          ) : (
            <button
              type="button"
              className="gd-retry-btn"
              onClick={() => void loadData()}
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Summary cards */}
      <section className="gd-stats">
        <div className="gd-stat-card">
          <span className="gd-stat-icon blue">
            <Icon name="truck" size={21} />
          </span>
          <div>
            <p>Total Deliveries</p>
            <h2>{deliveries.length}</h2>
            <span className="gd-stat-note">All recorded deliveries</span>
          </div>
        </div>

        <div className="gd-stat-card">
          <span className="gd-stat-icon green">
            <Icon name="calendar" size={21} />
          </span>
          <div>
            <p>Today's Deliveries</p>
            <h2>{todaysCount}</h2>
            <span className="gd-stat-note">Recorded today</span>
          </div>
        </div>

        <div className="gd-stat-card">
          <span className="gd-stat-icon purple">
            <Icon name="box" size={21} />
          </span>
          <div>
            <p>Filtered Quantity</p>
            <h2>{totalQuantity}</h2>
            <span className="gd-stat-note">Cylinder quantity</span>
          </div>
        </div>

        <div className="gd-stat-card">
          <span className="gd-stat-icon teal">
            <Icon name="rupee" size={21} />
          </span>
          <div>
            <p>Filtered Delivery Value</p>
            <h2 className="gd-money">{formatCurrency(totalValue)}</h2>
            <span className="gd-stat-note">Based on filtered records</span>
          </div>
        </div>
      </section>

      {/* Delivery table */}
      <section className="gd-panel">
        <div className="gd-panel-heading">
          <div>
            <h2>All Deliveries</h2>
            <p>Newest deliveries appear first. Search and review records.</p>
          </div>

          <button
            type="button"
            className="gd-refresh-btn"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <Icon name="refresh" size={16} />
            Refresh
          </button>
        </div>

        {/* Search and date filters */}
        <div className="gd-filters">
          <label className="gd-search">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search by ID, customer, cylinder, or note..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          <label className="gd-date-filter">
            <Icon name="calendar" size={17} />
            <input
              type="date"
              aria-label="Filter by delivery date"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          {(search || dateFilter) && (
            <button
              type="button"
              className="gd-clear-btn"
              onClick={() => {
                setSearch("");
                setDateFilter("");
                setCurrentPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="gd-empty">
            <span className="gd-spinner" />
            <p>Loading delivery records...</p>
          </div>
        ) : error ? (
          <div className="gd-empty">
            <span className="gd-empty-symbol">!</span>
            <h3>Delivery records unavailable</h3>
            <p>Resolve the error above to view your records.</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="gd-empty">
            <span className="gd-empty-icon">
              <Icon name="truck" size={25} />
            </span>

            <h3>
              {deliveries.length === 0
                ? "No deliveries yet"
                : "No matching deliveries"}
            </h3>

            <p>
              {deliveries.length === 0
                ? "Create your first delivery to see it listed here."
                : "Try changing your search or date filter."}
            </p>

            {deliveries.length === 0 && (
              <Link to="/deliveries/new" className="gd-primary-btn">
                <Icon name="plus" size={17} />
                Add First Delivery
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="gd-table-wrap">
              <table className="gd-table">
                <thead>
                  <tr>
                    <th>Delivery</th>
                    <th>Customer</th>
                    <th>Cylinder Type</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Amount</th>
                    <th>Delivery Date</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedDeliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>
                        <span className="gd-id">#{delivery.id}</span>
                      </td>

                      <td>
                        <div className="gd-customer">
                          <span className="gd-avatar">
                            {getCustomerName(delivery.customerId)
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                          <span className="gd-customer-name">
                            {getCustomerName(delivery.customerId)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="gd-cylinder">
                          {getCylinderName(delivery.cylinderTypeId)}
                        </span>
                      </td>

                      <td>
                        <span className="gd-quantity">
                          {delivery.quantity}
                        </span>
                      </td>

                      <td className="gd-amount">
                        {formatCurrency(delivery.unitPrice)}
                      </td>

                      <td className="gd-amount gd-total">
                        {formatCurrency(delivery.totalAmount)}
                      </td>

                      <td>
                        <span className="gd-date">
                          {formatDate(delivery.deliveryDate)}
                        </span>
                      </td>

                      <td>
                        <span className="gd-note" title={delivery.note ?? ""}>
                          {delivery.note || "—"}
                        </span>
                      </td>

                      <td>
                        <div className="gd-actions">
                          <Link
                            to={`/deliveries/${delivery.id}`}
                            className="gd-icon-btn view"
                            title="View delivery"
                            aria-label={`View delivery ${delivery.id}`}
                          >
                            <Icon name="eye" size={17} />
                          </Link>

                          <Link
                            to={`/deliveries/${delivery.id}/edit`}
                            className="gd-icon-btn edit"
                            title="Edit delivery"
                            aria-label={`Edit delivery ${delivery.id}`}
                          >
                            <Icon name="edit" size={17} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="gd-pagination">
              <div className="gd-pagination-info">
                Showing <strong>{firstRecord}–{lastRecord}</strong> of{" "}
                <strong>{filteredDeliveries.length}</strong> deliveries
              </div>

              <nav className="gd-page-controls" aria-label="Delivery pages">
                <button
                  type="button"
                  className="gd-page-btn gd-page-prev"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                >
                  Previous
                </button>

                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`gd-page-btn ${
                      currentPage === page ? "active" : ""
                    }`}
                    aria-current={currentPage === page ? "page" : undefined}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className="gd-page-btn gd-page-next"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                >
                  Next
                </button>
              </nav>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const styles = `
  .gf-deliveries {
    --gd-ink: #111827;
    --gd-text: #334155;
    --gd-muted: #64748b;
    --gd-line: #e5e9f2;
    --gd-bg: #f4f6fb;
    --gd-purple: #4f46e5;
    box-sizing: border-box;
    min-height: 100%;
    padding: clamp(16px, 2.4vw, 32px);
    background: var(--gd-bg);
    color: var(--gd-text);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  .gf-deliveries *, .gf-deliveries *::before, .gf-deliveries *::after {
    box-sizing: border-box;
  }

  .gf-deliveries a { text-decoration: none; }

  .gd-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 28px 30px;
    margin-bottom: 24px;
    color: white;
    border-radius: 20px;
    background: linear-gradient(120deg, #1e1b4b 0%, #3730a3 56%, #6366f1 100%);
    box-shadow: 0 14px 30px rgba(55, 48, 163, .18);
  }

  .gd-hero-content { min-width: 0; }

  .gd-back {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 20px;
    color: rgba(255,255,255,.8);
    font-size: 12px;
    font-weight: 650;
  }

  .gd-back svg { transform: rotate(180deg); }
  .gd-back:hover { color: white; }

  .gd-title-row { display: flex; align-items: center; gap: 16px; }

  .gd-hero-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    color: white;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 16px;
  }

  .gd-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.3px;
  }

  .gf-deliveries .gd-hero h1 {
    margin: 0;
    color: white;
    font-size: clamp(26px, 3vw, 34px);
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -.8px;
  }

  .gf-deliveries .gd-hero p {
    margin: 7px 0 0;
    color: rgba(255,255,255,.78);
    font-size: 13px;
  }

  .gd-primary-btn {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 43px;
    padding: 11px 17px;
    color: white;
    background: #4f46e5;
    border: 1px solid transparent;
    border-radius: 11px;
    font-size: 13px;
    font-weight: 750;
    transition: transform .15s ease, background .15s ease;
  }

  .gd-hero .gd-primary-btn { color: #3730a3; background: white; }

  .gd-primary-btn:hover {
    background: #4338ca;
    color: white;
    transform: translateY(-1px);
  }

  .gd-hero .gd-primary-btn:hover { color: #312e81; background: #eef2ff; }

  .gd-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 26px;
  }

  .gd-stat-card {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    min-width: 0;
    padding: 20px;
    background: white;
    border: 1px solid var(--gd-line);
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(15,23,42,.025);
  }

  .gd-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 43px;
    height: 43px;
    flex-shrink: 0;
    border-radius: 12px;
  }

  .gd-stat-icon.blue { color: #4338ca; background: #e0e7ff; }
  .gd-stat-icon.green { color: #15803d; background: #dcfce7; }
  .gd-stat-icon.purple { color: #7e22ce; background: #f3e8ff; }
  .gd-stat-icon.teal { color: #0f766e; background: #ccfbf1; }

  .gd-stat-card p {
    margin: 1px 0 6px;
    color: var(--gd-muted);
    font-size: 12px;
    font-weight: 650;
  }

  .gd-stat-card h2 {
    margin: 0;
    color: var(--gd-ink);
    font-size: clamp(22px, 2vw, 30px);
    font-weight: 800;
    line-height: 1.25;
    letter-spacing: -.6px;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }

  .gd-stat-card h2.gd-money { font-size: clamp(17px, 1.6vw, 23px); }
  .gd-stat-note { display: block; margin-top: 5px; color: #94a3b8; font-size: 11px; }

  .gd-panel {
    min-width: 0;
    overflow: hidden;
    background: white;
    border: 1px solid var(--gd-line);
    border-radius: 18px;
    box-shadow: 0 3px 12px rgba(15,23,42,.035);
  }

  .gd-panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 24px 24px 20px;
  }

  .gd-panel-heading h2 {
    margin: 0;
    color: var(--gd-ink);
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -.35px;
  }

  .gd-panel-heading p { margin: 5px 0 0; color: var(--gd-muted); font-size: 12px; }

  .gd-refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 37px;
    padding: 8px 12px;
    color: #475569;
    background: white;
    border: 1px solid var(--gd-line);
    border-radius: 9px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .gd-refresh-btn:hover { color: #4338ca; background: #f5f5ff; }
  .gd-refresh-btn:disabled { opacity: .6; cursor: wait; }

  .gd-filters {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 0 24px 20px;
  }

  .gd-search, .gd-date-filter {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 42px;
    padding: 0 12px;
    color: #94a3b8;
    background: #f8fafc;
    border: 1px solid #e6eaf1;
    border-radius: 10px;
  }

  .gd-search { flex: 1; min-width: 220px; }
  .gd-date-filter { min-width: 180px; }

  .gd-search input, .gd-date-filter input {
    width: 100%;
    min-width: 0;
    color: var(--gd-text);
    background: transparent;
    border: 0;
    outline: none;
    font: inherit;
    font-size: 12px;
  }

  .gd-search:focus-within, .gd-date-filter:focus-within {
    border-color: #a5b4fc;
    box-shadow: 0 0 0 3px rgba(99,102,241,.1);
  }

  .gd-clear-btn {
    padding: 9px 12px;
    color: #4f46e5;
    background: #eef2ff;
    border: 0;
    border-radius: 9px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .gd-clear-btn:hover { background: #e0e7ff; }

  .gd-table-wrap { width: 100%; overflow-x: auto; }

  .gd-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    text-align: left;
    font-size: 12px;
  }

  .gd-table thead th {
    padding: 14px 16px;
    color: #64748b;
    background: #f8fafc;
    border-top: 1px solid #edf0f5;
    border-bottom: 1px solid #e9edf4;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .65px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .gd-table thead th:first-child,
  .gd-table tbody td:first-child { padding-left: 24px; }

  .gd-table tbody td {
    padding: 15px 16px;
    color: #475569;
    border-bottom: 1px solid #f0f2f7;
    vertical-align: middle;
    white-space: nowrap;
  }

  .gd-table tbody tr:last-child td { border-bottom: 0; }
  .gd-table tbody tr:hover td { background: #fafbff; }

  .gd-id {
    display: inline-flex;
    align-items: center;
    padding: 5px 8px;
    color: #4338ca;
    background: #eef2ff;
    border-radius: 7px;
    font-weight: 800;
    font-size: 11px;
  }

  .gd-customer { display: flex; align-items: center; gap: 9px; }

  .gd-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 31px;
    height: 31px;
    flex-shrink: 0;
    color: #4338ca;
    background: #e0e7ff;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 800;
  }

  .gd-customer-name { color: #1e293b; font-weight: 750; }
  .gd-cylinder { color: #475569; }
  .gd-quantity { color: #1e293b; font-weight: 800; }
  .gd-amount { color: #475569; font-variant-numeric: tabular-nums; }
  .gd-total { color: #0f766e; font-weight: 800; }
  .gd-date { color: #475569; }
  .gd-note { display: inline-block; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .gd-actions { display: flex; align-items: center; gap: 7px; }

  .gd-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 33px;
    height: 33px;
    border: 1px solid transparent;
    border-radius: 9px;
    transition: background .15s ease, transform .15s ease;
  }

  .gd-icon-btn:hover { transform: translateY(-1px); }
  .gd-icon-btn.view { color: #4338ca; background: #eef2ff; }
  .gd-icon-btn.view:hover { background: #e0e7ff; }
  .gd-icon-btn.edit { color: #0f766e; background: #ccfbf1; }
  .gd-icon-btn.edit:hover { background: #99f6e4; }

  .gd-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding: 16px 24px;
    background: #fafbfe;
    border-top: 1px solid #edf0f5;
  }

  .gd-pagination-info {
    color: #64748b;
    font-size: 12px;
  }

  .gd-pagination-info strong { color: #334155; }

  .gd-page-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
  }

  .gd-page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    min-height: 34px;
    padding: 7px 10px;
    color: #475569;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease;
  }

  .gd-page-btn:hover:not(:disabled) {
    color: #4338ca;
    background: #eef2ff;
    border-color: #c7d2fe;
  }

  .gd-page-btn.active {
    color: white;
    background: #4f46e5;
    border-color: #4f46e5;
  }

  .gd-page-btn:disabled {
    opacity: .4;
    cursor: not-allowed;
  }

  .gd-page-prev, .gd-page-next { padding-inline: 12px; }

  .gd-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 240px;
    padding: 30px 20px;
    text-align: center;
  }

  .gd-empty h3 { margin: 5px 0 0; color: #1e293b; font-size: 16px; font-weight: 800; }
  .gd-empty p { margin: 0 0 8px; color: #64748b; font-size: 12px; }

  .gd-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 55px;
    height: 55px;
    margin-bottom: 6px;
    color: #4f46e5;
    background: #eef2ff;
    border-radius: 17px;
  }

  .gd-empty-symbol {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    color: #b91c1c;
    background: #fee2e2;
    border-radius: 50%;
    font-size: 22px;
    font-weight: 800;
  }

  .gd-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e0e7ff;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: gd-spin .7s linear infinite;
  }

  @keyframes gd-spin { to { transform: rotate(360deg); } }

  .gd-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 22px;
    padding: 16px 18px;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 13px;
  }

  .gd-error strong { display: block; font-size: 13px; }
  .gd-error p { margin: 4px 0 0; font-size: 12px; }

  .gd-retry-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    color: #991b1b;
    background: white;
    border: 1px solid #fecaca;
    border-radius: 8px;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
  }

  .gd-retry-btn:hover { background: #fff7f7; }

  @media (max-width: 1200px) {
    .gd-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 760px) {
    .gf-deliveries { padding: 14px; }
    .gd-hero { align-items: flex-start; flex-direction: column; padding: 22px; }
    .gd-hero .gd-primary-btn { width: 100%; }
    .gd-panel-heading { padding: 20px 18px; }
    .gd-filters { padding: 0 18px 18px; }
    .gd-search { min-width: 100%; }
    .gd-date-filter { flex: 1; }
    .gd-pagination { padding: 15px 18px; }
    .gd-pagination-info { width: 100%; }
    .gd-page-controls { justify-content: flex-start; }
  }

  @media (max-width: 480px) {
    .gd-stats { grid-template-columns: 1fr; gap: 10px; }
    .gd-stat-card { padding: 16px; }
    .gd-title-row { gap: 12px; }
    .gd-hero-icon { width: 49px; height: 49px; }
    .gf-deliveries .gd-hero h1 { font-size: 26px; }
    .gd-panel-heading { align-items: flex-start; }
    .gd-refresh-btn { padding: 8px; }
    .gd-page-btn { min-width: 32px; padding: 6px 8px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-deliveries *, .gf-deliveries *::before, .gf-deliveries *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

export default Deliveries;