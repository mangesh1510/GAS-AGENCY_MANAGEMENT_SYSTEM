import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

type Customer = {
  id: number;
  name: string;
  mobile: string;
  isActive: boolean;
};

type CylinderType = {
  id: number;
  name: string;
  capacityKg: string;
  sellingPrice: string;
  isActive: boolean;
};

function AddDelivery() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [cylinderTypeId, setCylinderTypeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Use the same JWT token for authenticated API requests.
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("gasflow_token");

    if (!token) {
      throw new Error("Authentication required. Please log in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setError("");

        const headers = getAuthHeaders();

        const [customerResponse, cylinderResponse] = await Promise.all([
          fetch(`${API_URL}/customers`, { headers }),
          fetch(`${API_URL}/cylinder-types`, { headers }),
        ]);

        const [customerData, cylinderData] = await Promise.all([
          customerResponse.json(),
          cylinderResponse.json(),
        ]);

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

        const activeCustomers: Customer[] = (
          customerData.data ?? []
        ).filter((customer: Customer) => customer.isActive);

        const activeCylinderTypes: CylinderType[] = (
          cylinderData.data ?? []
        ).filter((cylinder: CylinderType) => cylinder.isActive);

        if (!cancelled) {
          setCustomers(activeCustomers);
          setCylinderTypes(activeCylinderTypes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load form options."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCylinder = cylinderTypes.find(
    (cylinder) => String(cylinder.id) === cylinderTypeId
  );

  const numericQuantity = Number(quantity);
  const numericUnitPrice = Number(unitPrice);

  const totalAmount =
    Number.isInteger(numericQuantity) &&
    numericQuantity > 0 &&
    Number.isFinite(numericUnitPrice) &&
    numericUnitPrice >= 0
      ? numericQuantity * numericUnitPrice
      : 0;

  const handleCylinderChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedId = event.target.value;
    setCylinderTypeId(selectedId);

    const cylinder = cylinderTypes.find(
      (item) => String(item.id) === selectedId
    );

    setUnitPrice(
      cylinder ? String(Number(cylinder.sellingPrice)) : ""
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!customerId || !cylinderTypeId) {
      setError("Please select a customer and cylinder type.");
      return;
    }

    if (
      !Number.isInteger(numericQuantity) ||
      numericQuantity <= 0
    ) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (
      unitPrice.trim() === "" ||
      !Number.isFinite(numericUnitPrice) ||
      numericUnitPrice < 0
    ) {
      setError("Please enter a valid unit price.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/deliveries`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          customerId: Number(customerId),
          cylinderTypeId: Number(cylinderTypeId),
          quantity: numericQuantity,
          unitPrice: numericUnitPrice,
          note: note.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            (response.status === 401
              ? "Your session has expired. Please log in again."
              : "Failed to create delivery.")
        );
      }

      navigate("/deliveries", {
        state: { successMessage: "Delivery created successfully!" },
      });
    } catch (err) {
      console.error("Failed to create delivery:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create delivery."
      );
    } finally {
      setSaving(false);
    }
  };

  const authenticationError =
    error.toLowerCase().includes("authentication") ||
    error.toLowerCase().includes("session has expired") ||
    error.toLowerCase().includes("token");

  if (loadingOptions) {
    return (
      <div className="gf-add-delivery">
        <style>{styles}</style>
        <div className="ad-loading">
          <span className="ad-spinner" />
          <p>Loading customers and cylinder types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-add-delivery">
      <style>{styles}</style>

      <header className="ad-hero">
        <div>
          <Link to="/deliveries" className="ad-back">
            <span aria-hidden="true">←</span> Back to Deliveries
          </Link>

          <div className="ad-heading">
            <span className="ad-hero-icon" aria-hidden="true">
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
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>

            <div>
              <span className="ad-eyebrow">GASFLOW • OPERATIONS</span>
              <h1>Add Delivery</h1>
              <p>Record a cylinder delivery and calculate its total amount.</p>
            </div>
          </div>
        </div>

        <div className="ad-header-badge">
          <span className="ad-status-dot" />
          New delivery
        </div>
      </header>

      {error && (
        <div className="ad-error" role="alert">
          <span className="ad-error-icon">!</span>

          <div className="ad-error-content">
            <strong>Unable to continue</strong>
            <p>{error}</p>

            {authenticationError && (
              <Link to="/login" className="ad-login-link">
                Go to Login →
              </Link>
            )}
          </div>
        </div>
      )}

      {(customers.length === 0 || cylinderTypes.length === 0) &&
        !error && (
          <div className="ad-warning" role="status">
            {customers.length === 0 && (
              <p>
                No active customers found. Add or activate a customer first.
              </p>
            )}

            {cylinderTypes.length === 0 && (
              <p>
                No active cylinder types found. Add or activate a cylinder
                type first.
              </p>
            )}
          </div>
        )}

      <div className="ad-layout">
        <main className="ad-main">
          <form onSubmit={handleSubmit}>
            <section className="ad-card">
              <div className="ad-card-heading">
                <span className="ad-section-number">01</span>
                <div>
                  <h2>Delivery Information</h2>
                  <p>Select the customer and cylinder being delivered.</p>
                </div>
              </div>

              <div className="ad-field">
                <label htmlFor="customerId">
                  Customer <span className="ad-required">*</span>
                </label>

                <select
                  id="customerId"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  required
                  disabled={customers.length === 0 || saving}
                >
                  <option value="">Select a customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} — {customer.mobile}
                    </option>
                  ))}
                </select>

                <span className="ad-field-help">
                  Choose an active customer from your records.
                </span>
              </div>

              <div className="ad-field">
                <label htmlFor="cylinderTypeId">
                  Cylinder Type <span className="ad-required">*</span>
                </label>

                <select
                  id="cylinderTypeId"
                  value={cylinderTypeId}
                  onChange={handleCylinderChange}
                  required
                  disabled={cylinderTypes.length === 0 || saving}
                >
                  <option value="">Select a cylinder type</option>

                  {cylinderTypes.map((cylinder) => (
                    <option key={cylinder.id} value={cylinder.id}>
                      {cylinder.name} ({cylinder.capacityKg} kg)
                    </option>
                  ))}
                </select>

                <span className="ad-field-help">
                  Select the cylinder type for this delivery.
                </span>
              </div>

              {selectedCylinder && (
                <div className="ad-price-hint">
                  <span className="ad-price-icon">₹</span>
                  <div>
                    <span>Default Selling Price</span>
                    <strong>
                      ₹{Number(selectedCylinder.sellingPrice).toFixed(2)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="ad-use-price"
                    onClick={() =>
                      setUnitPrice(
                        String(Number(selectedCylinder.sellingPrice))
                      )
                    }
                    disabled={saving}
                  >
                    Use default
                  </button>
                </div>
              )}
            </section>

            <section className="ad-card">
              <div className="ad-card-heading">
                <span className="ad-section-number">02</span>
                <div>
                  <h2>Quantity & Pricing</h2>
                  <p>Enter the quantity and price for this delivery.</p>
                </div>
              </div>

              <div className="ad-fields-grid">
                <div className="ad-field">
                  <label htmlFor="quantity">
                    Quantity <span className="ad-required">*</span>
                  </label>

                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    required
                    disabled={saving}
                    placeholder="Enter quantity"
                  />

                  <span className="ad-field-help">
                    Number of cylinders delivered.
                  </span>
                </div>

                <div className="ad-field">
                  <label htmlFor="unitPrice">
                    Unit Price (₹) <span className="ad-required">*</span>
                  </label>

                  <div className="ad-input-prefix">
                    <span>₹</span>
                    <input
                      id="unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitPrice}
                      onChange={(event) => setUnitPrice(event.target.value)}
                      required
                      disabled={saving}
                      placeholder="0.00"
                    />
                  </div>

                  <span className="ad-field-help">
                    Price per cylinder. You can change the default.
                  </span>
                </div>
              </div>

              <div className="ad-total-box">
                <div className="ad-total-label">
                  <span className="ad-total-icon">₹</span>
                  <div>
                    <span>Total Delivery Amount</span>
                    <small>
                      {quantity || "0"} × ₹
                      {Number.isFinite(numericUnitPrice)
                        ? numericUnitPrice.toFixed(2)
                        : "0.00"}
                    </small>
                  </div>
                </div>

                <strong>₹{totalAmount.toFixed(2)}</strong>
              </div>
            </section>

            <section className="ad-card">
              <div className="ad-card-heading">
                <span className="ad-section-number">03</span>
                <div>
                  <h2>Additional Details</h2>
                  <p>Add any notes related to this delivery.</p>
                </div>
              </div>

              <div className="ad-field">
                <label htmlFor="note">Delivery Note (Optional)</label>

                <textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  maxLength={500}
                  disabled={saving}
                  placeholder="Enter delivery instructions, reference details, or other notes..."
                />

                <div className="ad-character-count">
                  {note.length}/500 characters
                </div>
              </div>
            </section>

            <div className="ad-form-actions">
              <Link to="/deliveries" className="ad-cancel-btn">
                Cancel
              </Link>

              <button
                type="submit"
                className="ad-submit-btn"
                disabled={
                  saving ||
                  customers.length === 0 ||
                  cylinderTypes.length === 0
                }
              >
                {saving ? (
                  <>
                    <span className="ad-button-spinner" />
                    Saving Delivery...
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">✓</span>
                    Create Delivery
                  </>
                )}
              </button>
            </div>
          </form>
        </main>

        <aside className="ad-sidebar">
          <section className="ad-summary-card">
            <span className="ad-summary-eyebrow">DELIVERY SUMMARY</span>
            <h2>Review your entry</h2>
            <p className="ad-summary-description">
              Check the details before creating the delivery record.
            </p>

            <div className="ad-summary-row">
              <span>Customer</span>
              <strong>
                {customers.find(
                  (customer) => String(customer.id) === customerId
                )?.name || "Not selected"}
              </strong>
            </div>

            <div className="ad-summary-row">
              <span>Cylinder</span>
              <strong>
                {selectedCylinder
                  ? `${selectedCylinder.name} (${selectedCylinder.capacityKg} kg)`
                  : "Not selected"}
              </strong>
            </div>

            <div className="ad-summary-row">
              <span>Quantity</span>
              <strong>{numericQuantity > 0 ? numericQuantity : "—"}</strong>
            </div>

            <div className="ad-summary-row">
              <span>Unit Price</span>
              <strong>
                {unitPrice !== "" && Number.isFinite(numericUnitPrice)
                  ? `₹${numericUnitPrice.toFixed(2)}`
                  : "—"}
              </strong>
            </div>

            <div className="ad-summary-total">
              <span>Total Amount</span>
              <strong>₹{totalAmount.toFixed(2)}</strong>
            </div>
          </section>

          <section className="ad-tip-card">
            <span className="ad-tip-icon" aria-hidden="true">i</span>
            <div>
              <h3>Before you create</h3>
              <ul>
                <li>Verify the selected customer.</li>
                <li>Check the cylinder type and quantity.</li>
                <li>Confirm the unit price and total.</li>
              </ul>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

const styles = `
  .gf-add-delivery {
    --ad-ink: #111827;
    --ad-text: #334155;
    --ad-muted: #64748b;
    --ad-border: #e5e9f2;
    --ad-purple: #4f46e5;
    box-sizing: border-box;
    min-height: 100%;
    padding: clamp(16px, 2.4vw, 32px);
    background: #f4f6fb;
    color: var(--ad-text);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  .gf-add-delivery *, .gf-add-delivery *::before, .gf-add-delivery *::after {
    box-sizing: border-box;
  }

  .gf-add-delivery a { text-decoration: none; }

  .ad-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
    margin-bottom: 25px;
    padding: 26px 30px;
    color: white;
    background: linear-gradient(120deg, #1e1b4b 0%, #3730a3 56%, #6366f1 100%);
    border-radius: 20px;
    box-shadow: 0 14px 30px rgba(55,48,163,.17);
  }

  .ad-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 19px;
    color: rgba(255,255,255,.82);
    font-size: 12px;
    font-weight: 700;
  }

  .ad-back:hover { color: white; }

  .ad-heading { display: flex; align-items: center; gap: 15px; }

  .ad-hero-icon {
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

  .ad-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.3px;
  }

  .gf-add-delivery .ad-hero h1 {
    margin: 0;
    color: white;
    font-size: clamp(26px, 3vw, 34px);
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -.8px;
  }

  .gf-add-delivery .ad-hero p {
    margin: 7px 0 0;
    color: rgba(255,255,255,.78);
    font-size: 13px;
  }

  .ad-header-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding: 9px 13px;
    color: white;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 30px;
    font-size: 12px;
    font-weight: 700;
  }

  .ad-status-dot {
    width: 7px;
    height: 7px;
    background: #86efac;
    border-radius: 50%;
  }

  .ad-error, .ad-warning {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
    padding: 15px 17px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    color: #991b1b;
  }

  .ad-error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 25px;
    height: 25px;
    flex-shrink: 0;
    color: white;
    background: #dc2626;
    border-radius: 50%;
    font-weight: 800;
  }

  .ad-error-content { min-width: 0; }
  .ad-error-content strong { font-size: 13px; }
  .ad-error-content p { margin: 3px 0; font-size: 12px; overflow-wrap: anywhere; }

  .ad-login-link {
    display: inline-block;
    margin-top: 5px;
    color: #4338ca;
    font-size: 12px;
    font-weight: 750;
  }

  .ad-warning {
    display: block;
    color: #92400e;
    background: #fffbeb;
    border-color: #fde68a;
  }

  .ad-warning p { margin: 3px 0; font-size: 12px; }

  .ad-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    align-items: start;
    gap: 22px;
  }

  .ad-main, .ad-sidebar { min-width: 0; }

  .ad-card {
    margin-bottom: 20px;
    padding: 24px;
    background: white;
    border: 1px solid var(--ad-border);
    border-radius: 17px;
    box-shadow: 0 3px 12px rgba(15,23,42,.025);
  }

  .ad-card-heading {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    margin-bottom: 23px;
    padding-bottom: 18px;
    border-bottom: 1px solid #edf0f5;
  }

  .ad-section-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 37px;
    height: 37px;
    flex-shrink: 0;
    color: #4338ca;
    background: #eef2ff;
    border-radius: 11px;
    font-size: 12px;
    font-weight: 850;
  }

  .gf-add-delivery .ad-card-heading h2 {
    margin: 0;
    color: var(--ad-ink);
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -.3px;
  }

  .ad-card-heading p {
    margin: 5px 0 0;
    color: var(--ad-muted);
    font-size: 12px;
  }

  .ad-field { min-width: 0; margin-bottom: 21px; }
  .ad-field:last-child { margin-bottom: 0; }

  .ad-field label {
    display: block;
    margin-bottom: 8px;
    color: #334155;
    font-size: 12px;
    font-weight: 750;
  }

  .ad-required { color: #dc2626; }

  .ad-field select, .ad-field input, .ad-field textarea {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: 11px 13px;
    color: #1e293b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    outline: none;
    font: inherit;
    font-size: 13px;
    transition: border-color .15s ease, box-shadow .15s ease;
  }

  .ad-field textarea { min-height: 105px; resize: vertical; }

  .ad-field select:focus, .ad-field input:focus, .ad-field textarea:focus {
    background: white;
    border-color: #a5b4fc;
    box-shadow: 0 0 0 3px rgba(99,102,241,.11);
  }

  .ad-field select:disabled, .ad-field input:disabled, .ad-field textarea:disabled {
    opacity: .65;
    cursor: not-allowed;
  }

  .ad-field-help {
    display: block;
    margin-top: 6px;
    color: #94a3b8;
    font-size: 11px;
  }

  .ad-price-hint {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
    padding: 14px;
    background: #f5f7ff;
    border: 1px solid #e0e7ff;
    border-radius: 12px;
  }

  .ad-price-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    color: #4338ca;
    background: #e0e7ff;
    border-radius: 11px;
    font-weight: 850;
  }

  .ad-price-hint div { display: flex; flex-direction: column; gap: 2px; }
  .ad-price-hint div span { color: #64748b; font-size: 11px; }
  .ad-price-hint div strong { color: #312e81; font-size: 14px; }

  .ad-use-price {
    margin-left: auto;
    padding: 7px 10px;
    color: #4338ca;
    background: white;
    border: 1px solid #c7d2fe;
    border-radius: 8px;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  .ad-use-price:hover { background: #eef2ff; }
  .ad-use-price:disabled { opacity: .6; cursor: not-allowed; }

  .ad-fields-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .ad-input-prefix {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding-left: 13px;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }

  .ad-input-prefix:focus-within {
    border-color: #a5b4fc;
    box-shadow: 0 0 0 3px rgba(99,102,241,.11);
    background: white;
  }

  .ad-input-prefix > span { font-weight: 750; }

  .ad-field .ad-input-prefix input {
    min-width: 0;
    background: transparent;
    border: 0;
    box-shadow: none;
  }

  .ad-total-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 5px;
    padding: 17px;
    background: linear-gradient(120deg, #eef2ff, #f5f3ff);
    border: 1px solid #e0e7ff;
    border-radius: 13px;
  }

  .ad-total-label { display: flex; align-items: center; gap: 11px; }

  .ad-total-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    color: white;
    background: #4f46e5;
    border-radius: 11px;
    font-size: 18px;
    font-weight: 800;
  }

  .ad-total-label div { display: flex; flex-direction: column; gap: 3px; }
  .ad-total-label div span { color: #312e81; font-size: 12px; font-weight: 800; }
  .ad-total-label small { color: #64748b; font-size: 11px; }

  .ad-total-box > strong {
    color: #312e81;
    font-size: clamp(19px, 2vw, 25px);
    font-weight: 850;
    text-align: right;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }

  .ad-character-count { margin-top: 5px; color: #94a3b8; text-align: right; font-size: 10px; }

  .ad-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 11px;
    margin-bottom: 22px;
  }

  .ad-cancel-btn, .ad-submit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 44px;
    padding: 11px 19px;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: background .15s ease, transform .15s ease;
  }

  .ad-cancel-btn {
    color: #475569;
    background: white;
    border: 1px solid #e2e8f0;
  }

  .ad-cancel-btn:hover { background: #f8fafc; }

  .ad-submit-btn {
    color: white;
    background: #4f46e5;
    border: 1px solid #4f46e5;
  }

  .ad-submit-btn:hover:not(:disabled) {
    background: #4338ca;
    transform: translateY(-1px);
  }

  .ad-submit-btn:disabled { opacity: .65; cursor: not-allowed; }

  .ad-button-spinner, .ad-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,.45);
    border-top-color: white;
    border-radius: 50%;
    animation: ad-spin .7s linear infinite;
  }

  .ad-spinner { width: 30px; height: 30px; border-color: #e0e7ff; border-top-color: #4f46e5; }

  @keyframes ad-spin { to { transform: rotate(360deg); } }

  .ad-summary-card {
    padding: 23px;
    color: white;
    background: linear-gradient(145deg, #1e1b4b, #3730a3 70%, #4f46e5);
    border-radius: 17px;
    box-shadow: 0 12px 25px rgba(55,48,163,.14);
  }

  .ad-summary-eyebrow {
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 1.2px;
  }

  .gf-add-delivery .ad-summary-card h2 {
    margin: 9px 0 5px;
    color: white;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -.4px;
  }

  .ad-summary-description { margin: 0 0 22px; color: #c7d2fe; font-size: 12px; }

  .ad-summary-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 13px 0;
    border-top: 1px solid rgba(255,255,255,.14);
  }

  .ad-summary-row span { color: #c7d2fe; font-size: 11px; }
  .ad-summary-row strong { color: white; font-size: 12px; font-weight: 750; overflow-wrap: anywhere; }

  .ad-summary-total {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 9px;
    padding: 17px;
    background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 12px;
  }

  .ad-summary-total span { color: #e0e7ff; font-size: 11px; font-weight: 700; }

  .ad-summary-total strong {
    color: white;
    font-size: 26px;
    font-weight: 850;
    letter-spacing: -.5px;
    overflow-wrap: anywhere;
  }

  .ad-tip-card {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 16px;
    padding: 17px;
    background: white;
    border: 1px solid var(--ad-border);
    border-radius: 15px;
  }

  .ad-tip-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 27px;
    height: 27px;
    flex-shrink: 0;
    color: #4338ca;
    background: #eef2ff;
    border-radius: 50%;
    font-weight: 850;
  }

  .gf-add-delivery .ad-tip-card h3 {
    margin: 2px 0 10px;
    color: #1e293b;
    font-size: 13px;
    font-weight: 800;
  }

  .ad-tip-card ul { margin: 0; padding-left: 17px; color: #64748b; font-size: 11px; }
  .ad-tip-card li { margin: 7px 0; }

  .ad-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 280px;
    color: #64748b;
  }

  .ad-loading p { margin: 0; font-size: 13px; }

  @media (max-width: 1100px) {
    .ad-layout { grid-template-columns: minmax(0, 1fr) 270px; gap: 16px; }
    .ad-card { padding: 20px; }
    .ad-summary-card { padding: 19px; }
  }

  @media (max-width: 850px) {
    .ad-layout { grid-template-columns: minmax(0, 1fr); }
    .ad-sidebar { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 14px; }
    .ad-tip-card { margin-top: 0; }
  }

  @media (max-width: 600px) {
    .gf-add-delivery { padding: 14px; }
    .ad-hero { align-items: flex-start; flex-direction: column; padding: 21px; }
    .ad-header-badge { align-self: flex-start; }
    .ad-heading { gap: 11px; }
    .ad-hero-icon { width: 48px; height: 48px; }
    .gf-add-delivery .ad-hero h1 { font-size: 26px; }
    .ad-card { padding: 18px; }
    .ad-fields-grid { grid-template-columns: minmax(0, 1fr); gap: 0; }
    .ad-sidebar { grid-template-columns: minmax(0, 1fr); }
    .ad-form-actions { flex-direction: column-reverse; }
    .ad-cancel-btn, .ad-submit-btn { width: 100%; }
    .ad-total-box { align-items: flex-start; flex-direction: column; }
    .ad-total-box > strong { text-align: left; }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-add-delivery *, .gf-add-delivery *::before, .gf-add-delivery *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

export default AddDelivery;