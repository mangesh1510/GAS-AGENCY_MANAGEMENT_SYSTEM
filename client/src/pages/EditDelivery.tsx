
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

type Delivery = {
  id: number;
  customerId: number;
  cylinderTypeId: number;
  quantity: number;
  unitPrice: number | string;
  totalAmount: number | string;
  deliveryDate: string;
  note: string | null;
};

type Customer = {
  id: number;
  name: string;
  mobile?: string;
  isActive?: boolean;
};

type CylinderType = {
  id: number;
  name?: string;
  cylinderTypeName?: string;
  capacityKg?: number | string;
  sellingPrice: number | string;
  isActive?: boolean;
};

function EditDelivery() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [cylinderTypeId, setCylinderTypeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalAmount = Number(quantity) * Number(unitPrice);

  const formatCurrency = (value: number | string) =>
    `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getToken = () => localStorage.getItem("gasflow_token");

  const authHeaders = (): HeadersInit => {
    const token = getToken();

    if (!token) {
      throw new Error("Authentication required. Please log in again.");
    }

    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
          throw new Error("Invalid delivery ID.");
        }

        const headers = authHeaders();

        const [deliveryRes, customersRes, cylinderTypesRes] =
          await Promise.all([
            fetch(`${API_URL}/deliveries/${id}`, { headers }),
            fetch(`${API_URL}/customers`, { headers }),
            fetch(`${API_URL}/cylinder-types`, { headers }),
          ]);

        const [deliveryJson, customersJson, cylinderTypesJson] =
          await Promise.all([
            deliveryRes.json(),
            customersRes.json(),
            cylinderTypesRes.json(),
          ]);

        if (!deliveryRes.ok) {
          throw new Error(
            deliveryJson.message ||
              (deliveryRes.status === 401
                ? "Your session has expired. Please log in again."
                : "Failed to fetch delivery details.")
          );
        }

        if (!customersRes.ok) {
          throw new Error(customersJson.message || "Failed to fetch customers.");
        }

        if (!cylinderTypesRes.ok) {
          throw new Error(
            cylinderTypesJson.message || "Failed to fetch cylinder types."
          );
        }

        const currentDelivery = deliveryJson.data as Delivery | undefined;
        const customerList = (customersJson.data ?? []) as Customer[];
        const cylinderTypeList =
          (cylinderTypesJson.data ?? []) as CylinderType[];

        if (!currentDelivery) {
          throw new Error("Delivery not found.");
        }

        if (cancelled) return;

        setDelivery(currentDelivery);

        setCustomers(
          customerList.filter(
            (customer) =>
              customer.isActive !== false ||
              customer.id === currentDelivery.customerId
          )
        );

        setCylinderTypes(
          cylinderTypeList.filter(
            (type) =>
              type.isActive !== false ||
              type.id === currentDelivery.cylinderTypeId
          )
        );

        setCustomerId(String(currentDelivery.customerId));
        setCylinderTypeId(String(currentDelivery.cylinderTypeId));
        setQuantity(String(currentDelivery.quantity));
        setUnitPrice(String(Number(currentDelivery.unitPrice)));

        const parsedDate = new Date(currentDelivery.deliveryDate);

        if (!Number.isNaN(parsedDate.getTime())) {
          const localDate = new Date(
            parsedDate.getTime() -
              parsedDate.getTimezoneOffset() * 60_000
          );

          setDeliveryDate(localDate.toISOString().slice(0, 16));
        }

        setNote(currentDelivery.note ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load delivery."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCylinderTypeChange = (value: string) => {
    setCylinderTypeId(value);

    const selectedType = cylinderTypes.find(
      (type) => String(type.id) === value
    );

    if (selectedType) {
      setUnitPrice(String(Number(selectedType.sellingPrice)));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!id || !customerId || !cylinderTypeId) {
      setError("Please select a customer and cylinder type.");
      return;
    }

    const quantityNumber = Number(quantity);
    const unitPriceNumber = Number(unitPrice);
    const calculatedTotal = quantityNumber * unitPriceNumber;

    if (!Number.isInteger(quantityNumber) || quantityNumber <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (
      unitPrice.trim() === "" ||
      !Number.isFinite(unitPriceNumber) ||
      unitPriceNumber < 0
    ) {
      setError("Please enter a valid unit price.");
      return;
    }

    if (
      !Number.isFinite(calculatedTotal) ||
      Math.abs(calculatedTotal - Number(calculatedTotal.toFixed(2))) >= 0.000001
    ) {
      setError("The delivery total must be valid to two decimal places.");
      return;
    }

    if (deliveryDate && Number.isNaN(new Date(deliveryDate).getTime())) {
      setError("Please enter a valid delivery date.");
      return;
    }

    try {
      setSaving(true);

      const headers = authHeaders();

      const payload = {
        customerId: Number(customerId),
        cylinderTypeId: Number(cylinderTypeId),
        quantity: quantityNumber,
        unitPrice: unitPriceNumber,
        ...(deliveryDate
          ? { deliveryDate: new Date(deliveryDate).toISOString() }
          : {}),
        note: note.trim(),
      };

      const response = await fetch(`${API_URL}/deliveries/${id}`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            (response.status === 401
              ? "Your session has expired. Please log in again."
              : "Failed to update delivery.")
        );
      }

      window.alert("Delivery updated successfully.");
      navigate(`/deliveries/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update delivery."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedCylinder = cylinderTypes.find(
    (type) => String(type.id) === cylinderTypeId
  );

  const authenticationError =
    error.toLowerCase().includes("authentication") ||
    error.toLowerCase().includes("session has expired") ||
    error.toLowerCase().includes("token");

  if (loading) {
    return (
      <div className="gf-edit-delivery">
        <style>{styles}</style>
        <div className="ed-loading">
          <span className="ed-spinner" />
          <p>Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="gf-edit-delivery">
        <style>{styles}</style>
        <div className="ed-error-page">
          <div className="ed-error-icon">!</div>
          <h2>Delivery not available</h2>
          <p role="alert">{error || "Delivery not found."}</p>

          {authenticationError && (
            <Link to="/login" className="ed-primary-btn">
              Go to Login
            </Link>
          )}

          <Link to="/deliveries" className="ed-secondary-btn">
            ← Back to Deliveries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-edit-delivery">
      <style>{styles}</style>

      <header className="ed-hero">
        <div>
          <Link to={`/deliveries/${delivery.id}`} className="ed-back-link">
            ← Back to Delivery Details
          </Link>

          <div className="ed-title-row">
            <div className="ed-hero-icon" aria-hidden="true">
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
              </svg>
            </div>

            <div>
              <span className="ed-eyebrow">
                GASFLOW • DELIVERY MANAGEMENT
              </span>
              <h1>Edit Delivery #{delivery.id}</h1>
              <p>Update delivery information and review the total amount.</p>
            </div>
          </div>
        </div>

        <span className="ed-record-badge">Record #{delivery.id}</span>
      </header>

      <form onSubmit={handleSubmit} className="ed-layout">
        <main className="ed-main">
          {error && (
            <div className="ed-error-banner" role="alert">
              <span className="ed-error-mark">!</span>
              <div>
                <strong>Unable to save changes</strong>
                <p>{error}</p>
                {authenticationError && (
                  <Link to="/login">Go to Login →</Link>
                )}
              </div>
            </div>
          )}

          <section className="ed-card">
            <div className="ed-card-heading">
              <div className="ed-section-icon ed-purple">♙</div>
              <div>
                <h2>Customer Information</h2>
                <p>Select the customer associated with this delivery.</p>
              </div>
            </div>

            <div className="ed-field">
              <label htmlFor="customerId">Customer <span>*</span></label>
              <select
                id="customerId"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.mobile ? ` — ${customer.mobile}` : ""}
                  </option>
                ))}
              </select>
              <small>Choose the customer receiving the cylinders.</small>
            </div>
          </section>

          <section className="ed-card">
            <div className="ed-card-heading">
              <div className="ed-section-icon ed-blue">▤</div>
              <div>
                <h2>Cylinder Information</h2>
                <p>Choose a cylinder type and update its pricing.</p>
              </div>
            </div>

            <div className="ed-field">
              <label htmlFor="cylinderTypeId">
                Cylinder Type <span>*</span>
              </label>
              <select
                id="cylinderTypeId"
                value={cylinderTypeId}
                onChange={(event) =>
                  handleCylinderTypeChange(event.target.value)
                }
                required
              >
                <option value="">Select cylinder type</option>
                {cylinderTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name ??
                      type.cylinderTypeName ??
                      `Cylinder Type #${type.id}`}
                    {type.capacityKg != null ? ` (${type.capacityKg} kg)` : ""}
                  </option>
                ))}
              </select>

              {selectedCylinder && (
                <small>
                  Default selling price:{" "}
                  <strong>{formatCurrency(selectedCylinder.sellingPrice)}</strong>
                </small>
              )}
            </div>

            <div className="ed-fields-grid">
              <div className="ed-field">
                <label htmlFor="quantity">Quantity <span>*</span></label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
                <small>Enter a positive whole number.</small>
              </div>

              <div className="ed-field">
                <label htmlFor="unitPrice">
                  Unit Price (₹) <span>*</span>
                </label>
                <input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  required
                />
                <small>Price for one cylinder.</small>
              </div>
            </div>

            <div className="ed-total-preview">
              <div>
                <span>Calculated Total Amount</span>
                <small>Quantity × Unit Price</small>
              </div>
              <strong>
                {formatCurrency(Number.isFinite(totalAmount) ? totalAmount : 0)}
              </strong>
            </div>
          </section>

          <section className="ed-card">
            <div className="ed-card-heading">
              <div className="ed-section-icon ed-green">◷</div>
              <div>
                <h2>Delivery Schedule & Notes</h2>
                <p>Update the date and any additional delivery information.</p>
              </div>
            </div>

            <div className="ed-field">
              <label htmlFor="deliveryDate">Delivery Date & Time</label>
              <input
                id="deliveryDate"
                type="datetime-local"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
              />
              <small>Use the local date and time for this delivery.</small>
            </div>

            <div className="ed-field ed-note-field">
              <label htmlFor="note">Delivery Note</label>
              <textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Enter delivery instructions or additional notes..."
              />
              <small>Optional information about this delivery.</small>
            </div>
          </section>

          <div className="ed-form-actions">
            <Link
              to={`/deliveries/${delivery.id}`}
              className="ed-secondary-btn"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="ed-primary-btn"
              disabled={
                saving ||
                customers.length === 0 ||
                cylinderTypes.length === 0
              }
            >
              {saving ? (
                <>
                  <span className="ed-button-spinner" />
                  Saving Changes...
                </>
              ) : (
                <>✓ Update Delivery</>
              )}
            </button>
          </div>
        </main>

        <aside className="ed-sidebar">
          <section className="ed-summary-card">
            <span className="ed-summary-eyebrow">DELIVERY OVERVIEW</span>
            <h2>Review Changes</h2>
            <p className="ed-summary-description">
              Check the updated delivery information before saving.
            </p>

            <div className="ed-summary-total-icon">₹</div>
            <span className="ed-summary-total-label">New Total Amount</span>
            <strong className="ed-summary-total">
              {formatCurrency(Number.isFinite(totalAmount) ? totalAmount : 0)}
            </strong>

            <div className="ed-summary-divider" />

            <div className="ed-summary-row">
              <span>Quantity</span>
              <strong>{quantity || "0"} cylinder(s)</strong>
            </div>

            <div className="ed-summary-row">
              <span>Unit Price</span>
              <strong>{formatCurrency(Number(unitPrice) || 0)}</strong>
            </div>

            <div className="ed-summary-row">
              <span>Customer</span>
              <strong>
                {customers.find((item) => String(item.id) === customerId)
                  ?.name ?? "Not selected"}
              </strong>
            </div>

            <div className="ed-summary-row">
              <span>Cylinder Type</span>
              <strong>
                {selectedCylinder?.name ??
                  selectedCylinder?.cylinderTypeName ??
                  "Not selected"}
              </strong>
            </div>
          </section>

          <section className="ed-tip-card">
            <span className="ed-tip-icon">i</span>
            <div>
              <h3>Before you save</h3>
              <p>
                Verify the customer, cylinder type, quantity, unit price,
                and delivery date. The total amount updates automatically.
              </p>
            </div>
          </section>

          <section className="ed-record-card">
            <h3>Current Record</h3>
            <div className="ed-record-row">
              <span>Delivery ID</span>
              <strong>#{delivery.id}</strong>
            </div>
            <div className="ed-record-row">
              <span>Original Amount</span>
              <strong>{formatCurrency(delivery.totalAmount)}</strong>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}

