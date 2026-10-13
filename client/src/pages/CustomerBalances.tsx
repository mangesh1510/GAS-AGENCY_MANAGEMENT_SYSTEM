
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:5000/api";

type CustomerBalance = {
  customerId: number;
  customerName: string;
  openingBalance: number | string;
  totalDelivered: number | string;
  totalPaid: number | string;
  outstandingBalance: number | string;
};

type BalanceFilter = "ALL" | "OUTSTANDING" | "PAID";

const styles = `
  * { box-sizing: border-box; }

  .balances-page {
    min-height: 100vh;
    padding: 30px;
    background: #f5f7fb;
    color: #172033;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .balances-container {
    max-width: 1400px;
    margin: 0 auto;
  }

  .balances-hero {
    position: relative;
    overflow: hidden;
    padding: 30px;
    border-radius: 22px;
    color: white;
    background: linear-gradient(120deg, #111827 0%, #312e81 60%, #6d28d9 100%);
    box-shadow: 0 15px 35px rgba(49, 46, 129, .18);
  }

  .balances-hero::after {
    content: "";
    position: absolute;
    width: 240px;
    height: 240px;
    right: -70px;
    top: -115px;
    border: 35px solid rgba(255,255,255,.08);
    border-radius: 50%;
    pointer-events: none;
  }

  .balances-breadcrumbs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 25px;
    color: #ddd6fe;
    font-size: 13px;
  }

  .balances-breadcrumbs a {
    color: #ede9fe;
    text-decoration: none;
  }

  .balances-breadcrumbs a:hover { text-decoration: underline; }

  .balances-hero h1 {
    margin: 0 0 10px;
    font-size: clamp(27px, 4vw, 38px);
    letter-spacing: -.8px;
  }

  .balances-hero p {
    margin: 0;
    max-width: 700px;
    color: #e0e7ff;
    line-height: 1.7;
  }

  .balances-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 17px;
    margin: 24px 0;
  }

  .balances-stat {
    min-width: 0;
    padding: 23px;
    border: 1px solid #e8ebf2;
    border-radius: 17px;
    background: white;
    box-shadow: 0 5px 20px rgba(15,23,42,.035);
  }

  .balances-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin-bottom: 18px;
    border-radius: 13px;
    background: #eef2ff;
    color: #4f46e5;
    font-size: 22px;
    font-weight: 800;
  }

  .balances-stat.red .balances-stat-icon {
    background: #fff1f2;
    color: #e11d48;
  }

  .balances-stat.green .balances-stat-icon {
    background: #dcfce7;
    color: #15803d;
  }

  .balances-stat-label {
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
  }

  .balances-stat-value {
    margin: 10px 0;
    overflow-wrap: anywhere;
    color: #172033;
    font-size: clamp(23px, 2.5vw, 31px);
    font-weight: 800;
    letter-spacing: -.7px;
  }

  .balances-stat-description {
    margin: 0;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.6;
  }

  .balances-panel {
    margin-top: 23px;
    padding: 24px;
    border: 1px solid #e8ebf2;
    border-radius: 18px;
    background: white;
    box-shadow: 0 5px 20px rgba(15,23,42,.035);
  }

  .balances-panel h2 {
    margin: 0 0 7px;
    color: #172033;
    font-size: 20px;
  }

  .balances-muted {
    margin: 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.6;
  }

  .balances-controls {
    display: grid;
    grid-template-columns: minmax(220px, 1.5fr) minmax(180px, 1fr) auto;
    align-items: end;
    gap: 17px;
    margin-top: 23px;
  }

  .balances-field { min-width: 0; }

  .balances-label {
    display: block;
    margin-bottom: 8px;
    color: #334155;
    font-size: 13px;
    font-weight: 700;
  }

  .balances-input {
    width: 100%;
    min-height: 45px;
    padding: 11px 13px;
    border: 1px solid #dbe1eb;
    border-radius: 10px;
    outline: none;
    background: white;
    color: #172033;
    font: inherit;
    font-size: 14px;
    transition: border-color .2s, box-shadow .2s;
  }

  .balances-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,.12);
  }

  .balances-reset {
    min-height: 45px;
    padding: 11px 18px;
    border: 1px solid #dbe1eb;
    border-radius: 10px;
    background: white;
    color: #475569;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .balances-reset:hover {
    background: #f8fafc;
    border-color: #a5b4fc;
    color: #4338ca;
  }

  .balances-sort {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 18px;
    color: #475569;
    font-size: 13px;
    cursor: pointer;
  }

  .balances-sort input {
    width: 16px;
    height: 16px;
    accent-color: #4f46e5;
    cursor: pointer;
  }

  .balances-table-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
  }

  .balances-count {
    padding: 7px 11px;
    border-radius: 9px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 12px;
    font-weight: 700;
  }

  .balances-table-wrapper {
    width: 100%;
    margin-top: 22px;
    overflow-x: auto;
    border: 1px solid #e8ebf2;
    border-radius: 12px;
  }

  .balances-table {
    width: 100%;
    min-width: 850px;
    border-collapse: collapse;
    font-size: 13px;
  }

  .balances-table thead { background: #f8fafc; }

  .balances-table th {
    padding: 15px 16px;
    border-bottom: 1px solid #e8ebf2;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .45px;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .balances-table td {
    padding: 16px;
    border-bottom: 1px solid #eef1f6;
    color: #334155;
    vertical-align: middle;
  }

  .balances-table tbody tr:last-child td { border-bottom: none; }
  .balances-table tbody tr:hover { background: #fafaff; }

  .balances-customer-name {
    display: block;
    color: #172033;
    font-weight: 750;
  }

  .balances-customer-id {
    display: block;
    margin-top: 5px;
    color: #94a3b8;
    font-size: 11px;
  }

  .balances-money {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .balances-outstanding {
    font-weight: 800;
  }

  .balances-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 750;
    white-space: nowrap;
  }

  .balances-status.due {
    background: #fff1f2;
    color: #be123c;
  }

  .balances-status.paid {
    background: #dcfce7;
    color: #166534;
  }

  .balances-view-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 8px 11px;
    border: 1px solid #c7d2fe;
    border-radius: 9px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;
    white-space: nowrap;
  }

  .balances-view-link:hover {
    background: #e0e7ff;
  }

  .balances-empty {
    padding: 38px 20px;
    color: #64748b;
    text-align: center;
    line-height: 1.7;
  }

  .balances-empty strong {
    display: block;
    margin-bottom: 5px;
    color: #334155;
  }

  .balances-alert {
    margin-top: 22px;
    padding: 15px 17px;
    border: 1px solid #fecaca;
    border-radius: 12px;
    background: #fef2f2;
    color: #b91c1c;
    font-size: 14px;
    line-height: 1.6;
  }

  .balances-retry {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    margin-top: 12px;
    padding: 9px 15px;
    border: none;
    border-radius: 9px;
    background: #4338ca;
    color: white;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .balances-loading {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4338ca;
    font-weight: 700;
  }

  @media (max-width: 850px) {
    .balances-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .balances-controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .balances-reset { width: 100%; }
  }

  @media (max-width: 600px) {
    .balances-page { padding: 15px; }
    .balances-hero { padding: 22px; border-radius: 16px; }
    .balances-panel { padding: 17px; }
    .balances-summary-grid { gap: 10px; }
    .balances-stat { padding: 15px; }
    .balances-stat-icon { margin-bottom: 13px; }
    .balances-controls { grid-template-columns: 1fr; }
    .balances-reset { width: 100%; }
  }

  @media (max-width: 380px) {
    .balances-summary-grid { grid-template-columns: 1fr; }
  }
`;

