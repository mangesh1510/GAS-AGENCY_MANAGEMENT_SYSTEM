
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./EditCustomer.css";

type Customer = {
  id: number;
  name: string;
  mobile: string;
  address: string | null;
  openingBalance: string | number;
};

function EditCustomer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCustomer() {
      if (!id) {
        setError("Customer ID is missing.");
        setLoading(false);
        return;
      }

      try {
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
              `Failed to load customer (${response.status}).`
          );
        }

        const customer: Customer = data.data ?? data;

        if (!customer || customer.id == null) {
          throw new Error("Customer details were not found.");
        }

        setName(customer.name ?? "");
        setMobile(customer.mobile ?? "");
        setAddress(customer.address ?? "");
        setOpeningBalance(String(customer.openingBalance ?? 0));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        console.error("Fetch customer error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load customer."
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) {
      setError("Customer ID is missing.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile.trim())) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    const balance = Number(openingBalance);

    if (!Number.isFinite(balance) || balance < 0) {
      setError("Opening balance must be a valid non-negative amount.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("gasflow_token");

      const response = await fetch(
        `http://localhost:5000/api/customers/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
          body: JSON.stringify({
            name: name.trim(),
            mobile: mobile.trim(),
            address: address.trim(),
            openingBalance: balance,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Failed to update customer (${response.status}).`
        );
      }

      navigate(`/customers/${id}`, {
        replace: true,
        state: { successMessage: "Customer updated successfully!" },
      });
    } catch (err) {
      console.error("Update customer error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update customer."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMobileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (/^\d{0,10}$/.test(value)) {
      setMobile(value);
    }
  };

  if (loading) {
    return (
      <main className="gf-edit-page">
        <div className="gf-edit-state">Loading customer details...</div>
      </main>
    );
  }

  if (error && !name && !mobile) {
    return (
      <main className="gf-edit-page">
        <section className="gf-edit-card gf-edit-error-card">
          <h1>Unable to load customer</h1>
          <p>{error}</p>
          <Link to="/customers" className="gf-edit-button gf-edit-cancel">
            Back to Customers
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="gf-edit-page">
      <section className="gf-edit-hero">
        <Link to={`/customers/${id}`} className="gf-edit-back">
          ← Back to Customer
        </Link>

        <p className="gf-edit-eyebrow">GASFLOW / CUSTOMER MANAGEMENT</p>
        <h1>Edit Customer</h1>
        <p>Update customer information and account details.</p>
      </section>

      <section className="gf-edit-card">
        <div className="gf-edit-heading">
          <div>
            <h2>Customer Information</h2>
            <p>Update the fields below and save your changes.</p>
          </div>

          <span className="gf-edit-id">Customer #{id}</span>
        </div>

        {error && (
          <div className="gf-edit-alert" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="gf-edit-form-grid">
            <div className="gf-edit-field">
              <label htmlFor="customer-name">Full Name *</label>
              <input
                id="customer-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter customer name"
                autoComplete="name"
                required
              />
            </div>

            <div className="gf-edit-field">
              <label htmlFor="customer-mobile">Mobile Number *</label>
              <input
                id="customer-mobile"
                type="tel"
                inputMode="numeric"
                value={mobile}
                onChange={handleMobileChange}
                placeholder="10-digit mobile number"
                autoComplete="tel"
                maxLength={10}
                required
              />
            </div>

            <div className="gf-edit-field gf-edit-full">
              <label htmlFor="customer-address">Address</label>
              <textarea
                id="customer-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Enter customer address"
                rows={3}
              />
            </div>

            <div className="gf-edit-field">
              <label htmlFor="customer-balance">Opening Balance (₹) *</label>
              <input
                id="customer-balance"
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(event) => setOpeningBalance(event.target.value)}
                placeholder="0.00"
                required
              />
              <small>Enter the customer's opening account balance.</small>
            </div>
          </div>

          <div className="gf-edit-actions">
            <Link
              to={`/customers/${id}`}
              className="gf-edit-button gf-edit-cancel"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="gf-edit-button gf-edit-save"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default EditCustomer;
