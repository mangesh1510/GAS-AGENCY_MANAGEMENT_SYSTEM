
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

function AddCylinderType() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [capacityKg, setCapacityKg] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const capacity = Number(capacityKg);
    const selling = Number(sellingPrice);
    const purchase = Number(purchasePrice);
    const threshold = Number(lowStockThreshold);

    if (name.trim().length < 2) {
      setError("Cylinder type name must contain at least 2 characters.");
      return;
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      setError("Capacity must be greater than zero.");
      return;
    }

    if (
      sellingPrice.trim() === "" ||
      !Number.isFinite(selling) ||
      selling < 0
    ) {
      setError("Enter a valid selling price.");
      return;
    }

    if (
      purchasePrice.trim() === "" ||
      !Number.isFinite(purchase) ||
      purchase < 0
    ) {
      setError("Enter a valid purchase price.");
      return;
    }

    if (
      lowStockThreshold.trim() === "" ||
      !Number.isInteger(threshold) ||
      threshold < 0
    ) {
      setError("Low-stock threshold must be a non-negative whole number.");
      return;
    }

    const token = localStorage.getItem("gasflow_token");

    if (!token) {
      localStorage.removeItem("gasflow_token");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/cylinder-types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          capacityKg: capacity,
          sellingPrice: selling,
          purchasePrice: purchase,
          lowStockThreshold: threshold,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("gasflow_token");
        navigate("/login", { replace: true });
        return;
      }

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Failed to create cylinder type."
        );
      }

      setSuccess("Cylinder type created successfully.");
      setTimeout(() => navigate("/cylinder-types"), 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create cylinder type."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gf-add-cylinder">
      <style>{styles}</style>

      <header className="act-hero">
        <div>
          <Link to="/cylinder-types" className="act-back">
            ← Back to Cylinder Types
          </Link>

          <span className="act-eyebrow">GASFLOW • INVENTORY SETUP</span>
          <h1>Add Cylinder Type</h1>
          <p>
            Configure cylinder capacity, pricing, and stock alert settings.
          </p>
        </div>

        <div className="act-hero-icon" aria-hidden="true">
          <svg
            width="47"
            height="47"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3h8M9 3v3h6V3M7 6h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
            <path d="M12 10v7M8.5 13.5h7" />
          </svg>
        </div>
      </header>

      {error && (
        <div className="act-alert act-alert-error" role="alert">
          <span className="act-alert-icon">!</span>
          <div>
            <strong>Unable to create cylinder type</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="act-dismiss"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="act-alert act-alert-success" role="status">
          <span className="act-alert-icon">✓</span>
          <div>
            <strong>Success</strong>
            <p>{success}</p>
          </div>
        </div>
      )}

      <div className="act-layout">
        <main className="act-main">
          <form onSubmit={handleSubmit}>
            <section className="act-card">
              <div className="act-section-heading">
                <div className="act-section-icon act-purple">▤</div>
                <div>
                  <h2>Cylinder Information</h2>
                  <p>Enter the basic details of the cylinder type.</p>
                </div>
              </div>

              <div className="act-field">
                <label htmlFor="name">
                  Cylinder Type Name <span>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Domestic LPG Cylinder"
                  minLength={2}
                  maxLength={100}
                  autoComplete="off"
                  required
                />
                <small>Use a clear, recognizable name.</small>
              </div>

              <div className="act-field">
                <label htmlFor="capacityKg">
                  Capacity (KG) <span>*</span>
                </label>
                <div className="act-input-suffix">
                  <input
                    id="capacityKg"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={capacityKg}
                    onChange={(event) => setCapacityKg(event.target.value)}
                    placeholder="e.g. 14.2"
                    required
                  />
                  <span>KG</span>
                </div>
                <small>Enter the cylinder's capacity in kilograms.</small>
              </div>
            </section>

            <section className="act-card">
              <div className="act-section-heading">
                <div className="act-section-icon act-blue">₹</div>
                <div>
                  <h2>Pricing Information</h2>
                  <p>Set the selling price and purchase cost per cylinder.</p>
                </div>
              </div>

              <div className="act-fields-grid">
                <div className="act-field">
                  <label htmlFor="sellingPrice">
                    Selling Price (₹) <span>*</span>
                  </label>
                  <div className="act-input-suffix">
                    <span>₹</span>
                    <input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={sellingPrice}
                      onChange={(event) =>
                        setSellingPrice(event.target.value)
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <small>Amount charged per cylinder.</small>
                </div>

                <div className="act-field">
                  <label htmlFor="purchasePrice">
                    Purchase Price (₹) <span>*</span>
                  </label>
                  <div className="act-input-suffix">
                    <span>₹</span>
                    <input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(event) =>
                        setPurchasePrice(event.target.value)
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <small>Enter the cost per cylinder.</small>
                </div>
              </div>

              {sellingPrice !== "" && purchasePrice !== "" && (
                <div className="act-margin-preview">
                  <div>
                    <span>Price Difference</span>
                    <small>Selling price − purchase price</small>
                  </div>
                  <strong
                    className={
                      Number(sellingPrice) >= Number(purchasePrice)
                        ? "act-positive"
                        : "act-negative"
                    }
                  >
                    {Number(sellingPrice) - Number(purchasePrice) < 0
                      ? "−"
                      : ""}
                    ₹
                    {Math.abs(
                      Number(sellingPrice) - Number(purchasePrice)
                    ).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </div>
              )}

              <p className="act-help-note">
                Price difference is a simple comparison, not a complete profit
                calculation. Additional expenses and taxes may affect actual
                profit.
              </p>
            </section>

            <section className="act-card">
              <div className="act-section-heading">
                <div className="act-section-icon act-orange">⚑</div>
                <div>
                  <h2>Stock Alert Settings</h2>
                  <p>Choose when GasFlow should flag low filled stock.</p>
                </div>
              </div>

              <div className="act-field">
                <label htmlFor="lowStockThreshold">
                  Low-Stock Threshold <span>*</span>
                </label>
                <input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  step="1"
                  value={lowStockThreshold}
                  onChange={(event) =>
                    setLowStockThreshold(event.target.value)
                  }
                  required
                />
                <small>
                  A non-negative whole number of cylinders.
                </small>
              </div>

              <div className="act-threshold-preview">
                <span className="act-threshold-icon">!</span>
                <div>
                  <strong>Low-stock alert preview</strong>
                  <p>
                    An alert should appear when filled stock reaches{" "}
                    <strong>{lowStockThreshold || "0"}</strong> cylinder(s) or
                    fewer, provided your backend uses this threshold.
                  </p>
                </div>
              </div>
            </section>

            <div className="act-actions">
              <Link to="/cylinder-types" className="act-cancel">
                Cancel
              </Link>
              <button
                type="submit"
                className="act-submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="act-spinner" />
                    Saving...
                  </>
                ) : (
                  <>＋ Add Cylinder Type</>
                )}
              </button>
            </div>
          </form>
        </main>

        <aside className="act-sidebar">
          <section className="act-summary">
            <span className="act-summary-eyebrow">CONFIGURATION SUMMARY</span>
            <h2>Review Details</h2>
            <p className="act-summary-intro">
              Review the information before creating this cylinder type.
            </p>

            <div className="act-summary-icon">▤</div>
            <span className="act-summary-label">Cylinder Type</span>
            <strong className="act-summary-name">
              {name.trim() || "New cylinder type"}
            </strong>

            <div className="act-summary-divider" />

            <div className="act-summary-row">
              <span>Capacity</span>
              <strong>{capacityKg ? `${capacityKg} kg` : "—"}</strong>
            </div>
            <div className="act-summary-row">
              <span>Selling Price</span>
              <strong>
                {sellingPrice !== "" ? `₹${sellingPrice}` : "—"}
              </strong>
            </div>
            <div className="act-summary-row">
              <span>Purchase Price</span>
              <strong>
                {purchasePrice !== "" ? `₹${purchasePrice}` : "—"}
              </strong>
            </div>
            <div className="act-summary-row">
              <span>Low-Stock Threshold</span>
              <strong>{lowStockThreshold || "—"}</strong>
            </div>
          </section>

          <section className="act-tip">
            <span className="act-tip-icon">i</span>
            <div>
              <h3>Before you save</h3>
              <p>
                Confirm that the capacity and prices match your agency's
                records. The low-stock threshold should match your replenishment
                process.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

const styles = `
  .gf-add-cylinder {
    --act-ink: #111827;
    --act-text: #334155;
    --act-muted: #64748b;
    --act-border: #e5e9f2;
    min-height: 100%;
    padding: clamp(15px, 2.4vw, 30px);
    color: var(--act-text);
    background: #f4f6fb;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }

  .gf-add-cylinder *, .gf-add-cylinder *::before,
  .gf-add-cylinder *::after { box-sizing: border-box; }

  .gf-add-cylinder button, .gf-add-cylinder input { font: inherit; }
  .gf-add-cylinder a { text-decoration: none; }

  .act-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 23px;
    padding: 28px 32px;
    color: white;
    background: linear-gradient(120deg, #1e1b4b, #3730a3 58%, #6366f1);
    border-radius: 20px;
    box-shadow: 0 13px 30px rgba(55,48,163,.15);
  }

  .act-back {
    display: inline-block;
    margin-bottom: 16px;
    color: #e0e7ff;
    font-size: 12px;
    font-weight: 750;
  }

  .act-eyebrow {
    display: block;
    margin-bottom: 6px;
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 1.3px;
  }

  .gf-add-cylinder .act-hero h1 {
    margin: 0;
    color: white;
    font-size: clamp(25px, 3vw, 34px);
    font-weight: 900;
    letter-spacing: -.8px;
    line-height: 1.2;
  }

  .act-hero p { margin: 9px 0 0; color: #e0e7ff; font-size: 13px; }

  .act-hero-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    flex-shrink: 0;
    color: white;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 23px;
  }

  .act-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    align-items: start;
    gap: 22px;
  }

  .act-main, .act-sidebar { min-width: 0; }

  .act-card {
    margin-bottom: 19px;
    padding: 24px;
    background: white;
    border: 1px solid var(--act-border);
    border-radius: 17px;
    box-shadow: 0 3px 12px rgba(15,23,42,.025);
  }

  .act-section-heading {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 22px;
    padding-bottom: 17px;
    border-bottom: 1px solid #edf0f5;
  }

  .act-section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 41px;
    height: 41px;
    flex-shrink: 0;
    border-radius: 12px;
    font-size: 21px;
    font-weight: 850;
  }

  .act-purple { color: #4f46e5; background: #eef2ff; }
  .act-blue { color: #2563eb; background: #eff6ff; }
  .act-orange { color: #ea580c; background: #fff7ed; }

  .gf-add-cylinder .act-section-heading h2 {
    margin: 1px 0 0;
    color: var(--act-ink);
    font-size: 16px;
    font-weight: 850;
    letter-spacing: -.25px;
  }

  .act-section-heading p { margin: 5px 0 0; color: var(--act-muted); font-size: 11px; }

  .act-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 19px; }
  .act-field:last-child { margin-bottom: 0; }
  .act-field label { color: #334155; font-size: 11px; font-weight: 800; }
  .act-field label span { color: #dc2626; }

  .gf-add-cylinder .act-field > input,
  .gf-add-cylinder .act-input-suffix {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    color: #1e293b;
    background: #fbfcff;
    border: 1px solid #dfe5ef;
    border-radius: 9px;
  }

  .gf-add-cylinder .act-field > input {
    padding: 11px 12px;
    outline: none;
    font-size: 12px;
  }

  .act-input-suffix {
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .act-input-suffix > span {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    min-width: 40px;
    padding: 0 10px;
    color: #64748b;
    background: #f1f5f9;
    border-right: 1px solid #e2e8f0;
    font-size: 11px;
    font-weight: 800;
  }

  .act-input-suffix input {
    width: 100%;
    min-width: 0;
    min-height: 42px;
    padding: 10px 12px;
    color: #1e293b;
    background: transparent;
    border: 0;
    outline: 0;
    font-size: 12px;
  }

  .gf-add-cylinder .act-field > input:focus,
  .gf-add-cylinder .act-input-suffix:focus-within {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(99,102,241,.12);
  }

  .act-field small { color: #94a3b8; font-size: 10px; }
  .act-fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px; }

  .act-margin-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 7px;
    padding: 15px;
    background: #f8fafc;
    border: 1px solid #e5e9f2;
    border-radius: 11px;
  }

  .act-margin-preview > div { display: flex; flex-direction: column; gap: 3px; }
  .act-margin-preview span { color: #334155; font-size: 11px; font-weight: 850; }
  .act-margin-preview small { color: #94a3b8; font-size: 10px; }
  .act-margin-preview > strong { font-size: 18px; font-weight: 900; }
  .act-positive { color: #047857; }
  .act-negative { color: #dc2626; }

  .act-help-note { margin: 12px 0 0; color: #94a3b8; font-size: 10px; line-height: 1.7; }

  .act-threshold-preview {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 19px;
    padding: 15px;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: 11px;
  }

  .act-threshold-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 27px;
    height: 27px;
    flex-shrink: 0;
    color: #c2410c;
    background: #ffedd5;
    border-radius: 50%;
    font-weight: 900;
  }

  .act-threshold-preview > div { min-width: 0; }
  .act-threshold-preview strong { color: #9a3412; font-size: 11px; }
  .act-threshold-preview p { margin: 5px 0 0; color: #9a3412; font-size: 10px; }
  .act-threshold-preview p strong { font-weight: 900; }

  .act-actions { display: flex; justify-content: flex-end; gap: 11px; margin-bottom: 22px; }

  .act-cancel, .act-submit {
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

  .act-cancel { color: #475569; background: white; border: 1px solid #e2e8f0; }
  .act-cancel:hover { background: #f8fafc; }

  .act-submit { color: white; background: #4f46e5; border: 1px solid #4f46e5; }
  .act-submit:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }
  .act-submit:disabled { opacity: .65; cursor: not-allowed; }

  .act-summary {
    padding: 23px;
    color: white;
    background: linear-gradient(145deg, #1e1b4b, #3730a3 70%, #4f46e5);
    border-radius: 17px;
    box-shadow: 0 12px 25px rgba(55,48,163,.14);
  }

  .act-summary-eyebrow { color: #c7d2fe; font-size: 10px; font-weight: 850; letter-spacing: 1.1px; }

  .gf-add-cylinder .act-summary h2 {
    margin: 9px 0 5px;
    color: white;
    font-size: 20px;
    font-weight: 850;
  }

  .act-summary-intro { margin: 0 0 21px; color: #c7d2fe; font-size: 11px; }

  .act-summary-icon {
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
  }

  .act-summary-label { display: block; color: #c7d2fe; font-size: 11px; }
  .act-summary-name { display: block; margin-top: 4px; color: white; font-size: 19px; font-weight: 850; overflow-wrap: anywhere; }
  .act-summary-divider { height: 1px; margin: 20px 0 8px; background: rgba(255,255,255,.15); }

  .act-summary-row { display: flex; flex-direction: column; gap: 4px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.12); }
  .act-summary-row:last-child { padding-bottom: 0; border-bottom: 0; }
  .act-summary-row span { color: #c7d2fe; font-size: 11px; }
  .act-summary-row strong { color: white; font-size: 12px; font-weight: 800; overflow-wrap: anywhere; }

  .act-tip {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 16px;
    padding: 19px;
    background: white;
    border: 1px solid var(--act-border);
    border-radius: 15px;
  }

  .act-tip-icon {
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

  .gf-add-cylinder .act-tip h3 { margin: 0 0 8px; color: #1e293b; font-size: 12px; font-weight: 850; }
  .act-tip p { margin: 0; color: #64748b; font-size: 10px; line-height: 1.7; }

  .act-alert { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border: 1px solid; border-radius: 12px; }
  .act-alert-error { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
  .act-alert-success { color: #065f46; background: #ecfdf5; border-color: #a7f3d0; }
  .act-alert-icon { display: flex; align-items: center; justify-content: center; width: 25px; height: 25px; flex-shrink: 0; color: white; background: #dc2626; border-radius: 50%; font-weight: 900; }
  .act-alert-success .act-alert-icon { background: #059669; }
  .act-alert strong { display: block; font-size: 12px; }
  .act-alert p { margin: 3px 0 0; font-size: 11px; overflow-wrap: anywhere; }
  .act-dismiss { margin-left: auto; padding: 0 4px; color: inherit; background: transparent; border: 0; font-size: 22px; line-height: 1; }

  .act-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: act-spin .7s linear infinite; }
  @keyframes act-spin { to { transform: rotate(360deg); } }

  @media (max-width: 1000px) {
    .act-layout { grid-template-columns: minmax(0, 1fr) 270px; gap: 15px; }
    .act-card { padding: 19px; }
    .act-summary { padding: 19px; }
  }

  @media (max-width: 800px) {
    .act-layout { grid-template-columns: minmax(0, 1fr); }
    .act-sidebar { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 14px; }
    .act-tip { margin-top: 0; }
  }

  @media (max-width: 560px) {
    .gf-add-cylinder { padding: 12px; }
    .act-hero { align-items: flex-start; flex-direction: column-reverse; padding: 21px; }
    .act-hero-icon { width: 55px; height: 55px; border-radius: 15px; }
    .act-hero-icon svg { width: 32px; height: 32px; }
    .gf-add-cylinder .act-hero h1 { font-size: 25px; }
    .act-card { padding: 17px; }
    .act-fields-grid { grid-template-columns: minmax(0, 1fr); gap: 0; }
    .act-sidebar { grid-template-columns: minmax(0, 1fr); }
    .act-actions { flex-direction: column-reverse; }
    .act-actions > * { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .gf-add-cylinder *, .gf-add-cylinder *::before,
    .gf-add-cylinder *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

export default AddCylinderType;
