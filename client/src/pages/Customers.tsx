
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Customers.css";

type Customer = {
  id: number;
  name: string;
  mobile: string;
  address: string | null;
  openingBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const entriesPerPage = 10;
  const totalPages = Math.ceil(customers.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;

  const paginatedCustomers = customers.slice(
    startIndex,
    startIndex + entriesPerPage
  );

  useEffect(() => {
    const controller = new AbortController();

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("gasflow_token");

        if (!token) {
          throw new Error("Please log in to view customers.");
        }

        const response = await fetch(
          "http://localhost:5000/api/customers",
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
          throw new Error(
            "Your session is invalid or expired. Please log in again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to view customers."
          );
        }

        if (!response.ok) {
          throw new Error(
            `Unable to load customers. HTTP ${response.status}`
          );
        }

        const result: unknown = await response.json();

        const customerList: unknown = Array.isArray(result)
          ? result
          : typeof result === "object" &&
              result !== null &&
              "data" in result
            ? result.data
            : undefined;

        if (!Array.isArray(customerList)) {
          console.error("Unexpected customers API response:", result);
          throw new Error(
            "The server returned an invalid customer list."
          );
        }

        setCustomers(customerList as Customer[]);
        setCurrentPage(1);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch customers:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading customers."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCustomers();

    return () => controller.abort();
  }, []);

  const formatDate = (date: string) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? "-"
      : parsedDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const formatAmount = (amount: string) => {
    const value = Number(amount);

    return Number.isFinite(value)
      ? value.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : amount;
  };

  const getVisiblePages = () => {
    const pages: number[] = [];

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      end = Math.min(totalPages, 5);
    }

    if (currentPage >= totalPages - 2) {
      start = Math.max(1, totalPages - 4);
    }

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    return pages;
  };

  return (
    <main className="gf-customers">
      {/* Page header */}
      <section className="gf-customer-hero">
        <div className="gf-customer-hero-content">
          <div className="gf-customer-breadcrumb">
            <Link to="/">Dashboard</Link>
            <span>/</span>
            <span>Customers</span>
          </div>

          <div className="gf-customer-heading-row">
            <div>
              <div className="gf-customer-eyebrow">
                CUSTOMER MANAGEMENT
              </div>

              <h1>Customers</h1>

              <p>
                Manage your customers, balances, and account
                information in one place.
              </p>
            </div>

            <Link
              to="/customers/new"
              className="gf-customer-add-btn"
            >
              <span className="gf-add-icon">+</span>
              <span>Add Customer</span>
            </Link>
          </div>

          <div className="gf-customer-hero-decoration">
            <span className="gf-decoration-circle circle-one" />
            <span className="gf-decoration-circle circle-two" />
          </div>
        </div>
      </section>

      {/* Summary card */}
      <section className="gf-customer-summary">
        <div className="gf-customer-summary-icon">
          <svg
            viewBox="0 0 24 24"
            width="27"
            height="27"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="10" cy="7" r="4" />
            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        <div className="gf-customer-summary-info">
          <span>Total Customers</span>

          <strong>
            {loading
              ? "—"
              : customers.length.toLocaleString("en-IN")}
          </strong>

          <small>Registered customer accounts</small>
        </div>

        <div className="gf-customer-summary-right">
          <span className="gf-customer-summary-dot" />
          Customer Directory
        </div>
      </section>

      {/* Customer table card */}
      <section className="gf-customer-card">
        <div className="gf-customer-card-header">
          <div>
            <h2>All Customers</h2>
            <p>View and manage your registered customers.</p>
          </div>

          {!loading && !error && (
            <span className="gf-customer-count">
              {customers.length}{" "}
              {customers.length === 1 ? "customer" : "customers"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="gf-customer-state">
            <span className="gf-customer-spinner" />
            <h3>Loading customers</h3>
            <p>
              Please wait while we fetch your customer records.
            </p>
          </div>
        ) : error ? (
          <div className="gf-customer-state gf-customer-error">
            <div className="gf-customer-state-icon">!</div>
            <h3>Unable to load customers</h3>
            <p role="alert">{error}</p>

            <button
              type="button"
              className="gf-customer-retry"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>

            <Link to="/login" className="gf-customer-login-link">
              Go to Login
            </Link>
          </div>
        ) : customers.length === 0 ? (
          <div className="gf-customer-state">
            <div className="gf-customer-empty-icon">
              <svg
                viewBox="0 0 24 24"
                width="35"
                height="35"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="9" cy="8" r="4" />
                <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
                <path d="M19 8v6" />
                <path d="M22 11h-6" />
              </svg>
            </div>

            <h3>No customers yet</h3>
            <p>
              Your customer directory is empty. Add your first
              customer to get started.
            </p>

            <Link
              to="/customers/new"
              className="gf-customer-empty-btn"
            >
              + Add Your First Customer
            </Link>
          </div>
        ) : (
          <>
            <div className="gf-customer-table-wrapper">
              <table className="gf-customer-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Mobile Number</th>
                    <th>Address</th>
                    <th>Opening Balance</th>
                    <th>Status</th>
                    <th>Created On</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div className="gf-customer-name-cell">
                          <div className="gf-customer-avatar">
                            {customer.name?.trim().charAt(0).toUpperCase() || "C"}
                          </div>

                          <div className="gf-customer-name-details">
                            <strong>{customer.name}</strong>
                            <span>Customer #{customer.id}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="gf-customer-mobile">
                          {customer.mobile || "-"}
                        </span>
                      </td>

                      <td>
                        <span
                          className="gf-customer-address"
                          title={customer.address || ""}
                        >
                          {customer.address || "-"}
                        </span>
                      </td>

                      <td>
                        <span className="gf-customer-balance">
                          ₹{formatAmount(customer.openingBalance)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`gf-customer-status ${
                            customer.isActive
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          <span className="gf-status-dot" />
                          {customer.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <span className="gf-customer-date">
                          {formatDate(customer.createdAt)}
                        </span>
                      </td>

                      <td>
                        <Link
                          to={`/customers/${customer.id}`}
                          className="gf-customer-view-btn"
                          aria-label={`View ${customer.name}`}
                        >
                          View
                          <svg
                            viewBox="0 0 24 24"
                            width="15"
                            height="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="gf-pagination">
              <span className="gf-pagination-info">
                Showing{" "}
                <strong>{startIndex + 1}</strong>–
                <strong>
                  {Math.min(
                    startIndex + entriesPerPage,
                    customers.length
                  )}
                </strong>{" "}
                of <strong>{customers.length}</strong> customers
              </span>

              <div className="gf-pagination-controls">
                <button
                  type="button"
                  className="gf-page-btn gf-page-arrow"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                >
                  ‹ Previous
                </button>

                {getVisiblePages().map((page) => (
                  <button
                    type="button"
                    key={page}
                    className={`gf-page-btn ${
                      currentPage === page ? "active" : ""
                    }`}
                    aria-current={
                      currentPage === page ? "page" : undefined
                    }
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className="gf-page-btn gf-page-arrow"
                  disabled={
                    totalPages === 0 || currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                >
                  Next ›
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <footer className="gf-customer-footer">
        GasFlow <span>•</span> Customer Management
      </footer>
    </main>
  );
}

export default Customers;
