import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:5000/api";

type PaymentReminder = {
  customerId: number;
  customerName: string;
  mobile: string;
  outstandingBalance: number;
  status: string;
  message: string;
};

const ICONS: Record<string, string> = {
  back: "M19 12H5 M11 6l-6 6 6 6",
  wallet: "M3 6.5A2.5 2.5 0 0 1 5.5 4H20v16H5.5A2.5 2.5 0 0 1 3 17.5z M3 7h17 M16 13h.01",
  users: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6",
  search: "m21 21-4.3-4.3 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0",
  alert: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01",
  copy: "M8 8V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4 M5 6h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z",
  message: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z",
};

function Icon({ name, size = 20 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      {ICONS[name].split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : `M${d}`} />
      ))}
    </svg>
  );
}

function PaymentReminders() {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const loadReminders = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API}/reminders/payments`);
        if (!response.ok) throw new Error("Failed to load payment reminders");
        const result = await response.json();
        const data = Array.isArray(result) ? result : result.data ?? [];
        setReminders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load payment reminders");
      } finally {
        setLoading(false);
      }
    };
    void loadReminders();
  }, []);

  const money = (value: number) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const filteredReminders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reminders.filter(
      (item) =>
        item.customerName.toLowerCase().includes(query) ||
        String(item.customerId).includes(query) ||
        item.mobile.includes(query),
    );
  }, [reminders, search]);

  const totalOutstanding = reminders.reduce(
    (sum, item) => sum + Number(item.outstandingBalance || 0),
    0,
  );

  const openWhatsApp = (reminder: PaymentReminder) => {
    const phone = reminder.mobile.replace(/\D/g, "");
    if (!phone) {
      setError(`No valid mobile number for ${reminder.customerName}.`);
      return;
    }
    const internationalPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = `https://wa.me/${internationalPhone}?text=${encodeURIComponent(reminder.message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyMessage = async (reminder: PaymentReminder) => {
    try {
      await navigator.clipboard.writeText(reminder.message);
      setCopiedId(reminder.customerId);
      setError("");
    } catch {
      setError("Unable to copy the message. Please try Open WhatsApp.");
    }
  };

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="gf-pr">
      <style>{paymentReminderStyles}</style>

      <header className="pr-hero">
        <div className="pr-hero-text">
          <span className="pr-hero-date">{todayLabel}</span>
          <h1>Payment Reminders</h1>
          <p>Review outstanding balances and prepare customer payment reminders.</p>
          <span className="pr-hero-caption">Messages are not sent automatically.</span>
        </div>
        <Link className="pr-hero-btn" to="/">
          <Icon name="back" size={16} /> Dashboard
        </Link>
      </header>

      <nav className="pr-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/customer-balances">Customer Balances</Link>
        <span>/</span>
        <strong>Payment Reminders</strong>
      </nav>

      {error && (
        <div className="pr-error" role="alert">
          <Icon name="alert" size={19} />
          <span>{error}</span>
          <button type="button" className="pr-dismiss" onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}

      <section className="pr-section">
        <div className="pr-stats">
          <div className="pr-card pr-stat">
            <div className="pr-stat-top"><span className="pr-icon tone-blue"><Icon name="wallet" /></span><span className="pr-stat-label">Total Outstanding</span></div>
            <div className="pr-stat-value money">{money(totalOutstanding)}</div>
            <p className="pr-note">Across customers with pending balances</p>
          </div>
          <div className="pr-card pr-stat">
            <div className="pr-stat-top"><span className="pr-icon tone-rose"><Icon name="users" /></span><span className="pr-stat-label">Customers With Dues</span></div>
            <div className="pr-stat-value">{reminders.length}</div>
            <p className="pr-note">Customers with outstanding balances</p>
          </div>
        </div>
      </section>

      <section className="pr-section">
        <div className="pr-section-head">
          <div>
            <h2>Customer Reminders</h2>
            <p>Search customers and copy a reminder or continue in WhatsApp.</p>
          </div>
          <span className="pr-count">{filteredReminders.length} result{filteredReminders.length === 1 ? "" : "s"}</span>
        </div>

        <div className="pr-card pr-toolbar">
          <label className="pr-search">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by customer name, ID, or mobile..."
              aria-label="Search customers"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
          </label>
          <span className="pr-showing">Showing <strong>{filteredReminders.length}</strong> of <strong>{reminders.length}</strong> customers</span>
        </div>

        {loading ? (
          <div className="pr-card pr-loading" role="status">
            <span className="pr-spinner" />
            <strong>Loading payment reminders...</strong>
            <span>Please wait while customer balances are fetched.</span>
          </div>
        ) : (
          <div className="pr-card pr-table-card">
            <div className="pr-table-wrap">
              <table className="pr-table">
                <thead>
                  <tr>
                    {["Customer", "Mobile", "Outstanding", "Status", "Actions"].map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReminders.map((reminder) => (
                    <tr key={reminder.customerId}>
                      <td>
                        <div className="pr-customer">
                          <span className="pr-avatar">{reminder.customerName.trim().charAt(0).toUpperCase() || "C"}</span>
                          <span><strong>{reminder.customerName}</strong><small>Customer ID: {reminder.customerId}</small></span>
                        </div>
                      </td>
                      <td className="pr-mobile">{reminder.mobile || "—"}</td>
                      <td><strong className="pr-amount">{money(Number(reminder.outstandingBalance))}</strong></td>
                      <td><span className="pr-badge"><span />Payment pending</span></td>
                      <td>
                        <div className="pr-actions">
                          <button type="button" className="pr-btn pr-btn-secondary" onClick={() => void copyMessage(reminder)}>
                            <Icon name="copy" size={15} /> {copiedId === reminder.customerId ? "Copied!" : "Copy message"}
                          </button>
                          <button type="button" className="pr-btn pr-btn-whatsapp" onClick={() => openWhatsApp(reminder)}>
                            <Icon name="message" size={15} /> Open WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredReminders.length === 0 && (
                    <tr><td colSpan={5}>
                      <div className="pr-empty">
                        <span className="pr-empty-icon"><Icon name="search" size={22} /></span>
                        <strong>{search ? "No matching customers" : "No payment reminders yet"}</strong>
                        <p>{search ? "Try another customer name, ID, or mobile number." : "Customers with outstanding balances will appear here."}</p>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const paymentReminderStyles = `
.gf-pr {
  --ink: #172033;
  --muted: #64748b;
  --line: #e5e9f2;
  --card: #fff;
  box-sizing: border-box;
  max-width: 1440px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 28px;
  color: var(--ink);
  background: #f5f7fb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
}
.gf-pr *, .gf-pr *::before, .gf-pr *::after { box-sizing: border-box; }
.gf-pr h1, .gf-pr h2, .gf-pr p { margin-top: 0; }
.pr-hero {
  position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between;
  gap: 22px; padding: 30px 32px; color: #fff; border-radius: 20px;
  background: linear-gradient(120deg, #1e1b4b 0%, #3730a3 55%, #4f46e5 100%);
  box-shadow: 0 16px 34px rgba(55, 48, 163, .22);
}
.pr-hero::before, .pr-hero::after { content: ""; position: absolute; border-radius: 50%; pointer-events: none; background: rgba(255,255,255,.07); }
.pr-hero::before { width: 260px; height: 260px; right: -70px; top: -120px; }
.pr-hero::after { width: 160px; height: 160px; right: 120px; bottom: -110px; }
.pr-hero-text { position: relative; z-index: 1; }
.pr-hero-date { display: inline-block; margin-bottom: 8px; font-size: 12px; font-weight: 600; letter-spacing: .4px; color: rgba(255,255,255,.75); }
.gf-pr .pr-hero h1 { margin-bottom: 7px; color: #fff; font-size: clamp(25px, 3vw, 34px); line-height: 1.2; font-weight: 800; letter-spacing: -.8px; }
.gf-pr .pr-hero p { margin-bottom: 6px; color: rgba(255,255,255,.84); }
.pr-hero-caption { color: rgba(255,255,255,.68); font-size: 12px; }
.pr-hero-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; padding: 10px 16px; color: #fff; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.28); border-radius: 11px; text-decoration: none; font-weight: 700; font-size: 13px; transition: background .15s ease; }
.pr-hero-btn:hover { background: rgba(255,255,255,.24); }
.pr-breadcrumb { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; padding: 18px 2px 0; color: #94a3b8; font-size: 12px; }
.pr-breadcrumb a { color: #4f46e5; text-decoration: none; font-weight: 650; }
.pr-breadcrumb a:hover { text-decoration: underline; }
.pr-breadcrumb strong { color: #64748b; font-weight: 600; }
.pr-section { margin-top: 28px; }
.pr-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.pr-card { min-width: 0; background: var(--card); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 2px 8px rgba(15,23,42,.035); }
.pr-stat { padding: 21px; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.pr-stat:hover { transform: translateY(-2px); border-color: #d2d9e6; box-shadow: 0 12px 26px rgba(15,23,42,.08); }
.pr-stat-top { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
.pr-icon { width: 42px; height: 42px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; }
.tone-blue { background: #e0e7ff; color: #4338ca; }
.tone-rose { background: #ffe4e6; color: #be123c; }
.pr-stat-label { color: var(--muted); font-size: 13px; font-weight: 650; }
.pr-stat-value { margin-top: 3px; color: var(--ink); font-size: clamp(28px, 2.3vw, 36px); line-height: 1.2; font-weight: 800; letter-spacing: -1px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.pr-stat-value.money { font-size: clamp(22px, 2vw, 29px); letter-spacing: -.6px; }
.pr-note { margin: 7px 0 0; color: var(--muted); font-size: 12px; }
.pr-section-head { display: flex; justify-content: space-between; align-items: end; gap: 14px; margin-bottom: 14px; }
.gf-pr .pr-section-head h2 { margin-bottom: 5px; color: var(--ink); font-size: 18px; font-weight: 800; letter-spacing: -.3px; }
.pr-section-head p { margin-bottom: 0; color: var(--muted); font-size: 12px; }
.pr-count { padding: 7px 10px; border: 1px solid #e0e7ff; background: #eef2ff; color: #4338ca; border-radius: 9px; font-size: 12px; font-weight: 750; white-space: nowrap; }
.pr-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px; margin-bottom: 14px; }
.pr-search { display: flex; align-items: center; gap: 10px; width: min(100%, 520px); min-width: 0; padding: 0 12px; background: #f8fafc; border: 1px solid #dfe5ef; border-radius: 11px; color: #94a3b8; }
.pr-search:focus-within { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.pr-search input { width: 100%; min-width: 0; padding: 12px 0; color: var(--ink); border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; }
.pr-search input::placeholder { color: #94a3b8; }
.pr-search button { border: 0; background: transparent; color: #64748b; font-size: 21px; cursor: pointer; }
.pr-showing { color: var(--muted); font-size: 12px; white-space: nowrap; }
.pr-showing strong { color: var(--ink); }
.pr-error { display: flex; align-items: flex-start; gap: 10px; margin-top: 18px; padding: 14px 16px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; line-height: 1.5; }
.pr-error svg { flex-shrink: 0; margin-top: 1px; }
.pr-dismiss { margin-left: auto; border: 0; background: transparent; color: inherit; font-size: 22px; line-height: 1; cursor: pointer; }
.pr-table-card { overflow: hidden; }
.pr-table-wrap { overflow-x: auto; }
.pr-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.pr-table th { padding: 14px 16px; background: #f8fafc; color: #64748b; border-bottom: 1px solid var(--line); font-size: 11px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; white-space: nowrap; }
.pr-table td { padding: 15px 16px; color: #475569; border-bottom: 1px solid #edf0f5; vertical-align: middle; }
.pr-table tbody tr:last-child td { border-bottom: 0; }
.pr-table tbody tr:hover td { background: #fafbff; }
.pr-customer { display: flex; align-items: center; gap: 11px; min-width: 190px; }
.pr-avatar { width: 38px; height: 38px; display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 12px; color: #4338ca; background: #e0e7ff; font-size: 14px; font-weight: 800; }
.pr-customer strong { display: block; color: var(--ink); font-size: 13px; font-weight: 750; }
.pr-customer small { display: block; margin-top: 4px; color: #94a3b8; font-size: 11px; }
.pr-mobile { white-space: nowrap; }
.pr-amount { color: #dc2626; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pr-badge { display: inline-flex; align-items: center; gap: 7px; padding: 6px 9px; border-radius: 8px; background: #fff1f2; color: #be123c; font-size: 11px; font-weight: 750; white-space: nowrap; }
.pr-badge span { width: 6px; height: 6px; border-radius: 50%; background: #e11d48; }
.pr-actions { display: flex; flex-wrap: wrap; gap: 8px; min-width: 220px; }
.pr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 11px; border: 1px solid transparent; border-radius: 9px; font: inherit; font-size: 12px; font-weight: 750; cursor: pointer; transition: background .15s ease, transform .15s ease; white-space: nowrap; }
.pr-btn:hover { transform: translateY(-1px); }
.pr-btn-secondary { color: #3730a3; background: #eef2ff; border-color: #e0e7ff; }
.pr-btn-secondary:hover { background: #e0e7ff; }
.pr-btn-whatsapp { color: #fff; background: #16a34a; border-color: #16a34a; }
.pr-btn-whatsapp:hover { background: #15803d; }
.pr-empty { display: flex; flex-direction: column; align-items: center; padding: 42px 18px; text-align: center; }
.pr-empty-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; margin-bottom: 12px; border-radius: 14px; color: #6366f1; background: #eef2ff; }
.pr-empty strong { color: var(--ink); font-size: 14px; }
.pr-empty p { margin: 6px 0 0; color: var(--muted); font-size: 12px; }
.pr-loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 52px 20px; color: var(--ink); }
.pr-loading > span:last-child { color: var(--muted); font-size: 12px; }
.pr-spinner { width: 30px; height: 30px; border: 3px solid #e0e7ff; border-top-color: #4f46e5; border-radius: 50%; animation: pr-spin .75s linear infinite; }
@keyframes pr-spin { to { transform: rotate(360deg); } }
@media (max-width: 800px) {
  .gf-pr { padding: 20px; }
  .pr-hero { padding: 24px 22px; }
  .pr-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pr-toolbar { align-items: stretch; flex-direction: column; }
  .pr-search { width: 100%; }
  .pr-showing { white-space: normal; }
}
@media (max-width: 560px) {
  .gf-pr { padding: 14px; }
  .pr-hero { align-items: flex-start; padding: 22px 18px; border-radius: 16px; }
  .pr-hero-btn { display: none; }
  .pr-stats { grid-template-columns: 1fr; }
  .pr-section-head { align-items: flex-start; flex-direction: column; }
  .pr-count { align-self: flex-start; }
  .pr-table th, .pr-table td { padding: 12px; }
}
`;

export default PaymentReminders;
