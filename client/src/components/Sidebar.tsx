
import { NavLink, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Truck,
  Package,
  BarChart3,
  ShoppingCart,
  Wallet,
  BookOpen,
  Bell,
  CalendarCheck,
  Database,
  CreditCard,
  LogOut,
  Flame,
} from "lucide-react";

import "./Sidebar.css";

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface SidebarProps {
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
  onLogout?: () => void;
}

const menuSections: MenuSection[] = [
  {
    title: "Today",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Daily Closing", path: "/daily-closing", icon: CalendarCheck, adminOnly: true },
    ],
  },
  {
    title: "Overview",
    items: [
      { label: "Reports", path: "/reports", icon: BarChart3, adminOnly: true },
      { label: "Notifications", path: "/notifications", icon: Bell },
    ],
  },
  {
    title: "Agency Operations",
    items: [
      { label: "Customers", path: "/customers", icon: Users },
      { label: "Suppliers", path: "/suppliers", icon: Truck },
      { label: "Cylinder Types", path: "/cylinder-types", icon: Flame },
      { label: "Stock Management", path: "/stock", icon: Package },
      { label: "Orders", path: "/orders", icon: ShoppingCart },
    ],
  },
  {
    title: "Payment Management",
    items: [
      { label: "Payments", path: "/payments", icon: CreditCard },
      { label: "Expenses", path: "/expenses", icon: Wallet },
      { label: "Ledger", path: "/ledger", icon: BookOpen },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Staff Management", path: "/staff", icon: Users, adminOnly: true },
      { label: "Backup & Restore", path: "/backups", icon: Database, adminOnly: true },
    ],
  },
];

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    localStorage.removeItem("gasflow_token");
    localStorage.removeItem("gasflow_user");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="gf-sidebar">
      <div className="gf-sidebar-brand">
        <div className="gf-sidebar-brand-icon">
          <Flame size={25} strokeWidth={2} />
        </div>

        <div className="gf-sidebar-brand-text">
          <h2>GasFlow</h2>
          <span>Agency Management</span>
        </div>
      </div>

      <nav className="gf-sidebar-nav">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.adminOnly || isAdmin
          );

          if (visibleItems.length === 0) return null;

          return (
            <div className="gf-sidebar-section" key={section.title}>
              <div className="gf-sidebar-section-title">
                {section.title}
              </div>

              <div className="gf-sidebar-section-items">
                {visibleItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `gf-sidebar-link${isActive ? " active" : ""}`
                      }
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.8}
                        className="gf-sidebar-link-icon"
                      />

                      <span className="gf-sidebar-link-label">
                        {item.label}
                      </span>

                      {item.adminOnly && (
                        <ShieldCheck
                          size={14}
                          className="gf-sidebar-admin-badge"
                          aria-label="Administrator only"
                        />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout only — profile card removed */}
      <div className="gf-sidebar-footer">
        <button
          type="button"
          className="gf-sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>

        <div className="gf-sidebar-version">
          GasFlow · Agency Management
        </div>
      </div>
    </aside>
  );
}
