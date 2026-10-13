import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ---------- UI-only helpers (same icon approach as Dashboard) ---------- */

const ICONS: Record<string, string> = {
  building: "M3 21h18 M5 21V7l8-4v18 M19 21V11l-6-4 M9 9v.01 M9 13v.01 M9 17v.01",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  back: "M19 12H5 M11 6l-6 6 6 6",
  check: "M20 6L9 17l-5-5",
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

function AddSupplier() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ---------------------------------------------------------------
  // BACKEND LOGIC: unchanged from the original file.
  // ---------------------------------------------------------------
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);

    try {
      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        throw new Error("Please log in before adding a supplier.");
      }

      const response = await fetch(
        "http://localhost:5000/api/suppliers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            mobile: formData.mobile.trim() || null,
            address: formData.address.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to register supplier."
        );
      }

      alert("Supplier registered successfully!");

      navigate("/suppliers");
    } catch (error) {
      console.error("Add supplier error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to register supplier."
      );
    } finally {
      setLoading(false);
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

  return (
    <div className="gf">
      <style>{supplierStyles}</style>

      {/* Hero */}
      <header className="gf-hero">
        <div className="gf-hero-text">
          <span className="gf-hero-date">{todayLabel}</span>
          <h1>Register Supplier</h1>
          <p>Add a new supplier to your GasFlow account.</p>
        </div>
        <Link to="/suppliers" className="gf-hero-btn">
          <Icon name="back" size={16} />
          Back to Suppliers
        </Link>
      </header>

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
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter supplier name"
                  maxLength={100}
                  required
                />
              </div>

              <div className="gf-field">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  id="mobile"
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  maxLength={15}
                />
              </div>

              <div className="gf-field gf-field-full">
                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter supplier address"
                  maxLength={250}
                />
              </div>
            </div>

            <div className="gf-form-actions">
              <button
                type="submit"
                className="gf-btn-primary"
                disabled={loading}
              >
                <Icon name="check" size={16} />
                {loading ? "Registering..." : "Register Supplier"}
              </button>

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

            <div className="gf-card gf-preview action-blue">
              <div className="gf-preview-top">
                <span className="gf-icon tone-blue gf-initials">
                  {initials}
                </span>
                <h3 className={previewName ? "" : "gf-muted-text"}>
                  {previewName || "Supplier name"}
                </h3>
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
  .gf-field input {
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
  .gf-field input::placeholder { color: #94a3b8; }
  .gf-field input:hover { border-color: #cbd5e1; }
  .gf-field input:focus {
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
  .gf-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 11px 18px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    background: var(--brand);
    border: 0;
    border-radius: 11px;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(79, 70, 229, .25);
    transition: background .15s ease;
  }
  .gf-btn-primary:hover:not(:disabled) { background: var(--brand-dark); }
  .gf-btn-primary:disabled { opacity: .65; cursor: not-allowed; box-shadow: none; }
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
  .gf-btn-secondary:focus-visible,
  .gf-hero-btn:focus-visible {
    outline: 3px solid #a5b4fc;
    outline-offset: 2px;
  }

  /* Preview */
  .gf-preview { display: flex; flex-direction: column; gap: 14px; padding: 22px; }
  .gf-preview-top { display: flex; align-items: center; gap: 14px; }
  .gf-preview-top h3 { font-size: 16px; font-weight: 750; overflow-wrap: anywhere; }
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
    .gf-card, .gf-hero-btn, .gf-btn-primary, .gf-btn-secondary, .gf-field input { transition: none; }
  }
`;

export default AddSupplier;