const styles = `
  .gf-edit-delivery {
    --ed-ink: #111827;
    --ed-text: #334155;
    --ed-muted: #64748b;
    --ed-border: #e5e9f2;
    box-sizing: border-box;
    min-height: 100%;
    padding: clamp(16px, 2.4vw, 32px);
    background: #f4f6fb;
    color: var(--ed-text);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  .gf-edit-delivery *, .gf-edit-delivery *::before,
  .gf-edit-delivery *::after { box-sizing: border-box; }

  .gf-edit-delivery a { text-decoration: none; }

  .ed-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
    padding: 26px 30px;
    color: white;
    background: linear-gradient(120deg, #1e1b4b 0%, #3730a3 56%, #6366f1 100%);
    border-radius: 20px;
    box-shadow: 0 14px 30px rgba(55,48,163,.16);
  }

  .ed-back-link {
    display: inline-flex;
    gap: 8px;
    margin-bottom: 17px;
    color: rgba(255,255,255,.82);
    font-size: 12px;
    font-weight: 750;
  }

  .ed-back-link:hover { color: white; }
  .ed-title-row { display: flex; align-items: center; gap: 15px; }

  .ed-hero-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    flex-shrink: 0;
    color: white;
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 16px;
  }

  .ed-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 1.3px;
  }

  .gf-edit-delivery .ed-hero h1 {
    margin: 0;
    color: white;
    font-size: clamp(24px, 3vw, 33px);
    font-weight: 850;
    line-height: 1.2;
    letter-spacing: -.8px;
  }

  .gf-edit-delivery .ed-hero p {
    margin: 7px 0 0;
    color: rgba(255,255,255,.78);
    font-size: 13px;
  }

  .ed-record-badge {
    flex-shrink: 0;
    padding: 9px 13px;
    color: white;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 30px;
    font-size: 12px;
    font-weight: 800;
  }

  .ed-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    align-items: start;
    gap: 22px;
  }

  .ed-main, .ed-sidebar { min-width: 0; }

  .ed-card {
    margin-bottom: 20px;
    padding: 24px;
    background: white;
    border: 1px solid var(--ed-border);
    border-radius: 17px;
    box-shadow: 0 3px 12px rgba(15,23,42,.025);
  }

  .ed-card-heading {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    margin-bottom: 22px;
    padding-bottom: 18px;
    border-bottom: 1px solid #edf0f5;
  }

  .ed-section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 800;
  }

  .ed-purple { color: #4f46e5; background: #eef2ff; }
  .ed-blue { color: #2563eb; background: #eff6ff; }
  .ed-green { color: #059669; background: #ecfdf5; }

  .gf-edit-delivery .ed-card-heading h2 {
    margin: 1px 0 0;
    color: var(--ed-ink);
    font-size: 17px;
    font-weight: 850;
    letter-spacing: -.3px;
  }

  .ed-card-heading p { margin: 5px 0 0; color: var(--ed-muted); font-size: 12px; }

  .ed-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .ed-field + .ed-field { margin-top: 18px; }

  .ed-field label {
    color: #334155;
    font-size: 12px;
    font-weight: 800;
  }

  .ed-field label span { color: #dc2626; }

  .gf-edit-delivery .ed-field input,
  .gf-edit-delivery .ed-field select,
  .gf-edit-delivery .ed-field textarea {
    display: block;
    width: 100%;
    min-width: 0;
    min-height: 45px;
    padding: 11px 13px;
    color: #1e293b;
    background: #fbfcff;
    border: 1px solid #dfe5ef;
    border-radius: 10px;
    outline: none;
    font: inherit;
    font-size: 13px;
    transition: border-color .15s ease, box-shadow .15s ease;
  }

  .gf-edit-delivery .ed-field textarea { min-height: 110px; resize: vertical; }

  .gf-edit-delivery .ed-field input:focus,
  .gf-edit-delivery .ed-field select:focus,
  .gf-edit-delivery .ed-field textarea:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(99,102,241,.12);
  }

  .ed-field small { color: #94a3b8; font-size: 11px; }
  .ed-field small strong { color: #4338ca; }

  .ed-fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px; margin-top: 19px; }

  .ed-total-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 22px;
    padding: 18px;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    border-radius: 13px;
  }

  .ed-total-preview > div { display: flex; flex-direction: column; gap: 4px; }
  .ed-total-preview span { color: #3730a3; font-size: 12px; font-weight: 850; }
  .ed-total-preview small { color: #6366f1; font-size: 11px; }
  .ed-total-preview > strong { color: #3730a3; font-size: clamp(20px, 2.5vw, 26px); font-weight: 900; overflow-wrap: anywhere; }

  .ed-note-field { margin-top: 20px !important; }

  .ed-form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 22px; }

  .ed-primary-btn, .ed-secondary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 43px;
    padding: 11px 16px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
    transition: background .15s ease, transform .15s ease;
  }

  .ed-primary-btn { color: white; background: #4f46e5; border: 1px solid #4f46e5; }
  .ed-primary-btn:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }
  .ed-primary-btn:disabled { opacity: .65; cursor: not-allowed; }

  .ed-secondary-btn { color: #475569; background: white; border: 1px solid #e2e8f0; }
  .ed-secondary-btn:hover { background: #f8fafc; }

  .ed-summary-card {
    padding: 23px;
    color: white;
    background: linear-gradient(145deg, #1e1b4b, #3730a3 70%, #4f46e5);
    border-radius: 17px;
    box-shadow: 0 12px 25px rgba(55,48,163,.14);
  }

  .ed-summary-eyebrow { color: #c7d2fe; font-size: 10px; font-weight: 850; letter-spacing: 1.2px; }

  .gf-edit-delivery .ed-summary-card h2 {
    margin: 9px 0 5px;
    color: white;
    font-size: 20px;
    font-weight: 850;
    letter-spacing: -.4px;
  }

  .ed-summary-description { margin: 0 0 21px; color: #c7d2fe; font-size: 12px; }

  .ed-summary-total-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 43px;
    height: 43px;
    margin-bottom: 12px;
    color: white;
    background: rgba(255,255,255,.13);
    border: 1px solid rgba(255,255,255,.17);
    border-radius: 13px;
    font-size: 22px;
    font-weight: 850;
  }

  .ed-summary-total-label { display: block; margin-bottom: 5px; color: #c7d2fe; font-size: 11px; }
  .ed-summary-total { display: block; color: white; font-size: clamp(24px, 2.5vw, 31px); font-weight: 850; letter-spacing: -.7px; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }

  .ed-summary-divider { height: 1px; margin: 21px 0 9px; background: rgba(255,255,255,.15); }

  .ed-summary-row { display: flex; flex-direction: column; gap: 4px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.12); }
  .ed-summary-row:last-child { padding-bottom: 0; border-bottom: 0; }
  .ed-summary-row span { color: #c7d2fe; font-size: 11px; }
  .ed-summary-row strong { color: white; font-size: 12px; font-weight: 750; overflow-wrap: anywhere; }

  .ed-tip-card, .ed-record-card {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 16px;
    padding: 19px;
    background: white;
    border: 1px solid var(--ed-border);
    border-radius: 15px;
  }

  .ed-tip-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    color: #4338ca;
    background: #eef2ff;
    border-radius: 50%;
    font-weight: 850;
  }

  .gf-edit-delivery .ed-tip-card h3,
  .gf-edit-delivery .ed-record-card h3 {
    margin: 0 0 8px;
    color: #1e293b;
    font-size: 13px;
    font-weight: 850;
  }

  .ed-tip-card p { margin: 0; color: #64748b; font-size: 11px; }

  .ed-record-card { display: block; }
  .ed-record-row { display: flex; justify-content: space-between; gap: 10px; padding: 10px 0; border-top: 1px solid #edf0f5; }
  .ed-record-row span { color: #64748b; font-size: 11px; }
  .ed-record-row strong { color: #334155; font-size: 11px; font-weight: 800; text-align: right; overflow-wrap: anywhere; }

  .ed-error-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
    padding: 15px;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
  }

  .ed-error-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 25px;
    height: 25px;
    flex-shrink: 0;
    color: white;
    background: #dc2626;
    border-radius: 50%;
    font-weight: 900;
  }

  .ed-error-banner strong { display: block; font-size: 12px; }
  .ed-error-banner p { margin: 4px 0 0; font-size: 12px; overflow-wrap: anywhere; }
  .ed-error-banner a { display: inline-block; margin-top: 7px; color: #4338ca; font-size: 12px; font-weight: 800; }

  .ed-error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 330px;
    padding: 25px;
    text-align: center;
    background: white;
    border: 1px solid var(--ed-border);
    border-radius: 17px;
  }

  .ed-error-icon { display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; margin-bottom: 13px; color: #b91c1c; background: #fee2e2; border-radius: 50%; font-size: 23px; font-weight: 850; }
  .gf-edit-delivery .ed-error-page h2 { margin: 0 0 7px; color: #1e293b; font-size: 21px; }
  .ed-error-page p { margin: 0 0 17px; color: #b91c1c; font-size: 12px; overflow-wrap: anywhere; }
  .ed-error-page .ed-primary-btn, .ed-error-page .ed-secondary-btn { margin: 4px; }

  .ed-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13px; min-height: 300px; color: #64748b; }
  .ed-spinner { width: 31px; height: 31px; border: 3px solid #e0e7ff; border-top-color: #4f46e5; border-radius: 50%; animation: ed-spin .7s linear infinite; }
  .ed-loading p { margin: 0; font-size: 13px; }

  .ed-button-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: ed-spin .7s linear infinite; }

  @keyframes ed-spin { to { transform: rotate(360deg); } }

  @media (max-width: 1100px) {
    .ed-layout { grid-template-columns: minmax(0, 1fr) 270px; gap: 16px; }
    .ed-card { padding: 20px; }
    .ed-summary-card { padding: 19px; }
  }

  @media (max-width: 850px) {
    .ed-layout { grid-template-columns: minmax(0, 1fr); }
    .ed-sidebar { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 14px; }
    .ed-tip-card, .ed-record-card { margin-top: 0; }
  }

  @media (max-width: 600px) {
    .gf-edit-delivery { padding: 14px; }
    .ed-hero { align-items: flex-start; flex-direction: column; padding: 21px; }
    .ed-title-row { align-items: flex-start; gap: 11px; }
    .ed-hero-icon { width: 48px; height: 48px; }
    .gf-edit-delivery .ed-hero h1 { font-size: 24px; }
    .ed-card { padding: 17px; }
    .ed-fields-grid { grid-template-columns: minmax(0, 1fr); gap: 17px; }
    .ed-total-preview { align-items: flex-start; flex-direction: column; }
    .ed-form-actions { flex-direction: column-reverse; }
    .ed-form-actions > * { width: 100%; }
    .ed-sidebar { grid-template-columns: minmax(0, 1fr); }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-edit-delivery *, .gf-edit-delivery *::before,
    .gf-edit-delivery *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

export default EditDelivery;
