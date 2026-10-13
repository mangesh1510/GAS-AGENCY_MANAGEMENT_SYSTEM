
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  Pencil,
  Power,
  X,
  RefreshCw,
  ShieldCheck,
  Mail,
  CalendarDays,
} from "lucide-react";
import "./StaffManagement.css";

const API_URL = "http://localhost:5000/api";

interface Staff {
  id: number;
  name: string;
  email: string;
  role: "STAFF";
  isActive: boolean;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] =
    useState<Staff | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const token = localStorage.getItem("gasflow_token");

  const requestHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
    }),
    [token],
  );

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/staff`, {
        headers: requestHeaders,
      });

      const result: ApiResponse<Staff[]> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load staff.");
      }

      setStaff(result.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server.",
      );
    } finally {
      setLoading(false);
    }
  }, [requestHeaders]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const activeCount = staff.filter((item) => item.isActive).length;
  const inactiveCount = staff.length - activeCount;

  const filteredStaff = staff.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()) ||
      String(item.id).includes(search.trim());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && item.isActive) ||
      (statusFilter === "INACTIVE" && !item.isActive);

    return matchesSearch && matchesStatus;
  });

  function openAddModal() {
    setEditingStaff(null);
    setName("");
    setEmail("");
    setPassword("");
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(item: Staff) {
    setEditingStaff(item);
    setName(item.name);
    setEmail(item.email);
    setPassword("");
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingStaff(null);
    setError("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const editing = Boolean(editingStaff);
      const endpoint = editing
        ? `${API_URL}/auth/staff/${editingStaff!.id}`
        : `${API_URL}/auth/staff`;

      const payload = editing
        ? { name: name.trim(), email: email.trim() }
        : {
            name: name.trim(),
            email: email.trim(),
            password,
          };

      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: requestHeaders,
        body: JSON.stringify(payload),
      });

      const result: ApiResponse<Staff> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save staff.");
      }

      setNotice(
        editing
          ? "Staff details updated successfully."
          : "Staff account created successfully.",
      );

      setModalOpen(false);
      setEditingStaff(null);
      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save staff details.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: Staff) {
    const action = item.isActive ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${item.name}'s account?`,
      )
    ) {
      return;
    }

    setChangingStatusId(item.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/auth/staff/${item.id}/status`,
        {
          method: "PATCH",
          headers: requestHeaders,
          body: JSON.stringify({ isActive: !item.isActive }),
        },
      );

      const result: ApiResponse<Staff> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to update staff status.",
        );
      }

      setNotice(result.message);
      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update staff status.",
      );
    } finally {
      setChangingStatusId(null);
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div>
          <div className="staff-eyebrow">
            <ShieldCheck size={15} />
            ADMINISTRATION
          </div>
          <h1>Staff Management</h1>
          <p>
            Manage staff accounts, update details, and control access
            to your GasFlow workspace.
          </p>
        </div>

        <button
          className="staff-primary-button"
          onClick={openAddModal}
          type="button"
        >
          <Plus size={18} />
          Add Staff
        </button>
      </div>

      <div className="staff-stats">
        <div className="staff-stat-card">
          <div className="staff-stat-icon staff-icon-total">
            <Users size={21} />
          </div>
          <div>
            <span>Total staff</span>
            <strong>{staff.length}</strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon staff-icon-active">
            <UserCheck size={21} />
          </div>
          <div>
            <span>Active accounts</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon staff-icon-inactive">
            <UserX size={21} />
          </div>
          <div>
            <span>Inactive accounts</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      {notice && (
        <div className="staff-alert staff-alert-success">
          {notice}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="staff-alert staff-alert-error">
          {error}
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="staff-directory">
        <div className="staff-directory-header">
          <div>
            <h2>Staff directory</h2>
            <p>View and manage all staff accounts.</p>
          </div>

          <button
            className="staff-refresh-button"
            type="button"
            onClick={() => void loadStaff()}
            disabled={loading}
            aria-label="Refresh staff list"
          >
            <RefreshCw
              size={17}
              className={loading ? "staff-spinning" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="staff-toolbar">
          <div className="staff-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            aria-label="Filter staff by status"
            className="staff-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            <option value="ALL">All accounts</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive only</option>
          </select>
        </div>

        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Account ID</th>
                <th>Joined</th>
                <th>Status</th>
                <th className="staff-actions-heading">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="staff-empty">
                    Loading staff accounts...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="staff-empty">
                    <Users size={28} />
                    <strong>No staff accounts found</strong>
                    <span>
                      Try changing your search or add a new staff member.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="staff-person">
                        <div className="staff-avatar">
                          {item.name.trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="staff-person-info">
                          <strong>{item.name}</strong>
                          <span>
                            <Mail size={13} />
                            {item.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="staff-id">#{item.id}</span>
                    </td>

                    <td>
                      <span className="staff-date">
                        <CalendarDays size={14} />
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`staff-status ${
                          item.isActive
                            ? "staff-status-active"
                            : "staff-status-inactive"
                        }`}
                      >
                        <span />
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="staff-row-actions">
                        <button
                          type="button"
                          className="staff-action-button"
                          onClick={() => openEditModal(item)}
                          title="Edit staff details"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className={`staff-action-button ${
                            item.isActive
                              ? "staff-deactivate-button"
                              : "staff-activate-button"
                          }`}
                          onClick={() => void toggleStatus(item)}
                          disabled={changingStatusId === item.id}
                          title={
                            item.isActive
                              ? "Deactivate account"
                              : "Activate account"
                          }
                          aria-label={
                            item.isActive
                              ? `Deactivate ${item.name}`
                              : `Activate ${item.name}`
                          }
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="staff-table-footer">
          <span>
            Showing {filteredStaff.length} of {staff.length} staff members
          </span>
          <span>Staff accounts only · Admin access required</span>
        </div>
      </section>

      {modalOpen && (
        <div
          className="staff-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="staff-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-modal-title"
          >
            <div className="staff-modal-header">
              <div>
                <span className="staff-modal-eyebrow">
                  STAFF ACCOUNT
                </span>
                <h2 id="staff-modal-title">
                  {editingStaff ? "Edit staff member" : "Add new staff"}
                </h2>
                <p>
                  {editingStaff
                    ? "Update the staff member's basic details."
                    : "Create an account for a member of your team."}
                </p>
              </div>

              <button
                type="button"
                className="staff-modal-close"
                onClick={closeModal}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="staff-alert staff-alert-error">
                  {error}
                </div>
              )}

              <label className="staff-form-field">
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter full name"
                  maxLength={100}
                  required
                  autoFocus
                />
              </label>

              <label className="staff-form-field">
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="staff@example.com"
                  required
                />
              </label>

              {!editingStaff && (
                <label className="staff-form-field">
                  Temporary password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    required
                  />
                  <small>
                    Use at least 8 characters. Share credentials securely.
                  </small>
                </label>
              )}

              {editingStaff && (
                <div className="staff-edit-note">
                  Password changes are not available in this form.
                </div>
              )}

              <div className="staff-form-actions">
                <button
                  type="button"
                  className="staff-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="staff-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingStaff
                      ? "Save changes"
                      : "Create staff"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
