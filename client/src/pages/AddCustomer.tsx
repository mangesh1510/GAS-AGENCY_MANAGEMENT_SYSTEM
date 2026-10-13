
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AddCustomer.css";

function AddCustomer() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: "",
    openingBalance: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const token = localStorage.getItem("gasflow_token");

    if (!token) {
      setError("Please log in before adding a customer.");
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();

      const response = await fetch(
        "http://localhost:5000/api/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            mobile: formData.mobile.trim(),
            address: formData.address.trim(),
            openingBalance: Number(formData.openingBalance || 0),
            createdAt: now,
            updatedAt: now,
          }),
        }
      );

      const responseText = await response.text();

      let data: {
        error?: string;
        message?: string;
      } = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          // Keep a fallback if the server returns non-JSON text.
        }
      }

      if (response.status === 401) {
        throw new Error(
          "Your session is invalid or expired. Please log in again."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "You do not have permission to add customers."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Failed to create customer (HTTP ${response.status})`
        );
      }

      navigate("/customers", {
        state: { successMessage: "Customer created successfully!" },
      });
    } catch (err) {
      console.error("Failed to create customer:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create customer. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="gf-add-customer">
      {/* Header */}
      <section className="gf-add-customer-hero">
        <div className="gf-add-customer-hero-content">
          <div className="gf-add-customer-breadcrumb">
            <Link to="/">Dashboard</Link>
            <span>/</span>
            <Link to="/customers">Customers</Link>
            <span>/</span>
            <span>Add Customer</span>
          </div>

          <div className="gf-add-customer-heading-row">
            <div>
              <div className="gf-add-customer-eyebrow">
                CUSTOMER MANAGEMENT
              </div>

              <h1>Add Customer</h1>

              <p>
                Create a customer profile and maintain their account
                information in GasFlow.
              </p>
            </div>

            <div className="gf-add-customer-hero-icon">
              <svg
                viewBox="0 0 24 24"
                width="38"
                height="38"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
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
          </div>

          <div className="gf-add-customer-decoration">
            <span className="gf-add-decoration-circle circle-one" />
            <span className="gf-add-decoration-circle circle-two" />
          </div>
        </div>
      </section>

      {/* Form card */}
      <section className="gf-add-customer-card">
        <div className="gf-add-customer-card-header">
          <div className="gf-add-customer-card-icon">
            <svg
              viewBox="0 0 24 24"
              width="23"
              height="23"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="10" cy="7" r="4" />
              <path d="M19 8v6" />
              <path d="M22 11h-6" />
            </svg>
          </div>

          <div>
            <h2>Customer Information</h2>
            <p>Enter the details below to register a new customer.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="gf-add-customer-form-body">
            {error && (
              <div className="gf-add-customer-error" role="alert">
                <span className="gf-add-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <div className="gf-add-customer-section-title">
              <span className="gf-section-number">01</span>
              <div>
                <h3>Basic Details</h3>
                <p>Customer identity and contact information</p>
              </div>
            </div>

            <div className="gf-add-customer-grid">
              <div className="gf-add-customer-field">
                <label htmlFor="customer-name">
                  Customer Name <span>*</span>
                </label>

                <input
                  id="customer-name"
                  type="text"
                  name="name"
                  placeholder="Enter customer's full name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  maxLength={100}
                  required
                />

                <small>Enter the name used for customer records.</small>
              </div>

              <div className="gf-add-customer-field">
                <label htmlFor="customer-mobile">
                  Mobile Number <span>*</span>
                </label>

                <input
                  id="customer-mobile"
                  type="tel"
                  name="mobile"
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  autoComplete="tel"
                  maxLength={20}
                  required
                />

                <small>Provide a contact number for the customer.</small>
              </div>

              <div className="gf-add-customer-field gf-field-full">
                <label htmlFor="customer-address">Address</label>

                <input
                  id="customer-address"
                  type="text"
                  name="address"
                  placeholder="Enter customer address"
                  value={formData.address}
                  onChange={handleChange}
                  autoComplete="street-address"
                  maxLength={250}
                />

                <small>
                  Address is optional and can be updated later.
                </small>
              </div>
            </div>

            <div className="gf-add-customer-divider" />

            <div className="gf-add-customer-section-title">
              <span className="gf-section-number">02</span>
              <div>
                <h3>Account Details</h3>
                <p>Set the customer's initial account balance</p>
              </div>
            </div>

            <div className="gf-add-customer-grid">
              <div className="gf-add-customer-field gf-field-full">
                <label htmlFor="customer-opening-balance">
                  Opening Balance
                </label>

                <div className="gf-add-customer-money-input">
                  <span>₹</span>
                  <input
                    id="customer-opening-balance"
                    type="number"
                    name="openingBalance"
                    placeholder="0.00"
                    value={formData.openingBalance}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>

                <small>
                  Enter 0 if the customer has no opening balance.
                </small>
              </div>
            </div>

            <div className="gf-add-customer-note">
              <span className="gf-add-note-icon">i</span>
              <p>
                Please verify the customer name and mobile number
                before saving the record.
              </p>
            </div>
          </div>

          {/* Form actions */}
          <div className="gf-add-customer-actions">
            <Link
              to="/customers"
              className="gf-add-customer-cancel"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="gf-add-customer-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="gf-add-button-spinner" />
                  Saving Customer...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                    <path d="M17 21v-8H7v8" />
                    <path d="M7 3v5h8" />
                  </svg>
                  Save Customer
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <footer className="gf-add-customer-footer">
        GasFlow <span>•</span> Customer Management
      </footer>
    </main>
  );
}

export default AddCustomer;
