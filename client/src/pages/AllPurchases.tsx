import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:5000/api";
const PAGE_SIZE = 10;

type Purchase = {
  id: number;
  supplierId: number;
  invoiceNumber?: string | null;
  purchaseDate: string;
  totalAmount: number | string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  note?: string | null;
};

type ApiResult<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

async function getPurchases(): Promise<Purchase[]> {
  const token = localStorage.getItem("gasflow_token") ?? "";
  const response = await fetch(`${API}/purchases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result: ApiResult<Purchase[]> | Purchase[] = await response.json();

  if (!response.ok) {
    throw new Error(
      !Array.isArray(result) && result.message
        ? result.message
        : "Could not load purchases",
    );
  }

  const list = Array.isArray(result) ? result : result.data;
  if (!list) throw new Error("Unexpected purchase API response");

  return list.sort(
    (a, b) =>
      new Date(b.purchaseDate).getTime() -
      new Date(a.purchaseDate).getTime(),
  );
}

const styles = `
  .all-purchases-page {
    --ap-ink:#172033; --ap-muted:#68758a; --ap-line:#e6ebf2; --ap-blue:#2563eb;
    box-sizing:border-box; width:100%; min-height:100%; padding:clamp(16px,2.2vw,30px);
    background:#f5f7fb; color:var(--ap-ink);
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    font-size:14px; line-height:1.55;
  }
  .all-purchases-page *, .all-purchases-page *::before, .all-purchases-page *::after { box-sizing:border-box; }
  .all-purchases-page h1,.all-purchases-page h2,.all-purchases-page p { margin-top:0; }
  .ap-header {
    display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:24px;
    padding:26px 28px; color:#fff; border-radius:18px; position:relative; overflow:hidden;
    background:linear-gradient(115deg,#14213d 0%,#1e3a70 58%,#2563eb 100%);
    box-shadow:0 12px 28px rgba(30,58,112,.15);
  }
  .ap-header::after {
    content:""; position:absolute; width:210px; height:210px; right:-58px; top:-104px;
    border:1px solid rgba(255,255,255,.18); border-radius:50%;
    box-shadow:0 0 0 28px rgba(255,255,255,.045),0 0 0 58px rgba(255,255,255,.035);
    pointer-events:none;
  }
  .ap-header-copy,.ap-header>a { position:relative; z-index:1; }
  .ap-eyebrow { margin:0 0 8px!important; color:#bfdbfe!important; font-size:10px; font-weight:850; letter-spacing:1.5px; }
  .ap-header h1 { margin:0 0 7px!important; color:#fff!important; font-size:clamp(25px,3vw,33px); line-height:1.2; font-weight:780; letter-spacing:-.8px; }
  .ap-header p:last-child { margin:0!important; color:rgba(255,255,255,.78)!important; font-size:13px; }
  .ap-btn {
    display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:40px; padding:10px 14px;
    border:1px solid transparent; border-radius:9px; font:inherit; font-size:12px; font-weight:750;
    text-decoration:none; cursor:pointer; white-space:nowrap; transition:background .16s,border-color .16s,transform .16s;
  }
  .ap-btn:hover { transform:translateY(-1px); }
  .ap-btn-light { color:#fff!important; background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.32); }
  .ap-btn-light:hover { background:rgba(255,255,255,.18); }
  .ap-btn-primary { color:#fff!important; background:#2563eb; box-shadow:0 4px 10px rgba(37,99,235,.18); }
  .ap-btn-primary:hover { background:#1d4ed8; }
  .ap-btn-outline { color:#34445f!important; background:#fff; border-color:#dce4ef; }
  .ap-btn-outline:hover:not(:disabled) { color:#1d4ed8!important; background:#f5f8ff; border-color:#bfd0f5; }
  .ap-btn:disabled { cursor:not-allowed; opacity:.45; transform:none; box-shadow:none; }
  .ap-alert { display:flex; align-items:flex-start; gap:10px; padding:13px 15px; margin:0 0 18px; color:#991b1b; background:#fff1f2; border:1px solid #fecdd3; border-radius:11px; font-size:13px; }
  .ap-alert-icon { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; flex-shrink:0; color:#fff; background:#dc2626; border-radius:50%; font-size:12px; font-weight:800; }
  .ap-panel { overflow:hidden; background:#fff; border:1px solid var(--ap-line); border-radius:15px; box-shadow:0 3px 10px rgba(21,34,58,.035); }
  .ap-panel-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; padding:21px 23px; border-bottom:1px solid var(--ap-line); }
  .ap-title-group { display:flex; align-items:center; gap:12px; min-width:0; }
  .ap-panel-icon { display:inline-flex; align-items:center; justify-content:center; width:42px; height:42px; flex-shrink:0; color:#2456c8; background:#e8efff; border-radius:12px; font-size:20px; }
  .ap-panel-head h2 { margin:0 0 3px!important; color:#172033!important; font-size:16px; font-weight:760; letter-spacing:-.2px; }
  .ap-subtitle { margin:0!important; color:#7a8799!important; font-size:12px; }
  .ap-count { display:inline-flex; align-items:center; padding:4px 8px; color:#2456c8; background:#e8efff; border-radius:999px; font-size:11px; font-weight:800; white-space:nowrap; }
  .ap-table-wrap { width:100%; overflow-x:auto; }
  .ap-table { width:100%; min-width:760px; border-collapse:separate; border-spacing:0; color:#354158!important; font-size:13px; text-align:left; }
  .ap-table th { padding:13px 18px; color:#647188!important; background:#f7f9fc; border-bottom:1px solid var(--ap-line); font-size:10px; font-weight:850; text-transform:uppercase; letter-spacing:.7px; white-space:nowrap; }
  .ap-table td { padding:15px 18px; color:#4a566a!important; background:#fff; border-bottom:1px solid #edf0f5; vertical-align:middle; }
  .ap-table tbody tr:last-child td { border-bottom:0; }
  .ap-table tbody tr:hover td { background:#fafcff; }
  .ap-id { color:#1d4ed8!important; font-weight:800; }
  .ap-primary-cell { color:#172033!important; font-weight:700; }
  .ap-amount { color:#172033!important; font-weight:750; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .ap-muted-cell { color:#7a8799!important; }
  .ap-status { display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border-radius:999px; font-size:10px; line-height:1.4; font-weight:850; letter-spacing:.35px; white-space:nowrap; }
  .ap-status::before { content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }
  .ap-status.draft { color:#7c5a12; background:#fff3d6; }
  .ap-status.ordered { color:#2456c8; background:#e8efff; }
  .ap-status.received { color:#167647; background:#e3f8ec; }
  .ap-status.cancelled { color:#a12732; background:#ffeaec; }
  .ap-state { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:245px; padding:28px 20px; text-align:center; }
  .ap-state-icon { display:flex; align-items:center; justify-content:center; width:54px; height:54px; margin-bottom:13px; color:#2456c8; background:#e8efff; border-radius:16px; font-size:24px; }
  .ap-state h3 { margin:0 0 6px!important; color:#172033!important; font-size:15px; }
  .ap-state p { margin:0!important; color:#7a8799!important; font-size:13px; }
  .ap-spinner { width:28px; height:28px; margin-bottom:13px; border:3px solid #dbeafe; border-top-color:#2563eb; border-radius:50%; animation:ap-spin .75s linear infinite; }
  @keyframes ap-spin { to { transform:rotate(360deg); } }
  .ap-pagination { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; padding:16px 22px; background:#fcfdff; border-top:1px solid var(--ap-line); }
  .ap-summary { margin:0!important; color:#778399!important; font-size:12px; }
  .ap-page-controls { display:flex; align-items:center; gap:10px; }
  .ap-page-number { min-width:88px; color:#536178; font-size:12px; font-weight:700; text-align:center; }
  @media(max-width:760px) {
    .all-purchases-page { padding:15px; }
    .ap-header { align-items:flex-start; flex-direction:column; padding:22px 20px; border-radius:14px; }
    .ap-header h1 { font-size:26px; }
    .ap-header>a { width:100%; }
    .ap-panel-head { align-items:flex-start; padding:17px; }
    .ap-panel-head>a { width:100%; }
    .ap-pagination { align-items:stretch; flex-direction:column; padding:15px 17px; }
    .ap-page-controls { justify-content:space-between; }
    .ap-page-number { flex:1; }
  }
  @media(prefers-reduced-motion:reduce) { .ap-btn { transition:none; } .ap-spinner { animation-duration:1.5s; } }
`;

export default function AllPurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await getPurchases();

        if (active) {
          setPurchases(data);
          setPage(1);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load purchases",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const visiblePurchases = purchases.slice(startIndex, startIndex + PAGE_SIZE);

  const formatAmount = (amount: number | string) =>
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <main className="all-purchases-page">
      <style>{styles}</style>

      <header className="ap-header">
        <div className="ap-header-copy">
          <p className="ap-eyebrow">INVENTORY MANAGEMENT</p>
          <h1>All Purchases</h1>
          <p>Review supplier orders, invoice details, and purchase history.</p>
        </div>
        <Link className="ap-btn ap-btn-light" to="/purchases">
          <span aria-hidden="true">←</span> Purchase Management
        </Link>
      </header>

      {error && (
        <div className="ap-alert" role="alert">
          <span className="ap-alert-icon" aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <section className="ap-panel" aria-labelledby="ap-history-title">
        <div className="ap-panel-head">
          <div className="ap-title-group">
            <span className="ap-panel-icon" aria-hidden="true">▤</span>
            <div>
              <h2 id="ap-history-title">Purchase history</h2>
              <p className="ap-subtitle">All recorded purchases, newest first</p>
            </div>
            <span className="ap-count">{purchases.length}</span>
          </div>
          <Link className="ap-btn ap-btn-primary" to="/purchases">
            <span aria-hidden="true">＋</span> Create Purchase
          </Link>
        </div>

        {loading ? (
          <div className="ap-state" role="status" aria-live="polite">
            <span className="ap-spinner" aria-hidden="true" />
            <p>Loading purchase history...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="ap-state">
            <span className="ap-state-icon" aria-hidden="true">▤</span>
            <h3>No purchases found</h3>
            <p>Your purchase records will appear here after a purchase is created.</p>
          </div>
        ) : (
          <>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th scope="col">Purchase ID</th>
                    <th scope="col">Supplier ID</th>
                    <th scope="col">Invoice</th>
                    <th scope="col">Purchase date</th>
                    <th scope="col">Total amount</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="ap-id">#{purchase.id}</td>
                      <td className="ap-primary-cell">{purchase.supplierId}</td>
                      <td className={purchase.invoiceNumber ? "ap-primary-cell" : "ap-muted-cell"}>
                        {purchase.invoiceNumber || "—"}
                      </td>
                      <td>
                        {purchase.purchaseDate
                          ? new Date(purchase.purchaseDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="ap-amount">₹{formatAmount(purchase.totalAmount)}</td>
                      <td>
                        <span className={`ap-status ${purchase.status.toLowerCase()}`}>
                          {purchase.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ap-pagination">
              <p className="ap-summary">
                Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, purchases.length)} of {purchases.length} purchases
              </p>
              <div className="ap-page-controls">
                <button
                  className="ap-btn ap-btn-outline"
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  ← Previous
                </button>
                <span className="ap-page-number">Page {page} of {totalPages}</span>
                <button
                  className="ap-btn ap-btn-outline"
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
