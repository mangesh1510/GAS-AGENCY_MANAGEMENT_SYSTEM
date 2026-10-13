
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type CylinderType = {
  id: number;
  name: string;
  capacityKg: string;
  sellingPrice: string;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const API_URL = "http://localhost:5000/api";

function CylinderTypeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cylinderType, setCylinderType] =
    useState<CylinderType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchCylinderType = async () => {
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

        const response = await fetch(
          `${API_URL}/cylinder-types/${id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("gasflow_token");
          navigate("/login", { replace: true });
          return;
        }

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.message || "Cylinder type not found."
          );
        }

        if (!result?.data) {
          throw new Error("Cylinder type data was not returned.");
        }

        setCylinderType(result.data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load cylinder type details."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCylinderType();

    return () => controller.abort();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!id || deleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${cylinderType?.name}"? This action may affect related inventory records.`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("gasflow_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      const response = await fetch(
        `${API_URL}/cylinder-types/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("gasflow_token");
        navigate("/login", { replace: true });
        return;
      }

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || "Failed to delete cylinder type."
        );
      }

      navigate("/cylinder-types", {
        replace: true,
        state: {
          successMessage: "Cylinder type deleted successfully.",
        },
      });
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Failed to delete cylinder type."
      );
    } finally {
      setDeleting(false);
    }
  };

  const formatPrice = (price: string | number) => {
    const value = Number(price);

    if (!Number.isFinite(value)) return "—";

    return value.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="gasflow-details-page">
        <style>{styles}</style>

        <div className="loading-container">
          <div className="spinner" />
          <h2>Loading cylinder details...</h2>
          <p>Please wait while we retrieve the information.</p>
        </div>
      </div>
    );
  }

  if (error || !cylinderType) {
    return (
      <div className="gasflow-details-page">
        <style>{styles}</style>

        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-icon">G</span>
            GasFlow
          </Link>
        </header>

        <main className="error-container">
          <div className="error-symbol">!</div>
          <h1>Cylinder Type Not Available</h1>
          <p>{error || "The requested cylinder type could not be found."}</p>

          <div className="error-actions">
            <Link to="/cylinder-types" className="secondary-button">
              ← Back to Cylinder Types
            </Link>

            <button
              type="button"
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  const threshold = cylinderType.lowStockThreshold ?? 5;

  return (
    <div className="gasflow-details-page">
      <style>{styles}</style>

      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-icon">G</span>
          GasFlow
        </Link>

        <Link to="/cylinder-types" className="dashboard-link">
          ← Back to Cylinder Types
        </Link>
      </header>

      <main className="page-container">
        <div className="breadcrumb">
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <Link to="/cylinder-types">Cylinder Types</Link>
          <span>/</span>
          <span className="breadcrumb-current">Details</span>
        </div>

        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">INVENTORY CONFIGURATION</span>
            <h1>Cylinder Type Details</h1>
            <p>
              View pricing, capacity, stock alert settings, and status for
              this cylinder type.
            </p>

            <div className="hero-actions">
              <Link
                to={`/cylinder-types/${cylinderType.id}/edit`}
                className="primary-button"
              >
                <span>✎</span> Edit Cylinder Type
              </Link>

              <span
                className={`hero-status ${
                  cylinderType.isActive ? "hero-active" : "hero-inactive"
                }`}
              >
                <span className="status-dot" />
                {cylinderType.isActive ? "Active" : "Inactive"}
              </span>
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

            <div className="floating-badge">
              <span className="online-dot" />
              Type #{cylinderType.id}
            </div>
          </div>
        </section>

        {deleteError && (
          <div className="alert-error" role="alert">
            <span className="alert-icon">!</span>
            <div>
              <strong>Unable to delete cylinder type</strong>
              <p>{deleteError}</p>
            </div>
          </div>
        )}

        <section className="summary-grid">
          <article className="summary-card">
            <div className="summary-icon purple-icon">▤</div>
            <div>
              <p>Capacity</p>
              <h2>{cylinderType.capacityKg} kg</h2>
              <span>Per cylinder</span>
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-icon green-icon">₹</div>
            <div>
              <p>Selling Price</p>
              <h2>{formatPrice(cylinderType.sellingPrice)}</h2>
              <span>Configured selling price</span>
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-icon orange-icon">!</div>
            <div>
              <p>Low-Stock Threshold</p>
              <h2>{threshold}</h2>
              <span>Cylinders or fewer</span>
            </div>
          </article>
        </section>

        <div className="details-layout">
          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>General Information</h2>
                <p>Core information about this cylinder type.</p>
              </div>

              <span className="id-badge">ID #{cylinderType.id}</span>
            </div>

            <div className="details-list">
              <div className="detail-row">
                <span className="detail-icon">▤</span>
                <div className="detail-copy">
                  <span>Cylinder Name</span>
                  <strong>{cylinderType.name}</strong>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">⚖</span>
                <div className="detail-copy">
                  <span>Capacity</span>
                  <strong>{cylinderType.capacityKg} kg</strong>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">₹</span>
                <div className="detail-copy">
                  <span>Selling Price</span>
                  <strong>{formatPrice(cylinderType.sellingPrice)}</strong>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">◉</span>
                <div className="detail-copy">
                  <span>Current Status</span>
                  <strong
                    className={
                      cylinderType.isActive ? "text-active" : "text-inactive"
                    }
                  >
                    {cylinderType.isActive ? "Active" : "Inactive"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <h2>Stock Alert Settings</h2>
                <p>Configured threshold for low-stock notifications.</p>
              </div>
            </div>

            <div className="threshold-panel">
              <div className="threshold-icon">!</div>
              <div>
                <p className="threshold-label">Low-Stock Threshold</p>
                <h3>{threshold} cylinders</h3>
                <p className="threshold-description">
                  Show a low-stock alert when the filled stock for this
                  cylinder type reaches {threshold} cylinders or fewer.
                </p>
              </div>
            </div>

            <div className="info-note">
              <span>ⓘ</span>
              <p>
                The alert depends on your inventory's filled-stock quantity
                and the low-stock rule implemented by your backend.
              </p>
            </div>
          </section>
        </div>

        <section className="content-card timestamps-card">
          <div className="section-heading">
            <div>
              <h2>Record Information</h2>
              <p>Creation and last update timestamps.</p>
            </div>
          </div>

          <div className="timestamp-grid">
            <div className="timestamp-item">
              <span className="timestamp-icon">＋</span>
              <div>
                <span>Created At</span>
                <strong>{formatDate(cylinderType.createdAt)}</strong>
              </div>
            </div>

            <div className="timestamp-item">
              <span className="timestamp-icon">↻</span>
              <div>
                <span>Last Updated</span>
                <strong>{formatDate(cylinderType.updatedAt)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="danger-zone">
          <div>
            <h3>Delete Cylinder Type</h3>
            <p>
              Remove this cylinder type if it is no longer required. Your
              backend may prevent deletion when related records exist.
            </p>
          </div>

          <button
            type="button"
            className="delete-button"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="button-spinner" />
                Deleting...
              </>
            ) : (
              <>⌫ Delete Cylinder Type</>
            )}
          </button>
        </section>

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

  .gasflow-details-page {
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
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
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

  .dashboard-link:hover,
  .breadcrumb a:hover {
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

  .breadcrumb-current {
    color: #4f496f;
    font-weight: 700;
  }

  .hero {
    min-height: 250px;
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
    margin: 0 0 22px;
    color: #e0ddf8;
    font-size: 14px;
    line-height: 1.7;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .primary-button {
    min-height: 43px;
    padding: 0 17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 10px;
    color: #5141a0;
    background: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 750;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .primary-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px #17113b30;
  }

  .hero-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #ffffff30;
    background: #ffffff13;
    font-size: 12px;
    font-weight: 700;
  }

  .hero-active {
    color: #b9f6d8;
  }

  .hero-inactive {
    color: #ffe0b2;
  }

  .status-dot,
  .online-dot {
    width: 7px;
    height: 7px;
    display: inline-block;
    border-radius: 50%;
  }

  .hero-active .status-dot,
  .online-dot {
    background: #75edbd;
  }

  .hero-inactive .status-dot {
    background: #ffbe73;
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

  .floating-badge {
    position: absolute;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border: 1px solid #ffffff38;
    border-radius: 11px;
    background: #ffffff19;
    color: #fff;
    font-size: 10px;
    font-weight: 650;
    white-space: nowrap;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 17px;
    margin: 22px 0;
  }

  .summary-card {
    min-width: 0;
    min-height: 115px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    background: #fff;
    border: 1px solid #ececf4;
    border-radius: 16px;
    box-shadow: 0 4px 12px #27204a05;
  }

  .summary-icon {
    flex: 0 0 auto;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    font-size: 20px;
    font-weight: 800;
  }

  .purple-icon {
    color: #6a55d7;
    background: #f0edff;
  }

  .green-icon {
    color: #209966;
    background: #e7f8ef;
  }

  .orange-icon {
    color: #d77b2e;
    background: #fff1e4;
  }

  .summary-card p {
    margin: 0 0 6px;
    color: #85849a;
    font-size: 12px;
    font-weight: 600;
  }

  .summary-card h2 {
    margin: 0 0 5px;
    color: #282540;
    font-size: clamp(17px, 1.7vw, 23px);
    overflow-wrap: anywhere;
    letter-spacing: -0.5px;
  }

  .summary-card span {
    color: #a09db0;
    font-size: 10px;
  }

  .details-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch;
    gap: 18px;
  }

  .content-card {
    min-width: 0;
    padding: 26px;
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
    margin-bottom: 22px;
  }

  .section-heading h2 {
    margin: 0 0 7px;
    color: #282540;
    font-size: 19px;
    letter-spacing: -0.4px;
  }

  .section-heading p {
    margin: 0;
    color: #9290a3;
    font-size: 12px;
    line-height: 1.6;
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

  .details-list {
    display: flex;
    flex-direction: column;
  }

  .detail-row {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 15px 0;
    border-bottom: 1px solid #f0eff6;
  }

  .detail-row:first-child {
    padding-top: 0;
  }

  .detail-row:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  .detail-icon {
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: #6b58d6;
    background: #f2efff;
    font-size: 17px;
    font-weight: 700;
  }

  .detail-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .detail-copy > span {
    color: #9491a5;
    font-size: 11px;
  }

  .detail-copy strong {
    color: #393550;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .text-active {
    color: #188759 !important;
  }

  .text-inactive {
    color: #bd792b !important;
  }

  .threshold-panel {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 18px;
    border: 1px solid #e8e2ff;
    border-radius: 13px;
    background: linear-gradient(140deg, #faf9ff, #f2efff);
  }

  .threshold-icon {
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: #6752d1;
    background: #e7e1ff;
    font-size: 19px;
    font-weight: 850;
  }

  .threshold-label {
    margin: 0 0 6px;
    color: #807a9e;
    font-size: 11px;
    font-weight: 650;
  }

  .threshold-panel h3 {
    margin: 0 0 11px;
    color: #4d3eaa;
    font-size: 23px;
  }

  .threshold-description {
    margin: 0;
    color: #77728f;
    font-size: 12px;
    line-height: 1.8;
  }

  .info-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 17px;
    padding: 13px;
    border-radius: 10px;
    background: #f7f8fc;
  }

  .info-note > span {
    color: #6c5bd0;
    font-size: 16px;
  }

  .info-note p {
    margin: 0;
    color: #858197;
    font-size: 11px;
    line-height: 1.8;
  }

  .timestamps-card {
    margin-top: 18px;
  }

  .timestamp-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 17px;
  }

  .timestamp-item {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    border: 1px solid #efedf6;
    border-radius: 12px;
    background: #fcfcff;
  }

  .timestamp-icon {
    flex: 0 0 auto;
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #f0edff;
    color: #6b58d6;
    font-size: 20px;
  }

  .timestamp-item > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .timestamp-item > div span {
    color: #9491a5;
    font-size: 11px;
  }

  .timestamp-item strong {
    color: #393550;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .danger-zone {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-top: 18px;
    padding: 23px 25px;
    border: 1px solid #f1dddd;
    border-radius: 16px;
    background: #fffafa;
  }

  .danger-zone h3 {
    margin: 0 0 7px;
    color: #a13e3e;
    font-size: 15px;
  }

  .danger-zone p {
    max-width: 660px;
    margin: 0;
    color: #9c8585;
    font-size: 12px;
    line-height: 1.8;
  }

  .delete-button {
    flex: 0 0 auto;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 15px;
    border: 1px solid #e9bcbc;
    border-radius: 10px;
    color: #b23b3b;
    background: #fff;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
    transition: background 0.2s;
  }

  .delete-button:hover:not(:disabled) {
    background: #fff0f0;
  }

  .delete-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .button-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #f0cccc;
    border-top-color: #b23b3b;
    border-radius: 50%;
    animation: gasflow-spin 0.7s linear infinite;
  }

  .alert-error {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 20px;
    padding: 15px;
    border: 1px solid #f2d0d0;
    border-radius: 12px;
    background: #fff5f5;
    color: #9c3434;
  }

  .alert-icon {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #ffe3e3;
    font-weight: 800;
  }

  .alert-error strong {
    font-size: 12px;
  }

  .alert-error p {
    margin: 4px 0 0;
    font-size: 12px;
    overflow-wrap: anywhere;
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

  .error-symbol {
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

  .error-container > p {
    margin: 0;
    color: #858197;
    font-size: 13px;
    line-height: 1.8;
  }

  .error-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-top: 22px;
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

  .error-actions .primary-button {
    color: #fff;
    background: linear-gradient(120deg, #5141a0, #8068e8);
  }

  @keyframes gasflow-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1000px) {
    .details-layout {
      grid-template-columns: 1fr;
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

    .summary-grid {
      grid-template-columns: 1fr;
      gap: 11px;
      margin: 15px 0;
    }

    .summary-card {
      min-height: 88px;
      padding: 17px;
    }

    .summary-card h2 {
      font-size: 21px;
    }

    .content-card {
      padding: 19px 15px;
      border-radius: 15px;
    }

    .timestamp-grid {
      grid-template-columns: 1fr;
    }

    .danger-zone {
      align-items: flex-start;
      flex-direction: column;
      padding: 19px;
    }

    .delete-button {
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

export default CylinderTypeDetails;
