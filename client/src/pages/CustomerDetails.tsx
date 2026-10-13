
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./CustomerDetails.css";

type Customer = {
  id: number;
  name: string;
  mobile: string;
  address: string | null;
  openingBalance: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCustomer() {
      if (!id) {
        setError("Customer ID is missing from the URL.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("gasflow_token");

        const response = await fetch(
          `http://localhost:5000/api/customers/${id}`,
          {
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : {},
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              `Unable to load customer (${response.status}).`
          );
        }

        // Supports either { data: customer } or a direct customer object.
        const result = data?.data ?? data;

        if (!result || result.id == null) {
          throw new Error("The API response did not contain customer details.");
        }

        setCustomer(result as Customer);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Customer details error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchCustomer();

    return () => controller.abort();
  }, [id]);

  const handleDelete = async () => {
    if (!id) {
      setError("Customer ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${customer?.name ?? "this customer"}?`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      const token = localStorage.getItem("gasflow_token");

      const response = await fetch(
        `http://localhost:5000/api/customers/${id}`,
        {
          method: "DELETE",
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to delete customer."
        );
      }

      window.alert("Customer deleted successfully!");
      navigate("/customers", { replace: true });
    } catch (err) {
      console.error("Delete customer error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete customer."
      );
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString("en-IN");
  };

  const formatBalance = (value: string | number) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "₹0.00";

    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <main className="gf-details-page">
        <div className="gf-details-state">Loading customer details...</div>
      </main>
    );
  }

  if (error && !customer) {
    return (
      <main className="gf-details-page">
        <section className="gf-details-card gf-details-error-card">
          <h1>Unable to load customer</h1>
          <p>{error}</p>
          <Link to="/customers" className="gf-details-button gf-details-secondary">
            Back to Customers
          </Link>
        </section>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="gf-details-page">
        <section className="gf-details-card">
          <h1>Customer not found</h1>
          <Link to="/customers" className="gf-details-button gf-details-secondary">
            Back to Customers
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="gf-details-page">
      <section className="gf-details-hero">
        <Link to="/customers" className="gf-details-back">
          ← Back to Customers
        </Link>

        <p className="gf-details-eyebrow">GASFLOW / CUSTOMER MANAGEMENT</p>
        <h1>{customer.name}</h1>
        <p>View customer information and account details.</p>
      </section>

      {error && (
        <div className="gf-details-alert" role="alert">
          {error}
        </div>
      )}

      <section className="gf-details-card">
        <div className="gf-details-card-heading">
          <div>
            <h2>Customer Details</h2>
            <p>Customer ID: #{customer.id}</p>
          </div>

          <span
            className={`gf-details-status ${
              customer.isActive ? "is-active" : "is-inactive"
            }`}
          >
            {customer.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="gf-details-grid">
          <div className="gf-details-field">
            <span>Full Name</span>
            <strong>{customer.name}</strong>
          </div>

          <div className="gf-details-field">
            <span>Mobile Number</span>
            <strong>{customer.mobile || "—"}</strong>
          </div>

          <div className="gf-details-field">
            <span>Opening Balance</span>
            <strong className="gf-details-balance">
              {formatBalance(customer.openingBalance)}
            </strong>
          </div>

          <div className="gf-details-field">
            <span>Account Status</span>
            <strong>{customer.isActive ? "Active" : "Inactive"}</strong>
          </div>

          <div className="gf-details-field gf-details-full">
            <span>Address</span>
            <strong>{customer.address || "—"}</strong>
          </div>

          <div className="gf-details-field">
            <span>Created At</span>
            <strong>{formatDate(customer.createdAt)}</strong>
          </div>

          <div className="gf-details-field">
            <span>Last Updated</span>
            <strong>{formatDate(customer.updatedAt)}</strong>
          </div>
        </div>

        <div className="gf-details-actions">
          <Link
            to={`/customers/${customer.id}/edit`}
            className="gf-details-button gf-details-edit"
          >
            Edit Customer
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="gf-details-button gf-details-delete"
          >
            {deleting ? "Deleting..." : "Delete Customer"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default CustomerDetails;
