
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";
const PAGE_SIZE = 8;

type CylinderType = {
  id: number;
  name?: string;
  cylinderTypeName?: string;
  capacityKg?: number | string;
  sellingPrice?: number | string;
  isActive?: boolean;
};

type InventoryMovement = {
  id: number;
  cylinderTypeId: number;
  quantity: number;
  type: string;
  status: string;
  note: string | null;
  createdAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

const movementTypes = [
  "OPENING",
  "RECEIVED",
  "SOLD",
  "EMPTY_RETURNED",
  "SENT_FOR_REFILL",
  "REFILL_RECEIVED",
  "ADJUSTMENT",
];

const positiveMovementTypes = [
  "OPENING",
  "RECEIVED",
  "REFILL_RECEIVED",
  "EMPTY_RETURNED",
];

const movementLabel = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );

function formatCurrency(value: number | string | undefined) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function Inventory() {
  const navigate = useNavigate();

  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const [cylinderTypeId, setCylinderTypeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [type, setType] = useState("RECEIVED");
  const [status, setStatus] = useState("FILLED");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const handleAuthError = useCallback(() => {
    localStorage.removeItem("gasflow_token");
    navigate("/login", { replace: true });
  }, [navigate]);

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        handleAuthError();
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
        handleAuthError();
        throw new Error("Your session has expired. Please log in again.");
      }

      return response;
    },
    [handleAuthError]
  );

  const loadInventory = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError("");

      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        localStorage.removeItem("gasflow_token");
        navigate("/login", { replace: true });
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [inventoryRes, cylinderTypesRes] = await Promise.all([
        fetch(`${API_URL}/inventory`, { headers }),
        fetch(`${API_URL}/cylinder-types`, { headers }),
      ]);

      if (inventoryRes.status === 401 || cylinderTypesRes.status === 401) {
        localStorage.removeItem("gasflow_token");
        navigate("/login", { replace: true });
        return;
      }

      const [inventoryJson, cylinderTypesJson] = await Promise.all([
        inventoryRes.json(),
        cylinderTypesRes.json(),
      ]);

      if (!inventoryRes.ok || !inventoryJson.success) {
        throw new Error(inventoryJson.message || "Failed to load inventory.");
      }

      if (!cylinderTypesRes.ok || !cylinderTypesJson.success) {
        throw new Error(
          cylinderTypesJson.message || "Failed to load cylinder types."
        );
      }

      setMovements(
        Array.isArray(inventoryJson.data) ? inventoryJson.data : []
      );
      setCylinderTypes(
        Array.isArray(cylinderTypesJson.data) ? cylinderTypesJson.data : []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const handleMovementTypeChange = (value: string) => {
    setType(value);

    if (["RECEIVED", "SOLD", "REFILL_RECEIVED", "OPENING"].includes(value)) {
      setStatus("FILLED");
    } else if (["EMPTY_RETURNED", "SENT_FOR_REFILL"].includes(value)) {
      setStatus("EMPTY");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!cylinderTypeId) {
      setError("Please select a cylinder type.");
      return;
    }

    const quantityNumber = Number(quantity);

    if (!Number.isInteger(quantityNumber) || quantityNumber <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (
      ["RECEIVED", "SOLD", "REFILL_RECEIVED", "OPENING"].includes(type) &&
      status !== "FILLED"
    ) {
      setError(`${movementLabel(type)} must have FILLED status.`);
      return;
    }

    if (
      ["EMPTY_RETURNED", "SENT_FOR_REFILL"].includes(type) &&
      status !== "EMPTY"
    ) {
      setError(`${movementLabel(type)} must have EMPTY status.`);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        cylinderTypeId: Number(cylinderTypeId),
        quantity: quantityNumber,
        type,
        status,
        note: note.trim(),
      };

      const response = await authenticatedFetch(`${API_URL}/inventory`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const result: ApiResponse<InventoryMovement> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to record stock movement."
        );
      }

      setMessage("Stock movement recorded successfully.");
      setQuantity("1");
      setNote("");
      setCurrentPage(1);

      await loadInventory(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const getCylinderName = (id: number) => {
    const cylinder = cylinderTypes.find((item) => item.id === id);

    return (
      cylinder?.name ??
      cylinder?.cylinderTypeName ??
      `Cylinder Type #${id}`
    );
  };

  const calculateStock = (cylinderId: number, stockStatus: string) => {
    return movements
      .filter(
        (movement) =>
          movement.cylinderTypeId === cylinderId &&
          movement.status === stockStatus
      )
      .reduce((total, movement) => {
        if (movement.type === "ADJUSTMENT") {
          // Assumes adjustment quantity is a signed delta.
          return total + movement.quantity;
        }

        if (positiveMovementTypes.includes(movement.type)) {
          return total + movement.quantity;
        }

        if (["SOLD", "SENT_FOR_REFILL"].includes(movement.type)) {
          return total - movement.quantity;
        }

        return total;
      }, 0);
  };

  const stockSummary = useMemo(() => {
    return cylinderTypes.map((cylinder) => ({
      id: cylinder.id,
      name: getCylinderName(cylinder.id),
      filled: calculateStock(cylinder.id, "FILLED"),
      empty: calculateStock(cylinder.id, "EMPTY"),
    }));
  }, [cylinderTypes, movements]);

  const totalFilledStock = stockSummary.reduce(
    (total, item) => total + item.filled,
    0
  );

  const totalEmptyStock = stockSummary.reduce(
    (total, item) => total + item.empty,
    0
  );

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...movements]
      .filter((movement) => {
        const matchesSearch =
          !query ||
          String(movement.id).includes(query) ||
          getCylinderName(movement.cylinderTypeId).toLowerCase().includes(query) ||
          movement.type.toLowerCase().includes(query) ||
          movement.status.toLowerCase().includes(query) ||
          (movement.note ?? "").toLowerCase().includes(query);

        const matchesType =
          movementFilter === "ALL" || movement.type === movementFilter;

        const matchesStatus =
          statusFilter === "ALL" || movement.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [movements, search, movementFilter, statusFilter, cylinderTypes]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovements.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedMovements = filteredMovements.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, movementFilter, statusFilter]);

  const cellStyle: React.CSSProperties = {
    padding: "14px 16px",
    textAlign: "left",
    borderBottom: "1px solid #edf0f6",
    whiteSpace: "nowrap",
  };

  if (loading) {
    return (
      <div className="gf-inventory">
        <style>{inventoryStyles}</style>
        <div className="inv-loading">
          <span className="inv-spinner" />
          <p>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-inventory">
      <style>{inventoryStyles}</style>

      <header className="inv-hero">
        <div>
          <Link to="/" className="inv-back-link">
            ← Back to Dashboard
          </Link>
          <span className="inv-eyebrow">GASFLOW • OPERATIONS</span>
          <h1>Inventory Management</h1>
          <p>Track cylinder stock, record movements, and review inventory history.</p>
        </div>

        <div className="inv-hero-icon" aria-hidden="true">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3h8M9 3v3h6V3M7 6h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
            <path d="M9 11h6M9 15h6" />
          </svg>
        </div>
      </header>

      {error && (
        <div className="inv-alert inv-alert-error" role="alert">
          <span className="inv-alert-icon">!</span>
          <div>
            <strong>Something went wrong</strong>
            <p>{error}</p>
            <button
              type="button"
              className="inv-text-button"
              onClick={() => void loadInventory()}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="inv-alert inv-alert-success" role="status">
          <span className="inv-alert-icon">✓</span>
          <div>
            <strong>Success</strong>
            <p>{message}</p>
          </div>
          <button
            type="button"
            className="inv-dismiss"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <section className="inv-stats">
        <article className="inv-stat-card">
          <div className="inv-stat-icon inv-icon-purple">▤</div>
          <div>
            <span>Total Cylinder Types</span>
            <strong>{cylinderTypes.length}</strong>
            <small>Configured cylinder types</small>
          </div>
        </article>

        <article className="inv-stat-card">
          <div className="inv-stat-icon inv-icon-blue">▥</div>
          <div>
            <span>Filled Stock</span>
            <strong>{totalFilledStock}</strong>
            <small>Units across all types</small>
          </div>
        </article>

        <article className="inv-stat-card">
          <div className="inv-stat-icon inv-icon-orange">↻</div>
          <div>
            <span>Empty Stock</span>
            <strong>{totalEmptyStock}</strong>
            <small>Units awaiting next action</small>
          </div>
        </article>

        <article className="inv-stat-card">
          <div className="inv-stat-icon inv-icon-green">↕</div>
          <div>
            <span>Total Movements</span>
            <strong>{movements.length}</strong>
            <small>Recorded transactions</small>
          </div>
        </article>
      </section>

      <div className="inv-main-grid">
        <section className="inv-card inv-form-card">
          <div className="inv-section-heading">
            <div className="inv-heading-icon">＋</div>
            <div>
              <h2>Record Stock Movement</h2>
              <p>Add an opening balance or record a stock transaction.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="inv-field">
              <label htmlFor="cylinderTypeId">
                Cylinder Type <span>*</span>
              </label>
              <select
                id="cylinderTypeId"
                value={cylinderTypeId}
                onChange={(event) => setCylinderTypeId(event.target.value)}
                required
              >
                <option value="">Select cylinder type</option>
                {cylinderTypes.map((cylinder) => (
                  <option key={cylinder.id} value={cylinder.id}>
                    {getCylinderName(cylinder.id)}
                    {cylinder.capacityKg != null
                      ? ` (${cylinder.capacityKg} kg)`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="inv-field">
              <label htmlFor="type">
                Movement Type <span>*</span>
              </label>
              <select
                id="type"
                value={type}
                onChange={(event) =>
                  handleMovementTypeChange(event.target.value)
                }
              >
                {movementTypes.map((movementType) => (
                  <option key={movementType} value={movementType}>
                    {movementLabel(movementType)}
                  </option>
                ))}
              </select>
            </div>

            <div className="inv-field">
              <label htmlFor="status">
                Cylinder Status <span>*</span>
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="FILLED">Filled</option>
                <option value="EMPTY">Empty</option>
              </select>
              <small>
                Select the stock status that matches this movement.
              </small>
            </div>

            <div className="inv-field">
              <label htmlFor="quantity">
                Quantity <span>*</span>
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </div>

            <div className="inv-field">
              <label htmlFor="note">Note</label>
              <textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Add a reference or explanation..."
              />
            </div>

            <button
              type="submit"
              className="inv-submit-button"
              disabled={saving || cylinderTypes.length === 0}
            >
              {saving ? (
                <>
                  <span className="inv-button-spinner" />
                  Saving Movement...
                </>
              ) : (
                <>＋ Record Movement</>
              )}
            </button>
          </form>
        </section>

        <section className="inv-card inv-stock-card">
          <div className="inv-section-heading">
            <div className="inv-heading-icon inv-heading-blue">▦</div>
            <div>
              <h2>Current Stock Summary</h2>
              <p>Stock balances by cylinder type.</p>
            </div>
          </div>

          {stockSummary.length === 0 ? (
            <div className="inv-empty-state">
              <span>▤</span>
              <strong>No cylinder types found</strong>
              <p>Add cylinder types to start tracking stock.</p>
            </div>
          ) : (
            <div className="inv-stock-list">
              {stockSummary.map((item) => (
                <article className="inv-stock-item" key={item.id}>
                  <div className="inv-stock-cylinder-icon">▤</div>
                  <div className="inv-stock-info">
                    <strong>{item.name}</strong>
                    <span>Type ID: {item.id}</span>
                    <div className="inv-stock-badges">
                      <span className="inv-stock-filled">
                        Filled: {item.filled}
                      </span>
                      <span className="inv-stock-empty">
                        Empty: {item.empty}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="inv-stock-footnote">
            Stock totals are calculated from the movement history returned by
            your API. Confirm adjustment and refill rules against your backend.
          </div>
        </section>
      </div>

      <section className="inv-card inv-history-card">
        <div className="inv-history-header">
          <div className="inv-section-heading">
            <div className="inv-heading-icon inv-heading-green">☷</div>
            <div>
              <h2>Inventory Movement History</h2>
              <p>Search, filter, and review recorded transactions.</p>
            </div>
          </div>

          <button
            type="button"
            className="inv-refresh-button"
            onClick={() => void loadInventory()}
          >
            ↻ Refresh
          </button>
        </div>

        <div className="inv-toolbar">
          <div className="inv-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ID, cylinder, movement, or note..."
              aria-label="Search inventory movements"
            />
          </div>

          <select
            value={movementFilter}
            onChange={(event) => setMovementFilter(event.target.value)}
            aria-label="Filter by movement type"
          >
            <option value="ALL">All movements</option>
            {movementTypes.map((movementType) => (
              <option key={movementType} value={movementType}>
                {movementLabel(movementType)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by cylinder status"
          >
            <option value="ALL">All statuses</option>
            <option value="FILLED">Filled</option>
            <option value="EMPTY">Empty</option>
          </select>
        </div>

        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th style={cellStyle}>ID</th>
                <th style={cellStyle}>Cylinder Type</th>
                <th style={cellStyle}>Movement</th>
                <th style={cellStyle}>Status</th>
                <th style={cellStyle}>Quantity</th>
                <th style={cellStyle}>Note</th>
                <th style={cellStyle}>Date</th>
              </tr>
            </thead>

            <tbody>
              {paginatedMovements.map((movement) => (
                <tr key={movement.id}>
                  <td style={cellStyle}>
                    <span className="inv-id-badge">#{movement.id}</span>
                  </td>
                  <td style={cellStyle}>
                    <strong>{getCylinderName(movement.cylinderTypeId)}</strong>
                  </td>
                  <td style={cellStyle}>
                    <span className="inv-movement-label">
                      {movementLabel(movement.type)}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <span
                      className={`inv-status-badge ${
                        movement.status === "FILLED"
                          ? "inv-status-filled"
                          : "inv-status-empty"
                      }`}
                    >
                      {movement.status}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <strong>{movement.quantity}</strong>
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: "normal", minWidth: 130 }}>
                    {movement.note || <span className="inv-muted">—</span>}
                  </td>
                  <td style={cellStyle}>
                    {new Date(movement.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}

              {paginatedMovements.length === 0 && (
                <tr>
                  <td style={{ ...cellStyle, textAlign: "center" }} colSpan={7}>
                    <div className="inv-empty-state">
                      <span>⌕</span>
                      <strong>No movements found</strong>
                      <p>Try changing your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="inv-pagination">
          <span>
            Showing{" "}
            {filteredMovements.length === 0
              ? 0
              : (safePage - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(safePage * PAGE_SIZE, filteredMovements.length)} of{" "}
            {filteredMovements.length} movements
          </span>

          <div className="inv-pagination-controls">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
              aria-label="First page"
            >
              «
            </button>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>

            <span className="inv-page-number">
              {safePage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              Next
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              aria-label="Last page"
            >
              »
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const inventoryStyles = `
  .gf-inventory {
    --inv-ink: #111827;
    --inv-text: #334155;
    --inv-muted: #64748b;
    --inv-border: #e5e9f2;
    min-height: 100%;
    padding: clamp(15px, 2.4vw, 30px);
    background: #f4f6fb;
    color: var(--inv-text);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }

  .gf-inventory *, .gf-inventory *::before, .gf-inventory *::after {
    box-sizing: border-box;
  }

  .gf-inventory button, .gf-inventory input,
  .gf-inventory select, .gf-inventory textarea { font: inherit; }

  .gf-inventory button { cursor: pointer; }
  .gf-inventory button:disabled { cursor: not-allowed; opacity: .5; }

  .inv-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
    margin-bottom: 23px;
    padding: 29px 32px;
    color: white;
    background: linear-gradient(120deg, #1e1b4b, #3730a3 58%, #6366f1);
    border-radius: 20px;
    box-shadow: 0 13px 30px rgba(55,48,163,.15);
  }

  .inv-back-link {
    display: inline-block;
    margin-bottom: 17px;
    color: #e0e7ff;
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;
  }

  .inv-eyebrow {
    display: block;
    margin-bottom: 6px;
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 1.3px;
  }

  .gf-inventory .inv-hero h1 {
    margin: 0;
    color: white;
    font-size: clamp(25px, 3vw, 34px);
    font-weight: 900;
    letter-spacing: -.8px;
    line-height: 1.2;
  }

  .inv-hero p { margin: 9px 0 0; color: #e0e7ff; font-size: 13px; }

  .inv-hero-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 94px;
    height: 94px;
    flex-shrink: 0;
    color: white;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 24px;
  }

  .inv-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 15px;
    margin-bottom: 22px;
  }

  .inv-stat-card {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    min-width: 0;
    padding: 19px;
    background: white;
    border: 1px solid var(--inv-border);
    border-radius: 15px;
    box-shadow: 0 3px 12px rgba(15,23,42,.025);
  }

  .inv-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 43px;
    height: 43px;
    flex-shrink: 0;
    border-radius: 13px;
    font-size: 22px;
    font-weight: 850;
  }

  .inv-icon-purple { color: #4f46e5; background: #eef2ff; }
  .inv-icon-blue { color: #2563eb; background: #eff6ff; }
  .inv-icon-orange { color: #ea580c; background: #fff7ed; }
  .inv-icon-green { color: #059669; background: #ecfdf5; }

  .inv-stat-card > div:last-child { min-width: 0; }
  .inv-stat-card span { display: block; color: #64748b; font-size: 11px; font-weight: 700; }
  .inv-stat-card strong { display: block; margin-top: 3px; color: #111827; font-size: 27px; font-weight: 900; line-height: 1.25; }
  .inv-stat-card small { display: block; margin-top: 5px; color: #94a3b8; font-size: 10px; }

  .inv-main-grid {
    display: grid;
    grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr);
    align-items: start;
    gap: 20px;
    margin-bottom: 22px;
  }

  .inv-card {
    min-width: 0;
    padding: 23px;
    background: white;
    border: 1px solid var(--inv-border);
    border-radius: 17px;
    box-shadow: 0 3px 12px rgba(15,23,42,.025);
  }

  .inv-section-heading {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 22px;
  }

  .inv-heading-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 41px;
    height: 41px;
    flex-shrink: 0;
    color: #4f46e5;
    background: #eef2ff;
    border-radius: 12px;
    font-size: 21px;
    font-weight: 850;
  }

  .inv-heading-blue { color: #2563eb; background: #eff6ff; }
  .inv-heading-green { color: #059669; background: #ecfdf5; }

  .gf-inventory .inv-section-heading h2 {
    margin: 1px 0 0;
    color: var(--inv-ink);
    font-size: 16px;
    font-weight: 850;
    letter-spacing: -.25px;
  }

  .inv-section-heading p { margin: 5px 0 0; color: var(--inv-muted); font-size: 11px; }

  .inv-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 17px; }
  .inv-field label { color: #334155; font-size: 11px; font-weight: 800; }
  .inv-field label span { color: #dc2626; }

  .gf-inventory .inv-field input,
  .gf-inventory .inv-field select,
  .gf-inventory .inv-field textarea {
    display: block;
    width: 100%;
    min-width: 0;
    min-height: 43px;
    padding: 10px 12px;
    color: #1e293b;
    background: #fbfcff;
    border: 1px solid #dfe5ef;
    border-radius: 9px;
    outline: none;
    font-size: 12px;
    transition: border-color .15s ease, box-shadow .15s ease;
  }

  .gf-inventory .inv-field textarea { min-height: 83px; resize: vertical; }
  .gf-inventory .inv-field input:focus,
  .gf-inventory .inv-field select:focus,
  .gf-inventory .inv-field textarea:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(99,102,241,.12);
  }

  .inv-field small { color: #94a3b8; font-size: 10px; }

  .inv-submit-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    width: 100%;
    min-height: 44px;
    padding: 11px 15px;
    color: white;
    background: #4f46e5;
    border: 1px solid #4f46e5;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 850;
    transition: background .15s ease, transform .15s ease;
  }

  .inv-submit-button:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }

  .inv-stock-list { display: flex; flex-direction: column; gap: 10px; }

  .inv-stock-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 15px;
    background: #fbfcff;
    border: 1px solid #edf0f6;
    border-radius: 12px;
  }

  .inv-stock-cylinder-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 39px;
    height: 39px;
    flex-shrink: 0;
    color: #4f46e5;
    background: #eef2ff;
    border-radius: 11px;
    font-size: 20px;
  }

  .inv-stock-info { flex: 1; min-width: 0; }
  .inv-stock-info > strong { display: block; color: #1e293b; font-size: 12px; font-weight: 850; overflow-wrap: anywhere; }
  .inv-stock-info > span { display: block; margin-top: 3px; color: #94a3b8; font-size: 10px; }

  .inv-stock-badges { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
  .inv-stock-badges > span { padding: 5px 8px; border-radius: 7px; font-size: 10px; font-weight: 800; }
  .inv-stock-filled { color: #047857; background: #d1fae5; }
  .inv-stock-empty { color: #b45309; background: #fef3c7; }

  .inv-stock-footnote { margin-top: 17px; padding: 12px; color: #64748b; background: #f8fafc; border-radius: 9px; font-size: 10px; line-height: 1.7; }

  .inv-history-card { padding: 0; overflow: hidden; }
  .inv-history-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 23px 23px 0; }
  .inv-history-header .inv-section-heading { margin-bottom: 18px; }

  .inv-refresh-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex-shrink: 0;
    min-height: 37px;
    padding: 8px 12px;
    color: #4338ca;
    background: #eef2ff;
    border: 1px solid #e0e7ff;
    border-radius: 9px;
    font-size: 11px;
    font-weight: 800;
  }

  .inv-refresh-button:hover { background: #e0e7ff; }

  .inv-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 23px 19px;
  }

  .inv-search {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 150px;
    gap: 8px;
    min-height: 40px;
    padding: 0 11px;
    background: #fbfcff;
    border: 1px solid #dfe5ef;
    border-radius: 9px;
  }

  .inv-search > span { color: #94a3b8; font-size: 22px; line-height: 1; }
  .gf-inventory .inv-search input { width: 100%; min-width: 0; padding: 9px 0; color: #334155; background: transparent; border: 0; outline: 0; font-size: 11px; }
  .gf-inventory .inv-search input:focus { box-shadow: none; }

  .gf-inventory .inv-toolbar > select {
    min-height: 40px;
    max-width: 180px;
    padding: 9px 10px;
    color: #475569;
    background: white;
    border: 1px solid #dfe5ef;
    border-radius: 9px;
    outline: none;
    font-size: 11px;
  }

  .inv-table-wrap { width: 100%; overflow-x: auto; }
  .gf-inventory .inv-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .gf-inventory .inv-table thead { background: #f8fafc; }
  .gf-inventory .inv-table th { color: #64748b; font-size: 10px; font-weight: 850; }
  .gf-inventory .inv-table tbody tr:hover { background: #fafbff; }
  .gf-inventory .inv-table td { color: #475569; vertical-align: middle; }
  .gf-inventory .inv-table td strong { color: #1e293b; font-weight: 800; }

  .inv-id-badge { display: inline-block; padding: 5px 7px; color: #4338ca; background: #eef2ff; border-radius: 6px; font-size: 10px; font-weight: 850; }
  .inv-movement-label { color: #475569; font-weight: 750; }
  .inv-status-badge { display: inline-block; padding: 5px 8px; border-radius: 7px; font-size: 9px; font-weight: 850; }
  .inv-status-filled { color: #047857; background: #d1fae5; }
  .inv-status-empty { color: #b45309; background: #fef3c7; }
  .inv-muted { color: #94a3b8; }

  .inv-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 13px;
    padding: 17px 23px;
    border-top: 1px solid #edf0f6;
  }

  .inv-pagination > span { color: #64748b; font-size: 11px; }
  .inv-pagination-controls { display: flex; align-items: center; gap: 5px; }

  .inv-pagination-controls button {
    min-height: 32px;
    padding: 6px 9px;
    color: #475569;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-size: 10px;
    font-weight: 750;
  }

  .inv-pagination-controls button:hover:not(:disabled) { color: #4338ca; background: #eef2ff; border-color: #c7d2fe; }
  .inv-pagination-controls button:disabled { opacity: .4; }
  .inv-page-number { padding: 0 7px; color: #4338ca; font-size: 10px; font-weight: 850; white-space: nowrap; }

  .inv-alert { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border: 1px solid; border-radius: 12px; }
  .inv-alert-error { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
  .inv-alert-success { color: #065f46; background: #ecfdf5; border-color: #a7f3d0; }

  .inv-alert-icon { display: flex; align-items: center; justify-content: center; width: 25px; height: 25px; flex-shrink: 0; border-radius: 50%; color: white; background: #dc2626; font-weight: 900; }
  .inv-alert-success .inv-alert-icon { background: #059669; }
  .inv-alert strong { display: block; font-size: 12px; }
  .inv-alert p { margin: 3px 0 0; font-size: 11px; overflow-wrap: anywhere; }
  .inv-text-button { margin-top: 7px; padding: 0; color: #4338ca; background: transparent; border: 0; font-size: 11px; font-weight: 850; }
  .inv-dismiss { margin-left: auto; padding: 0 4px; color: inherit; background: transparent; border: 0; font-size: 22px; line-height: 1; }

  .inv-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 25px 12px; text-align: center; }
  .inv-empty-state > span { color: #a5b4fc; font-size: 30px; }
  .inv-empty-state strong { color: #334155; font-size: 12px; }
  .inv-empty-state p { margin: 0; color: #94a3b8; font-size: 11px; }

  .inv-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13px; min-height: 300px; color: #64748b; }
  .inv-spinner, .inv-button-spinner { display: inline-block; width: 17px; height: 17px; border: 2px solid rgba(99,102,241,.25); border-top-color: #6366f1; border-radius: 50%; animation: inv-spin .7s linear infinite; }
  .inv-spinner { width: 31px; height: 31px; border-width: 3px; }
  .inv-button-spinner { border-color: rgba(255,255,255,.4); border-top-color: white; }
  .inv-loading p { margin: 0; font-size: 12px; }

  @keyframes inv-spin { to { transform: rotate(360deg); } }

  @media (max-width: 1150px) {
    .inv-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .inv-main-grid { grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 760px) {
    .inv-hero { padding: 22px; }
    .inv-hero-icon { width: 66px; height: 66px; }
    .inv-toolbar { align-items: stretch; flex-direction: column; }
    .gf-inventory .inv-toolbar > select { width: 100%; max-width: none; }
    .inv-search { flex: initial; width: 100%; }
    .inv-history-header { align-items: flex-start; }
    .inv-pagination { align-items: flex-start; flex-direction: column; }
  }

  @media (max-width: 520px) {
    .gf-inventory { padding: 12px; }
    .inv-hero { align-items: flex-start; flex-direction: column-reverse; padding: 20px; }
    .inv-hero-icon { width: 52px; height: 52px; border-radius: 15px; }
    .inv-hero-icon svg { width: 31px; height: 31px; }
    .gf-inventory .inv-hero h1 { font-size: 25px; }
    .inv-stats { grid-template-columns: minmax(0, 1fr); gap: 10px; }
    .inv-stat-card { padding: 15px; }
    .inv-card { padding: 17px; }
    .inv-history-card { padding: 0; }
    .inv-history-header { padding: 17px 17px 0; }
    .inv-history-header { flex-direction: column; }
    .inv-toolbar { padding: 0 17px 16px; }
    .inv-pagination { padding: 15px 17px; }
    .inv-pagination-controls { flex-wrap: wrap; }
    .inv-pagination-controls button { padding: 6px 7px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-inventory *, .gf-inventory *::before, .gf-inventory *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

