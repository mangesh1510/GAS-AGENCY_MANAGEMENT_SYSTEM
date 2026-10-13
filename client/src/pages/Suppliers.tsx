import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Supplier {
  id: number;
  name: string;
  mobile: string | null;
  address: string | null;
  isActive: boolean;
  createdAt?: string;
}

const PAGE_SIZE = 10;

function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        throw new Error("Please log in to view suppliers.");
      }

      const response = await fetch(
        "http://localhost:5000/api/suppliers",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to fetch suppliers."
        );
      }

      const supplierData = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      setSuppliers(supplierData);
      setCurrentPage(1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const totalPages = Math.max(
    1,
    Math.ceil(suppliers.length / PAGE_SIZE)
  );

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const visibleSuppliers = suppliers.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  /* ---------- Presentation only ---------- */

  const activeCount = suppliers.filter((s) => s.isActive).length;
  const inactiveCount = suppliers.length - activeCount;

  const initials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <div className="sp">
      <style>{supplierStyles}</style>

      {/* Header */}
      <header className="sp-hero">
        <div className="sp-hero-text">
          <Link to="/" className="sp-crumb">
            ← Dashboard
          </Link>
          <h1>All Suppliers</h1>
          <p>Manage your registered GasFlow suppliers.</p>
        </div>

        <div className="sp-hero-actions">
          <button
            type="button"
            className="sp-btn sp-btn-ghost"
            onClick={() => void loadSuppliers()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>

          <Link to="/suppliers/add" className="sp-btn sp-btn-light">
            + Register Supplier
          </Link>
        </div>
      </header>

      {/* Summary chips */}
      {!loading && !error && suppliers.length > 0 && (
        <div className="sp-stats">
          <div className="sp-stat">
            <span className="sp-stat-label">Total Suppliers</span>
            <span className="sp-stat-value">{suppliers.length}</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-label">Active</span>
            <span className="sp-stat-value tone-green">{activeCount}</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-label">Inactive</span>
            <span className="sp-stat-value tone-grey">{inactiveCount}</span>
          </div>
        </div>
      )}

      {/* Panel */}
      <section className="sp-panel">
        <div className="sp-panel-head">
          <h2>Supplier List</h2>
          <span className="sp-count">Total suppliers: {suppliers.length}</span>
        </div>

        {loading ? (
          <div className="sp-skeleton-list" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="sp-skeleton-row" />
            ))}
            <p className="sp-loading-text">Loading suppliers…</p>
          </div>
        ) : error ? (
          <div className="sp-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="sp-btn sp-btn-primary"
              onClick={() => void loadSuppliers()}
            >
              Try Again
            </button>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-icon">🏢</div>
            <h3>No suppliers registered yet</h3>
            <p>Add your first supplier to get started.</p>
            <Link to="/suppliers/add" className="sp-btn sp-btn-primary">
              Register First Supplier
            </Link>
          </div>
        ) : (
          <>
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Supplier ID</th>
                    <th>Supplier Name</th>
                    <th>Mobile</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleSuppliers.map((supplier, index) => (
                    <tr key={supplier.id}>
                      <td className="muted">{startIndex + index + 1}</td>
                      <td className="muted">#{supplier.id}</td>
                      <td>
                        <div className="sp-name">
                          <span className="sp-avatar">
                            {initials(supplier.name)}
                          </span>
                          <span className="sp-name-text">{supplier.name}</span>
                        </div>
                      </td>
                      <td>{supplier.mobile || "—"}</td>
                      <td className="sp-address">{supplier.address || "—"}</td>
                      <td>
                        <span
                          className={
                            supplier.isActive
                              ? "sp-badge sp-badge-active"
                              : "sp-badge sp-badge-inactive"
                          }
                        >
                          <i />
                          {supplier.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="right">
                        <Link
                          to={`/suppliers/${supplier.id}/edit`}
                          className="sp-btn sp-btn-outline sp-btn-sm"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sp-pagination">
              <p>
                Showing {startIndex + 1}–
                {Math.min(startIndex + PAGE_SIZE, suppliers.length)} of{" "}
                {suppliers.length} suppliers
              </p>

              <div className="sp-pagination-buttons">
                <button
                  type="button"
                  className="sp-btn sp-btn-outline sp-btn-sm"
                  onClick={() => setCurrentPage((page) => page - 1)}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>

                <span className="sp-page-label">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  className="sp-btn sp-btn-outline sp-btn-sm"
                  onClick={() => setCurrentPage((page) => page + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="sp-back">
        <Link to="/">← Back to Dashboard</Link>
      </div>
    </div>
  );
}

const supplierStyles = `
  .sp {
    --ink: #0f172a;
    --text: #334155;
    --muted: #64748b;
    --line: #e5e9f0;
    --bg: #f4f6fb;
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
  .sp *, .sp *::before, .sp *::after { box-sizing: border-box; }
  .sp h1, .sp h2, .sp h3 { margin: 0; color: var(--ink); }
  .sp p { margin: 0; }
  .sp a { text-decoration: none; }

  /* Hero */
  .sp-hero {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 18px;
    padding: 26px 30px;
    color: #fff;
    border-radius: 20px;
    background: linear-gradient(120deg, #1e1b4b 0%, #3730a3 55%, #4f46e5 100%);
    box-shadow: 0 16px 34px rgba(55, 48, 163, .22);
  }
  .sp-hero::before, .sp-hero::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    background: rgba(255,255,255,.07);
  }
  .sp-hero::before { width: 260px; height: 260px; right: -70px; top: -120px; }
  .sp-hero::after { width: 150px; height: 150px; right: 150px; bottom: -105px; }
  .sp-hero-text, .sp-hero-actions { position: relative; z-index: 1; }
  .sp .sp-crumb {
    display: inline-block;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 650;
    color: rgba(255,255,255,.75);
    transition: color .15s ease;
  }
  .sp .sp-crumb:hover { color: #fff; }
  .sp .sp-hero h1 {
    color: #fff;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -.8px;
  }
  .sp .sp-hero p { margin-top: 6px; color: rgba(255,255,255,.8); }
  .sp-hero-actions { display: flex; flex-wrap: wrap; gap: 10px; }

  /* Buttons */
  .sp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    border: 1px solid transparent;
    border-radius: 11px;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, color .15s ease, transform .15s ease;
  }
  .sp-btn:disabled { opacity: .5; cursor: not-allowed; }
  .sp-btn-sm { padding: 7px 12px; font-size: 12px; border-radius: 9px; }
  .sp-btn-light { color: #3730a3; background: #fff; }
  .sp-btn-light:hover { background: #eef0ff; transform: translateY(-1px); }
  .sp-btn-ghost {
    color: #fff;
    background: rgba(255,255,255,.14);
    border-color: rgba(255,255,255,.28);
  }
  .sp-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.24); }
  .sp .sp-btn-primary { color: #fff; background: var(--brand); }
  .sp .sp-btn-primary:hover { background: var(--brand-dark); }
  .sp .sp-btn-outline { color: #3b4a73; background: #fff; border-color: var(--line); }
  .sp .sp-btn-outline:hover:not(:disabled) { background: #eef0ff; border-color: #c7cdf5; color: var(--brand-dark); }

  /* Stats */
  .sp-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-top: 20px;
  }
  .sp-stat {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 20px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .035);
  }
  .sp-stat-label { font-size: 13px; font-weight: 650; color: var(--muted); }
  .sp-stat-value {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -.8px;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .sp-stat-value.tone-green { color: #15803d; }
  .sp-stat-value.tone-grey { color: #64748b; }

  /* Panel */
  .sp-panel {
    margin-top: 20px;
    padding: 22px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 2px 10px rgba(15, 23, 42, .04);
  }
  .sp-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;
  }
  .sp-panel-head h2 { font-size: 18px; font-weight: 750; letter-spacing: -.3px; }
  .sp-count {
    padding: 4px 11px;
    font-size: 12px;
    font-weight: 700;
    color: #4338ca;
    background: #e0e7ff;
    border-radius: 999px;
  }

  /* Table */
  .sp-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 14px;
  }
  .sp-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
  .sp-table th {
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
  .sp-table td {
    padding: 14px 16px;
    color: var(--text);
    border-bottom: 1px solid #eef1f6;
    vertical-align: middle;
  }
  .sp-table tbody tr:last-child td { border-bottom: 0; }
  .sp-table tbody tr:hover td { background: #fafbff; }
  .sp-table .muted { color: var(--muted); font-variant-numeric: tabular-nums; }
  .sp-table .right { text-align: right; }
  .sp-address { max-width: 260px; overflow-wrap: anywhere; }

  .sp-name { display: flex; align-items: center; gap: 12px; min-width: 170px; }
  .sp-avatar {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    color: #4338ca;
    background: #e0e7ff;
    border-radius: 11px;
  }
  .sp-name-text { color: var(--ink); font-weight: 700; }

  .sp-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
    border-radius: 999px;
  }
  .sp-badge i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .sp-badge-active { color: #166534; background: #dcfce7; }
  .sp-badge-inactive { color: #475569; background: #e8ecf3; }

  /* Pagination */
  .sp-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 16px;
  }
  .sp-pagination p { color: var(--muted); font-size: 12.5px; }
  .sp-pagination-buttons { display: flex; align-items: center; gap: 10px; }
  .sp-page-label { font-size: 12.5px; font-weight: 700; color: var(--ink); white-space: nowrap; }

  /* States */
  .sp-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 44px 20px;
    text-align: center;
    background: #fafbff;
    border: 1px dashed #cfd8e6;
    border-radius: 14px;
  }
  .sp-empty-icon {
    width: 58px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    font-size: 26px;
    background: #e0e7ff;
    border-radius: 16px;
  }
  .sp-empty h3 { font-size: 17px; font-weight: 750; }
  .sp-empty p { margin: 6px 0 18px; color: var(--muted); }

  .sp-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px 18px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
  }
  .sp-error p { color: #991b1b; font-weight: 600; }

  .sp-skeleton-list { display: grid; gap: 10px; }
  .sp-skeleton-row {
    height: 54px;
    border-radius: 12px;
    background: linear-gradient(90deg, #e9edf5 25%, #f4f6fb 50%, #e9edf5 75%);
    background-size: 200% 100%;
    animation: sp-shimmer 1.3s infinite linear;
  }
  .sp-loading-text { text-align: center; color: var(--muted); font-weight: 600; margin-top: 6px; }
  @keyframes sp-shimmer { to { background-position: -200% 0; } }

  .sp-back { margin-top: 20px; }
  .sp-back a { font-size: 13px; font-weight: 700; color: var(--brand); transition: color .15s ease; }
  .sp-back a:hover { color: var(--brand-dark); }

  /* Responsive */
  @media (max-width: 720px) {
    .sp { padding: 14px; }
    .sp-hero { padding: 22px 20px; border-radius: 16px; }
    .sp-hero-actions { width: 100%; }
    .sp-hero-actions .sp-btn { flex: 1; }
    .sp-stats { grid-template-columns: 1fr; gap: 10px; }
    .sp-panel { padding: 16px; border-radius: 15px; }
    .sp-pagination { flex-direction: column; align-items: stretch; text-align: center; }
    .sp-pagination-buttons { justify-content: space-between; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sp-btn, .sp-skeleton-row { transition: none; animation: none; }
  }
`;

export default Suppliers;
