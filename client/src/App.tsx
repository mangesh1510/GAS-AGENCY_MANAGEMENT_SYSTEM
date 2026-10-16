
import {
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
} from "react-router-dom";

import Login from "./pages/Login";
import Customers from "./pages/Customers";
import AddCustomer from "./pages/AddCustomer";
import CustomerDetails from "./pages/CustomerDetails";
import EditCustomer from "./pages/EditCustomer";

import CylinderTypes from "./pages/CylinderTypes";
import AddCylinderType from "./pages/AddCylinderType";
import CylinderTypeDetails from "./pages/CylinderTypeDetails";
import EditCylinderType from "./pages/EditCylinderType";

import Deliveries from "./pages/Deliveries";
import AddDelivery from "./pages/AddDelivery";
import DeliveryDetails from "./pages/DeliveryDetails";
import EditDelivery from "./pages/EditDelivery";

import Inventory from "./pages/Inventory";
import DashboardS from "./pages/DashboardS";
import Payments from "./pages/Payments";
import CustomerBalances from "./pages/CustomerBalances";
import Reports from "./pages/Reports";
import CustomerLedger from "./pages/CustomerLedger";
import PaymentReminders from "./pages/PaymentReminders";
import DailyClosing from "./pages/DailyClosing";
import Backups from "./pages/Backups";

import Purchases from "./pages/Purchases";
import AllPurchases from "./pages/AllPurchases";
import AddSupplier from "./pages/AddSupplier";
import Suppliers from "./pages/Suppliers";
import EditSupplier from "./pages/EditSupplier";
import DailyPayments from "./pages/DailyPayments";

import StaffManagement from "./pages/StaffManagement";
import StaffPayments from "./pages/StaffPayments";

import DashboardLayout from "./layouts/DashboardLayout";
import PurchaseDetails from "./pages/PurchaseDetails";

type UserRole = "ADMIN" | "STAFF";

interface SavedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
}

function getSavedUser(): SavedUser | null {
  const token = localStorage.getItem("gasflow_token");
  const savedUser = localStorage.getItem("gasflow_user");

  if (!token || !savedUser) {
    return null;
  }

  try {
    const user: SavedUser = JSON.parse(savedUser);

    if (
      !user ||
      typeof user.id !== "number" ||
      typeof user.name !== "string" ||
      typeof user.email !== "string" ||
      !["ADMIN", "STAFF"].includes(user.role)
    ) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

function clearSession(): void {
  localStorage.removeItem("gasflow_token");
  localStorage.removeItem("gasflow_user");
}

function ProtectedRoute() {
  const user = getSavedUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AdminRoute() {
  const user = getSavedUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function Dashboard() {
  const user = getSavedUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main>
      <h1>GasFlow Dashboard</h1>

      <p>Welcome, {user.name}</p>
      <p>Role: {user.role}</p>

      <nav aria-label="Main navigation">
        <p><Link to="/dashboard">Main Dashboard</Link></p>

        <p><Link to="/customers">Customers</Link></p>
        <p><Link to="/cylinder-types">Cylinder Types</Link></p>
        <p><Link to="/deliveries">Deliveries</Link></p>
        <p><Link to="/inventory">Inventory</Link></p>

        <p><Link to="/payments">Customer Payments</Link></p>
        <p><Link to="/daily-payments">Daily Payments</Link></p>

        <p>
          <Link to="/customer-balances">
            Customer Outstanding Balances
          </Link>
        </p>

        <p><Link to="/customer-ledger">Customer Ledger</Link></p>
        <p><Link to="/payment-reminders">Payment Reminders</Link></p>
        <p><Link to="/daily-closing">Daily Business Closing</Link></p>

        <p><Link to="/purchases">Purchase Management</Link></p>
        <p><Link to="/purchases/all">All Purchases</Link></p>
        <p><Link to="/suppliers">Suppliers</Link></p>

        {user.role === "ADMIN" && (
          <>
            <p><Link to="/reports">Reports</Link></p>

            <p><Link to="/backups">Backup &amp; Restore</Link></p>

            <p><Link to="/staff">Staff Management</Link></p>

            {/* NEW: Staff salary payments and history */}
            <p>
              <Link to="/staff-payments">
                Staff Payments &amp; History
              </Link>
            </p>

            <p>
              <Link to="/suppliers/add" className="purchase-primary">
                + Register Supplier
              </Link>
            </p>
          </>
        )}
      </nav>

      <button
        type="button"
        onClick={() => {
          clearSession();
          window.location.replace("/login");
        }}
      >
        Logout
      </button>
    </main>
  );
}

export default function App() {
  const user = getSavedUser();

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* All authenticated pages use the dashboard layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<DashboardS />} />

          {/* Customers */}
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetails />} />
          <Route path="/customers/:id/edit" element={<EditCustomer />} />

          {/* Cylinder Types */}
          <Route path="/cylinder-types" element={<CylinderTypes />} />
          <Route
            path="/cylinder-types/new"
            element={<AddCylinderType />}
          />
          <Route
            path="/cylinder-types/:id"
            element={<CylinderTypeDetails />}
          />
          <Route
            path="/cylinder-types/:id/edit"
            element={<EditCylinderType />}
          />

          {/* Deliveries */}
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/deliveries/new" element={<AddDelivery />} />
          <Route path="/deliveries/:id" element={<DeliveryDetails />} />
          <Route
            path="/deliveries/:id/edit"
            element={<EditDelivery />}
          />

          {/* Inventory and customer payments */}
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/daily-payments" element={<DailyPayments />} />

          <Route
            path="/customer-balances"
            element={<CustomerBalances />}
          />
          <Route path="/customer-ledger" element={<CustomerLedger />} />
          <Route
            path="/payment-reminders"
            element={<PaymentReminders />}
          />
          <Route path="/daily-closing" element={<DailyClosing />} />

          {/* Purchases and suppliers */}
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/all" element={<AllPurchases />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases/:id" element={<PurchaseDetails />} />
          
          <Route
            path="/suppliers/:id/edit"
            element={<EditSupplier />}
          />

          {/* ADMIN-only pages */}
          <Route element={<AdminRoute />}>
            <Route path="/reports" element={<Reports />} />
            <Route path="/backups" element={<Backups />} />
            <Route path="/staff" element={<StaffManagement />} />

            {/* NEW: Staff Payments page */}
            <Route
              path="/staff-payments"
              element={<StaffPayments />}
            />

            <Route
              path="/suppliers/add"
              element={<AddSupplier />}
            />
          </Route>
        </Route>


      </Route>

      {/* Unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
