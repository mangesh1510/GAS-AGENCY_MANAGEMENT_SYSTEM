
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

import Sidebar from "../components/Sidebar";
import "./DashboardLayout.css";

interface SavedUser {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<SavedUser | undefined>();
  const location = useLocation();

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("gasflow_user");

      if (savedUser) {
        setUser(JSON.parse(savedUser) as SavedUser);
      } else {
        setUser(undefined);
      }
    } catch {
      setUser(undefined);
    }
  }, []);

  // Close the mobile sidebar after navigation.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen((previous) => !previous);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("gasflow_token");
    localStorage.removeItem("gasflow_user");
    window.location.replace("/login");
  };

  return (
    <div className={`gf-layout ${sidebarOpen ? "sidebar-open" : ""}`}>
      <Sidebar user={user} onLogout={handleLogout} />

      {sidebarOpen && (
        <button
          type="button"
          className="gf-sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        />
      )}

      <div className="gf-main-area">
        <header className="gf-topbar">
          <button
            type="button"
            className="gf-menu-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X size={23} /> : <Menu size={23} />}
          </button>

          <div className="gf-topbar-title">
            <strong>GasFlow</strong>
            <span>Agency Management</span>
          </div>
        </header>

        <main className="gf-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
