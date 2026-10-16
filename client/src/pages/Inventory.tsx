
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

const PAGE_SIZE = 8;
const STOCK_PAGE_SIZE = 4;

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type CylinderType = {
  id: number;
  name?: string;
  cylinderTypeName?: string;
  capacityKg?: number;
  sellingPrice?: number;
  isActive?: boolean;
};

type InventoryMovement = {
  id: number;
  cylinderTypeId: number;
  quantity: number;
  type: string;
  status?: string;
  note?: string;
  createdAt: string;
};

type StockSummary = {
  id: number;
  name: string;
  filled: number;
  empty: number;
};

const MOVEMENT_TYPES = [
  { value: "STOCK_IN", label: "Stock In" },
  { value: "STOCK_OUT", label: "Stock Out" },
  { value: "EMPTY_RETURNED", label: "Empty Returned" },
  { value: "SENT_FOR_REFILL", label: "Sent for Refill" },
  { value: "REFILL_RECEIVED", label: "Refill Received" },
] as const;

const POSITIVE_MOVEMENT_TYPES = new Set([
  "STOCK_IN",
  "EMPTY_RETURNED",
  "REFILL_RECEIVED",
]);

const movementLabel = (type: string) =>
  MOVEMENT_TYPES.find((movement) => movement.value === type)?.label ??
  type.replaceAll("_", " ");

const getCylinderName = (cylinder: CylinderType) =>
  cylinder.name ??
  cylinder.cylinderTypeName ??
  `Cylinder Type #${cylinder.id}`;

