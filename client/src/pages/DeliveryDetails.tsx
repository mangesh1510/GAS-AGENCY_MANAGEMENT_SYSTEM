import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

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
  mobile: string;
  address: string | null;
};

type CylinderType = {
  id: number;
  name: string;
  capacityKg: string;
};

function DeliveryDetails() {
  const { id } = useParams<{ id: string }>();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cylinderType, setCylinderType] =
    useState<CylinderType | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      try {
        setLoading(true);
        setError("");

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
          throw new Error("Invalid delivery ID.");
        }

        const token = localStorage.getItem("gasflow_token");

        if (!token) {
          throw new Error("Authentication required. Please log in again.");
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [deliveryResponse, customerResponse, cylinderResponse] =
          await Promise.all([
            fetch(`${API_URL}/deliveries/${id}`, { headers }),
            fetch(`${API_URL}/customers`, { headers }),
            fetch(`${API_URL}/cylinder-types`, { headers }),
          ]);

        const [deliveryData, customerData, cylinderData] =
          await Promise.all([
            deliveryResponse.json(),
            customerResponse.json(),
            cylinderResponse.json(),
          ]);

        if (!deliveryResponse.ok) {
          throw new Error(
            deliveryData.message ||
              deliveryData.error ||
              (deliveryResponse.status === 401
                ? "Your session has expired. Please log in again."
                : "Failed to load delivery.")
          );
        }

        if (!customerResponse.ok) {
          throw new Error(
            customerData.message || "Failed to load customer information."
          );
        }

        if (!cylinderResponse.ok) {
          throw new Error(
            cylinderData.message || "Failed to load cylinder information."
          );
        }

        const currentDelivery: Delivery = deliveryData.data;

        if (!currentDelivery) {
          throw new Error("Delivery not found.");
        }

        const currentCustomer =
          (customerData.data ?? []).find(
            (item: Customer) => item.id === currentDelivery.customerId
          ) ?? null;

        const currentCylinder =
          (cylinderData.data ?? []).find(
            (item: CylinderType) =>
              item.id === currentDelivery.cylinderTypeId
          ) ?? null;

        if (!cancelled) {
          setDelivery(currentDelivery);
          setCustomer(currentCustomer);
          setCylinderType(currentCylinder);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load delivery details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const formatCurrency = (value: string | number) =>
    `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value: string) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const authenticationError =
    error.toLowerCase().includes("authentication") ||
    error.toLowerCase().includes("session has expired") ||
    error.toLowerCase().includes("token");

  if (loading) {
    return (
      <div className="gf-delivery-details">
        <style>{styles}</style>

        <div className="dd-loading">
          <span className="dd-spinner" />
          <p>Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="gf-delivery-details">
        <style>{styles}</style>

        <div className="dd-error-page">
          <div className="dd-error-icon">!</div>
          <h1>Unable to load delivery</h1>
          <p role="alert">{error || "Delivery not found."}</p>

          {authenticationError && (
            <Link to="/login" className="dd-primary-btn">
              Go to Login
            </Link>
          )}

          <Link to="/deliveries" className="dd-secondary-btn">
            ← Back to Deliveries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-delivery-details">
      <style>{styles}</style>

      <header className="dd-hero">
        <div className="dd-hero-content">
          <Link to="/deliveries" className="dd-back">
            <span aria-hidden="true">←</span> Back to Deliveries
          </Link>

          <div className="dd-title-row">
            <div className="dd-hero-icon" aria-hidden="true">
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
                <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                <path d="M9 8h6M9 12h6M9 16h3" />
              </svg>
            </div>

            <div>
              <span className="dd-eyebrow">
                GASFLOW • DELIVERY MANAGEMENT
              </span>
              <h1>Delivery Details</h1>
              <p>View customer, cylinder, and delivery information.</p>
            </div>
          </div>
        </div>

        <div className="dd-hero-actions">
          <span className="dd-id-badge">Delivery #{delivery.id}</span>

          <Link
            to={`/deliveries/${delivery.id}/edit`}
            className="dd-edit-btn"
          >
            <span aria-hidden="true">✎</span> Edit Delivery
          </Link>
        </div>
      </header>

      <div className="dd-content">
        <main className="dd-main">
          <section className="dd-card">
            <div className="dd-card-heading">
              <div className="dd-section-icon dd-purple">♙</div>
              <div>
                <h2>Customer Information</h2>
                <p>Details of the customer receiving this delivery.</p>
              </div>
            </div>

            <div className="dd-customer-profile">
              <div className="dd-avatar">
                {customer?.name?.trim().charAt(0).toUpperCase() || "C"}
              </div>

              <div className="dd-customer-name">
                <span>Customer Name</span>
                <strong>{customer?.name ?? "Unknown customer"}</strong>
                <span className="dd-customer-id">
                  Customer ID: #{delivery.customerId}
                </span>
              </div>

              <Link
                to={`/customers/${delivery.customerId}`}
                className="dd-view-customer"
              >
                View Customer →
              </Link>
            </div>

            <div className="dd-info-grid">
              <InfoItem
                label="Mobile Number"
                value={customer?.mobile || "Not available"}
              />

              <InfoItem
                label="Customer Address"
                value={customer?.address || "Not provided"}
              />
            </div>
          </section>

          <section className="dd-card">
            <div className="dd-card-heading">
              <div className="dd-section-icon dd-blue">▤</div>
              <div>
                <h2>Cylinder Information</h2>
                <p>Details of the cylinder type included in this delivery.</p>
              </div>
            </div>

            <div className="dd-cylinder-panel">
              <div className="dd-cylinder-icon" aria-hidden="true">
                <svg
                  width="31"
                  height="31"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="6" y="5" width="12" height="17" rx="3" />
                  <path d="M9 5V3h6v2M9 10h6M9 14h6" />
                </svg>
              </div>

              <div className="dd-cylinder-name">
                <span>Cylinder Type</span>
                <strong>
                  {cylinderType?.name ?? "Unknown cylinder type"}
                </strong>
                <span>
                  Cylinder ID: #{delivery.cylinderTypeId}
                </span>
              </div>

              <div className="dd-capacity">
                <span>Capacity</span>
                <strong>
                  {cylinderType
                    ? `${cylinderType.capacityKg} kg`
                    : "—"}
                </strong>
              </div>
            </div>
          </section>

          <section className="dd-card">
            <div className="dd-card-heading">
              <div className="dd-section-icon dd-green">✓</div>
              <div>
                <h2>Delivery Information</h2>
                <p>Quantity, pricing, and delivery notes.</p>
              </div>
            </div>

            <div className="dd-info-grid">
              <InfoItem
                label="Delivery ID"
                value={`#${delivery.id}`}
              />

              <InfoItem
                label="Delivery Date"
                value={formatDate(delivery.deliveryDate)}
              />

              <InfoItem
                label="Quantity Delivered"
                value={`${delivery.quantity} cylinder(s)`}
              />

              <InfoItem
                label="Price Per Cylinder"
                value={formatCurrency(delivery.unitPrice)}
              />

              <InfoItem
                label="Total Delivery Amount"
                value={formatCurrency(delivery.totalAmount)}
                highlighted
              />

              <InfoItem
                label="Created At"
                value={formatDate(delivery.createdAt)}
              />

              <InfoItem
                label="Created By"
                value={
                  delivery.createdBy != null
                    ? `User #${delivery.createdBy}`
                    : "Not available"
                }
              />
            </div>

            <div className="dd-note">
              <span className="dd-note-label">Delivery Note</span>
              <p>{delivery.note?.trim() || "No notes were added."}</p>
            </div>
          </section>

          <div className="dd-bottom-actions">
            <Link to="/deliveries" className="dd-secondary-btn">
              ← All Deliveries
            </Link>

            <Link
              to={`/deliveries/${delivery.id}/edit`}
              className="dd-primary-btn"
            >
              Edit This Delivery →
            </Link>
          </div>
        </main>

        <aside className="dd-sidebar">
          <section className="dd-summary-card">
            <span className="dd-summary-eyebrow">PAYMENT OVERVIEW</span>
            <h2>Delivery Summary</h2>
            <p className="dd-summary-description">
              Financial details for this delivery record.
            </p>

            <div className="dd-total-icon">₹</div>

            <span className="dd-total-label">Total Delivery Amount</span>
            <strong className="dd-total-amount">
              {formatCurrency(delivery.totalAmount)}
            </strong>

            <div className="dd-summary-divider" />

            <div className="dd-summary-row">
              <span>Quantity</span>
              <strong>{delivery.quantity}</strong>
            </div>

            <div className="dd-summary-row">
              <span>Unit Price</span>
              <strong>{formatCurrency(delivery.unitPrice)}</strong>
            </div>

            <div className="dd-summary-row">
              <span>Cylinder</span>
              <strong>{cylinderType?.name ?? "Unknown"}</strong>
            </div>

            <div className="dd-summary-row">
              <span>Customer</span>
              <strong>{customer?.name ?? "Unknown"}</strong>
            </div>
          </section>

          <section className="dd-timeline-card">
            <h3>Record Timeline</h3>

            <div className="dd-timeline-item">
              <span className="dd-timeline-dot dd-dot-purple" />
              <div>
                <strong>Delivery Created</strong>
                <p>{formatDate(delivery.createdAt)}</p>
              </div>
            </div>

            <div className="dd-timeline-item">
              <span className="dd-timeline-dot dd-dot-green" />
              <div>
                <strong>Delivery Date</strong>
                <p>{formatDate(delivery.deliveryDate)}</p>
              </div>
            </div>
          </section>

          <section className="dd-help-card">
            <span className="dd-help-icon">i</span>
            <div>
              <h3>Need to make a change?</h3>
              <p>
                Use Edit Delivery to update the delivery record.
              </p>
              <Link to={`/deliveries/${delivery.id}/edit`}>
                Edit delivery →
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

type InfoItemProps = {
  label: string;
  value: string;
  highlighted?: boolean;
};

function InfoItem({ label, value, highlighted = false }: InfoItemProps) {
  return (
    <div className={`dd-info-item${highlighted ? " dd-highlighted" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles = `
  .gf-delivery-details {
    --dd-ink: #111827;
    --dd-text: #334155;
    --dd-muted: #64748b;
    --dd-border: #e5e9f2;
    box-sizing: border-box;
    min-height: 100%;
    padding: clamp(16px, 2.4vw, 32px);
    background: #f4f6fb;
    color: var(--dd-text);
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  .gf-delivery-details *, .gf-delivery-details *::before,
  .gf-delivery-details *::after { box-sizing: border-box; }

  .gf-delivery-details a { text-decoration: none; }

  .dd-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
    margin-bottom: 24px;
    padding: 26px 30px;
    color: white;
    background: linear-gradient(120deg, #1e1b4b 0%, #3730a3 56%, #6366f1 100%);
    border-radius: 20px;
    box-shadow: 0 14px 30px rgba(55,48,163,.16);
  }

  .dd-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    color: rgba(255,255,255,.82);
    font-size: 12px;
    font-weight: 750;
  }

  .dd-back:hover { color: white; }

  .dd-title-row { display: flex; align-items: center; gap: 15px; }

  .dd-hero-icon {
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

  .dd-eyebrow {
    display: block;
    margin-bottom: 5px;
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 1.3px;
  }

  .gf-delivery-details .dd-hero h1 {
    margin: 0;
    color: white;
    font-size: clamp(25px, 3vw, 34px);
    font-weight: 850;
    line-height: 1.2;
    letter-spacing: -.8px;
  }

  .gf-delivery-details .dd-hero p {
    margin: 7px 0 0;
    color: rgba(255,255,255,.78);
    font-size: 13px;
  }

  .dd-hero-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }

  .dd-id-badge {
    padding: 9px 13px;
    color: white;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 30px;
    font-size: 12px;
    font-weight: 800;
  }

  .dd-edit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 39px;
    padding: 9px 13px;
    color: #3730a3;
    background: white;
    border: 1px solid white;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .dd-edit-btn:hover { background: #eef2ff; }

  .dd-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    align-items: start;
    gap: 22px;
  }

  .dd-main, .dd-sidebar { min-width: 0; }

  .dd-card {
    margin-bottom: 20px;
    padding: 24px;
    background: white;
    border: 1px solid var(--dd-border);
    border-radius: 17px;
    box-shadow: 0 3px 12px rgba(15,23,42,.025);
  }

  .dd-card-heading {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    margin-bottom: 22px;
    padding-bottom: 18px;
    border-bottom: 1px solid #edf0f5;
  }

  .dd-section-icon {
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

  .dd-purple { color: #4f46e5; background: #eef2ff; }
  .dd-blue { color: #2563eb; background: #eff6ff; }
  .dd-green { color: #059669; background: #ecfdf5; }

  .gf-delivery-details .dd-card-heading h2 {
    margin: 1px 0 0;
    color: var(--dd-ink);
    font-size: 17px;
    font-weight: 850;
    letter-spacing: -.3px;
  }

  .dd-card-heading p {
    margin: 5px 0 0;
    color: var(--dd-muted);
    font-size: 12px;
  }

  .dd-customer-profile {
    display: flex;
    align-items: center;
    gap: 13px;
    margin-bottom: 20px;
    padding: 16px;
    background: #f8faff;
    border: 1px solid #edf0ff;
    border-radius: 13px;
  }

  .dd-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    color: #4338ca;
    background: #e0e7ff;
    border-radius: 14px;
    font-size: 19px;
    font-weight: 850;
  }

  .dd-customer-name {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .dd-customer-name > span:first-child,
  .dd-cylinder-name > span:first-child {
    color: var(--dd-muted);
    font-size: 11px;
  }

  .dd-customer-name strong,
  .dd-cylinder-name strong {
    color: #1e293b;
    font-size: 14px;
    font-weight: 850;
    overflow-wrap: anywhere;
  }

  .dd-customer-name .dd-customer-id,
  .dd-cylinder-name > span:last-child {
    color: #94a3b8;
    font-size: 10px;
  }

  .dd-view-customer {
    flex-shrink: 0;
    color: #4338ca;
    font-size: 11px;
    font-weight: 800;
  }

  .dd-view-customer:hover { text-decoration: underline; }

  .dd-info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .dd-info-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #edf0f5;
    border-radius: 11px;
  }

  .dd-info-item > span {
    color: #64748b;
    font-size: 11px;
    font-weight: 650;
  }

  .dd-info-item > strong {
    color: #1e293b;
    font-size: 13px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .dd-info-item.dd-highlighted {
    background: #eef2ff;
    border-color: #c7d2fe;
  }

  .dd-info-item.dd-highlighted > strong {
    color: #4338ca;
    font-size: 17px;
  }

  .dd-cylinder-panel {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 17px;
    background: #f8fafc;
    border: 1px solid #edf0f5;
    border-radius: 13px;
  }

  .dd-cylinder-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    color: #2563eb;
    background: #dbeafe;
    border-radius: 14px;
  }

  .dd-cylinder-name {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .dd-capacity {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
    padding-left: 13px;
    border-left: 1px solid #e2e8f0;
  }

  .dd-capacity span { color: #64748b; font-size: 11px; }
  .dd-capacity strong { color: #1d4ed8; font-size: 18px; font-weight: 850; }

  .dd-note {
    margin-top: 17px;
    padding: 15px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 11px;
  }

  .dd-note-label { color: #92400e; font-size: 11px; font-weight: 850; }
  .dd-note p { margin: 6px 0 0; color: #78350f; font-size: 12px; overflow-wrap: anywhere; }

  .dd-bottom-actions {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 22px;
  }

  .dd-primary-btn, .dd-secondary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 10px 15px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 800;
    transition: background .15s ease, transform .15s ease;
  }

  .dd-primary-btn {
    color: white;
    background: #4f46e5;
    border: 1px solid #4f46e5;
  }

  .dd-primary-btn:hover { background: #4338ca; transform: translateY(-1px); }

  .dd-secondary-btn {
    color: #475569;
    background: white;
    border: 1px solid #e2e8f0;
  }

  .dd-secondary-btn:hover { background: #f8fafc; }

  .dd-summary-card {
    padding: 23px;
    color: white;
    background: linear-gradient(145deg, #1e1b4b, #3730a3 70%, #4f46e5);
    border-radius: 17px;
    box-shadow: 0 12px 25px rgba(55,48,163,.14);
  }

  .dd-summary-eyebrow {
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 1.2px;
  }

  .gf-delivery-details .dd-summary-card h2 {
    margin: 9px 0 5px;
    color: white;
    font-size: 20px;
    font-weight: 850;
    letter-spacing: -.4px;
  }

  .dd-summary-description { margin: 0 0 21px; color: #c7d2fe; font-size: 12px; }

  .dd-total-icon {
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

  .dd-total-label { display: block; margin-bottom: 5px; color: #c7d2fe; font-size: 11px; }

  .dd-total-amount {
    display: block;
    color: white;
    font-size: clamp(24px, 2.5vw, 31px);
    font-weight: 850;
    letter-spacing: -.7px;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }

  .dd-summary-divider { height: 1px; margin: 21px 0 9px; background: rgba(255,255,255,.15); }

  .dd-summary-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,.12);
  }

  .dd-summary-row:last-child { border-bottom: 0; padding-bottom: 0; }
  .dd-summary-row span { color: #c7d2fe; font-size: 11px; }
  .dd-summary-row strong { color: white; font-size: 12px; font-weight: 750; overflow-wrap: anywhere; }

  .dd-timeline-card, .dd-help-card {
    margin-top: 16px;
    padding: 19px;
    background: white;
    border: 1px solid var(--dd-border);
    border-radius: 15px;
  }

  .gf-delivery-details .dd-timeline-card h3,
  .gf-delivery-details .dd-help-card h3 {
    margin: 0 0 16px;
    color: #1e293b;
    font-size: 13px;
    font-weight: 850;
  }

  .dd-timeline-item {
    position: relative;
    display: flex;
    gap: 11px;
    padding-bottom: 18px;
  }

  .dd-timeline-item:last-child { padding-bottom: 0; }
  .dd-timeline-dot { width: 10px; height: 10px; flex-shrink: 0; margin-top: 4px; border-radius: 50%; }
  .dd-dot-purple { background: #6366f1; box-shadow: 0 0 0 4px #eef2ff; }
  .dd-dot-green { background: #10b981; box-shadow: 0 0 0 4px #d1fae5; }

  .dd-timeline-item strong { display: block; color: #334155; font-size: 11px; font-weight: 800; }
  .dd-timeline-item p { margin: 4px 0 0; color: #94a3b8; font-size: 10px; }

  .dd-help-card { display: flex; align-items: flex-start; gap: 11px; }

  .dd-help-icon {
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

  .gf-delivery-details .dd-help-card h3 { margin-bottom: 6px; }
  .dd-help-card p { margin: 0 0 10px; color: #64748b; font-size: 11px; }
  .dd-help-card a { color: #4338ca; font-size: 11px; font-weight: 800; }

  .dd-error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 330px;
    padding: 25px;
    text-align: center;
    background: white;
    border: 1px solid var(--dd-border);
    border-radius: 17px;
  }

  .dd-error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    margin-bottom: 13px;
    color: #b91c1c;
    background: #fee2e2;
    border-radius: 50%;
    font-size: 23px;
    font-weight: 850;
  }

  .gf-delivery-details .dd-error-page h1 { margin: 0 0 7px; color: #1e293b; font-size: 21px; }
  .dd-error-page p { max-width: 540px; margin: 0 0 17px; color: #b91c1c; font-size: 12px; overflow-wrap: anywhere; }
  .dd-error-page .dd-primary-btn, .dd-error-page .dd-secondary-btn { margin: 4px; }

  .dd-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 13px;
    min-height: 300px;
    color: #64748b;
  }

  .dd-spinner {
    width: 31px;
    height: 31px;
    border: 3px solid #e0e7ff;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: dd-spin .7s linear infinite;
  }

  .dd-loading p { margin: 0; font-size: 13px; }

  @keyframes dd-spin { to { transform: rotate(360deg); } }

  @media (max-width: 1100px) {
    .dd-content { grid-template-columns: minmax(0, 1fr) 270px; gap: 16px; }
    .dd-card { padding: 20px; }
    .dd-summary-card { padding: 19px; }
  }

  @media (max-width: 850px) {
    .dd-content { grid-template-columns: minmax(0, 1fr); }
    .dd-sidebar { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 14px; }
    .dd-timeline-card, .dd-help-card { margin-top: 0; }
  }

  @media (max-width: 600px) {
    .gf-delivery-details { padding: 14px; }
    .dd-hero { align-items: flex-start; flex-direction: column; padding: 21px; }
    .dd-hero-actions { justify-content: flex-start; }
    .dd-title-row { align-items: flex-start; gap: 11px; }
    .dd-hero-icon { width: 48px; height: 48px; }
    .gf-delivery-details .dd-hero h1 { font-size: 25px; }
    .dd-card { padding: 17px; }
    .dd-info-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
    .dd-customer-profile { align-items: flex-start; flex-wrap: wrap; }
    .dd-view-customer { margin-left: 61px; }
    .dd-cylinder-panel { align-items: flex-start; flex-wrap: wrap; }
    .dd-capacity { margin-left: 66px; padding-left: 0; border-left: 0; }
    .dd-sidebar { grid-template-columns: minmax(0, 1fr); }
    .dd-bottom-actions { flex-direction: column; }
    .dd-bottom-actions a { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-delivery-details *, .gf-delivery-details *::before,
    .gf-delivery-details *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

export default DeliveryDetails;