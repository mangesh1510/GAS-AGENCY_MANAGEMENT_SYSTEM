import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

interface SupplierForm {
  name: string;
  mobile: string;
  address: string;
  isActive: boolean;
}

interface SupplierResponse {
  id: number;
  name: string;
  mobile: string | null;
  address: string | null;
  isActive: boolean;
}

/* ---------- UI-only helpers (same icon approach as Dashboard) ---------- */

const ICONS: Record<string, string> = {
  building: "M3 21h18 M5 21V7l8-4v18 M19 21V11l-6-4 M9 9v.01 M9 13v.01 M9 17v.01",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  back: "M19 12H5 M11 6l-6 6 6 6",
  check: "M20 6L9 17l-5-5",
  alert:
    "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5",
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

function EditSupplier() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SupplierForm>({
    name: "",
    mobile: "",
    address: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ---------------------------------------------------------------
  // BACKEND LOGIC: unchanged from the original file.
  // ---------------------------------------------------------------
  const loadSupplier = useCallback(async () => {
    try {
      if (!id || !/^[1-9]\d*$/.test(id)) {
        throw new Error("Invalid supplier ID.");
      }

      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        throw new Error("Please log in first.");
      }

      const response = await fetch(
        `http://localhost:5000/api/suppliers/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false || !result.data) {
        throw new Error(result.message || "Failed to load supplier.");
      }

      const supplier: SupplierResponse = result.data;

      setFormData({
        name: supplier.name ?? "",
        mobile: supplier.mobile ?? "",
        address: supplier.address ?? "",
        isActive: supplier.isActive ?? true,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load supplier."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === "isActive" ? value === "true" : value,
    }));
  };

  const updateSupplierStatus = async (isActive: boolean) => {
    if (!id) {
      setError("Invalid supplier ID.");
      return;
    }

    const action = isActive ? "reactivate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this supplier? Existing purchase records will be preserved.`
    );

    if (!confirmed) return;

    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        throw new Error("Please log in first.");
      }

      const response = await fetch(
        `http://localhost:5000/api/suppliers/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isActive }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || `Failed to ${action} supplier.`
        );
      }

      setFormData((previous) => ({
        ...previous,
        isActive,
      }));

      alert(`Supplier ${isActive ? "reactivated" : "deactivated"} successfully.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${action} supplier.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    // Validate Indian mobile number when provided.
    const mobile = formData.mobile.trim();
    const normalizedMobile = mobile.replace(/[\s()-]/g, "");

    if (
      mobile &&
      !/^(?:\+91|91)?[6-9]\d{9}$/.test(normalizedMobile)
    ) {
      setError(
        "Enter a valid Indian mobile number with 10 digits, starting with 6, 7, 8, or 9."
      );
      return;
    }

    if (!id) {
      setError("Invalid supplier ID.");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        throw new Error("Please log in first.");
      }

      const response = await fetch(
        `http://localhost:5000/api/suppliers/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            mobile: mobile || null,
            address: formData.address.trim() || null,
            isActive: formData.isActive,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        const validationErrors = Array.isArray(result.errors)
          ? result.errors.join("\n")
          : "";

        throw new Error(
          validationErrors ||
            result.message ||
            "Failed to update supplier."
        );
      }

      alert("Supplier updated successfully!");
      navigate("/suppliers");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update supplier."
      );
    } finally {
      setSaving(false);
    }
  };
  // ---------------------------------------------------------------
  // END OF BACKEND LOGIC
  // ---------------------------------------------------------------

  /* ---------- Presentation only (reads state, never calls the API) ---------- */

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const previewName = formData.name.trim();
  const previewMobile = formData.mobile.trim();
  const previewAddress = formData.address.trim();

  const initials =
    previewName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("") || "?";

  if (loading) {
    return (
      <div className="gf">
        <style>{supplierStyles}</style>
        <div className="gf-hero skeleton-hero" />
        <div className="gf-section">
          <div className="gf-two-col gf-form-layout">
            <div className="gf-card skeleton-card tall" />
            <div className="gf-card skeleton-card" />
          </div>
        </div>
        <p className="gf-loading-text">Loading supplier…</p>
      </div>
    );
  }

  return (
    <div className="gf">
      <style>{supplierStyles}</style>

      {/* Hero */}
      <header className="gf-hero">
        <div className="gf-hero-text">
          <span className="gf-hero-date">{todayLabel}</span>
          <h1>Edit Supplier</h1>
          <p>Update supplier information and account status.</p>
        </div>
        <Link to="/suppliers" className="gf-hero-btn">
          <Icon name="back" size={16} />
          Back to Suppliers
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

      <section className="gf-section">
        <div className="gf-two-col gf-form-layout">
          {/* Form */}
          <form onSubmit={handleSubmit} className="gf-card gf-form-card">
            <div className="gf-form-head">
              <span className="gf-icon tone-blue">
                <Icon name="building" />
              </span>
              <div>
                <h2>Supplier Details</h2>
                <p className="gf-note">
                  Only the supplier name is required.
                </p>
              </div>
            </div>

            <div className="gf-form-grid">
              <div className="gf-field">
                <label htmlFor="name">Supplier Name *</label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  required
                />
              </div>

              <div className="gf-field">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="10-digit Indian mobile number"
                  maxLength={15}
                />
              </div>

              <div className="gf-field gf-field-full">
                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  maxLength={250}
                />
              </div>

              <div className="gf-field">
                <label htmlFor="isActive">Supplier Status</label>
                <select
                  id="isActive"
                  name="isActive"
                  value={String(formData.isActive)}
                  onChange={handleChange}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="gf-form-actions">
              <button
                type="submit"
                className="gf-btn-primary"
                disabled={saving}
              >
                <Icon name="check" size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </button>

              {formData.isActive ? (
                <button
                  type="button"
                  className="gf-btn-danger"
                  onClick={() => void updateSupplierStatus(false)}
                  disabled={saving}
                >
                  {saving ? "Processing..." : "Deactivate Supplier"}
                </button>
              ) : (
                <button
                  type="button"
                  className="gf-btn-primary"
                  onClick={() => void updateSupplierStatus(true)}
                  disabled={saving}
                >
                  <Icon name="refresh" size={16} />
                  {saving ? "Processing..." : "Reactivate Supplier"}
                </button>
              )}

              <Link to="/suppliers" className="gf-btn-secondary">
                Cancel
              </Link>
            </div>
          </form>

          {/* Live preview */}
          <aside aria-label="Supplier preview">
            <div className="gf-section-head">
              <h2>Preview</h2>
              <span className="gf-pill">Live</span>
            </div>

            <div
              className={`gf-card gf-preview ${
                formData.isActive ? "action-blue" : "action-grey"
              }`}
            >
              <div className="gf-preview-top">
                <span className="gf-icon tone-blue gf-initials">
                  {initials}
                </span>
                <div className="gf-preview-title">
                  <h3 className={previewName ? "" : "gf-muted-text"}>
                    {previewName || "Supplier name"}
                  </h3>
                  <span
                    className={`gf-badge ${
                      formData.isActive ? "badge-active" : "badge-inactive"
                    }`}
                  >
                    {formData.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              </div>

              <div className="gf-preview-row">
                <span className="gf-preview-icon">
                  <Icon name="phone" size={16} />
                </span>
                <span className={previewMobile ? "" : "gf-muted-text"}>
                  {previewMobile || "No mobile number"}
                </span>
              </div>

              <div className="gf-preview-row">
                <span className="gf-preview-icon">
                  <Icon name="pin" size={16} />
                </span>
                <span className={previewAddress ? "" : "gf-muted-text"}>
                  {previewAddress || "No address"}
                </span>
              </div>
            </div>

            {!formData.isActive && (
              <p className="gf-note gf-status-note">
                Inactive suppliers keep their purchase records. Reactivate to
                use this supplier again.
              </p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

const supplierStyles = `
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
  .gf-section-head h2 { font-size: 18px; font-weight: 750; letter-spacing: -.3px; }
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

  .gf-two-col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    align-items: start;
  }
  .gf-form-layout { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); }

  /* Cards */
  .gf-card {
    min-width: 0;
    padding: 20px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .035);
    transition: box-shadow .18s ease, border-color .18s ease;
  }
  .gf-card:hover {
    border-color: #d2d9e6;
    box-shadow: 0 12px 26px rgba(15, 23, 42, .08);
  }
  .gf-note { margin-top: 2px; font-size: 12px; color: var(--muted); }

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
  .tone-blue { background: #e0e7ff; color: #4338ca; }
  .action-blue { border-left: 4px solid #6366f1; }
  .action-grey { border-left: 4px solid #cbd5e1; }

  /* Form */
  .gf-form-card { padding: 24px; }
  .gf-form-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 22px;
    padding-bottom: 18px;
    border-bottom: 1px solid #eef1f6;
  }
  .gf-form-head h2 { font-size: 16px; font-weight: 750; }

  .gf-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }
  .gf-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .gf-field-full { grid-column: 1 / -1; }
  .gf-field label { font-size: 13px; font-weight: 650; color: var(--ink); }
  .gf-field input,
  .gf-field select {
    width: 100%;
    height: 44px;
    padding: 0 14px;
    font: inherit;
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

  .gf-form-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
  }
  .gf-btn-primary,
  .gf-btn-danger {
    display: inline-flex;
    align-items: center;
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
  .gf-btn-danger {
    color: #b91c1c;
    background: #fff;
    border: 1px solid #fecaca;
  }
  .gf-btn-danger:hover:not(:disabled) { background: #fef2f2; border-color: #fca5a5; }
  .gf-btn-primary:disabled,
  .gf-btn-danger:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
  .gf-btn-secondary {
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 700;
    color: #3b4a73;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 11px;
    transition: background .15s ease, border-color .15s ease;
  }
  .gf-btn-secondary:hover { background: #eef0ff; border-color: #c7cdf5; }
  .gf-btn-primary:focus-visible,
  .gf-btn-danger:focus-visible,
  .gf-btn-secondary:focus-visible,
  .gf-hero-btn:focus-visible {
    outline: 3px solid #a5b4fc;
    outline-offset: 2px;
  }

  /* Preview */
  .gf-preview { display: flex; flex-direction: column; gap: 14px; padding: 22px; }
  .gf-preview-top { display: flex; align-items: center; gap: 14px; }
  .gf-preview-title { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
  .gf-preview-title h3 { font-size: 16px; font-weight: 750; overflow-wrap: anywhere; }
  .gf-initials { font-size: 15px; font-weight: 800; letter-spacing: .3px; }
  .gf-preview-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .gf-preview-icon {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    background: #f1f5f9;
    border-radius: 8px;
  }
  .gf-preview-row > span:last-child { padding-top: 4px; }
  .gf-muted-text { color: #94a3b8; font-weight: 500; }
  .gf-status-note { margin-top: 12px; line-height: 1.6; }

  .gf-badge {
    display: inline-flex;
    padding: 4px 10px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .3px;
    white-space: nowrap;
    border-radius: 999px;
  }
  .badge-active { color: #047857; background: #d1fae5; }
  .badge-inactive { color: #475569; background: #e2e8f0; }

  /* Error */
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

  /* Loading skeleton */
  .skeleton-hero, .skeleton-card {
    background: linear-gradient(90deg, #e9edf5 25%, #f4f6fb 50%, #e9edf5 75%);
    background-size: 200% 100%;
    animation: gf-shimmer 1.3s infinite linear;
    border: 0;
    box-shadow: none;
  }
  .skeleton-hero { height: 112px; margin-bottom: 30px; }
  .skeleton-card { height: 180px; }
  .skeleton-card.tall { height: 340px; }
  .skeleton-card:hover { box-shadow: none; }
  .gf-loading-text { margin-top: 22px; text-align: center; color: var(--muted); font-weight: 600; }
  @keyframes gf-shimmer { to { background-position: -200% 0; } }

  /* Responsive */
  @media (max-width: 1180px) {
    .gf-form-layout { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .gf { padding: 14px; }
    .gf-hero { padding: 22px 20px; border-radius: 16px; }
    .gf-hero-btn { display: none; }
    .gf-form-grid { grid-template-columns: 1fr; }
    .gf-form-actions > * { flex: 1 1 100%; justify-content: center; text-align: center; }
    .gf-section { margin-top: 24px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gf-card, .gf-hero-btn, .gf-btn-primary, .gf-btn-danger, .gf-btn-secondary,
    .gf-field input, .gf-field select, .skeleton-hero, .skeleton-card { transition: none; animation: none; }
  }
`;

export default EditSupplier;
