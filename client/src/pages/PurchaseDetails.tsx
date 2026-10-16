
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Toast, { type ToastType } from "../components/Toast";

const API = "http://localhost:5000/api";

type PurchaseStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
type InventoryStatus = "FILLED" | "EMPTY";

type Supplier = {
  id: number;
  name: string;
  mobile?: string | null;
  isActive?: boolean;
};

type CylinderType = {
  id: number;
  name: string;
  weight?: number | string | null;
  isActive?: boolean;
};

type PurchaseItem = {
  id?: number;
  cylinderTypeId: number;
  quantity: number;
  inventoryStatus: InventoryStatus;
  unitPurchasePrice: number | string;
  cylinderType?: CylinderType;
  totalPrice?: number | string;
};

type Purchase = {
  id: number;
  supplierId: number;
  invoiceNumber?: string | null;
  purchaseDate: string;
  totalAmount: number | string;
  status: PurchaseStatus;
  note?: string | null;
  supplier?: Supplier;
  items?: PurchaseItem[];
  createdAt?: string;
  updatedAt?: string;
};

type ApiResult<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type EditableItem = {
  id?: number;
  cylinderTypeId: string;
  quantity: string;
  inventoryStatus: InventoryStatus;
  unitPurchasePrice: string;
};

type ToastState = {
  message: string;
  type: ToastType;
};

function getToken() {
  return localStorage.getItem("gasflow_token") ?? "";
}

function isAdminUser(): boolean {
  // Check the user object saved by your login flow.
  try {
    const savedUser = localStorage.getItem("gasflow_user");

    if (savedUser) {
      const user = JSON.parse(savedUser) as {
        role?: string;
        user?: { role?: string };
      };

      const role = user.role ?? user.user?.role;

      if (role) {
        return role.toUpperCase() === "ADMIN";
      }
    }
  } catch {
    // Try reading the role from the JWT payload below.
  }

  // Fallback if your JWT includes a role claim.
  try {
    const token = getToken();
    const payload = token.split(".")[1];

    if (!payload) return false;

    const base64 = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = JSON.parse(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))
    ) as {
      role?: string;
      user?: { role?: string };
    };

    const role = decoded.role ?? decoded.user?.role;

    return role?.toUpperCase() === "ADMIN";
  } catch {
    return false;
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let result: ApiResult<T> | T | null = null;

  if (text) {
    try {
      result = JSON.parse(text) as ApiResult<T> | T;
    } catch {
      if (response.ok) {
        throw new Error("The server returned an unexpected response.");
      }
    }
  }

  if (!response.ok) {
    const errorResult = result as ApiResult<T> | null;

    throw new Error(
      errorResult?.message ??
        (response.status === 401
          ? "Your session has expired. Please log in again."
          : response.status === 403
            ? "You are not authorized to perform this action."
            : `Request failed (${response.status}).`)
    );
  }

  const wrapped = result as ApiResult<T> | null;

  if (wrapped && typeof wrapped === "object" && "success" in wrapped) {
    if (wrapped.success === false) {
      throw new Error(wrapped.message ?? "The request failed.");
    }

    if ("data" in wrapped && wrapped.data !== undefined) {
      return wrapped.data as T;
    }
  }

  return result as T;
}

function unwrapList<T>(result: ApiResult<T[]> | T[]): T[] {
  const list = Array.isArray(result) ? result : result.data;

  if (!Array.isArray(list)) {
    throw new Error("Unexpected API response format.");
  }

  return list;
}

function unwrapPurchase(
  result: ApiResult<Purchase> | Purchase
): Purchase {
  if ("data" in result && result.data) {
    return result.data;
  }

  return result as Purchase;
}