const formatDate = (date: string) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Inventory() {
  const navigate = useNavigate();

  const stockSummaryRef = useRef<HTMLElement | null>(null);
  const historyRef = useRef<HTMLElement | null>(null);

  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedCylinderType, setSelectedCylinderType] = useState("");
  const [movementType, setMovementType] = useState("STOCK_IN");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [stockCurrentPage, setStockCurrentPage] = useState(1);

  const token = () => localStorage.getItem("gasflow_token");

  const handleAuthError = useCallback(() => {
    localStorage.removeItem("gasflow_token");
    navigate("/login");
  }, [navigate]);

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const currentToken = token();

      if (!currentToken) {
        handleAuthError();
        throw new Error("Please log in to continue.");
      }

      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${currentToken}`);

      if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthError();
        throw new Error("Your session has expired. Please log in again.");
      }

      return response;
    },
    [handleAuthError]
  );

  const loadInventory = useCallback(async () => {
    const currentToken = token();

    if (!currentToken) {
      handleAuthError();
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${currentToken}`,
      };

      const [cylinderResponse, movementResponse] = await Promise.all([
        fetch(`${API_URL}/cylinder-types`, { headers }),
        fetch(`${API_URL}/inventory`, { headers }),
      ]);

      if (
        cylinderResponse.status === 401 ||
        cylinderResponse.status === 403 ||
        movementResponse.status === 401 ||
        movementResponse.status === 403
      ) {
        handleAuthError();
        return;
      }

      if (!cylinderResponse.ok) {
        throw new Error("Unable to load cylinder types.");
      }

      if (!movementResponse.ok) {
        throw new Error(
          "Unable to load inventory movements. Check your inventory API endpoint."
        );
      }

      const cylinderResult =
        (await cylinderResponse.json()) as ApiResponse<CylinderType[]>;

      const movementResult =
        (await movementResponse.json()) as ApiResponse<InventoryMovement[]>;

      const cylinderData = Array.isArray(cylinderResult)
        ? cylinderResult
        : cylinderResult.data;

      const movementData = Array.isArray(movementResult)
        ? movementResult
        : movementResult.data;

      if (!Array.isArray(cylinderData)) {
        throw new Error("Unexpected cylinder types API response.");
      }

      if (!Array.isArray(movementData)) {
        throw new Error("Unexpected inventory API response.");
      }

      setCylinderTypes(cylinderData);
      setMovements(movementData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load inventory.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const calculateStock = useCallback(
    (cylinderTypeId: number) => {
      let filled = 0;
      let empty = 0;

      const cylinderMovements = movements
        .filter((movement) => movement.cylinderTypeId === cylinderTypeId)
        .slice()
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );

      for (const movement of cylinderMovements) {
        const amount = Math.max(0, Number(movement.quantity) || 0);

        switch (movement.type) {
          case "STOCK_IN":
            filled += amount;
            break;

          case "STOCK_OUT":
            filled -= amount;
            break;

          case "EMPTY_RETURNED":
            empty += amount;
            break;

          case "SENT_FOR_REFILL":
            empty -= amount;
            break;

          case "REFILL_RECEIVED":
            filled += amount;
            empty -= amount;
            break;

          default:
            if (POSITIVE_MOVEMENT_TYPES.has(movement.type)) {
              filled += amount;
            }
            break;
        }
      }

      return {
        filled: Math.max(0, filled),
        empty: Math.max(0, empty),
      };
    },
    [movements]
  );

  const stockSummary = useMemo<StockSummary[]>(() => {
    return cylinderTypes.map((cylinder) => {
      const stock = calculateStock(cylinder.id);

      return {
        id: cylinder.id,
        name: getCylinderName(cylinder),
        filled: stock.filled,
        empty: stock.empty,
      };
    });
  }, [cylinderTypes, calculateStock]);

  const totalFilled = stockSummary.reduce(
    (total, item) => total + item.filled,
    0
  );

  const totalEmpty = stockSummary.reduce(
    (total, item) => total + item.empty,
    0
  );

  const totalMovements = movements.length;

  const filteredMovements = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return movements
      .filter((movement) => {
        const matchesType =
          movementFilter === "ALL" || movement.type === movementFilter;

        const cylinderName =
          cylinderTypes.find(
            (cylinder) => cylinder.id === movement.cylinderTypeId
          )?.name ??
          cylinderTypes.find(
            (cylinder) => cylinder.id === movement.cylinderTypeId
          )?.cylinderTypeName ??
          "";

        const matchesSearch =
          !search ||
          cylinderName.toLowerCase().includes(search) ||
          movementLabel(movement.type).toLowerCase().includes(search) ||
          (movement.note ?? "").toLowerCase().includes(search) ||
          String(movement.id).includes(search);

        return matchesType && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [movements, cylinderTypes, movementFilter, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovements.length / PAGE_SIZE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMovements = filteredMovements.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const stockTotalPages = Math.max(
    1,
    Math.ceil(stockSummary.length / STOCK_PAGE_SIZE)
  );

  const safeStockPage = Math.min(stockCurrentPage, stockTotalPages);

  const paginatedStockSummary = stockSummary.slice(
    (safeStockPage - 1) * STOCK_PAGE_SIZE,
    safeStockPage * STOCK_PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, movementFilter]);

  useEffect(() => {
    setStockCurrentPage((page) =>
      Math.min(page, Math.max(1, Math.ceil(stockSummary.length / STOCK_PAGE_SIZE)))
    );
  }, [stockSummary.length]);

  const goToStockSummary = () => {
    stockSummaryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goToMovementHistory = () => {
    historyRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const cylinderTypeId = Number(selectedCylinderType);
    const movementQuantity = Number(quantity);

    if (!cylinderTypeId) {
      setError("Please select a cylinder type.");
      return;
    }

    if (!Number.isInteger(movementQuantity) || movementQuantity <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await authenticatedFetch(`${API_URL}/inventory`, {
        method: "POST",
        body: JSON.stringify({
          cylinderTypeId,
          quantity: movementQuantity,
          type: movementType,
          note: note.trim(),
        }),
      });

      const result = (await response.json()) as ApiResponse<InventoryMovement>;

      if (!response.ok || result.success === false) {
        throw new Error(result.message ?? "Unable to record stock movement.");
      }

      setSuccessMessage("Stock movement recorded successfully.");
      setSelectedCylinderType("");
      setMovementType("STOCK_IN");
      setQuantity("1");
      setNote("");

      await loadInventory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record stock movement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cellStyle: CSSProperties = {
    padding: "13px 16px",
    textAlign: "left",
  };

  return (
    <div className="inv-page">
      <style>{inventoryStyles}</style>

      <div className="inv-container">
        <header className="inv-hero">
          <div className="inv-hero-top">
            <Link to="/dashboard" className="inv-back-link">
              <span aria-hidden="true">←</span> Back to Dashboard
            </Link>

            <span className="inv-hero-badge">
              <span className="inv-live-dot" />
              Inventory Management
            </span>
          </div>

          <div className="inv-hero-content">
            <div>
              <p className="inv-eyebrow">GASFLOW / OPERATIONS</p>
              <h1>Inventory Management</h1>
              <p className="inv-hero-description">
                Monitor cylinder stock, record movements, and track your
                inventory in one place.
              </p>
            </div>

            <button
              type="button"
              className="inv-refresh-button"
              onClick={() => void loadInventory()}
              disabled={loading}
            >
              <span aria-hidden="true">↻</span>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </header>

        {error && (
          <div className="inv-alert inv-alert-error" role="alert">
            <span aria-hidden="true">⚠</span>
            <span>{error}</span>
            <button
              type="button"
              className="inv-alert-close"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="inv-alert inv-alert-success" role="status">
            <span aria-hidden="true">✓</span>
            <span>{successMessage}</span>
            <button
              type="button"
              className="inv-alert-close"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        <section className="inv-stats-grid" aria-label="Inventory overview">
          <button
            type="button"
            className="inv-stat-card inv-stat-button"
            onClick={() => navigate("/cylinder-types")}
          >
            <div className="inv-stat-top">
              <span className="inv-stat-label">Total Cylinder Types</span>
              <span className="inv-stat-icon inv-icon-blue" aria-hidden="true">
                ◈
              </span>
            </div>
            <div className="inv-stat-value">
              {loading ? "—" : cylinderTypes.length}
            </div>
            <div className="inv-stat-footer">
              <span>Manage cylinder types</span>
              <span aria-hidden="true">↗</span>
            </div>
          </button>

          <button
            type="button"
            className="inv-stat-card inv-stat-button"
            onClick={goToStockSummary}
            aria-label="View filled stock in Current Stock Summary"
          >
            <div className="inv-stat-top">
              <span className="inv-stat-label">Filled Stock</span>
              <span
                className="inv-stat-icon inv-icon-green"
                aria-hidden="true"
              >
                ✓
              </span>
            </div>
            <div className="inv-stat-value">
              {loading ? "—" : totalFilled}
            </div>
            <div className="inv-stat-footer">
              <span>Filled cylinders available</span>
              <span aria-hidden="true">↓</span>
            </div>
          </button>

          <button
            type="button"
            className="inv-stat-card inv-stat-button"
            onClick={goToStockSummary}
            aria-label="View empty stock in Current Stock Summary"
          >
            <div className="inv-stat-top">
              <span className="inv-stat-label">Empty Stock</span>
              <span
                className="inv-stat-icon inv-icon-orange"
                aria-hidden="true"
              >
                ◌
              </span>
            </div>
            <div className="inv-stat-value">
              {loading ? "—" : totalEmpty}
            </div>
            <div className="inv-stat-footer">
              <span>Empty cylinders available</span>
              <span aria-hidden="true">↓</span>
            </div>
          </button>

          <button
            type="button"
            className="inv-stat-card inv-stat-button"
            onClick={goToMovementHistory}
            aria-label="View Inventory Movement History"
          >
            <div className="inv-stat-top">
              <span className="inv-stat-label">Total Movements</span>
              <span
                className="inv-stat-icon inv-icon-purple"
                aria-hidden="true"
              >
                ⇄
              </span>
            </div>
            <div className="inv-stat-value">
              {loading ? "—" : totalMovements}
            </div>
            <div className="inv-stat-footer">
              <span>Recorded stock movements</span>
              <span aria-hidden="true">↓</span>
            </div>
          </button>
        </section>

        <div className="inv-main-grid">
          <section className="inv-card inv-form-card">
            <div className="inv-section-heading">
              <div className="inv-heading-icon inv-heading-blue" aria-hidden="true">
                +
              </div>
              <div>
                <h2>Record Stock Movement</h2>
                <p>Add a new inventory transaction</p>
              </div>
            </div>

            <form className="inv-form" onSubmit={handleSubmit}>
              <div className="inv-field">
                <label htmlFor="inv-cylinder-type">Cylinder Type</label>
                <select
                  id="inv-cylinder-type"
                  value={selectedCylinderType}
                  onChange={(event) =>
                    setSelectedCylinderType(event.target.value)
                  }
                  required
                >
                  <option value="">Select cylinder type</option>
                  {cylinderTypes.map((cylinder) => (
                    <option key={cylinder.id} value={cylinder.id}>
                      {getCylinderName(cylinder)}
                      {cylinder.capacityKg
                        ? ` (${cylinder.capacityKg} kg)`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inv-field">
                <label htmlFor="inv-movement-type">Movement Type</label>
                <select
                  id="inv-movement-type"
                  value={movementType}
                  onChange={(event) => setMovementType(event.target.value)}
                  required
                >
                  {MOVEMENT_TYPES.map((movement) => (
                    <option key={movement.value} value={movement.value}>
                      {movement.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inv-field">
                <label htmlFor="inv-quantity">Quantity</label>
                <input
                  id="inv-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div className="inv-field">
                <label htmlFor="inv-note">
                  Note <span className="inv-optional">(Optional)</span>
                </label>
                <textarea
                  id="inv-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a note about this movement..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                className="inv-primary-button"
                disabled={submitting || loading || cylinderTypes.length === 0}
              >
                {submitting ? (
                  <>
                    <span className="inv-spinner" aria-hidden="true" />
                    Recording...
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">+</span>
                    Record Movement
                  </>
                )}
              </button>
            </form>
          </section>

          <section
            ref={stockSummaryRef}
            className="inv-card inv-stock-card"
            aria-labelledby="inv-stock-heading"
          >
            <div className="inv-section-heading">
              <div
                className="inv-heading-icon inv-heading-green"
                aria-hidden="true"
              >
                ▤
              </div>
              <div>
                <h2 id="inv-stock-heading">Current Stock Summary</h2>
                <p>Stock levels by cylinder type</p>
              </div>
            </div>

            <div className="inv-stock-list">
              {loading ? (
                <div className="inv-empty-state">
                  <span className="inv-spinner inv-spinner-dark" />
                  <p>Loading stock summary...</p>
                </div>
              ) : stockSummary.length === 0 ? (
                <div className="inv-empty-state">
                  <span className="inv-empty-icon" aria-hidden="true">
                    ◈
                  </span>
                  <p>No cylinder types found.</p>
                  <Link to="/cylinder-types" className="inv-inline-link">
                    Add a cylinder type
                  </Link>
                </div>
              ) : (
                paginatedStockSummary.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="inv-stock-item inv-stock-item-button"
                    onClick={() => navigate(`/cylinder-types/${item.id}`)}
                    aria-label={`View details for ${item.name}`}
                  >
                    <div className="inv-stock-item-main">
                      <span className="inv-stock-cylinder-icon" aria-hidden="true">
                        ◈
                      </span>
                      <span className="inv-stock-name">{item.name}</span>
                      <span className="inv-stock-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </div>

                    <div className="inv-stock-counts">
                      <span className="inv-stock-count inv-filled-count">
                        <span className="inv-count-dot" />
                        Filled: <strong>{item.filled}</strong>
                      </span>
                      <span className="inv-stock-count inv-empty-count">
                        <span className="inv-count-dot" />
                        Empty: <strong>{item.empty}</strong>
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="inv-stock-pagination">
              <span className="inv-pagination-info">
                {stockSummary.length === 0
                  ? "0 cylinder types"
                  : `Showing ${
                      (safeStockPage - 1) * STOCK_PAGE_SIZE + 1
                    }–${Math.min(
                      safeStockPage * STOCK_PAGE_SIZE,
                      stockSummary.length
                    )} of ${stockSummary.length}`}
              </span>

              <div className="inv-pagination-actions">
                <button
                  type="button"
                  className="inv-page-button"
                  onClick={() =>
                    setStockCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeStockPage <= 1}
                  aria-label="Previous stock summary page"
                >
                  ←
                </button>
                <span className="inv-page-number">
                  {safeStockPage} / {stockTotalPages}
                </span>
                <button
                  type="button"
                  className="inv-page-button"
                  onClick={() =>
                    setStockCurrentPage((page) =>
                      Math.min(stockTotalPages, page + 1)
                    )
                  }
                  disabled={safeStockPage >= stockTotalPages}
                  aria-label="Next stock summary page"
                >
                  →
                </button>
              </div>
            </div>
          </section>
        </div>

        <section
          ref={historyRef}
          className="inv-card inv-history-card"
          aria-labelledby="inv-history-heading"
        >
          <div className="inv-history-header">
            <div className="inv-section-heading">
              <div
                className="inv-heading-icon inv-heading-purple"
                aria-hidden="true"
              >
                ⇄
              </div>
              <div>
                <h2 id="inv-history-heading">Inventory Movement History</h2>
                <p>Review all recorded inventory transactions</p>
              </div>
            </div>

            <span className="inv-record-count">
              {filteredMovements.length} records
            </span>
          </div>

          <div className="inv-filters">
            <div className="inv-search-wrapper">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search cylinder type, movement, note..."
                aria-label="Search inventory movements"
              />
            </div>

            <select
              className="inv-filter-select"
              value={movementFilter}
              onChange={(event) => setMovementFilter(event.target.value)}
              aria-label="Filter by movement type"
            >
              <option value="ALL">All Movement Types</option>
              {MOVEMENT_TYPES.map((movement) => (
                <option key={movement.value} value={movement.value}>
                  {movement.label}
                </option>
              ))}
            </select>
          </div>

          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={cellStyle}>Movement ID</th>
                  <th style={cellStyle}>Cylinder Type</th>
                  <th style={cellStyle}>Movement Type</th>
                  <th style={cellStyle}>Quantity</th>
                  <th style={cellStyle}>Note</th>
                  <th style={cellStyle}>Date &amp; Time</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="inv-table-message">
                      <span className="inv-spinner inv-spinner-dark" />
                      Loading movements...
                    </td>
                  </tr>
                ) : paginatedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="inv-table-message">
                      <span className="inv-empty-icon" aria-hidden="true">
                        ▤
                      </span>
                      <strong>No inventory movements found</strong>
                      <span>
                        Try changing your search or record a new movement.
                      </span>
                    </td>
                  </tr>
                ) : (
                  paginatedMovements.map((movement) => {
                    const cylinder = cylinderTypes.find(
                      (item) => item.id === movement.cylinderTypeId
                    );

                    return (
                      <tr key={movement.id}>
                        <td style={cellStyle}>
                          <span className="inv-id-badge">
                            #{movement.id}
                          </span>
                        </td>

                        <td style={cellStyle}>
                          <span className="inv-table-cylinder">
                            {cylinder
                              ? getCylinderName(cylinder)
                              : `Cylinder #${movement.cylinderTypeId}`}
                          </span>
                        </td>

                        <td style={cellStyle}>
                          <span
                            className={`inv-movement-badge inv-movement-${movement.type.toLowerCase()}`}
                          >
                            {movementLabel(movement.type)}
                          </span>
                        </td>

                        <td style={cellStyle}>
                          <strong className="inv-quantity-value">
                            {movement.quantity}
                          </strong>
                        </td>

                        <td style={cellStyle}>
                          <span className="inv-note-cell">
                            {movement.note?.trim() || "—"}
                          </span>
                        </td>

                        <td style={cellStyle}>
                          <span className="inv-date-cell">
                            {formatDate(movement.createdAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="inv-history-footer">
            <span className="inv-pagination-info">
              {filteredMovements.length === 0
                ? "Showing 0 records"
                : `Showing ${
                    (safeCurrentPage - 1) * PAGE_SIZE + 1
                  }–${Math.min(
                    safeCurrentPage * PAGE_SIZE,
                    filteredMovements.length
                  )} of ${filteredMovements.length} records`}
            </span>

            <div className="inv-pagination-actions">
              <button
                type="button"
                className="inv-page-button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={safeCurrentPage <= 1}
              >
                ← Previous
              </button>

              <span className="inv-page-number">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="inv-page-button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safeCurrentPage >= totalPages}
              >
                Next →
              </button>
            </div>
          </div>
        </section>

        <footer className="inv-footer">
          <span>
            <span className="inv-footer-dot" />
            GasFlow Inventory Management
          </span>
          <span>Track stock. Manage movements. Stay organized.</span>
        </footer>
      </div>
    </div>
  );
}

const inventoryStyles = `
  .inv-page {
    min-height: 100vh;
    padding: 34px 24px 28px;
    background: #f5f7fb;
    color: #172033;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .inv-page *,
  .inv-page *::before,
  .inv-page *::after {
    box-sizing: border-box;
  }

  .inv-container {
    max-width: 1440px;
    margin: 0 auto;
  }

  .inv-hero {
    padding: 28px 32px 32px;
    margin-bottom: 24px;
    color: #fff;
    background: linear-gradient(120deg, #172554 0%, #1e40af 55%, #2563eb 100%);
    border-radius: 20px;
    box-shadow: 0 14px 34px rgba(30, 64, 175, 0.13);
  }

  .inv-hero-top,
  .inv-hero-content,
  .inv-stat-top,
  .inv-stat-footer,
  .inv-section-heading,
  .inv-stock-item-main,
  .inv-stock-counts,
  .inv-history-header,
  .inv-filters,
  .inv-history-footer,
  .inv-stock-pagination,
  .inv-pagination-actions,
  .inv-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .inv-hero-top {
    margin-bottom: 28px;
    gap: 16px;
  }

  .inv-back-link {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: #e0e7ff;
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
  }

  .inv-back-link:hover {
    color: #fff;
  }

  .inv-back-link span {
    font-size: 19px;
  }

  .inv-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 999px;
    background: rgba(255,255,255,.09);
    color: #eff6ff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .04em;
  }

  .inv-live-dot,
  .inv-footer-dot {
    width: 7px;
    height: 7px;
    display: inline-block;
    border-radius: 50%;
    background: #4ade80;
  }

  .inv-hero-content {
    gap: 24px;
  }

  .inv-eyebrow {
    margin: 0 0 10px;
    color: #bfdbfe;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .16em;
  }

  .inv-hero h1 {
    margin: 0;
    color: #fff;
    font-size: clamp(27px, 3vw, 36px);
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -.04em;
  }

  .inv-hero-description {
    max-width: 650px;
    margin: 12px 0 0;
    color: #dbeafe;
    font-size: 14px;
    line-height: 1.7;
  }

  .inv-refresh-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    gap: 9px;
    min-height: 43px;
    padding: 0 16px;
    border: 1px solid rgba(255,255,255,.25);
    border-radius: 10px;
    background: rgba(255,255,255,.12);
    color: #fff;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
  }

  .inv-refresh-button:hover:not(:disabled) {
    background: rgba(255,255,255,.2);
  }

  .inv-refresh-button:disabled {
    opacity: .65;
    cursor: not-allowed;
  }

  .inv-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  .inv-stat-card {
    min-width: 0;
    padding: 22px;
    border: 1px solid #e7ebf3;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 3px 10px rgba(15, 23, 42, .025);
    color: #172033;
  }

  .inv-stat-button {
    display: block;
    width: 100%;
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }

  .inv-stat-button:hover {
    transform: translateY(-2px);
    border-color: #c7d2fe;
    box-shadow: 0 10px 24px rgba(15, 23, 42, .07);
  }

  .inv-stat-button:focus-visible,
  .inv-stock-item-button:focus-visible,
  .inv-page-button:focus-visible {
    outline: 3px solid #818cf8;
    outline-offset: 3px;
  }

  .inv-stat-top {
    gap: 10px;
  }

  .inv-stat-label {
    color: #68748a;
    font-size: 12px;
    font-weight: 650;
  }

  .inv-stat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 37px;
    height: 37px;
    border-radius: 11px;
    font-size: 20px;
    font-weight: 750;
  }

  .inv-icon-blue {
    color: #2563eb;
    background: #eff6ff;
  }

  .inv-icon-green {
    color: #059669;
    background: #ecfdf5;
  }

  .inv-icon-orange {
    color: #d97706;
    background: #fffbeb;
  }

  .inv-icon-purple {
    color: #7c3aed;
    background: #f5f3ff;
  }

  .inv-stat-value {
    margin-top: 17px;
    color: #172033;
    font-size: 34px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.04em;
  }

  .inv-stat-footer {
    gap: 8px;
    margin-top: 17px;
    color: #8a94a6;
    font-size: 11px;
  }

  .inv-stat-footer span:last-child {
    color: #64748b;
    font-size: 17px;
  }

  .inv-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: stretch;
    gap: 22px;
    margin-bottom: 24px;
  }

  .inv-card {
    min-width: 0;
    padding: 25px;
    border: 1px solid #e7ebf3;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 3px 10px rgba(15, 23, 42, .025);
  }

  .inv-form-card,
  .inv-stock-card {
    height: 100%;
  }

  .inv-form-card {
    display: flex;
    flex-direction: column;
  }

  .inv-stock-card {
    display: flex;
    flex-direction: column;
    scroll-margin-top: 22px;
  }

  .inv-section-heading {
    justify-content: flex-start;
    gap: 13px;
    margin-bottom: 23px;
  }

  .inv-heading-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 43px;
    height: 43px;
    border-radius: 12px;
    font-size: 22px;
    font-weight: 750;
  }

  .inv-heading-blue {
    color: #2563eb;
    background: #eff6ff;
  }

  .inv-heading-green {
    color: #059669;
    background: #ecfdf5;
  }

  .inv-heading-purple {
    color: #7c3aed;
    background: #f5f3ff;
  }

  .inv-section-heading h2 {
    margin: 0;
    color: #1e293b;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -.025em;
  }

  .inv-section-heading p {
    margin: 6px 0 0;
    color: #8792a5;
    font-size: 11px;
  }

  .inv-form {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 17px;
  }

  .inv-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .inv-field label {
    color: #334155;
    font-size: 12px;
    font-weight: 750;
  }

  .inv-optional {
    color: #9ca3af;
    font-size: 11px;
    font-weight: 500;
  }

  .inv-field input,
  .inv-field select,
  .inv-field textarea,
  .inv-filter-select,
  .inv-search-wrapper input {
    width: 100%;
    min-width: 0;
    border: 1px solid #e1e6ef;
    border-radius: 9px;
    outline: none;
    background: #fff;
    color: #263449;
    font: inherit;
    font-size: 12px;
    transition: border-color .18s ease, box-shadow .18s ease;
  }

  .inv-field input,
  .inv-field select {
    min-height: 43px;
    padding: 0 12px;
  }

  .inv-field textarea {
    min-height: 77px;
    padding: 12px;
    resize: vertical;
    line-height: 1.5;
  }

  .inv-field input::placeholder,
  .inv-field textarea::placeholder,
  .inv-search-wrapper input::placeholder {
    color: #a3adbd;
  }

  .inv-field input:focus,
  .inv-field select:focus,
  .inv-field textarea:focus,
  .inv-filter-select:focus,
  .inv-search-wrapper input:focus {
    border-color: #7c9df8;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, .1);
  }

  .inv-primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    width: 100%;
    min-height: 45px;
    margin-top: auto;
    padding: 0 18px;
    border: 0;
    border-radius: 10px;
    background: #2563eb;
    color: #fff;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: background .18s ease, transform .18s ease;
  }

  .inv-primary-button:hover:not(:disabled) {
    transform: translateY(-1px);
    background: #1d4ed8;
  }

  .inv-primary-button:disabled {
    opacity: .65;
    cursor: not-allowed;
  }

  .inv-spinner {
    display: inline-block;
    width: 15px;
    height: 15px;
    border: 2px solid rgba(255,255,255,.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: inv-spin .7s linear infinite;
  }

  .inv-spinner-dark {
    border-color: #dbeafe;
    border-top-color: #2563eb;
  }

  @keyframes inv-spin {
    to { transform: rotate(360deg); }
  }

  .inv-stock-list {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
  }

  .inv-stock-item {
    min-width: 0;
    padding: 14px;
    border: 1px solid #edf0f5;
    border-radius: 11px;
    background: #fff;
  }

  .inv-stock-item-button {
    display: block;
    width: 100%;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color .18s ease, background .18s ease, transform .18s ease;
  }

  .inv-stock-item-button:hover {
    border-color: #c7d2fe;
    background: #fafbff;
    transform: translateY(-1px);
  }

  .inv-stock-item-main {
    justify-content: flex-start;
    gap: 10px;
    min-width: 0;
  }

  .inv-stock-cylinder-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 31px;
    height: 31px;
    border-radius: 9px;
    background: #f1f5f9;
    color: #475569;
    font-size: 17px;
  }

  .inv-stock-name {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    color: #334155;
    font-size: 12px;
    font-weight: 750;
  }

  .inv-stock-arrow {
    color: #94a3b8;
    font-size: 17px;
  }

  .inv-stock-counts {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 9px 18px;
    margin: 12px 0 0 41px;
  }

  .inv-stock-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 10px;
  }

  .inv-stock-count strong {
    color: #334155;
    font-size: 11px;
  }

  .inv-count-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .inv-filled-count .inv-count-dot {
    background: #10b981;
  }

  .inv-empty-count .inv-count-dot {
    background: #f59e0b;
  }

  .inv-stock-pagination {
    flex-wrap: wrap;
    gap: 12px;
    margin-top: auto;
    padding-top: 18px;
  }

  .inv-pagination-info {
    color: #8792a5;
    font-size: 11px;
  }

  .inv-pagination-actions {
    justify-content: flex-end;
    gap: 9px;
  }

  .inv-page-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid #e1e6ef;
    border-radius: 8px;
    background: #fff;
    color: #475569;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  .inv-page-button:hover:not(:disabled) {
    border-color: #a5b4fc;
    background: #f8faff;
    color: #1d4ed8;
  }

  .inv-page-button:disabled {
    opacity: .4;
    cursor: not-allowed;
  }

  .inv-page-number {
    color: #64748b;
    font-size: 11px;
    white-space: nowrap;
  }

  .inv-empty-state {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 150px;
    color: #8792a5;
    text-align: center;
    font-size: 12px;
  }

  .inv-empty-state p {
    margin: 0;
  }

  .inv-empty-icon {
    color: #cbd5e1;
    font-size: 28px;
  }

  .inv-inline-link {
    color: #2563eb;
    font-size: 11px;
    font-weight: 750;
    text-decoration: none;
  }

  .inv-inline-link:hover {
    text-decoration: underline;
  }

  .inv-history-card {
    margin-bottom: 24px;
    scroll-margin-top: 22px;
  }

  .inv-history-header {
    flex-wrap: wrap;
    gap: 14px;
  }

  .inv-history-header .inv-section-heading {
    margin-bottom: 22px;
  }

  .inv-record-count {
    padding: 7px 10px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 10px;
    font-weight: 750;
  }

  .inv-filters {
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 17px;
  }

  .inv-search-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-width: 230px;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid #e1e6ef;
    border-radius: 9px;
    color: #94a3b8;
  }

  .inv-search-wrapper > span {
    font-size: 20px;
  }

  .inv-search-wrapper input {
    min-height: 38px;
    padding: 0;
    border: 0;
    box-shadow: none;
  }

  .inv-search-wrapper input:focus {
    border: 0;
    box-shadow: none;
  }

  .inv-filter-select {
    width: auto;
    min-width: 185px;
    min-height: 42px;
    padding: 0 12px;
  }

  .inv-table-wrapper {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #edf0f5;
    border-radius: 11px;
  }

  .inv-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    white-space: nowrap;
  }

  .inv-table thead {
    background: #f8fafc;
  }

  .inv-table th {
    color: #758197;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .025em;
  }

  .inv-table tbody tr {
    border-top: 1px solid #edf0f5;
    transition: background .15s ease;
  }

  .inv-table tbody tr:hover {
    background: #fafbff;
  }

  .inv-table td {
    color: #526075;
    font-size: 11px;
  }

  .inv-id-badge {
    display: inline-block;
    padding: 5px 7px;
    border-radius: 6px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 10px;
    font-weight: 750;
  }

  .inv-table-cylinder {
    color: #334155;
    font-weight: 700;
  }

  .inv-movement-badge {
    display: inline-block;
    padding: 6px 8px;
    border-radius: 6px;
    background: #f1f5f9;
    color: #475569;
    font-size: 10px;
    font-weight: 750;
  }

  .inv-movement-stock_in,
  .inv-movement-refill_received {
    background: #ecfdf5;
    color: #047857;
  }

  .inv-movement-stock_out,
  .inv-movement-sent_for_refill {
    background: #fff7ed;
    color: #c2410c;
  }

  .inv-movement-empty_returned {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .inv-quantity-value {
    color: #1e293b;
    font-size: 12px;
  }

  .inv-note-cell {
    display: inline-block;
    max-width: 230px;
    overflow: hidden;
    color: #7b8799;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }

  .inv-date-cell {
    color: #7b8799;
    font-size: 10px;
  }

  .inv-table-message {
    padding: 45px 18px !important;
    color: #8792a5 !important;
    text-align: center !important;
  }

  .inv-table-message .inv-spinner,
  .inv-table-message .inv-empty-icon,
  .inv-table-message strong,
  .inv-table-message span {
    display: block;
    margin: 0 auto 9px;
  }

  .inv-table-message strong {
    color: #475569;
    font-size: 12px;
  }

  .inv-table-message span:last-child {
    font-size: 11px;
  }

  .inv-history-footer {
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 18px;
  }

  .inv-footer {
    flex-wrap: wrap;
    gap: 10px;
    padding: 4px 2px;
    color: #94a3b8;
    font-size: 10px;
  }

  .inv-footer > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    font-weight: 750;
  }

  .inv-footer-dot {
    width: 6px;
    height: 6px;
    background: #10b981;
  }

  .inv-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    padding: 13px 15px;
    border: 1px solid;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.5;
  }

  .inv-alert-error {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }

  .inv-alert-success {
    border-color: #a7f3d0;
    background: #ecfdf5;
    color: #047857;
  }

  .inv-alert-close {
    margin-left: auto;
    padding: 0 4px;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 20px;
    cursor: pointer;
  }

  @media (max-width: 1100px) {
    .inv-stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .inv-main-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .inv-form-card,
    .inv-stock-card {
      height: auto;
    }

    .inv-stock-card {
      min-height: 410px;
    }
  }

  @media (max-width: 640px) {
    .inv-page {
      padding: 16px 12px 22px;
    }

    .inv-hero {
      padding: 20px 18px 24px;
      border-radius: 14px;
    }

    .inv-hero-top {
      align-items: flex-start;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 22px;
    }

    .inv-hero-content {
      align-items: flex-start;
      flex-direction: column;
    }

    .inv-refresh-button {
      width: 100%;
    }

    .inv-stats-grid {
      gap: 10px;
    }

    .inv-stat-card {
      padding: 15px;
      border-radius: 12px;
    }

    .inv-stat-label {
      font-size: 10px;
    }

    .inv-stat-icon {
      width: 31px;
      height: 31px;
      font-size: 16px;
    }

    .inv-stat-value {
      font-size: 29px;
    }

    .inv-stat-footer {
      align-items: flex-start;
      font-size: 10px;
    }

    .inv-card {
      padding: 17px;
      border-radius: 13px;
    }

    .inv-section-heading h2 {
      font-size: 14px;
    }

    .inv-section-heading p {
      font-size: 10px;
    }

    .inv-stock-counts {
      margin-left: 0;
    }

    .inv-stock-pagination {
      align-items: flex-start;
      flex-direction: column;
    }

    .inv-filters {
      align-items: stretch;
      flex-direction: column;
    }

    .inv-search-wrapper {
      min-width: 0;
    }

    .inv-filter-select {
      width: 100%;
    }

    .inv-history-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .inv-pagination-actions {
      width: 100%;
      justify-content: space-between;
    }

    .inv-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .inv-page *,
    .inv-page *::before,
    .inv-page *::after {
      scroll-behavior: auto !important;
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;
