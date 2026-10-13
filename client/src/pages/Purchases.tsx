import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Toast, { type ToastType } from "../components/Toast";

const API = "http://localhost:5000/api";
const PAGE_SIZE = 10;

type Purchase = {
  id: number;
  supplierId: number;
  invoiceNumber?: string | null;
  purchaseDate: string;
  totalAmount: number | string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  note?: string | null;
};

type Supplier = {
  id: number;
  name: string;
  isActive?: boolean;
};

type CylinderType = {
  id: number;
  name: string;
  weight?: number | string | null;
  isActive?: boolean;
};

type PurchaseItemForm = {
  cylinderTypeId: string;
  quantity: string;
  inventoryStatus: "FILLED" | "EMPTY";
  unitPurchasePrice: string;
};

type ApiResult<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type ToastState = {
  message: string;
  type: ToastType;
};

/* ---------- UI-only helpers (same icon approach as Dashboard) ---------- */

const ICONS: Record<string, string> = {
  receipt:
    "M4 2v20l3-2 3 2 3-2 3 2 3-2 2 2V2l-2 2-3-2-3 2-3-2-3 2z M8 8h8 M8 12h8 M8 16h5",
  box: "M21 8l-9-5-9 5v8l9 5 9-5z M3.3 7L12 12l8.7-5 M12 22V12",
  check: "M20 6L9 17l-5-5",
  rupee: "M6 3h12 M6 8h12 M6 13l8.5 8 M6 13h3a4 4 0 0 0 0-8",
  back: "M19 12H5 M11 6l-6 6 6 6",
  arrow: "M5 12h14 M13 6l6 6 6-6",
  plus: "M12 5v14 M5 12h14",
  trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5",
  alert:
    "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
};

function Icon({ name, size = 20 }: { name: keyof typeof ICONS; size?: number }) {
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

// ---------------------------------------------------------------
// BACKEND / DATA HELPERS: unchanged from the original file.
// ---------------------------------------------------------------

function getToken() {
  return localStorage.getItem("gasflow_token") ?? "";
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Request failed.");
  }

  return result as T;
}

// Only the CSS class names changed here (to match the new design).
function statusClass(status: Purchase["status"]) {
  switch (status) {
    case "RECEIVED":
      return "gf-badge badge-received";
    case "CANCELLED":
      return "gf-badge badge-cancelled";
    case "ORDERED":
      return "gf-badge badge-ordered";
    default:
      return "gf-badge badge-draft";
  }
}

function emptyItem(): PurchaseItemForm {
  return {
    cylinderTypeId: "",
    quantity: "1",
    inventoryStatus: "FILLED",
    unitPurchasePrice: "0",
  };
}

function unwrapList<T>(result: ApiResult<T[]> | T[]): T[] {
  const list = Array.isArray(result) ? result : result.data;

  if (!Array.isArray(list)) {
    throw new Error("Unexpected API response format.");
  }

  return list;
}

function sortNewestFirst(purchases: Purchase[]) {
  return [...purchases].sort(
    (a, b) =>
      new Date(b.purchaseDate).getTime() -
      new Date(a.purchaseDate).getTime(),
  );
}