function CustomerBalances() {
  const [balances, setBalances] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BalanceFilter>("ALL");
  const [highestFirst, setHighestFirst] = useState(false);

  const loadBalances = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("gasflow_token");

    if (!token) {
      window.location.assign("/login");
      return;
    }

    try {
      const response = await fetch(`${API}/payments/balances`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("gasflow_token");
        window.location.assign("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ??
            data?.message ??
            "Failed to load customer balances."
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setBalances(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customer balances."
      );
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  const money = (value: number | string | null | undefined) => {
    const amount = Number(value ?? 0);

    return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const filteredBalances = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    const result = balances.filter((customer) => {
      const name = String(customer.customerName ?? "");
      const id = String(customer.customerId);
      const outstanding = Number(customer.outstandingBalance ?? 0);

      const matchesSearch =
        name.toLowerCase().includes(searchText) ||
        id.includes(searchText);

      const matchesFilter =
        filter === "ALL" ||
        (filter === "OUTSTANDING" && outstanding > 0) ||
        (filter === "PAID" && outstanding <= 0);

      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      if (highestFirst) {
        return (
          Number(b.outstandingBalance ?? 0) -
          Number(a.outstandingBalance ?? 0)
        );
      }

      return String(a.customerName ?? "").localeCompare(
        String(b.customerName ?? "")
      );
    });

    return result;
  }, [balances, search, filter, highestFirst]);

  const totalOutstanding = balances.reduce(
    (sum, customer) =>
      sum + Number(customer.outstandingBalance ?? 0),
    0
  );

  const outstandingCustomers = balances.filter(
    (customer) => Number(customer.outstandingBalance ?? 0) > 0
  ).length;

  const resetFilters = () => {
    setSearch("");
    setFilter("ALL");
    setHighestFirst(false);
  };

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="balances-loading">
          Loading GasFlow customer balances...
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <main className="balances-page">
        <div className="balances-container">
          <header className="balances-hero">
            <nav className="balances-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <span>Customer Balances</span>
            </nav>

            <h1>Customer Outstanding Balances</h1>
            <p>
              Monitor customer dues, review account balances, and open payment
              records to track collections.
            </p>
          </header>

          {error ? (
            <section className="balances-alert" role="alert">
              <strong>Unable to load balances.</strong>
              <div>{error}</div>
              <button
                className="balances-retry"
                type="button"
                onClick={() => void loadBalances()}
              >
                Try Again
              </button>
            </section>
          ) : (
            <>
              <section
                className="balances-summary-grid"
                aria-label="Balance summary"
              >
                <article className="balances-stat">
                  <div className="balances-stat-icon">₹</div>
                  <div className="balances-stat-label">
                    Net Outstanding
                  </div>
                  <p className="balances-stat-value">
                    {money(totalOutstanding)}
                  </p>
                  <p className="balances-stat-description">
                    Sum of customer balances returned by the API
                  </p>
                </article>

                <article className="balances-stat red">
                  <div className="balances-stat-icon">!</div>
                  <div className="balances-stat-label">
                    Customers With Dues
                  </div>
                  <p className="balances-stat-value">
                    {outstandingCustomers}
                  </p>
                  <p className="balances-stat-description">
                    Accounts with a positive outstanding balance
                  </p>
                </article>

                <article className="balances-stat green">
                  <div className="balances-stat-icon">♙</div>
                  <div className="balances-stat-label">
                    Total Customers
                  </div>
                  <p className="balances-stat-value">
                    {balances.length}
                  </p>
                  <p className="balances-stat-description">
                    Customer accounts included in this report
                  </p>
                </article>
              </section>

              <section className="balances-panel">
                <h2>Search & Filter</h2>
                <p className="balances-muted">
                  Find a customer by name or ID and organize accounts by dues.
                </p>

                <div className="balances-controls">
                  <div className="balances-field">
                    <label
                      className="balances-label"
                      htmlFor="customerSearch"
                    >
                      Search Customer
                    </label>
                    <input
                      className="balances-input"
                      id="customerSearch"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Enter customer name or ID"
                    />
                  </div>

                  <div className="balances-field">
                    <label
                      className="balances-label"
                      htmlFor="balanceFilter"
                    >
                      Balance Filter
                    </label>
                    <select
                      className="balances-input"
                      id="balanceFilter"
                      value={filter}
                      onChange={(event) =>
                        setFilter(event.target.value as BalanceFilter)
                      }
                    >
                      <option value="ALL">All customers</option>
                      <option value="OUTSTANDING">
                        Outstanding balance
                      </option>
                      <option value="PAID">
                        Zero or negative balance
                      </option>
                    </select>
                  </div>

                  <button
                    className="balances-reset"
                    type="button"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </button>
                </div>

                <label className="balances-sort">
                  <input
                    type="checkbox"
                    checked={highestFirst}
                    onChange={(event) =>
                      setHighestFirst(event.target.checked)
                    }
                  />
                  Sort by highest outstanding first
                </label>
              </section>

              <section className="balances-panel">
                <div className="balances-table-heading">
                  <div>
                    <h2>Customer Accounts</h2>
                    <p className="balances-muted">
                      Review account totals and open individual payment
                      histories.
                    </p>
                  </div>

                  <span className="balances-count">
                    Showing {filteredBalances.length} of {balances.length}
                  </span>
                </div>

                <div className="balances-table-wrapper">
                  <table className="balances-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th style={{ textAlign: "right" }}>
                          Opening Balance
                        </th>
                        <th style={{ textAlign: "right" }}>
                          Total Delivered
                        </th>
                        <th style={{ textAlign: "right" }}>
                          Total Paid
                        </th>
                        <th style={{ textAlign: "right" }}>
                          Outstanding
                        </th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBalances.map((customer) => {
                        const outstanding = Number(
                          customer.outstandingBalance ?? 0
                        );

                        const hasDue = outstanding > 0;

                        return (
                          <tr key={customer.customerId}>
                            <td>
                              <span className="balances-customer-name">
                                {customer.customerName}
                              </span>
                              <span className="balances-customer-id">
                                Customer ID: {customer.customerId}
                              </span>
                            </td>

                            <td className="balances-money">
                              {money(customer.openingBalance)}
                            </td>

                            <td className="balances-money">
                              {money(customer.totalDelivered)}
                            </td>

                            <td className="balances-money">
                              {money(customer.totalPaid)}
                            </td>

                            <td
                              className="balances-money balances-outstanding"
                              style={{
                                color: hasDue ? "#e11d48" : "#15803d",
                              }}
                            >
                              {money(outstanding)}
                            </td>

                            <td>
                              <span
                                className={`balances-status ${
                                  hasDue ? "due" : "paid"
                                }`}
                              >
                                {hasDue ? "● Due" : "✓ Settled"}
                              </span>
                            </td>

                            <td>
                              <Link
                                className="balances-view-link"
                                to={`/payments?customerId=${customer.customerId}`}
                              >
                                View Payments →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredBalances.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <div className="balances-empty">
                              <strong>No matching customers</strong>
                              Try a different name, customer ID, or balance
                              filter.
                              <div style={{ marginTop: 14 }}>
                                <button
                                  className="balances-reset"
                                  type="button"
                                  onClick={resetFilters}
                                >
                                  Clear Filters
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default CustomerBalances;
