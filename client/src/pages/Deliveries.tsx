
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

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

function getTodayKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDateKey(value: string) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function Icon({
  name,
  size = 20,
}: {
  name: "truck" | "plus" | "search" | "calendar" | "rupee" | "arrow" | "refresh" | "box";
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
    refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
    box: [
      "M21 8l-9-5-9 5v8l9 5 9-5z",
      "M3.3 7L12 12l8.7-5",
      "M12 22V12",
    ],
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
  const key = getDateKey(value);

  if (!key) return "—";

  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatKg(value: string | number) {
  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(2) : "0.00";
}

function Deliveries() {
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(getTodayKey());

  const [currentPage, setCurrentPage] = useState(1);

  const todayKey = getTodayKey();

  const loadData = useCallback(async () => {
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
        throw new Error(deliveryData.message || "Failed to load deliveries.");
      }

      if (!customerResponse.ok) {
        throw new Error(customerData.message || "Failed to load customers.");
      }

      if (!cylinderResponse.ok) {
        throw new Error(
          cylinderData.message || "Failed to load cylinder types."
        );
      }

      const deliveryList = Array.isArray(deliveryData)
        ? deliveryData
        : deliveryData.data;

      const customerList = Array.isArray(customerData)
        ? customerData
        : customerData.data;

      const cylinderList = Array.isArray(cylinderData)
        ? cylinderData
        : cylinderData.data;

      if (
        !Array.isArray(deliveryList) ||
        !Array.isArray(customerList) ||
        !Array.isArray(cylinderList)
      ) {
        throw new Error("The server returned an unexpected response.");
      }

      setDeliveries(deliveryList);
      setCustomers(customerList);
      setCylinderTypes(cylinderList);

      setStartDate((currentStart) => {
        if (currentStart) return currentStart;

        const validDates = deliveryList
          .map((delivery: Delivery) => getDateKey(delivery.deliveryDate))
          .filter((date: string) => date && date <= todayKey)
          .sort();

        return validDates[0] || todayKey;
      });
    } catch (err: unknown) {
      console.error("Failed to load delivery data:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load delivery data."
      );
    } finally {
      setLoading(false);
    }
  }, [todayKey]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const firstDeliveryDate = useMemo(() => {
    const dates = deliveries
      .map((delivery) => getDateKey(delivery.deliveryDate))
      .filter((date) => date && date <= todayKey)
      .sort();

    return dates[0] || todayKey;
  }, [deliveries, todayKey]);

  const getCustomerName = (customerId: number) =>
    customers.find((customer) => customer.id === customerId)?.name ??
    `Unknown customer (#${customerId})`;

  const getCylinderName = (cylinderTypeId: number) => {
    const cylinder = cylinderTypes.find(
      (item) => item.id === cylinderTypeId
    );

    return cylinder
      ? `${cylinder.name} (${formatKg(cylinder.capacityKg)} kg)`
      : `Unknown cylinder (#${cylinderTypeId})`;
  };

  const dateRangeDeliveries = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return [];

    return deliveries.filter((delivery) => {
      const deliveryDate = getDateKey(delivery.deliveryDate);

      if (!deliveryDate) return false;
      if (startDate && deliveryDate < startDate) return false;
      if (endDate && deliveryDate > endDate) return false;

      return true;
    });
  }, [deliveries, startDate, endDate]);

  const sortedDeliveries = useMemo(() => {
    return [...dateRangeDeliveries].sort((a, b) => {
      const dateDifference =
        new Date(b.deliveryDate).getTime() -
        new Date(a.deliveryDate).getTime();

      if (dateDifference !== 0) return dateDifference;

      const createdA = new Date(a.createdAt).getTime() || 0;
      const createdB = new Date(b.createdAt).getTime() || 0;

      if (createdA !== createdB) return createdB - createdA;

      return b.id - a.id;
    });
  }, [dateRangeDeliveries]);

  const filteredDeliveries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sortedDeliveries;

    return sortedDeliveries.filter((delivery) => {
      const customerName = getCustomerName(delivery.customerId).toLowerCase();
      const cylinderName = getCylinderName(
        delivery.cylinderTypeId
      ).toLowerCase();

      return (
        String(delivery.id).includes(query) ||
        customerName.includes(query) ||
        cylinderName.includes(query) ||
        String(delivery.note ?? "").toLowerCase().includes(query)
      );
    });
  }, [sortedDeliveries, customers, cylinderTypes, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeliveries.length / PAGE_SIZE)
  );

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

  const totalQuantity = dateRangeDeliveries.reduce(
    (total, delivery) => total + Number(delivery.quantity || 0),
    0
  );

  const totalValue = dateRangeDeliveries.reduce(
    (total, delivery) => total + Number(delivery.totalAmount || 0),
    0
  );

  const todaysCount = deliveries.filter(
    (delivery) => getDateKey(delivery.deliveryDate) === todayKey
  ).length;

  const selectAllDates = () => {
    setStartDate(firstDeliveryDate);
    setEndDate(todayKey);
    setSearch("");
    setCurrentPage(1);
  };

  const selectToday = () => {
    setStartDate(todayKey);
    setEndDate(todayKey);
    setSearch("");
    setCurrentPage(1);
  };

  const openDelivery = (deliveryId: number) => {
    navigate(`/deliveries/${deliveryId}`);
  };

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  const invalidRange = Boolean(startDate && endDate && startDate > endDate);

  return (
    <div className="gf-deliveries">
      <style>{styles}</style>

      <header className="gd-hero">
        <div className="gd-hero-content">
          <Link to="/dashboard" className="gd-back">
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

      <section className="gd-stats">
        <button
          type="button"
          className={`gd-stat-card gd-stat-clickable ${
            startDate === firstDeliveryDate && endDate === todayKey
              ? "gd-stat-selected"
              : ""
          }`}
          onClick={selectAllDates}
          title="Show deliveries from the first recorded delivery through today"
        >
          <span className="gd-stat-icon blue">
            <Icon name="truck" size={21} />
          </span>
          <div>
            <p>Total Deliveries</p>
            <h2>{dateRangeDeliveries.length}</h2>
            <span className="gd-stat-note">
              First delivery to today · Click to select
            </span>
          </div>
        </button>

        <button
          type="button"
          className={`gd-stat-card gd-stat-clickable ${
            startDate === todayKey && endDate === todayKey
              ? "gd-stat-selected"
              : ""
          }`}
          onClick={selectToday}
          title="Show only today's deliveries"
        >
          <span className="gd-stat-icon green">
            <Icon name="calendar" size={21} />
          </span>
          <div>
            <p>Today's Deliveries</p>
            <h2>{todaysCount}</h2>
            <span className="gd-stat-note">Click to select today's date</span>
          </div>
        </button>

        <div className="gd-stat-card">
          <span className="gd-stat-icon purple">
            <Icon name="box" size={21} />
          </span>
          <div>
            <p>Filtered Quantity</p>
            <h2>{totalQuantity}</h2>
            <span className="gd-stat-note">Selected date range</span>
          </div>
        </div>

        <div className="gd-stat-card">
          <span className="gd-stat-icon teal">
            <Icon name="rupee" size={21} />
          </span>
          <div>
            <p>Filtered Delivery Value</p>
            <h2 className="gd-money">{formatCurrency(totalValue)}</h2>
            <span className="gd-stat-note">Selected date range</span>
          </div>
        </div>
      </section>

      <section className="gd-panel">
        <div className="gd-panel-heading">
          <div>
            <h2>All Deliveries</h2>
            <p>Choose a date range to review actual delivery records.</p>
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

        <div className="gd-date-range">
          <label className="gd-date-field">
            <span>
              <Icon name="calendar" size={17} />
              Start Date
            </span>
            <input
              type="date"
              aria-label="Start date"
              value={startDate}
              max={endDate || todayKey}
              onChange={(event) => {
                setStartDate(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          <label className="gd-date-field">
            <span>
              <Icon name="calendar" size={17} />
              End Date
            </span>
            <input
              type="date"
              aria-label="End date"
              value={endDate}
              min={startDate || undefined}
              max={todayKey}
              onChange={(event) => {
                setEndDate(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          <button
            type="button"
            className="gd-range-reset"
            onClick={selectAllDates}
          >
            All Dates
          </button>

          <button
            type="button"
            className="gd-range-reset"
            onClick={selectToday}
          >
            Today
          </button>
        </div>

        {invalidRange && (
          <p className="gd-range-error" role="alert">
            Start date cannot be later than end date.
          </p>
        )}

        <div className="gd-range-summary">
          Showing records from <strong>{formatDate(startDate)}</strong> to{" "}
          <strong>{formatDate(endDate)}</strong>
        </div>

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

          {search && (
            <button
              type="button"
              className="gd-clear-btn"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
            >
              Clear search
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
        ) : invalidRange ? (
          <div className="gd-empty">
            <h3>Invalid date range</h3>
            <p>Select a start date on or before the end date.</p>
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
                : "There are no deliveries matching your selected dates or search."}
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
                  </tr>
                </thead>

                <tbody>
                  {paginatedDeliveries.map((delivery) => (
                    <tr
                      key={delivery.id}
                      className="gd-delivery-row"
                      tabIndex={0}
                      role="link"
                      aria-label={`View delivery ${delivery.id}`}
                      onClick={() => openDelivery(delivery.id)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          openDelivery(delivery.id);
                        }
                      }}
                      title="Click to view delivery details"
                    >
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
                        <span
                          className="gd-note"
                          title={delivery.note ?? ""}
                        >
                          {delivery.note || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
  .gd-back { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 20px; color: rgba(255,255,255,.8); font-size: 12px; font-weight: 650; }
  .gd-back svg { transform: rotate(180deg); }
  .gd-back:hover { color: white; }
  .gd-title-row { display: flex; align-items: center; gap: 16px; }

  .gd-hero-icon {
    display: flex; align-items: center; justify-content: center;
    width: 60px; height: 60px; flex-shrink: 0; color: white;
    background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2);
    border-radius: 16px;
  }

  .gd-eyebrow { display: block; margin-bottom: 5px; color: #c7d2fe; font-size: 10px; font-weight: 800; letter-spacing: 1.3px; }
  .gf-deliveries .gd-hero h1 { margin: 0; color: white; font-size: clamp(26px, 3vw, 34px); font-weight: 800; line-height: 1.2; letter-spacing: -.8px; }
  .gf-deliveries .gd-hero p { margin: 7px 0 0; color: rgba(255,255,255,.78); font-size: 13px; }

  .gd-primary-btn {
    display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
    gap: 9px; min-height: 43px; padding: 11px 17px; color: white;
    background: #4f46e5; border: 1px solid transparent; border-radius: 11px;
    font-size: 13px; font-weight: 750; transition: transform .15s ease, background .15s ease;
  }

  .gd-hero .gd-primary-btn { color: #3730a3; background: white; }
  .gd-primary-btn:hover { background: #4338ca; color: white; transform: translateY(-1px); }
  .gd-hero .gd-primary-btn:hover { color: #312e81; background: #eef2ff; }

  .gd-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 26px; }

  .gd-stat-card {
    display: flex; align-items: flex-start; gap: 13px; min-width: 0;
    padding: 20px; background: white; border: 1px solid var(--gd-line);
    border-radius: 16px; box-shadow: 0 2px 8px rgba(15,23,42,.025);
  }

  .gd-stat-clickable {
    width: 100%; text-align: left; color: inherit; font: inherit; cursor: pointer;
    transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
  }

  .gd-stat-clickable:hover { border-color: #a5b4fc; box-shadow: 0 8px 20px rgba(79,70,229,.10); transform: translateY(-2px); }
  .gd-stat-clickable:focus-visible { outline: 3px solid #a5b4fc; outline-offset: 3px; }
  .gd-stat-selected { border-color: #818cf8; box-shadow: inset 0 0 0 1px #818cf8; }

  .gd-stat-icon { display: flex; align-items: center; justify-content: center; width: 43px; height: 43px; flex-shrink: 0; border-radius: 12px; }
  .gd-stat-icon.blue { color: #4338ca; background: #e0e7ff; }
  .gd-stat-icon.green { color: #15803d; background: #dcfce7; }
  .gd-stat-icon.purple { color: #7e22ce; background: #f3e8ff; }
  .gd-stat-icon.teal { color: #0f766e; background: #ccfbf1; }

  .gd-stat-card p { margin: 1px 0 6px; color: var(--gd-muted); font-size: 12px; font-weight: 650; }
  .gd-stat-card h2 { margin: 0; color: var(--gd-ink); font-size: clamp(22px, 2vw, 30px); font-weight: 800; line-height: 1.25; letter-spacing: -.6px; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
  .gd-stat-card h2.gd-money { font-size: clamp(17px, 1.6vw, 23px); }
  .gd-stat-note { display: block; margin-top: 5px; color: #94a3b8; font-size: 11px; }

  .gd-panel { min-width: 0; overflow: hidden; background: white; border: 1px solid var(--gd-line); border-radius: 18px; box-shadow: 0 3px 12px rgba(15,23,42,.035); }
  .gd-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 24px 20px; }
  .gd-panel-heading h2 { margin: 0; color: var(--gd-ink); font-size: 19px; font-weight: 800; letter-spacing: -.35px; }
  .gd-panel-heading p { margin: 5px 0 0; color: var(--gd-muted); font-size: 12px; }

  .gd-refresh-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    min-height: 37px; padding: 8px 12px; color: #475569; background: white;
    border: 1px solid var(--gd-line); border-radius: 9px; font: inherit;
    font-size: 12px; font-weight: 700; cursor: pointer;
  }

  .gd-refresh-btn:hover { color: #4338ca; background: #f5f5ff; }
  .gd-refresh-btn:disabled { opacity: .6; cursor: wait; }

  .gd-date-range {
    display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
    padding: 0 24px 16px;
  }

  .gd-date-field { display: flex; flex-direction: column; gap: 7px; min-width: 180px; }
  .gd-date-field > span { display: flex; align-items: center; gap: 7px; color: #475569; font-size: 12px; font-weight: 750; }
  .gd-date-field input { min-height: 42px; padding: 9px 11px; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; font: inherit; }
  .gd-date-field input:focus { outline: 3px solid rgba(99,102,241,.15); border-color: #818cf8; }

  .gd-range-reset {
    min-height: 40px; padding: 9px 13px; color: #4338ca; background: #eef2ff;
    border: 1px solid #e0e7ff; border-radius: 9px; font: inherit; font-size: 12px;
    font-weight: 750; cursor: pointer;
  }

  .gd-range-reset:hover { background: #e0e7ff; }
  .gd-range-error { margin: 0 24px 12px; color: #b91c1c; font-size: 12px; }
  .gd-range-summary { padding: 0 24px 18px; color: #64748b; font-size: 12px; }
  .gd-range-summary strong { color: #334155; }

  .gd-filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 0 24px 20px; }
  .gd-search { display: flex; align-items: center; gap: 9px; min-height: 42px; padding: 0 12px; color: #94a3b8; background: #f8fafc; border: 1px solid #e6eaf1; border-radius: 10px; flex: 1; min-width: 220px; }
  .gd-search input { width: 100%; min-width: 0; color: var(--gd-text); background: transparent; border: 0; outline: none; font: inherit; font-size: 12px; }
  .gd-search:focus-within { border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }

  .gd-clear-btn { padding: 9px 12px; color: #4f46e5; background: #eef2ff; border: 0; border-radius: 9px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
  .gd-clear-btn:hover { background: #e0e7ff; }

  .gd-table-wrap { width: 100%; overflow-x: auto; }
  .gd-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: auto; text-align: left; font-size: 12px; }
  .gd-table thead th { padding: 14px 16px; color: #64748b; background: #f8fafc; border-top: 1px solid #edf0f5; border-bottom: 1px solid #e9edf4; font-size: 10px; font-weight: 800; letter-spacing: .65px; text-transform: uppercase; white-space: nowrap; }
  .gd-table thead th:first-child, .gd-table tbody td:first-child { padding-left: 24px; }
  .gd-table tbody td { padding: 15px 16px; color: #475569; border-bottom: 1px solid #f0f2f7; vertical-align: middle; }
  .gd-table tbody tr:last-child td { border-bottom: 0; }

  .gd-delivery-row { cursor: pointer; transition: background .15s ease; }
  .gd-delivery-row:hover td { background: #f5f6ff; }
  .gd-delivery-row:focus { outline: 2px solid #818cf8; outline-offset: -2px; }
  .gd-delivery-row:focus-visible td { background: #eef2ff; }

  .gd-id { display: inline-flex; align-items: center; padding: 5px 8px; color: #4338ca; background: #eef2ff; border-radius: 7px; font-weight: 800; font-size: 11px; white-space: nowrap; }
  .gd-customer { display: flex; align-items: center; gap: 9px; min-width: 150px; }
  .gd-avatar { display: inline-flex; align-items: center; justify-content: center; width: 31px; height: 31px; flex-shrink: 0; color: #4338ca; background: #e0e7ff; border-radius: 10px; font-size: 12px; font-weight: 800; }
  .gd-customer-name { color: #1e293b; font-weight: 750; }
  .gd-cylinder { color: #475569; }
  .gd-quantity { color: #1e293b; font-weight: 800; }
  .gd-amount { color: #475569; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .gd-total { color: #0f766e; font-weight: 800; }
  .gd-date { color: #475569; white-space: nowrap; }
  .gd-note { display: block; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .gd-pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 16px 24px; background: #fafbfe; border-top: 1px solid #edf0f5; }
  .gd-pagination-info { color: #64748b; font-size: 12px; }
  .gd-pagination-info strong { color: #334155; }
  .gd-page-controls { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 6px; }
  .gd-page-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 34px; min-height: 34px; padding: 7px 10px; color: #475569; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
  .gd-page-btn:hover:not(:disabled) { color: #4338ca; background: #eef2ff; border-color: #c7d2fe; }
  .gd-page-btn.active { color: white; background: #4f46e5; border-color: #4f46e5; }
  .gd-page-btn:disabled { opacity: .4; cursor: not-allowed; }
  .gd-page-prev, .gd-page-next { padding-inline: 12px; }

  .gd-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 240px; padding: 30px 20px; text-align: center; }
  .gd-empty h3 { margin: 5px 0 0; color: #1e293b; font-size: 16px; font-weight: 800; }
  .gd-empty p { margin: 0 0 8px; color: #64748b; font-size: 12px; }
  .gd-empty-icon { display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; margin-bottom: 6px; color: #4f46e5; background: #eef2ff; border-radius: 17px; }
  .gd-empty-symbol { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; color: #b91c1c; background: #fee2e2; border-radius: 50%; font-size: 22px; font-weight: 800; }
  .gd-spinner { width: 28px; height: 28px; border: 3px solid #e0e7ff; border-top-color: #4f46e5; border-radius: 50%; animation: gd-spin .7s linear infinite; }
  @keyframes gd-spin { to { transform: rotate(360deg); } }

  .gd-error { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; margin-bottom: 22px; padding: 16px 18px; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; border-radius: 13px; }
  .gd-error strong { display: block; font-size: 13px; }
  .gd-error p { margin: 4px 0 0; font-size: 12px; }
  .gd-retry-btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 12px; color: #991b1b; background: white; border: 1px solid #fecaca; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 750; cursor: pointer; }
  .gd-retry-btn:hover { background: #fff7f7; }

  @media (max-width: 1200px) {
    .gd-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 760px) {
    .gf-deliveries { padding: 14px; }
    .gd-hero { align-items: flex-start; flex-direction: column; padding: 22px; }
    .gd-hero .gd-primary-btn { width: 100%; }
    .gd-panel-heading { padding: 20px 18px; }
    .gd-date-range, .gd-range-summary, .gd-filters { padding-left: 18px; padding-right: 18px; }
    .gd-date-field { flex: 1; min-width: 140px; }
    .gd-search { min-width: 100%; }
    .gd-pagination { padding: 15px 18px; }
    .gd-pagination-info { width: 100%; }
    .gd-page-controls { justify-content: flex-start; }
    .gd-table { min-width: 900px; }
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