function formatAmount(value: number | string) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [toast, setToast] = useState<ToastState | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [note, setNote] = useState("");
  const [items, setItems] = useState<PurchaseItemForm[]>([emptyItem()]);
  const [creating, setCreating] = useState(false);

  const [recentPage, setRecentPage] = useState(1);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      setToast({ message, type });
    },
    [],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [purchaseResult, supplierResult, cylinderResult] =
        await Promise.all([
          apiRequest<ApiResult<Purchase[]> | Purchase[]>("/purchases"),
          apiRequest<ApiResult<Supplier[]> | Supplier[]>("/suppliers"),
          apiRequest<ApiResult<CylinderType[]> | CylinderType[]>(
            "/cylinder-types",
          ),
        ]);

      const purchaseList = unwrapList(purchaseResult);
      const supplierList = unwrapList(supplierResult);
      const cylinderList = unwrapList(cylinderResult);

      setPurchases(sortNewestFirst(purchaseList));

      // Only active suppliers should be available for new purchases.
      setSuppliers(
        supplierList.filter((supplier) => supplier.isActive !== false),
      );

      setCylinderTypes(
        cylinderList.filter((cylinder) => cylinder.isActive !== false),
      );

      setRecentPage(1);

      return purchaseList;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Could not load purchase data.";

      setError(errorMessage);
      showToast(errorMessage, "error");

      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Initial loading errors are handled by loadData.
    void loadData().catch(() => {});
  }, [loadData]);

  const updateItem = (
    index: number,
    field: keyof PurchaseItemForm,
    value: string,
  ) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [...current, emptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const createPurchase = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setToast(null);

    if (!supplierId) {
      const text = "Please select a supplier.";
      setError(text);
      showToast(text, "error");
      return;
    }

    if (!suppliers.some((supplier) => supplier.id === Number(supplierId))) {
      const text = "Please select a valid active supplier.";
      setError(text);
      showToast(text, "error");
      return;
    }

    if (cylinderTypes.length === 0) {
      const text = "No active cylinder types are available.";
      setError(text);
      showToast(text, "error");
      return;
    }

    if (!purchaseDate) {
      const text = "Please select a purchase date.";
      setError(text);
      showToast(text, "error");
      return;
    }

    const payloadItems = items.map((item) => ({
      cylinderTypeId: Number(item.cylinderTypeId),
      quantity: Number(item.quantity),
      inventoryStatus: item.inventoryStatus,
      unitPurchasePrice: Number(item.unitPurchasePrice),
    }));

    const invalidItems = payloadItems.some(
      (item) =>
        !Number.isInteger(item.cylinderTypeId) ||
        !cylinderTypes.some(
          (cylinder) => cylinder.id === item.cylinderTypeId,
        ) ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.unitPurchasePrice) ||
        item.unitPurchasePrice < 0,
    );

    if (invalidItems) {
      const text =
        "Select a valid cylinder type and enter a valid quantity and purchase price for every item.";
      setError(text);
      showToast(text, "error");
      return;
    }

    setCreating(true);

    try {
      await apiRequest("/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId: Number(supplierId),
          invoiceNumber: invoiceNumber.trim() || undefined,
          purchaseDate: new Date(
            `${purchaseDate}T12:00:00`,
          ).toISOString(),
          note: note.trim() || undefined,
          items: payloadItems,
        }),
      });

      setInvoiceNumber("");
      setNote("");
      setItems([emptyItem()]);
      setRecentPage(1);

      setMessage("");
      setError("");
      showToast("Purchase created successfully! Status: DRAFT.", "success");

      // Refresh records without replacing the success popup with an empty-list popup.
      try {
        await loadData();
      } catch {
        // The purchase was created successfully even if refreshing the list fails.
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Could not create purchase.";

      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setCreating(false);
    }
  };

  const performAction = async (
    purchase: Purchase,
    action: "receive" | "cancel",
  ) => {
    const actionText = action === "receive" ? "receive" : "cancel";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} purchase #${purchase.id}?`,
    );

    if (!confirmed) return;

    setBusyId(purchase.id);
    setError("");
    setMessage("");
    setToast(null);

    try {
      await apiRequest(`/purchases/${purchase.id}/${action}`, {
        method: "POST",
      });

      showToast(
        action === "receive"
          ? `Purchase #${purchase.id} received successfully!`
          : `Purchase #${purchase.id} cancelled successfully!`,
        "success",
      );

      try {
        await loadData();
      } catch {
        // Preserve the successful action notification.
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Could not ${actionText} purchase.`;

      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setBusyId(null);
    }
  };

  const refreshPurchases = async () => {
    try {
      const list = await loadData();

      if (list.length === 0) {
        showToast(
          "No purchases found. Create your first purchase to get started.",
          "info",
        );
      } else {
        showToast("Purchase records refreshed successfully.", "success");
      }
    } catch {
      // loadData already displays the error notification.
    }
  };

  const totalValue = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.totalAmount || 0),
    0,
  );

  // Show the 10 newest purchases on this page.
  const recentPurchases = purchases.slice(0, PAGE_SIZE);
  const recentTotalPages = Math.max(
    1,
    Math.ceil(recentPurchases.length / PAGE_SIZE),
  );
  const recentStart = (recentPage - 1) * PAGE_SIZE;
  const visibleRecentPurchases = recentPurchases.slice(
    recentStart,
    recentStart + PAGE_SIZE,
  );

  // ---------------------------------------------------------------
  // END OF BACKEND / DATA LOGIC
  // ---------------------------------------------------------------

  /* ---------- Presentation only ---------- */

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pendingCount = purchases.filter(
    (purchase) =>
      purchase.status === "DRAFT" || purchase.status === "ORDERED",
  ).length;

  const receivedCount = purchases.filter(
    (p) => p.status === "RECEIVED",
  ).length;

  return (
    <main className="gf">
      <style>{purchaseStyles}</style>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Hero */}
      <header className="gf-hero">
        <div className="gf-hero-text">
          <span className="gf-hero-date">{todayLabel}</span>
          <h1>Purchase Management</h1>
          <p>Manage supplier orders, cylinder purchases, and incoming stock.</p>
        </div>
        <Link className="gf-hero-btn" to="/">
          <Icon name="back" size={16} />
          Dashboard
        </Link>
      </header>

      {error && (
        <div className="gf-error" role="alert">
          <span className="gf-error-text">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </span>
        </div>
      )}

      {message && (
        <div className="gf-success" role="status">
          {message}
        </div>
      )}

      {/* Stats */}
      <section className="gf-section">
        <div className="gf-grid gf-grid-4">
          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-blue"><Icon name="receipt" /></span>
            </div>
            <div className="gf-stat-label">Total Purchases</div>
            <div className="gf-stat-value">{purchases.length}</div>
          </div>

          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-amber"><Icon name="box" /></span>
            </div>
            <div className="gf-stat-label">Pending Purchases</div>
            <div className="gf-stat-value">{pendingCount}</div>
            <p className="gf-note">Draft or ordered</p>
          </div>

          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-green"><Icon name="check" /></span>
            </div>
            <div className="gf-stat-label">Received Purchases</div>
            <div className="gf-stat-value">{receivedCount}</div>
          </div>

          <div className="gf-card gf-stat">
            <div className="gf-stat-top">
              <span className="gf-icon tone-teal"><Icon name="rupee" /></span>
            </div>
            <div className="gf-stat-label">Total Purchase Value</div>
            <div className="gf-stat-value money">₹{formatAmount(totalValue)}</div>
          </div>
        </div>
      </section>

      {/* Create purchase */}
      <section className="gf-section">
        <div className="gf-section-head">
          <h2>Create Purchase</h2>
        </div>

        <form onSubmit={createPurchase} className="gf-card gf-form-card">
          <div className="gf-form-grid gf-form-grid-4">
            <label className="gf-field">
              <span>Supplier *</span>
              <select
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                required
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} (ID: {supplier.id})
                  </option>
                ))}
              </select>
            </label>

            <label className="gf-field">
              <span>Invoice Number</span>
              <input
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                placeholder="Enter invoice number"
              />
            </label>

            <label className="gf-field">
              <span>Purchase Date *</span>
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                required
              />
            </label>

            <label className="gf-field">
              <span>Note</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note"
              />
            </label>
          </div>

          <div className="gf-items-head">
            <h3>Cylinder Items</h3>
            <span className="gf-note">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="gf-items">
            {items.map((item, index) => (
              <div className="gf-item-row" key={index}>
                <label className="gf-field">
                  <span>Cylinder Type *</span>
                  <select
                    value={item.cylinderTypeId}
                    onChange={(event) =>
                      updateItem(index, "cylinderTypeId", event.target.value)
                    }
                    required
                  >
                    <option value="">Select cylinder type</option>
                    {cylinderTypes.map((cylinder) => (
                      <option key={cylinder.id} value={cylinder.id}>
                        {cylinder.name} (ID: {cylinder.id})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="gf-field">
                  <span>Quantity *</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, "quantity", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="gf-field">
                  <span>Stock Status *</span>
                  <select
                    value={item.inventoryStatus}
                    onChange={(event) =>
                      updateItem(index, "inventoryStatus", event.target.value)
                    }
                  >
                    <option value="FILLED">Filled</option>
                    <option value="EMPTY">Empty</option>
                  </select>
                </label>

                <label className="gf-field">
                  <span>Unit Price (₹) *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPurchasePrice}
                    onChange={(event) =>
                      updateItem(index, "unitPurchasePrice", event.target.value)
                    }
                    required
                  />
                </label>

                <button
                  className="gf-btn-danger gf-item-remove"
                  type="button"
                  disabled={items.length === 1}
                  onClick={() => removeItem(index)}
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Icon name="trash" size={16} />
                  Remove
                </button>
              </div>
            ))}
          </div>

          {cylinderTypes.length === 0 && !loading && (
            <p className="gf-inline-alert">
              No active cylinder types were loaded. Add or activate a cylinder
              type before creating a purchase.
            </p>
          )}

          {suppliers.length === 0 && !loading && (
            <p className="gf-inline-alert">
              No active suppliers are available. Add or reactivate a supplier
              before creating a purchase.
            </p>
          )}

          <div className="gf-form-actions">
            <button
              className="gf-btn-secondary"
              type="button"
              onClick={addItem}
              disabled={loading || cylinderTypes.length === 0}
            >
              <Icon name="plus" size={16} />
              Add Cylinder Item
            </button>

            <button
              className="gf-btn-primary"
              type="submit"
              disabled={
                creating ||
                loading ||
                cylinderTypes.length === 0 ||
                suppliers.length === 0
              }
            >
              <Icon name="check" size={16} />
              {creating ? "Creating..." : "Create Purchase"}
            </button>
          </div>
        </form>
      </section>

      {/* Recent purchases */}
      <section className="gf-section">
        <div className="gf-section-head gf-section-head-split">
          <h2>Recent Purchases</h2>

          <div className="gf-head-actions">
            <Link className="gf-link" to="/purchases/all">
              View All Purchases <Icon name="arrow" size={14} />
            </Link>

            <button
              className="gf-btn-secondary gf-btn-small"
              type="button"
              onClick={() => void refreshPurchases()}
              disabled={loading}
            >
              <Icon name="refresh" size={14} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <>
            <div className="gf-card skeleton-card" />
            <p className="gf-loading-text">Loading purchases…</p>
          </>
        ) : purchases.length === 0 ? (
          <div className="gf-empty">
            <span className="gf-icon tone-blue"><Icon name="receipt" /></span>
            <div>
              <h3>No purchases found</h3>
              <p>
                You haven't recorded any purchases yet. Create your first
                purchase using the form above.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="gf-table-wrap">
              <table className="gf-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Supplier ID</th>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRecentPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="strong">#{purchase.id}</td>
                      <td>{purchase.supplierId}</td>
                      <td>{purchase.invoiceNumber || "—"}</td>
                      <td>
                        {purchase.purchaseDate
                          ? new Date(
                              purchase.purchaseDate,
                            ).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="strong">
                        ₹{formatAmount(purchase.totalAmount)}
                      </td>
                      <td>
                        <span className={statusClass(purchase.status)}>
                          {purchase.status}
                        </span>
                      </td>
                      <td>
                        <div className="gf-row-actions">
                          {purchase.status !== "RECEIVED" &&
                            purchase.status !== "CANCELLED" && (
                              <>
                                <button
                                  className="gf-btn-receive"
                                  type="button"
                                  disabled={busyId === purchase.id}
                                  onClick={() =>
                                    void performAction(purchase, "receive")
                                  }
                                >
                                  {busyId === purchase.id
                                    ? "Processing..."
                                    : "Receive"}
                                </button>

                                <button
                                  className="gf-btn-cancel"
                                  type="button"
                                  disabled={busyId === purchase.id}
                                  onClick={() =>
                                    void performAction(purchase, "cancel")
                                  }
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                          {purchase.status === "RECEIVED" && (
                            <span className="gf-muted-text">Stock received</span>
                          )}
                          {purchase.status === "CANCELLED" && (
                            <span className="gf-muted-text">Cancelled</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="gf-pager">
              <span className="gf-note">
                Showing {recentStart + 1}–
                {Math.min(
                  recentStart + PAGE_SIZE,
                  recentPurchases.length,
                )}{" "}
                of {recentPurchases.length} recent purchases
              </span>

              <div className="gf-head-actions">
                <button
                  className="gf-btn-secondary gf-btn-small"
                  type="button"
                  disabled={recentPage === 1}
                  onClick={() =>
                    setRecentPage((current) => Math.max(1, current - 1))
                  }
                >
                  Previous
                </button>

                <span className="gf-page-label">
                  Page {recentPage} of {recentTotalPages}
                </span>

                <button
                  className="gf-btn-secondary gf-btn-small"
                  type="button"
                  disabled={recentPage >= recentTotalPages}
                  onClick={() =>
                    setRecentPage((current) =>
                      Math.min(recentTotalPages, current + 1),
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
    </main>
  );
}

const purchaseStyles = `
  .gf {
    --ink: #0f172a;
    --text: #334155;
    --muted: #64748b;
    --line: #e5e9f0;
    --bg: #f4f6fb;
    --card: #ffffff;
    --brand: #4f46e5;
    --brand-dark: #4338ca;
    display: block;
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
  .gf *, .gf *::before, .gf *::after { box-sizing: border-box; }
  .gf h1, .gf h2, .gf h3 { margin: 0; color: var(--ink); }
  .gf p { margin: 0; }
  .gf a { text-decoration: none; }

  /* Hero */
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
  .gf-hero::before { width: 260px; height: 260px; right: -70px; top: -120px; }
  .gf-hero::after { width: 160px; height: 160px; right: 120px; bottom: -110px; }
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
  .gf .gf-hero p { margin-top: 6px; color: rgba(255,255,255,.8); }
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

  /* Sections */
  .gf-section { margin-top: 30px; }
  .gf-section-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .gf-section-head-split { justify-content: space-between; flex-wrap: wrap; }
  .gf-section-head h2 { font-size: 18px; font-weight: 750; letter-spacing: -.3px; }
  .gf-head-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }

  /* Grids */
  .gf-grid { display: grid; gap: 16px; }
  .gf-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  /* Cards */
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
  .gf-form-card:hover { transform: none; }

  .gf-stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }
  .gf-stat-label { font-size: 13px; font-weight: 650; color: var(--muted); }
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
  .gf-stat-value.money { font-size: clamp(21px, 1.9vw, 28px); letter-spacing: -.6px; }
  .gf-note { margin-top: 6px; font-size: 12px; color: var(--muted); }

  /* Icons */
  .gf-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }
  .tone-blue   { background: #e0e7ff; color: #4338ca; }
  .tone-green  { background: #dcfce7; color: #15803d; }
  .tone-teal   { background: #ccfbf1; color: #0f766e; }
  .tone-amber  { background: #fef3c7; color: #b45309; }

  /* Links */
  .gf-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 750;
    color: var(--brand);
    transition: gap .15s ease, color .15s ease;
  }
  .gf-link:hover { gap: 7px; color: var(--brand-dark); }

  /* Form */
  .gf-form-card { padding: 24px; }
  .gf-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }
  .gf-form-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  .gf-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .gf-field > span { font-size: 13px; font-weight: 650; color: var(--ink); }
  .gf-field input,
  .gf-field select {
    width: 100%;
    height: 44px;
    padding: 0 14px;
    font: inherit;
    font-weight: 400;
    color: var(--ink);
    background: #f8fafc;
    border: 1px solid var(--line);
    border-radius: 11px;
    transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
  }
  .gf-field select { cursor: pointer; }
  .gf-field input::placeholder { color: #94a3b8; }
  .gf-field input:hover,
  .gf-field select:hover { border-color: #cbd5e1; }
  .gf-field input:focus,
  .gf-field select:focus {
    outline: none;
    background: #fff;
    border-color: var(--brand);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, .15);
  }

  .gf-items-head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 26px 0 12px;
    padding-top: 20px;
    border-top: 1px solid #eef1f6;
  }
  .gf-items-head h3 { font-size: 15px; font-weight: 750; }
  .gf-items-head .gf-note { margin-top: 0; }

  .gf-items { display: grid; gap: 12px; }
  .gf-item-row {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, .8fr) minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 14px;
    align-items: end;
    padding: 16px;
    background: #fafbff;
    border: 1px solid #eef1f6;
    border-left: 4px solid #6366f1;
    border-radius: 12px;
  }

  .gf-inline-alert {
    margin-top: 14px;
    padding: 12px 14px;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 11px;
  }

  .gf-form-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
  }

  /* Buttons */
  .gf-btn-primary,
  .gf-btn-secondary,
  .gf-btn-danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 11px 18px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    border-radius: 11px;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease;
  }
  .gf-btn-primary {
    color: #fff;
    background: var(--brand);
    border: 0;
    box-shadow: 0 8px 18px rgba(79, 70, 229, .25);
  }
  .gf-btn-primary:hover:not(:disabled) { background: var(--brand-dark); }
  .gf-btn-secondary {
    color: #3b4a73;
    background: #fff;
    border: 1px solid var(--line);
  }
  .gf-btn-secondary:hover:not(:disabled) { background: #eef0ff; border-color: #c7cdf5; }
  .gf-btn-danger {
    color: #b91c1c;
    background: #fff;
    border: 1px solid #fecaca;
  }
  .gf-btn-danger:hover:not(:disabled) { background: #fef2f2; border-color: #fca5a5; }
  .gf-btn-small { padding: 8px 12px; font-size: 12px; }
  .gf-item-remove { height: 44px; }
  .gf-btn-primary:disabled,
  .gf-btn-secondary:disabled,
  .gf-btn-danger:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
  .gf-btn-primary:focus-visible,
  .gf-btn-secondary:focus-visible,
  .gf-btn-danger:focus-visible,
  .gf-btn-receive:focus-visible,
  .gf-btn-cancel:focus-visible,
  .gf-hero-btn:focus-visible {
    outline: 3px solid #a5b4fc;
    outline-offset: 2px;
  }

  /* Table */
  .gf-table-wrap {
    overflow-x: auto;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }
  .gf-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
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
  .gf-table td.strong { color: var(--ink); font-weight: 700; font-variant-numeric: tabular-nums; }

  .gf-badge {
    display: inline-flex;
    padding: 4px 10px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .3px;
    white-space: nowrap;
    border-radius: 999px;
  }
  .badge-draft { color: #475569; background: #e2e8f0; }
  .badge-ordered { color: #3730a3; background: #e0e7ff; }
  .badge-received { color: #047857; background: #d1fae5; }
  .badge-cancelled { color: #991b1b; background: #fee2e2; }

  .gf-row-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  .gf-btn-receive,
  .gf-btn-cancel {
    padding: 7px 12px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    border-radius: 9px;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease;
  }
  .gf-btn-receive { color: #fff; background: #16a34a; border: 1px solid #16a34a; }
  .gf-btn-receive:hover:not(:disabled) { background: #15803d; border-color: #15803d; }
  .gf-btn-cancel { color: #b91c1c; background: #fff; border: 1px solid #fecaca; }
  .gf-btn-cancel:hover:not(:disabled) { background: #fef2f2; border-color: #fca5a5; }
  .gf-btn-receive:disabled,
  .gf-btn-cancel:disabled { opacity: .55; cursor: not-allowed; }
  .gf-muted-text { color: #94a3b8; font-weight: 500; }

  .gf-pager {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 14px;
  }
  .gf-pager .gf-note { margin-top: 0; }
  .gf-page-label { font-size: 12px; font-weight: 700; color: var(--ink); }

  /* Empty */
  .gf-empty {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px;
    background: var(--card);
    border: 1px dashed #cfd8e6;
    border-radius: 16px;
  }
  .gf-empty h3 { font-size: 15px; font-weight: 750; margin-bottom: 2px; }
  .gf-empty p { color: var(--muted); }

  /* Alerts */
  .gf-error {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    padding: 14px 16px;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
  }
  .gf-error-text { display: flex; align-items: flex-start; gap: 10px; white-space: pre-line; }
  .gf-error-text svg { flex-shrink: 0; margin-top: 2px; }
  .gf-success {
    margin-top: 16px;
    padding: 14px 16px;
    color: #047857;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 12px;
  }

  /* Loading skeleton */
  .skeleton-card {
    height: 180px;
    background: linear-gradient(90deg, #e9edf5 25%, #f4f6fb 50%, #e9edf5 75%);
    background-size: 200% 100%;
    animation: gf-shimmer 1.3s infinite linear;
    border: 0;
    box-shadow: none;
  }
  .skeleton-card:hover { transform: none; box-shadow: none; }
  .gf-loading-text { margin-top: 18px; text-align: center; color: var(--muted); font-weight: 600; }
  @keyframes gf-shimmer { to { background-position: -200% 0; } }

  /* Responsive */
  @media (max-width: 1180px) {
    .gf-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gf-form-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gf-item-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gf-item-remove { grid-column: 1 / -1; justify-self: start; }
  }
  @media (max-width: 640px) {
    .gf { padding: 14px; }
    .gf-hero { padding: 22px 20px; border-radius: 16px; }
    .gf-hero-btn { display: none; }
    .gf-grid-4,
    .gf-form-grid-4,
    .gf-item-row { grid-template-columns: 1fr; gap: 12px; }
    .gf-section { margin-top: 24px; }
    .gf-form-card { padding: 18px; }
    .gf-form-actions > * { flex: 1 1 100%; }
    .gf-table th, .gf-table td { padding: 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gf-card, .gf-link, .gf-hero-btn, .gf-btn-primary, .gf-btn-secondary, .gf-btn-danger,
    .gf-btn-receive, .gf-btn-cancel, .gf-field input, .gf-field select, .skeleton-card {
      transition: none; animation: none;
    }
  }
`;
