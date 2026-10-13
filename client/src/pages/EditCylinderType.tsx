
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type CylinderType = {
  id: number;
  name: string;
  capacityKg: string | number;
  sellingPrice: string | number;
  purchasePrice?: string | number | null;
  lowStockThreshold?: number | null;
  isActive: boolean;
};

const API_URL = "http://localhost:5000/api";

function EditCylinderType() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [capacityKg, setCapacityKg] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadCylinderType = async () => {
      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      if (!id || !/^\d+$/.test(id)) {
        setError("Invalid cylinder type ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/cylinder-types/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        if (response.status === 401) {
          localStorage.removeItem("gasflow_token");
          navigate("/login", { replace: true });
          return;
        }

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.message || "Failed to load cylinder type."
          );
        }

        if (!result?.data) {
          throw new Error("Cylinder type details were not returned.");
        }

        const cylinderType: CylinderType = result.data;

        setName(cylinderType.name ?? "");
        setCapacityKg(String(cylinderType.capacityKg ?? ""));
        setSellingPrice(String(cylinderType.sellingPrice ?? ""));
        setPurchasePrice(String(cylinderType.purchasePrice ?? 0));
        setLowStockThreshold(
          String(cylinderType.lowStockThreshold ?? 5)
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load cylinder type."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadCylinderType();

    return () => controller.abort();
  }, [id, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving || !id) return;

    const trimmedName = name.trim();
    const capacity = Number(capacityKg);
    const selling = Number(sellingPrice);
    const purchase = Number(purchasePrice);
    const threshold = Number(lowStockThreshold);

    if (trimmedName.length < 2) {
      setError("Cylinder type name must contain at least 2 characters.");
      return;
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      setError("Capacity must be greater than zero.");
      return;
    }

    if (!Number.isFinite(selling) || selling < 0) {
      setError("Selling price cannot be negative.");
      return;
    }

    if (!Number.isFinite(purchase) || purchase < 0) {
      setError("Purchase price cannot be negative.");
      return;
    }

    if (
      !Number.isInteger(threshold) ||
      threshold < 0
    ) {
      setError("Low-stock threshold must be a non-negative whole number.");
      return;
    }

    const token = localStorage.getItem("gasflow_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/cylinder-types/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
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

      if (!response.ok) {
        throw new Error(
          result?.message || "Failed to update cylinder type."
        );
      }

      setSuccess("Cylinder type updated successfully.");

      // Allow the success message to be visible before navigating.
      window.setTimeout(() => {
        navigate(`/cylinder-types/${id}`, {
          replace: true,
          state: {
            successMessage: "Cylinder type updated successfully.",
          },
        });
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update cylinder type."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="gasflow-edit-page">
        <style>{styles}</style>

        <div className="loading-container">
          <div className="spinner" />
          <h2>Loading cylinder details...</h2>
          <p>Preparing your editing form.</p>
        </div>
      </div>
    );
  }

  if (error && !name && !capacityKg && !sellingPrice) {
    return (
      <div className="gasflow-edit-page">
        <style>{styles}</style>

        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-icon">G</span>
            GasFlow
          </Link>
        </header>

        <main className="error-container">
          <div className="error-icon">!</div>
          <h1>Unable to Load Cylinder Type</h1>
          <p>{error}</p>
          <Link to="/cylinder-types" className="secondary-button">
            ← Back to Cylinder Types
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="gasflow-edit-page">
      <style>{styles}</style>

      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-icon">G</span>
          GasFlow
        </Link>

        <Link to={`/cylinder-types/${id}`} className="dashboard-link">
          ← Back to Cylinder Details
        </Link>
      </header>

      <main className="page-container">
        <div className="breadcrumb">
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <Link to="/cylinder-types">Cylinder Types</Link>
          <span>/</span>
          <Link to={`/cylinder-types/${id}`}>Details</Link>
          <span>/</span>
          <span className="breadcrumb-current">Edit</span>
        </div>

        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">INVENTORY CONFIGURATION</span>
            <h1>Edit Cylinder Type</h1>
            <p>
              Update cylinder capacity, pricing, and low-stock alert settings
              for your gas agency.
            </p>

            <div className="record-badge">
              <span className="record-dot" />
              Editing Cylinder #{id}
            </div>
          </div>

          <div className="hero-decoration" aria-hidden="true">
            <div className="cylinder-illustration">
              <div className="cylinder-neck" />
              <div className="cylinder-body">
                <div className="cylinder-label">GAS</div>
                <div className="cylinder-line" />
                <div className="cylinder-line short" />
              </div>
              <div className="cylinder-base" />
            </div>
          </div>
        </section>

        <div className="form-layout">
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>Cylinder Information</h2>
                <p>Update the fields below and save your changes.</p>
              </div>

              <span className="id-badge">ID #{id}</span>
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                <span className="alert-icon">!</span>
                <div>
                  <strong>Unable to update cylinder type</strong>
                  <p>{error}</p>
                </div>
                <button
                  type="button"
                  className="alert-close"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="alert alert-success" role="status">
                <span className="success-icon">✓</span>
                <div>
                  <strong>Changes saved</strong>
                  <p>{success}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-section-title">
                <span className="section-number">01</span>
                <div>
                  <h3>Basic Information</h3>
                  <p>Identify your cylinder type.</p>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="name">
                  Cylinder Type Name <span className="required">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Domestic LPG"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={saving}
                />
                <small>Use a clear, recognizable name.</small>
              </div>

              <div className="form-section-title section-spaced">
                <span className="section-number">02</span>
                <div>
                  <h3>Pricing & Capacity</h3>
                  <p>Set the cylinder weight and pricing.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="field-group">
                  <label htmlFor="capacityKg">
                    Capacity <span className="required">*</span>
                  </label>
                  <div className="input-with-suffix">
                    <input
                      id="capacityKg"
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={capacityKg}
                      onChange={(event) =>
                        setCapacityKg(event.target.value)
                      }
                      placeholder="14.2"
                      required
                      disabled={saving}
                    />
                    <span>kg</span>
                  </div>
                  <small>Capacity in kilograms.</small>
                </div>

                <div className="field-group">
                  <label htmlFor="sellingPrice">
                    Selling Price <span className="required">*</span>
                  </label>
                  <div className="input-with-prefix">
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
                      placeholder="950.00"
                      required
                      disabled={saving}
                    />
                  </div>
                  <small>Price charged per cylinder.</small>
                </div>

                <div className="field-group full-width">
                  <label htmlFor="purchasePrice">
                    Purchase Price <span className="required">*</span>
                  </label>
                  <div className="input-with-prefix">
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
                      placeholder="800.00"
                      required
                      disabled={saving}
                    />
                  </div>
                  <small>
                    Your cost per cylinder, excluding costs not included
                    in this price.
                  </small>
                </div>
              </div>

              <div className="form-section-title section-spaced">
                <span className="section-number">03</span>
                <div>
                  <h3>Stock Alert Settings</h3>
                  <p>Choose when the low-stock warning should appear.</p>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="lowStockThreshold">
                  Low-Stock Threshold <span className="required">*</span>
                </label>
                <div className="input-with-suffix">
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
                    disabled={saving}
                  />
                  <span>cylinders</span>
                </div>
                <small>
                  A warning should appear when filled stock reaches this
                  quantity or fewer.
                </small>
              </div>

              <div className="threshold-preview">
                <div className="preview-icon">!</div>
                <div>
                  <strong>Alert preview</strong>
                  <p>
                    Low-stock warning at{" "}
                    <strong>
                      {lowStockThreshold === ""
                        ? "0"
                        : lowStockThreshold}{" "}
                      cylinders
                    </strong>{" "}
                    or fewer.
                  </p>
                </div>
              </div>

              <div className="form-actions">
                <Link
                  to={`/cylinder-types/${id}`}
                  className="cancel-button"
                  aria-disabled={saving}
                  onClick={(event) => {
                    if (saving) event.preventDefault();
                  }}
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner" />
                      Saving Changes...
                    </>
                  ) : (
                    <>✓ Update Cylinder Type</>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="sidebar">
            <section className="side-card">
              <div className="side-heading">
                <span className="side-icon">✦</span>
                <h3>Editing Tips</h3>
              </div>

              <div className="tip-item">
                <span className="tip-check">✓</span>
                <p>Double-check the cylinder capacity before saving.</p>
              </div>

              <div className="tip-item">
                <span className="tip-check">✓</span>
                <p>Keep selling and purchase prices accurate.</p>
              </div>

              <div className="tip-item">
                <span className="tip-check">✓</span>
                <p>Choose a threshold suitable for your stock levels.</p>
              </div>
            </section>

            <section className="side-card">
              <div className="side-heading">
                <span className="side-icon purple-side-icon">₹</span>
                <h3>Price Overview</h3>
              </div>

              <div className="price-overview-row">
                <span>Selling Price</span>
                <strong>
                  ₹
                  {Number(sellingPrice || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <div className="price-overview-row">
                <span>Purchase Price</span>
                <strong>
                  ₹
                  {Number(purchasePrice || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <div className="price-note">
                This is a price overview only. Actual profit may depend on
                other costs and adjustments.
              </div>
            </section>

            <div className="help-card">
              <span className="help-icon">ⓘ</span>
              <div>
                <strong>Remember</strong>
                <p>
                  Changes are saved to your cylinder type record after the
                  server confirms the update.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="page-footer">
          <span>GasFlow Inventory Management</span>
          <Link to="/cylinder-types">Return to Cylinder Types →</Link>
        </footer>
      </main>
    </div>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .gasflow-edit-page {
    min-height: 100vh;
    padding-bottom: 30px;
    background: #f5f6fb;
    color: #25233f;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .topbar {
    min-height: 72px;
    padding: 0 6%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: #fff;
    border-bottom: 1px solid #ececf4;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #24213f;
    font-size: 21px;
    font-weight: 800;
    text-decoration: none;
  }

  .brand-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: #fff;
    background: linear-gradient(135deg, #6157d9, #8b5cf6);
    box-shadow: 0 5px 12px #7662dc40;
  }

  .dashboard-link {
    color: #65647b;
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
  }

  .dashboard-link:hover {
    color: #6556d9;
  }

  .page-container {
    width: 88%;
    max-width: 1240px;
    margin: 28px auto 0;
  }

  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    color: #a09db1;
    font-size: 12px;
  }

  .breadcrumb a {
    color: #77748e;
    text-decoration: none;
  }

  .breadcrumb a:hover {
    color: #6556d9;
  }

  .breadcrumb-current {
    color: #4f496f;
    font-weight: 700;
  }

  .hero {
    min-height: 245px;
    padding: 34px 42px;
    border-radius: 23px;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    background: linear-gradient(115deg, #28244f, #5141a0 58%, #7661db);
    color: #fff;
    box-shadow: 0 14px 35px #39306c20;
  }

  .hero::before,
  .hero::after {
    content: "";
    position: absolute;
    border: 1px solid #ffffff16;
    border-radius: 50%;
    pointer-events: none;
  }

  .hero::before {
    width: 310px;
    height: 310px;
    top: -170px;
    right: 4%;
  }

  .hero::after {
    width: 400px;
    height: 400px;
    right: -5%;
    bottom: -290px;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 650px;
  }

  .eyebrow {
    display: inline-block;
    margin-bottom: 12px;
    color: #d5d0ff;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 2px;
  }

  .hero h1 {
    margin: 0 0 12px;
    font-size: clamp(28px, 3vw, 38px);
    line-height: 1.15;
    letter-spacing: -1px;
  }

  .hero p {
    max-width: 520px;
    margin: 0 0 20px;
    color: #e0ddf8;
    font-size: 14px;
    line-height: 1.7;
  }

  .record-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border: 1px solid #ffffff30;
    border-radius: 10px;
    background: #ffffff13;
    color: #eeebff;
    font-size: 11px;
    font-weight: 700;
  }

  .record-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #75edbd;
  }

  .hero-decoration {
    width: 215px;
    min-width: 175px;
    height: 195px;
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
  }

  .cylinder-illustration {
    display: flex;
    flex-direction: column;
    align-items: center;
    filter: drop-shadow(0 14px 15px #1c163e40);
    transform: scale(0.9);
  }

  .cylinder-neck {
    width: 35px;
    height: 19px;
    border-radius: 5px 5px 0 0;
    background: linear-gradient(90deg, #f1efff, #b7afff);
  }

  .cylinder-body {
    width: 92px;
    height: 120px;
    border: 1px solid #ffffff85;
    border-radius: 24px 24px 15px 15px;
    background: linear-gradient(90deg, #bcb2ff, #fff 43%, #c9c0ff);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }

  .cylinder-label {
    color: #5445a8;
    font-size: 17px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .cylinder-line {
    width: 45px;
    height: 4px;
    border-radius: 4px;
    background: #9b8bea;
  }

  .cylinder-line.short {
    width: 28px;
    opacity: 0.6;
  }

  .cylinder-base {
    width: 103px;
    height: 9px;
    border-radius: 4px 4px 9px 9px;
    background: #b0a5fa;
  }

  .form-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.8fr);
    align-items: start;
    gap: 20px;
    margin-top: 22px;
  }

  .content-card,
  .side-card {
    min-width: 0;
    padding: 27px;
    border: 1px solid #ececf4;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 5px 20px #29234c05;
  }

  .section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 25px;
  }

  .section-heading h2 {
    margin: 0 0 7px;
    color: #282540;
    font-size: 20px;
    letter-spacing: -0.4px;
  }

  .section-heading p {
    margin: 0;
    color: #9290a3;
    font-size: 12px;
    line-height: 1.7;
  }

  .id-badge {
    padding: 7px 10px;
    border-radius: 8px;
    color: #6554ce;
    background: #f0edff;
    font-size: 11px;
    font-weight: 750;
    white-space: nowrap;
  }

  .form-section-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .section-spaced {
    margin-top: 30px;
  }

  .section-number {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #f0edff;
    color: #6653d0;
    font-size: 11px;
    font-weight: 850;
  }

  .form-section-title h3 {
    margin: 0 0 5px;
    color: #36334f;
    font-size: 14px;
  }

  .form-section-title p {
    margin: 0;
    color: #9692a7;
    font-size: 11px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 8px;
    margin-bottom: 19px;
  }

  .field-group label {
    color: #4b4764;
    font-size: 12px;
    font-weight: 750;
  }

  .required {
    color: #d74f64;
  }

  .field-group input {
    width: 100%;
    min-width: 0;
    height: 45px;
    padding: 0 13px;
    border: 1px solid #e5e3ef;
    border-radius: 10px;
    outline: none;
    background: #fcfcff;
    color: #302d49;
    font: inherit;
    font-size: 13px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .field-group input:focus {
    border-color: #8271e5;
    box-shadow: 0 0 0 3px #8271e51a;
  }

  .field-group input:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .field-group small {
    color: #9692a7;
    font-size: 10px;
    line-height: 1.7;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 16px;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .input-with-prefix,
  .input-with-suffix {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 45px;
    border: 1px solid #e5e3ef;
    border-radius: 10px;
    overflow: hidden;
    background: #fcfcff;
  }

  .input-with-prefix:focus-within,
  .input-with-suffix:focus-within {
    border-color: #8271e5;
    box-shadow: 0 0 0 3px #8271e51a;
  }

  .input-with-prefix > span,
  .input-with-suffix > span {
    flex: 0 0 auto;
    padding: 0 12px;
    color: #79748f;
    font-size: 12px;
    font-weight: 700;
  }

  .input-with-prefix input,
  .input-with-suffix input {
    flex: 1;
    width: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
  }

  .input-with-prefix input:focus,
  .input-with-suffix input:focus {
    border: none;
    box-shadow: none;
  }

  .threshold-preview {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 6px;
    padding: 15px;
    border: 1px solid #e8e2ff;
    border-radius: 12px;
    background: linear-gradient(140deg, #faf9ff, #f2efff);
  }

  .preview-icon {
    flex: 0 0 auto;
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: #e7e1ff;
    color: #6752d1;
    font-size: 17px;
    font-weight: 850;
  }

  .threshold-preview > div:last-child {
    min-width: 0;
  }

  .threshold-preview > div > strong {
    color: #4d4681;
    font-size: 12px;
  }

  .threshold-preview p {
    margin: 6px 0 0;
    color: #77728f;
    font-size: 11px;
    line-height: 1.8;
  }

  .threshold-preview p strong {
    color: #5542c4;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 27px;
    padding-top: 22px;
    border-top: 1px solid #efedf6;
  }

  .cancel-button,
  .save-button {
    min-height: 44px;
    padding: 0 17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;
    cursor: pointer;
  }

  .cancel-button {
    border: 1px solid #e2dff0;
    background: #fff;
    color: #68647e;
  }

  .cancel-button:hover {
    background: #f8f7fc;
  }

  .save-button {
    border: none;
    color: #fff;
    background: linear-gradient(120deg, #5141a0, #8068e8);
    box-shadow: 0 5px 13px #6553cc25;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .save-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px #6553cc35;
  }

  .save-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .button-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #ffffff65;
    border-top-color: #fff;
    border-radius: 50%;
    animation: gasflow-spin 0.7s linear infinite;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 17px;
  }

  .side-card {
    padding: 22px;
  }

  .side-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  .side-heading h3 {
    margin: 0;
    color: #34314e;
    font-size: 15px;
  }

  .side-icon {
    width: 35px;
    height: 35px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #e8f8ef;
    color: #229968;
    font-size: 17px;
    font-weight: 800;
  }

  .purple-side-icon {
    color: #6653d0;
    background: #f0edff;
  }

  .tip-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;
  }

  .tip-item:last-child {
    margin-bottom: 0;
  }

  .tip-check {
    flex: 0 0 auto;
    width: 19px;
    height: 19px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #e8f8ef;
    color: #229968;
    font-size: 11px;
    font-weight: 850;
  }

  .tip-item p {
    margin: 1px 0 0;
    color: #77748c;
    font-size: 11px;
    line-height: 1.8;
  }

  .price-overview-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 13px 0;
    border-bottom: 1px solid #f0eff6;
  }

  .price-overview-row span {
    color: #8c899f;
    font-size: 11px;
  }

  .price-overview-row strong {
    color: #494560;
    font-size: 13px;
    overflow-wrap: anywhere;
    text-align: right;
  }

  .price-overview-row:first-of-type strong {
    color: #5846c0;
  }

  .price-note {
    margin-top: 14px;
    color: #9692a7;
    font-size: 10px;
    line-height: 1.8;
  }

  .help-card {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 17px;
    border: 1px solid #e4e1f6;
    border-radius: 14px;
    background: #f6f4ff;
  }

  .help-icon {
    flex: 0 0 auto;
    color: #6a58d4;
    font-size: 19px;
  }

  .help-card strong {
    color: #4d4681;
    font-size: 12px;
  }

  .help-card p {
    margin: 6px 0 0;
    color: #827d9d;
    font-size: 11px;
    line-height: 1.8;
  }

  .alert {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
    padding: 14px;
    border-radius: 12px;
  }

  .alert-error {
    border: 1px solid #f2d0d0;
    background: #fff5f5;
    color: #9c3434;
  }

  .alert-success {
    border: 1px solid #c7eed9;
    background: #effbf4;
    color: #187b4f;
  }

  .alert-icon,
  .success-icon {
    flex: 0 0 auto;
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-weight: 850;
  }

  .alert-icon {
    background: #ffe3e3;
  }

  .success-icon {
    background: #d8f6e5;
  }

  .alert > div {
    flex: 1;
    min-width: 0;
  }

  .alert strong {
    font-size: 12px;
  }

  .alert p {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }

  .alert-close {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 22px;
    cursor: pointer;
  }

  .loading-container {
    min-height: 75vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #292641;
  }

  .loading-container h2 {
    margin: 18px 0 6px;
    font-size: 18px;
  }

  .loading-container p {
    margin: 0;
    color: #8b879f;
    font-size: 13px;
  }

  .spinner {
    width: 38px;
    height: 38px;
    border: 3px solid #e6e1fb;
    border-top-color: #6d59d9;
    border-radius: 50%;
    animation: gasflow-spin 0.8s linear infinite;
  }

  .error-container {
    width: 90%;
    max-width: 600px;
    min-height: 65vh;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .error-icon {
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: #fff0f0;
    color: #b23b3b;
    font-size: 28px;
    font-weight: 850;
  }

  .error-container h1 {
    margin: 18px 0 8px;
    font-size: 25px;
  }

  .error-container p {
    margin: 0 0 22px;
    color: #858197;
    font-size: 13px;
    line-height: 1.8;
  }

  .secondary-button {
    min-height: 42px;
    padding: 0 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2dff0;
    border-radius: 10px;
    background: #fff;
    color: #6553cc;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
  }

  .page-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 22px 3px 0;
    color: #9a97aa;
    font-size: 11px;
  }

  .page-footer a {
    color: #6a58d4;
    text-decoration: none;
    font-weight: 650;
  }

  @keyframes gasflow-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1000px) {
    .form-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .sidebar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .help-card {
      grid-column: 1 / -1;
    }

    .hero-decoration {
      transform: scale(0.88);
      transform-origin: center right;
    }
  }

  @media (max-width: 700px) {
    .topbar {
      min-height: 64px;
      padding: 0 5%;
    }

    .brand {
      font-size: 18px;
    }

    .page-container {
      width: 92%;
      margin-top: 18px;
    }

    .hero {
      min-height: auto;
      padding: 27px 23px;
      border-radius: 17px;
    }

    .hero-decoration {
      display: none;
    }

    .hero h1 {
      font-size: 29px;
    }

    .hero p {
      font-size: 13px;
    }

    .content-card {
      padding: 20px 15px;
      border-radius: 15px;
    }

    .form-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .full-width {
      grid-column: auto;
    }

    .sidebar {
      display: flex;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .cancel-button,
    .save-button {
      width: 100%;
    }

    .page-footer {
      flex-direction: column;
      align-items: flex-start;
    }

    .breadcrumb {
      gap: 7px;
      font-size: 11px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

export default EditCylinderType;