function formatAmount(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function toDateInput(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function statusClass(status: PurchaseStatus) {
  return `pd-status pd-status-${status.toLowerCase()}`;
}

function emptyEditableItem(): EditableItem {
  return {
    cylinderTypeId: "",
    quantity: "1",
    inventoryStatus: "FILLED",
    unitPurchasePrice: "0",
  };
}

function purchaseItemsToForm(items: PurchaseItem[] = []): EditableItem[] {
  if (items.length === 0) return [emptyEditableItem()];

  return items.map((item) => ({
    id: item.id,
    cylinderTypeId: String(item.cylinderTypeId),
    quantity: String(item.quantity),
    inventoryStatus: item.inventoryStatus,
    unitPurchasePrice: String(item.unitPurchasePrice),
  }));
}

export default function PurchaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<EditableItem[]>([
    emptyEditableItem(),
  ]);

  const admin = useMemo(() => isAdminUser(), []);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
  }, []);

  const loadDetails = useCallback(async () => {
    if (!id || !/^\d+$/.test(id)) {
      setError("Invalid purchase ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [purchaseResult, supplierResult, cylinderResult] =
        await Promise.all([
          apiRequest<ApiResult<Purchase> | Purchase>(
            `/purchases/${id}`
          ),
          apiRequest<ApiResult<Supplier[]> | Supplier[]>(
            "/suppliers"
          ),
          apiRequest<ApiResult<CylinderType[]> | CylinderType[]>(
            "/cylinder-types"
          ),
        ]);

      const purchaseData = unwrapPurchase(purchaseResult);
      const supplierList = unwrapList(supplierResult);
      const cylinderList = unwrapList(cylinderResult);

      setPurchase(purchaseData);
      setSuppliers(supplierList);
      setCylinderTypes(cylinderList);

      setSupplierId(String(purchaseData.supplierId));
      setInvoiceNumber(purchaseData.invoiceNumber ?? "");
      setPurchaseDate(toDateInput(purchaseData.purchaseDate));
      setNote(purchaseData.note ?? "");
      setItems(purchaseItemsToForm(purchaseData.items));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load purchase.";

      setError(message);

      if (message.toLowerCase().includes("log in")) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const updateItem = (
    index: number,
    field: keyof EditableItem,
    value: string
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [...current, emptyEditableItem()]);
  };

  const removeItem = (index: number) => {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const cancelEditing = () => {
    if (!purchase) return;

    setSupplierId(String(purchase.supplierId));
    setInvoiceNumber(purchase.invoiceNumber ?? "");
    setPurchaseDate(toDateInput(purchase.purchaseDate));
    setNote(purchase.note ?? "");
    setItems(purchaseItemsToForm(purchase.items));
    setEditing(false);
    setError("");
  };

  const saveChanges = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!admin) {
      setError("Only administrators can edit purchases.");
      return;
    }

    if (!purchase) return;

    if (!supplierId || !purchaseDate) {
      setError("Supplier and purchase date are required.");
      return;
    }

    const payloadItems = items.map((item) => ({
      ...(item.id !== undefined ? { id: item.id } : {}),
      cylinderTypeId: Number(item.cylinderTypeId),
      quantity: Number(item.quantity),
      inventoryStatus: item.inventoryStatus,
      unitPurchasePrice: Number(item.unitPurchasePrice),
    }));

    const invalidItems = payloadItems.some(
      (item) =>
        !Number.isInteger(item.cylinderTypeId) ||
        !cylinderTypes.some(
          (cylinder) => cylinder.id === item.cylinderTypeId
        ) ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.unitPurchasePrice) ||
        item.unitPurchasePrice < 0
    );

    if (invalidItems || payloadItems.length === 0) {
      setError(
        "Select a valid cylinder type and enter a valid quantity and unit price for every item."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedResult = await apiRequest<
        ApiResult<Purchase> | Purchase
      >(`/purchases/${purchase.id}`, {
        method: "PUT",
        body: JSON.stringify({
          supplierId: Number(supplierId),
          invoiceNumber: invoiceNumber.trim() || null,
          purchaseDate: new Date(
            `${purchaseDate}T12:00:00`
          ).toISOString(),
          note: note.trim() || null,
          items: payloadItems,
        }),
      });

      const updatedPurchase = unwrapPurchase(updatedResult);

      setPurchase(updatedPurchase);
      setSupplierId(String(updatedPurchase.supplierId));
      setInvoiceNumber(updatedPurchase.invoiceNumber ?? "");
      setPurchaseDate(toDateInput(updatedPurchase.purchaseDate));
      setNote(updatedPurchase.note ?? "");
      setItems(purchaseItemsToForm(updatedPurchase.items));
      setEditing(false);

      showToast("Purchase updated successfully.", "success");

      // Reload so the supplier and item relationships reflect server data.
      await loadDetails();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update purchase.";

      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deletePurchase = async () => {
    if (!admin || !purchase) return;

    const confirmed = window.confirm(
      `Delete purchase #${purchase.id}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      await apiRequest(`/purchases/${purchase.id}`, {
        method: "DELETE",
      });

      showToast("Purchase deleted successfully.", "success");
      navigate("/purchases/all");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete purchase.";

      setError(message);
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const supplier =
    suppliers.find((item) => item.id === purchase?.supplierId) ??
    purchase?.supplier;

  const cylinderTypeName = (item: PurchaseItem) =>
    item.cylinderType?.name ??
    cylinderTypes.find(
      (cylinder) => cylinder.id === item.cylinderTypeId
    )?.name ??
    `Cylinder Type #${item.cylinderTypeId}`;

  const displayedItems = purchase?.items ?? [];

  const calculatedTotal = displayedItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity) * Number(item.unitPurchasePrice),
    0
  );

  if (loading) {
    return (
      <main className="pd-page">
        <style>{purchaseDetailsStyles}</style>
        <div className="pd-state">
          <span className="pd-spinner" />
          <p>Loading purchase details...</p>
        </div>
      </main>
    );
  }

  if (!purchase) {
    return (
      <main className="pd-page">
        <style>{purchaseDetailsStyles}</style>

        <Link to="/purchases/all" className="pd-back">
          ← Back to Purchases
        </Link>

        <div className="pd-state pd-state-error">
          <h2>Purchase not found</h2>
          <p>{error || "This purchase could not be found."}</p>
          <button
            type="button"
            className="pd-button pd-button-primary"
            onClick={() => void loadDetails()}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pd-page">
      <style>{purchaseDetailsStyles}</style>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="pd-hero">
        <div>
          <Link to="/purchases/all" className="pd-back">
            ← Back to Purchases
          </Link>

          <p className="pd-eyebrow">GASFLOW / PURCHASE MANAGEMENT</p>
          <h1>Purchase #{purchase.id}</h1>
          <p className="pd-subtitle">
            View purchase information, supplier details, and purchased
            cylinder items.
          </p>
        </div>

        <span className={statusClass(purchase.status)}>
          {purchase.status}
        </span>
      </header>

      {error && (
        <div className="pd-alert" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <section className="pd-summary-grid">
        <article className="pd-summary-card">
          <span className="pd-summary-label">Purchase Amount</span>
          <strong>₹{formatAmount(purchase.totalAmount)}</strong>
          <span className="pd-summary-hint">Recorded purchase value</span>
        </article>

        <article className="pd-summary-card">
          <span className="pd-summary-label">Total Items</span>
          <strong>{displayedItems.length}</strong>
          <span className="pd-summary-hint">Cylinder item types</span>
        </article>

        <article className="pd-summary-card">
          <span className="pd-summary-label">Total Quantity</span>
          <strong>
            {displayedItems.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0
            )}
          </strong>
          <span className="pd-summary-hint">Cylinders in this purchase</span>
        </article>
      </section>

      <section className="pd-card">
        <div className="pd-section-heading">
          <div>
            <h2>Purchase Information</h2>
            <p>Invoice, supplier, date, and status</p>
          </div>

          <div className="pd-actions">
            {admin && !editing && (
              <>
                <button
                  type="button"
                  className="pd-button pd-button-primary"
                  onClick={() => {
                    setError("");
                    setEditing(true);
                  }}
                >
                  ✎ Edit Purchase
                </button>

                <button
                  type="button"
                  className="pd-button pd-button-danger"
                  onClick={() => void deletePurchase()}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Purchase"}
                </button>
              </>
            )}
          </div>
        </div>

        {!editing ? (
          <div className="pd-info-grid">
            <Info label="Purchase ID" value={`#${purchase.id}`} />
            <Info
              label="Invoice Number"
              value={purchase.invoiceNumber || "Not provided"}
            />
            <Info
              label="Purchase Date"
              value={formatDate(purchase.purchaseDate)}
            />
            <Info
              label="Supplier"
              value={supplier?.name ?? `Supplier #${purchase.supplierId}`}
            />
            <Info
              label="Supplier ID"
              value={String(purchase.supplierId)}
            />
            <Info
              label="Supplier Mobile"
              value={supplier?.mobile || "Not available"}
            />
            <Info
              label="Status"
              value={purchase.status}
            />
            <Info
              label="Note"
              value={purchase.note || "No note added"}
            />
            <Info
              label="Created At"
              value={formatDate(purchase.createdAt)}
            />
            <Info
              label="Last Updated"
              value={formatDate(purchase.updatedAt)}
            />
          </div>
        ) : (
          <form className="pd-edit-form" onSubmit={saveChanges}>
            <div className="pd-form-grid">
              <label className="pd-field">
                <span>Supplier *</span>
                <select
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                  required
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (ID: {item.id})
                    </option>
                  ))}
                </select>
              </label>

              <label className="pd-field">
                <span>Invoice Number</span>
                <input
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="Enter invoice number"
                />
              </label>

              <label className="pd-field">
                <span>Purchase Date *</span>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(event) => setPurchaseDate(event.target.value)}
                  required
                />
              </label>

              <label className="pd-field">
                <span>Note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Add a note"
                />
              </label>
            </div>

            <div className="pd-items-heading">
              <div>
                <h3>Purchased Cylinder Items</h3>
                <p>Edit cylinder type, quantity, stock status, or price.</p>
              </div>

              <button
                type="button"
                className="pd-button pd-button-secondary"
                onClick={addItem}
              >
                + Add Item
              </button>
            </div>

            <div className="pd-edit-items">
              {items.map((item, index) => (
                <div className="pd-edit-item" key={item.id ?? `new-${index}`}>
                  <label className="pd-field">
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
                          {cylinder.name}
                          {cylinder.weight
                            ? ` (${cylinder.weight} kg)`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="pd-field">
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

                  <label className="pd-field">
                    <span>Stock Status *</span>
                    <select
                      value={item.inventoryStatus}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "inventoryStatus",
                          event.target.value
                        )
                      }
                    >
                      <option value="FILLED">Filled</option>
                      <option value="EMPTY">Empty</option>
                    </select>
                  </label>

                  <label className="pd-field">
                    <span>Unit Purchase Price (₹) *</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPurchasePrice}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "unitPurchasePrice",
                          event.target.value
                        )
                      }
                      required
                    />
                  </label>

                  <button
                    type="button"
                    className="pd-remove-item"
                    disabled={items.length === 1}
                    onClick={() => removeItem(index)}
                  >
                    Remove Item
                  </button>
                </div>
              ))}
            </div>

            <div className="pd-edit-total">
              <span>Estimated total from edited items</span>
              <strong>
                ₹
                {formatAmount(
                  items.reduce(
                    (sum, item) =>
                      sum +
                      Number(item.quantity || 0) *
                        Number(item.unitPurchasePrice || 0),
                    0
                  )
                )}
              </strong>
            </div>

            <p className="pd-form-note">
              The backend should validate the purchase status and recalculate
              the final total from the saved items.
            </p>

            <div className="pd-form-actions">
              <button
                type="button"
                className="pd-button pd-button-secondary"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="pd-button pd-button-primary"
                disabled={saving}
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {!admin && (
          <p className="pd-readonly-note">
            You have read-only access to this purchase.
          </p>
        )}
      </section>

      <section className="pd-card">
        <div className="pd-section-heading">
          <div>
            <h2>Purchased Cylinder Items</h2>
            <p>Line-by-line breakdown of this purchase</p>
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="pd-empty">
            No purchase items were returned by the API.
          </div>
        ) : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Cylinder Type</th>
                  <th>Stock Status</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>

              <tbody>
                {displayedItems.map((item, index) => (
                  <tr key={item.id ?? `${item.cylinderTypeId}-${index}`}>
                    <td>
                      <strong>{cylinderTypeName(item)}</strong>
                      <span className="pd-cell-subtext">
                        Cylinder ID: {item.cylinderTypeId}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`pd-stock-badge pd-stock-${item.inventoryStatus.toLowerCase()}`}
                      >
                        {item.inventoryStatus}
                      </span>
                    </td>
                    <td>{item.quantity}</td>
                    <td>₹{formatAmount(item.unitPurchasePrice)}</td>
                    <td className="pd-line-total">
                      ₹
                      {formatAmount(
                        item.totalPrice ??
                          Number(item.quantity) *
                            Number(item.unitPurchasePrice)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={4}>Calculated items total</td>
                  <td className="pd-line-total">
                    ₹{formatAmount(calculatedTotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4}>Recorded purchase total</td>
                  <td className="pd-grand-total">
                    ₹{formatAmount(purchase.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <footer className="pd-footer">
        <span>GasFlow · Purchase #{purchase.id}</span>
        <Link to="/purchases/all">Return to all purchases →</Link>
      </footer>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="pd-info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const purchaseDetailsStyles = `
  .pd-page {
    min-height: 100vh;
    padding: clamp(16px, 2.5vw, 34px);
    background: #f4f6fb;
    color: #334155;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.55;
  }

  .pd-page *, .pd-page *::before, .pd-page *::after {
    box-sizing: border-box;
  }

  .pd-page h1, .pd-page h2, .pd-page h3, .pd-page p {
    margin-top: 0;
  }

  .pd-page h1, .pd-page h2, .pd-page h3 {
    color: #0f172a;
  }

  .pd-page button, .pd-page input, .pd-page select, .pd-page textarea {
    font: inherit;
  }

  .pd-page button:focus-visible, .pd-page a:focus-visible {
    outline: 3px solid #a5b4fc;
    outline-offset: 3px;
  }

  .pd-hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 22px;
    padding: 28px;
    margin-bottom: 22px;
    border-radius: 18px;
    background: linear-gradient(120deg, #1e1b4b, #3730a3 58%, #4f46e5);
    box-shadow: 0 15px 32px rgba(55, 48, 163, .16);
    color: white;
  }

  .pd-hero h1 {
    margin: 10px 0 7px;
    color: white;
    font-size: clamp(25px, 3vw, 34px);
    font-weight: 800;
    letter-spacing: -.7px;
  }

  .pd-subtitle {
    margin-bottom: 0;
    color: #dbeafe;
  }

  .pd-back {
    display: inline-flex;
    color: #dbeafe;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
  }

  .pd-back:hover { color: white; }

  .pd-eyebrow {
    margin: 22px 0 0;
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .14em;
  }

  .pd-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
  }

  .pd-hero > .pd-status { margin-top: 8px; }

  .pd-status-draft { background: #fff7ed; color: #c2410c; }
  .pd-status-ordered { background: #eff6ff; color: #1d4ed8; }
  .pd-status-received { background: #dcfce7; color: #166534; }
  .pd-status-cancelled { background: #fee2e2; color: #b91c1c; }

  .pd-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 22px;
  }

  .pd-summary-card {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 21px;
    border: 1px solid #e5e9f0;
    border-radius: 14px;
    background: white;
  }

  .pd-summary-label {
    color: #64748b;
    font-size: 12px;
    font-weight: 650;
  }

  .pd-summary-card strong {
    color: #0f172a;
    font-size: 27px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .pd-summary-hint {
    color: #94a3b8;
    font-size: 11px;
  }

  .pd-card {
    padding: 25px;
    margin-bottom: 22px;
    border: 1px solid #e5e9f0;
    border-radius: 15px;
    background: white;
    box-shadow: 0 3px 12px rgba(15, 23, 42, .025);
  }

  .pd-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 22px;
  }

  .pd-section-heading h2 {
    margin-bottom: 5px;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -.3px;
  }

  .pd-section-heading p {
    margin-bottom: 0;
    color: #94a3b8;
    font-size: 11px;
  }

  .pd-actions, .pd-form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  .pd-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 39px;
    padding: 9px 13px;
    border: 1px solid transparent;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
    transition: background .15s ease, transform .15s ease;
  }

  .pd-button:hover:not(:disabled) { transform: translateY(-1px); }
  .pd-button:disabled { opacity: .55; cursor: not-allowed; }

  .pd-button-primary { background: #4f46e5; color: white; }
  .pd-button-primary:hover:not(:disabled) { background: #4338ca; }

  .pd-button-secondary {
    border-color: #e2e8f0;
    background: white;
    color: #334155;
  }

  .pd-button-secondary:hover:not(:disabled) { background: #f8fafc; }

  .pd-button-danger { background: #fee2e2; color: #b91c1c; }
  .pd-button-danger:hover:not(:disabled) { background: #fecaca; }

  .pd-info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 26px;
  }

  .pd-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: 15px 0;
    border-bottom: 1px solid #edf0f5;
  }

  .pd-info span {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 650;
  }

  .pd-info strong {
    color: #334155;
    font-size: 13px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .pd-edit-form { display: flex; flex-direction: column; gap: 22px; }

  .pd-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 17px;
  }

  .pd-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
  }

  .pd-field > span {
    color: #334155;
    font-size: 12px;
    font-weight: 750;
  }

  .pd-field input, .pd-field select, .pd-field textarea {
    width: 100%;
    min-height: 42px;
    padding: 10px 12px;
    border: 1px solid #dfe5ef;
    border-radius: 9px;
    background: white;
    color: #334155;
    font-size: 12px;
    outline: none;
  }

  .pd-field textarea { resize: vertical; }

  .pd-field input:focus, .pd-field select:focus, .pd-field textarea:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, .1);
  }

  .pd-items-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }

  .pd-items-heading h3 {
    margin-bottom: 4px;
    font-size: 14px;
  }

  .pd-items-heading p {
    margin-bottom: 0;
    color: #94a3b8;
    font-size: 11px;
  }

  .pd-edit-items { display: flex; flex-direction: column; gap: 13px; }

  .pd-edit-item {
    display: grid;
    grid-template-columns: 1.4fr .7fr .8fr 1fr auto;
    align-items: end;
    gap: 12px;
    padding: 15px;
    border: 1px solid #e8edf4;
    border-radius: 11px;
    background: #fafbfe;
  }

  .pd-remove-item {
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid #fecaca;
    border-radius: 8px;
    background: #fff1f2;
    color: #b91c1c;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  .pd-remove-item:disabled { opacity: .45; cursor: not-allowed; }

  .pd-edit-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding: 15px;
    border-radius: 10px;
    background: #f5f3ff;
    color: #4338ca;
    font-size: 12px;
  }

  .pd-edit-total strong { font-size: 19px; }

  .pd-form-note, .pd-readonly-note {
    margin-bottom: 0;
    color: #64748b;
    font-size: 11px;
    line-height: 1.6;
  }

  .pd-form-actions {
    justify-content: flex-end;
    padding-top: 4px;
  }

  .pd-table-wrap {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #edf0f5;
    border-radius: 10px;
  }

  .pd-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    white-space: nowrap;
  }

  .pd-table th {
    padding: 13px 15px;
    background: #f8fafc;
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
  }

  .pd-table td {
    padding: 14px 15px;
    border-top: 1px solid #edf0f5;
    color: #475569;
    font-size: 12px;
  }

  .pd-table td strong { color: #334155; }

  .pd-cell-subtext {
    display: block;
    margin-top: 3px;
    color: #94a3b8;
    font-size: 10px;
  }

  .pd-stock-badge {
    display: inline-block;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
  }

  .pd-stock-filled { background: #dcfce7; color: #166534; }
  .pd-stock-empty { background: #fef3c7; color: #92400e; }

  .pd-line-total { font-weight: 750; color: #334155 !important; }

  .pd-table tfoot td {
    background: #fafbfe;
    font-weight: 700;
  }

  .pd-grand-total { color: #4338ca !important; font-size: 14px !important; }

  .pd-empty, .pd-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 55px 20px;
    color: #64748b;
    text-align: center;
  }

  .pd-state h2 { margin-bottom: 0; }
  .pd-state p { margin-bottom: 0; }

  .pd-state-error {
    margin-top: 22px;
    border: 1px solid #e5e9f0;
    border-radius: 15px;
    background: white;
  }

  .pd-spinner {
    width: 25px;
    height: 25px;
    border: 3px solid #e0e7ff;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: pd-spin .7s linear infinite;
  }

  @keyframes pd-spin { to { transform: rotate(360deg); } }

  .pd-alert {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 15px;
    margin-bottom: 18px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fef2f2;
    color: #b91c1c;
    font-size: 12px;
  }

  .pd-alert button {
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 19px;
    cursor: pointer;
  }

  .pd-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 4px 2px 12px;
    color: #94a3b8;
    font-size: 11px;
  }

  .pd-footer a {
    color: #4f46e5;
    font-weight: 750;
    text-decoration: none;
  }

  @media (max-width: 900px) {
    .pd-edit-item {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pd-remove-item { grid-column: 1 / -1; }
  }

  @media (max-width: 600px) {
    .pd-hero { flex-direction: column; padding: 22px; }
    .pd-summary-grid { grid-template-columns: 1fr; gap: 10px; }
    .pd-summary-card { padding: 16px; }
    .pd-card { padding: 17px; }
    .pd-info-grid, .pd-form-grid { grid-template-columns: 1fr; }
    .pd-section-heading { align-items: flex-start; }
    .pd-actions { width: 100%; }
    .pd-actions .pd-button { flex: 1; }
    .pd-edit-item { grid-template-columns: 1fr; }
    .pd-remove-item { grid-column: auto; }
    .pd-footer { align-items: flex-start; flex-direction: column; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pd-spinner { animation: none; }
    .pd-button { transition: none; }
  }
`;
