
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type CylinderType = {
  id: number;
  name: string;
  capacityKg: string;
  sellingPrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const API_URL = "http://localhost:5000/api";

function CylinderTypes() {
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const fetchCylinderTypes = async () => {
      const token = localStorage.getItem("gasflow_token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/cylinder-types`, {
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
            result?.message || "Failed to fetch cylinder types."
          );
        }

        if (!Array.isArray(result?.data)) {
          throw new Error("Unexpected response from the server.");
        }

        setCylinderTypes(result.data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading cylinder types."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCylinderTypes();

    return () => controller.abort();
  }, [navigate]);

  const filteredCylinderTypes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cylinderTypes.filter((cylinderType) => {
      const matchesSearch =
        cylinderType.name.toLowerCase().includes(query) ||
        String(cylinderType.capacityKg).includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && cylinderType.isActive) ||
        (statusFilter === "inactive" && !cylinderType.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [cylinderTypes, search, statusFilter]);

  const activeCount = cylinderTypes.filter(
    (item) => item.isActive
  ).length;

  const inactiveCount = cylinderTypes.length - activeCount;

  if (loading) {
    return (
      <div className="gasflow-page">
        <style>{styles}</style>
        <div className="loading-container">
          <div className="spinner" />
          <h2>Loading cylinder types...</h2>
          <p>Getting your inventory configuration ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gasflow-page">
      <style>{styles}</style>

      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-icon">G</span>
          <span>GasFlow</span>
        </Link>

        <Link to="/" className="dashboard-link">
          ← Back to Dashboard
        </Link>
      </header>

      <main className="page-container">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">INVENTORY CONFIGURATION</span>
            <h1>Cylinder Types</h1>
            <p>
              Manage cylinder capacities, selling prices, and availability
              for your gas agency.
            </p>

            <Link to="/cylinder-types/new" className="primary-button">
              <span>＋</span> Add Cylinder Type
            </Link>
          </div>

          <div className="hero-decoration">
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
              Inventory Overview
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">▤</div>
            <div>
              <p>Total Cylinder Types</p>
              <h2>{cylinderTypes.length}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <p>Active Types</p>
              <h2>{activeCount}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">◷</div>
            <div>
              <p>Inactive Types</p>
              <h2>{inactiveCount}</h2>
            </div>
          </div>
        </section>

        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">!</span>
            <div>
              <strong>Unable to load cylinder types</strong>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        <section className="content-card">
          <div className="section-heading">
            <div>
              <h2>Your Cylinder Types</h2>
              <p>
                {filteredCylinderTypes.length} of {cylinderTypes.length} types
                displayed
              </p>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon">⌕</span>
              <input
                type="search"
                placeholder="Search by name or capacity..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search cylinder types"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="status-select"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          {cylinderTypes.length === 0 && !error ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <h3>No cylinder types yet</h3>
              <p>
                Add your first cylinder type to start configuring your
                inventory.
              </p>
              <Link to="/cylinder-types/new" className="primary-button">
                ＋ Add Your First Cylinder
              </Link>
            </div>
          ) : filteredCylinderTypes.length === 0 ? (
            <div className="empty-state compact">
              <h3>No matching cylinder types</h3>
              <p>Try another search term or change the status filter.</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="cylinder-grid">
              {filteredCylinderTypes.map((cylinderType) => (
                <article
                  className="cylinder-card"
                  key={cylinderType.id}
                >
                  <div className="card-top">
                    <div className="mini-cylinder">
                      <span />
                      <div />
                    </div>

                    <span
                      className={`status-badge ${
                        cylinderType.isActive ? "active" : "inactive"
                      }`}
                    >
                      <span className="status-dot" />
                      {cylinderType.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="cylinder-info">
                    <p className="card-label">CYLINDER TYPE</p>
                    <h3>{cylinderType.name}</h3>

                    <div className="capacity-row">
                      <span>Capacity</span>
                      <strong>{cylinderType.capacityKg} kg</strong>
                    </div>
                  </div>

                  <div className="price-panel">
                    <span>Selling Price</span>
                    <strong>
                      ₹
                      {Number(cylinderType.sellingPrice).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </strong>
                  </div>

                  <div className="card-footer">
                    <span className="type-id">
                      Type ID: #{cylinderType.id}
                    </span>

                    <Link
                      to={`/cylinder-types/${cylinderType.id}`}
                      className="view-link"
                    >
                      View Details <span>→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>GasFlow Inventory Management</span>
          <span>Manage your cylinders with confidence.</span>
        </footer>
      </main>
    </div>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .gasflow-page {
    min-height: 100vh;
    background: #f5f6fb;
    color: #20233a;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding-bottom: 30px;
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
    text-decoration: none;
    color: #24213f;
    font-weight: 800;
    font-size: 21px;
    letter-spacing: -0.5px;
  }

  .brand-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    color: white;
    background: linear-gradient(135deg, #6157d9, #8b5cf6);
    box-shadow: 0 5px 12px #7662dc40;
  }

  .dashboard-link {
    color: #65647b;
    text-decoration: none;
    font-size: 13px;
    font-weight: 650;
  }

  .dashboard-link:hover,
  .view-link:hover {
    color: #6556d9;
  }

  .page-container {
    max-width: 1240px;
    width: 88%;
    margin: 30px auto 0;
  }

  .hero {
    min-height: 255px;
    padding: 36px 42px;
    border-radius: 23px;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    background: linear-gradient(115deg, #28244f 0%, #5141a0 55%, #7661db 100%);
    color: #fff;
    box-shadow: 0 14px 35px #39306c20;
  }

  .hero::before,
  .hero::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    border: 1px solid #ffffff16;
    pointer-events: none;
  }

  .hero::before {
    width: 310px;
    height: 310px;
    right: 4%;
    top: -170px;
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
    max-width: 620px;
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
    letter-spacing: -1.2px;
  }

  .hero p {
    margin: 0 0 23px;
    color: #e0ddf8;
    font-size: 14px;
    line-height: 1.7;
    max-width: 510px;
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

  .primary-button span {
    font-size: 19px;
    line-height: 1;
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
    background: linear-gradient(90deg, #f1efff, #b7afff);
    border-radius: 5px 5px 0 0;
  }

  .cylinder-body {
    width: 92px;
    height: 120px;
    border-radius: 24px 24px 15px 15px;
    background: linear-gradient(90deg, #bcb2ff, #fff 43%, #c9c0ff);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #ffffff85;
  }

  .cylinder-label {
    color: #5445a8;
    font-size: 17px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .cylinder-line {
    height: 4px;
    width: 45px;
    border-radius: 4px;
    background: #9b8bea;
  }

  .cylinder-line.short {
    width: 28px;
    opacity: 0.6;
  }

  .cylinder-base {
    height: 9px;
    width: 103px;
    border-radius: 4px 4px 9px 9px;
    background: #b0a5fa;
  }

  .floating-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border: 1px solid #ffffff38;
    border-radius: 11px;
    background: #ffffff19;
    backdrop-filter: blur(10px);
    color: #fff;
    font-size: 10px;
    font-weight: 650;
    white-space: nowrap;
  }

  .online-dot,
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }

  .online-dot {
    background: #75edbd;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 17px;
    margin: 23px 0;
  }

  .stat-card {
    min-height: 105px;
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 22px;
    background: #fff;
    border: 1px solid #ececf4;
    border-radius: 16px;
    box-shadow: 0 4px 12px #27204a05;
  }

  .stat-icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    font-size: 21px;
    font-weight: 800;
  }

  .stat-icon.purple {
    background: #f0edff;
    color: #6a55d7;
  }

  .stat-icon.green {
    background: #e7f8ef;
    color: #209966;
  }

  .stat-icon.orange {
    background: #fff1e4;
    color: #d77b2e;
  }

  .stat-card p {
    margin: 0 0 6px;
    color: #85849a;
    font-size: 12px;
    font-weight: 600;
  }

  .stat-card h2 {
    margin: 0;
    color: #25223f;
    font-size: 27px;
    line-height: 1;
    letter-spacing: -0.7px;
  }

  .content-card {
    padding: 28px;
    border: 1px solid #ececf4;
    border-radius: 19px;
    background: #fff;
    box-shadow: 0 5px 20px #29234c05;
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
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
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 23px 0;
  }

  .search-box {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 45px;
    padding: 0 13px;
    border: 1px solid #e7e6f0;
    border-radius: 10px;
    background: #fbfbfe;
  }

  .search-icon {
    color: #8d89a5;
    font-size: 24px;
    line-height: 1;
  }

  .search-box input {
    width: 100%;
    min-width: 0;
    border: none;
    outline: none;
    color: #292641;
    background: transparent;
    font: inherit;
    font-size: 12px;
  }

  .search-box:focus-within {
    border-color: #8271e5;
    box-shadow: 0 0 0 3px #8271e51a;
  }

  .status-select {
    min-width: 145px;
    height: 45px;
    padding: 0 12px;
    border: 1px solid #e7e6f0;
    border-radius: 10px;
    background: #fff;
    color: #5f5d75;
    font: inherit;
    font-size: 12px;
    outline: none;
  }

  .cylinder-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 17px;
  }

  .cylinder-card {
    min-width: 0;
    padding: 19px;
    border: 1px solid #eae9f3;
    border-radius: 15px;
    background: linear-gradient(150deg, #fff 55%, #faf9ff);
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .cylinder-card:hover {
    transform: translateY(-3px);
    border-color: #d4cef8;
    box-shadow: 0 10px 24px #43368a0c;
  }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 17px;
  }

  .mini-cylinder {
    height: 43px;
    width: 34px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .mini-cylinder span {
    width: 12px;
    height: 7px;
    border-radius: 2px 2px 0 0;
    background: #8d7ae5;
  }

  .mini-cylinder div {
    width: 30px;
    height: 35px;
    border-radius: 9px 9px 5px 5px;
    background: linear-gradient(90deg, #b6aafa, #e7e2ff 48%, #a999f0);
    border: 1px solid #c9c0f6;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 750;
    white-space: nowrap;
  }

  .status-badge.active {
    color: #178658;
    background: #e8f8ef;
  }

  .status-badge.active .status-dot {
    background: #22b879;
  }

  .status-badge.inactive {
    color: #a56b2c;
    background: #fff2e1;
  }

  .status-badge.inactive .status-dot {
    background: #e49a44;
  }

  .card-label {
    margin: 0 0 7px;
    color: #9996ad;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1.2px;
  }

  .cylinder-info h3 {
    overflow-wrap: anywhere;
    margin: 0 0 17px;
    color: #282540;
    font-size: 17px;
    font-weight: 750;
  }

  .capacity-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 15px;
    color: #8a879d;
    font-size: 12px;
  }

  .capacity-row strong {
    color: #494560;
    font-size: 12px;
  }

  .price-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 13px;
    border-radius: 10px;
    background: #f5f3ff;
  }

  .price-panel span {
    color: #77728f;
    font-size: 11px;
  }

  .price-panel strong {
    color: #5542c4;
    font-size: 17px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }

  .type-id {
    color: #a09db0;
    font-size: 10px;
  }

  .view-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #6654d2;
    text-decoration: none;
    font-size: 11px;
    font-weight: 750;
  }

  .view-link span {
    font-size: 16px;
  }

  .empty-state {
    min-height: 280px;
    padding: 35px 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .empty-icon {
    width: 58px;
    height: 58px;
    margin-bottom: 16px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: #f0edff;
    color: #6a55d7;
    font-size: 27px;
  }

  .empty-state h3 {
    margin: 0 0 8px;
    color: #292641;
    font-size: 18px;
  }

  .empty-state p {
    max-width: 400px;
    margin: 0 0 20px;
    color: #8d8aa0;
    font-size: 13px;
    line-height: 1.7;
  }

  .empty-state .primary-button {
    color: white;
    background: linear-gradient(120deg, #5141a0, #8068e8);
  }

  .empty-state.compact {
    min-height: 190px;
  }

  .secondary-button,
  .retry-button {
    border: 1px solid #dedaf3;
    border-radius: 9px;
    padding: 9px 13px;
    background: #fff;
    color: #6553cc;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 20px;
    padding: 15px;
    border-radius: 12px;
  }

  .alert-error {
    border: 1px solid #f2d0d0;
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

  .alert strong {
    display: block;
    font-size: 12px;
  }

  .alert p {
    margin: 4px 0 0;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .retry-button {
    margin-left: auto;
    flex-shrink: 0;
    border-color: #f0c7c7;
    color: #9c3434;
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

  @keyframes gasflow-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1000px) {
    .cylinder-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
      font-size: 30px;
    }

    .hero p {
      font-size: 13px;
    }

    .stats-grid {
      grid-template-columns: 1fr;
      gap: 11px;
      margin: 15px 0;
    }

    .stat-card {
      min-height: 82px;
      padding: 17px;
    }

    .content-card {
      padding: 19px 15px;
      border-radius: 15px;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
      margin: 18px 0;
    }

    .search-box,
    .status-select {
      width: 100%;
    }

    .cylinder-grid {
      grid-template-columns: 1fr;
    }

    .page-footer {
      flex-direction: column;
      align-items: flex-start;
    }

    .alert {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .retry-button {
      margin-left: 40px;
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

export default CylinderTypes;
