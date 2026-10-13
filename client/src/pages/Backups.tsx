
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";

const API_URL = "http://localhost:5000/api";
const MAX_BACKUP_SIZE = 100 * 1024 * 1024;

type BackupHistoryItem = {
  id: number;
  fileName: string;
  targetDatabase: string;
  status: string;
  fileSize: string | number;
  message: string | null;
  createdAt: string;
  createdBy: number | null;
};

type RestoreHistoryItem = {
  id: number;
  fileName: string;
  targetDatabase: string;
  status: string;
  message: string | null;
  createdAt: string;
  restoredBy: number | null;
};

type ApiResult = {
  message?: string;
  data?: unknown;
};

function getToken(): string {
  const token = localStorage.getItem("gasflow_token");

  if (!token) {
    window.location.href = "/login";
    throw new Error("Your session has expired. Please log in again.");
  }

  return token;
}

async function readJson(response: Response): Promise<ApiResult | null> {
  return response.json().catch(() => null);
}

function handleAuthError(status: number): void {
  if (status === 401) {
    localStorage.removeItem("gasflow_token");
    window.location.href = "/login";
  }
}

function getErrorMessage(
  result: ApiResult | null,
  fallback: string,
): string {
  return result?.message || fallback;
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "UNKNOWN").toUpperCase();
}

function normalizeBackupRow(
  row: Record<string, unknown>,
): BackupHistoryItem {
  return {
    id: Number(row.id ?? 0),
    fileName: String(row.fileName ?? row.file_name ?? "—"),
    targetDatabase: String(
      row.targetDatabase ?? row.target_database ?? "—",
    ),
    status: normalizeStatus(row.status),
    fileSize: String(row.fileSize ?? row.file_size ?? "0"),
    message: row.message == null ? null : String(row.message),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    createdBy:
      row.createdBy == null && row.created_by == null
        ? null
        : Number(row.createdBy ?? row.created_by),
  };
}

function normalizeRestoreRow(
  row: Record<string, unknown>,
): RestoreHistoryItem {
  return {
    id: Number(row.id ?? 0),
    fileName: String(row.fileName ?? row.file_name ?? "—"),
    targetDatabase: String(
      row.targetDatabase ?? row.target_database ?? "—",
    ),
    status: normalizeStatus(row.status),
    message: row.message == null ? null : String(row.message),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    restoredBy:
      row.restoredBy == null && row.restored_by == null
        ? null
        : Number(row.restoredBy ?? row.restored_by),
  };
}

function formatDateTime(value: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function formatFileSize(value: string | number): string {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getStatusStyle(status: string): CSSProperties {
  switch (status.toUpperCase()) {
    case "SUCCESS":
      return {
        background: "#dcfce7",
        color: "#166534",
      };

    case "FAILED":
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };

    default:
      return {
        background: "#f3f4f6",
        color: "#4b5563",
      };
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{ ...styles.statusBadge, ...getStatusStyle(status) }}>
      {status || "UNKNOWN"}
    </span>
  );
}

function Alert({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  if (!message) return null;

  const successful = type === "success";

  return (
    <div
      role={successful ? "status" : "alert"}
      aria-live="polite"
      style={{
        ...styles.alert,
        background: successful ? "#ecfdf5" : "#fef2f2",
        color: successful ? "#047857" : "#b91c1c",
        borderColor: successful ? "#a7f3d0" : "#fecaca",
      }}
    >
      <span aria-hidden="true">{successful ? "✓" : "⚠"}</span>
      <span>{message}</span>
    </div>
  );
}

function Backups() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState("");
  const [restoreError, setRestoreError] = useState(false);

  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [backupHistoryLoading, setBackupHistoryLoading] = useState(false);
  const [backupHistoryError, setBackupHistoryError] = useState("");

  const [history, setHistory] = useState<RestoreHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const fetchBackupHistory = useCallback(async () => {
    setBackupHistoryLoading(true);
    setBackupHistoryError("");

    try {
      const token = getToken();

      const response = await fetch(`${API_URL}/backups/history`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await readJson(response);

      if (!response.ok) {
        handleAuthError(response.status);

        if (response.status === 403) {
          throw new Error("Administrator access is required.");
        }

        throw new Error(
          getErrorMessage(result, "Failed to load backup history."),
        );
      }

      const rows = Array.isArray(result?.data) ? result.data : [];

      setBackupHistory(
        rows.map((row) =>
          normalizeBackupRow(row as Record<string, unknown>),
        ),
      );
    } catch (err) {
      setBackupHistoryError(
        err instanceof Error ? err.message : "Unable to load backup history.",
      );
    } finally {
      setBackupHistoryLoading(false);
    }
  }, []);

  const fetchRestoreHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const token = getToken();

      const response = await fetch(`${API_URL}/restore/history`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await readJson(response);

      if (!response.ok) {
        handleAuthError(response.status);

        if (response.status === 403) {
          throw new Error("Administrator access is required.");
        }

        throw new Error(
          getErrorMessage(result, "Failed to load restore history."),
        );
      }

      const rows = Array.isArray(result?.data) ? result.data : [];

      setHistory(
        rows.map((row) =>
          normalizeRestoreRow(row as Record<string, unknown>),
        ),
      );
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Unable to load restore history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBackupHistory();
    void fetchRestoreHistory();
  }, [fetchBackupHistory, fetchRestoreHistory]);

  const createBackup = async () => {
    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const token = getToken();

      const response = await fetch(`${API_URL}/backups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const result = await readJson(response);

        handleAuthError(response.status);

        if (response.status === 403) {
          throw new Error("Administrator access is required.");
        }

        throw new Error(
          getErrorMessage(result, "Failed to create database backup."),
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("The backup file is empty.");
      }

      // A server may return an error as JSON despite a successful HTTP status.
      if (
        response.headers.get("content-type")?.includes("application/json")
      ) {
        const text = await blob.text();

        let result: ApiResult | null = null;

        try {
          result = JSON.parse(text) as ApiResult;
        } catch {
          // Ignore invalid JSON and report a generic backup error below.
        }

        throw new Error(
          getErrorMessage(result, "The server did not return a backup file."),
        );
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `gasflow-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.dump`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setMessage("Database backup downloaded successfully.");
      setError(false);

      await fetchBackupHistory();
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : "Unable to create database backup.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(null);
    setRestoreMessage("");
    setRestoreError(false);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".dump")) {
      setRestoreError(true);
      setRestoreMessage("Please select a PostgreSQL .dump file.");
      event.target.value = "";
      return;
    }

    if (file.size === 0 || file.size > MAX_BACKUP_SIZE) {
      setRestoreError(true);
      setRestoreMessage(
        "The backup file must be greater than 0 bytes and no larger than 100 MB.",
      );
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const restoreBackup = async () => {
    if (!selectedFile) {
      setRestoreError(true);
      setRestoreMessage("Please select a backup file first.");
      return;
    }

    const confirmed = window.confirm(
      `Restore "${selectedFile.name}" into the test database ` +
        '"gasflow_restore_test"? Existing data in that test database may ' +
        'be affected. The original "gasflow" database must remain unchanged.',
    );

    if (!confirmed) return;

    setRestoring(true);
    setRestoreMessage("");
    setRestoreError(false);

    try {
      const token = getToken();
      const formData = new FormData();

      formData.append("backup", selectedFile);

      const response = await fetch(`${API_URL}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await readJson(response);

      if (!response.ok) {
        handleAuthError(response.status);

        if (response.status === 403) {
          throw new Error("Administrator access is required.");
        }

        throw new Error(
          getErrorMessage(result, "The restore request could not be completed."),
        );
      }

      setRestoreMessage(
        getErrorMessage(result, "Restore completed successfully."),
      );
      setRestoreError(false);
      setSelectedFile(null);

      const input = document.getElementById(
        "backup-file",
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      await fetchRestoreHistory();
    } catch (err) {
      setRestoreError(true);
      setRestoreMessage(
        err instanceof Error ? err.message : "Unable to restore the backup.",
      );

      await fetchRestoreHistory();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={styles.heroIcon} aria-hidden="true">
            <span>◈</span>
          </div>

          <a href="/" style={styles.dashboardLink}>
            ← Dashboard
          </a>
        </div>

        <div style={styles.heroContent}>
          <span style={styles.eyebrow}>SYSTEM MANAGEMENT</span>
          <h1 style={styles.heading}>Backup &amp; Restore</h1>
          <p style={styles.subtitle}>
            Protect your GasFlow data and review your database recovery history.
          </p>
        </div>

        <div style={styles.heroFooter}>
          <span style={styles.heroDot} />
          Database maintenance
          <span style={styles.heroDivider}>•</span>
          Backup and recovery
        </div>
      </header>

      <div style={styles.sectionIntro}>
        <h2 style={styles.sectionTitle}>Database protection</h2>
        <p style={styles.sectionDescription}>
          Create downloadable backups and review previous operations.
        </p>
      </div>

      <section style={styles.card}>
        <div style={styles.cardTop}>
          <div style={styles.cardIcon}>💾</div>
          <span style={styles.sectionTag}>BACKUP</span>
        </div>

        <h2 style={styles.cardHeading}>Create database backup</h2>

        <p style={styles.description}>
          Generate and download a PostgreSQL database dump for safekeeping.
        </p>

        <div style={styles.includedPanel}>
          <h3 style={styles.smallHeading}>Data included in the backup</h3>
          <ul style={styles.list}>
            <li>Customer records</li>
            <li>Cylinder types and inventory</li>
            <li>Deliveries and payment records</li>
            <li>Other database objects included by the server's dump process</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => void createBackup()}
          disabled={loading}
          style={{
            ...styles.primaryButton,
            ...(loading ? styles.disabledButton : {}),
          }}
        >
          {loading ? "Creating backup..." : "↓  Download database backup"}
        </button>

        <Alert
          message={message}
          type={error ? "error" : "success"}
        />

        <p style={styles.note}>
          Keep backup files in a secure location with access limited to
          authorized personnel.
        </p>
      </section>

      <section style={styles.card}>
        <div style={styles.historyHeader}>
          <div>
            <div style={styles.cardTop}>
              <div style={styles.cardIcon}>📋</div>
              <span style={styles.sectionTag}>ACTIVITY</span>
            </div>
            <h2 style={styles.cardHeading}>Backup history</h2>
            <p style={styles.description}>
              Review recent database backup attempts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchBackupHistory()}
            disabled={backupHistoryLoading}
            style={{
              ...styles.secondaryButton,
              ...(backupHistoryLoading ? styles.disabledButton : {}),
            }}
          >
            {backupHistoryLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {backupHistoryError && (
          <div style={styles.errorPanel} role="alert">
            <p style={styles.errorText}>{backupHistoryError}</p>
            <button
              type="button"
              onClick={() => void fetchBackupHistory()}
              style={styles.retryButton}
            >
              Try again
            </button>
          </div>
        )}

        {backupHistoryLoading && backupHistory.length === 0 ? (
          <p style={styles.emptyState}>Loading backup history...</p>
        ) : !backupHistoryError && backupHistory.length === 0 ? (
          <p style={styles.emptyState}>
            No backup attempts have been recorded yet.
          </p>
        ) : backupHistory.length > 0 ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date &amp; time</th>
                  <th style={styles.th}>Backup file</th>
                  <th style={styles.th}>Target database</th>
                  <th style={styles.th}>File size</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Message</th>
                </tr>
              </thead>
              <tbody>
                {backupHistory.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td style={styles.fileNameCell}>
                      {item.fileName || "—"}
                    </td>
                    <td style={styles.td}>{item.targetDatabase || "—"}</td>
                    <td style={styles.td}>{formatFileSize(item.fileSize)}</td>
                    <td style={styles.td}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={styles.messageCell}>
                      {item.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p style={styles.note}>
          The server should return the latest 100 backup attempts.
        </p>
      </section>

      <div style={styles.sectionIntro}>
        <h2 style={styles.sectionTitle}>Recovery tools</h2>
        <p style={styles.sectionDescription}>
          Validate recovery workflows in a separate test database.
        </p>
      </div>

      <section style={styles.card}>
        <div style={styles.cardTop}>
          <div style={styles.cardIcon}>♻️</div>
          <span style={styles.warningTag}>TEST ENVIRONMENT</span>
        </div>

        <h2 style={styles.cardHeading}>Restore database backup</h2>

        <p style={styles.description}>
          Select a previously downloaded GasFlow PostgreSQL .dump file.
        </p>

        <div style={styles.warning}>
          <div style={styles.warningTitle}>
            <span aria-hidden="true">⚠</span> Test database only
          </div>
          <p style={styles.warningText}>
            This operation is intended to restore into{" "}
            <code>gasflow_restore_test</code>. Existing data in that database
            may be affected. The original <code>gasflow</code> database must
            remain unchanged.
          </p>
          <p style={styles.warningText}>
            The server must enforce this restriction independently of this
            screen.
          </p>
        </div>

        <label htmlFor="backup-file" style={styles.fileLabel}>
          Choose backup file
        </label>

        <div style={styles.filePicker}>
          <input
            id="backup-file"
            type="file"
            accept=".dump"
            onChange={handleFileChange}
            disabled={restoring}
            style={styles.fileInput}
          />
          <p style={styles.fileHint}>
            PostgreSQL .dump file · Maximum size: 100 MB
          </p>
        </div>

        {selectedFile && (
          <div style={styles.selectedFile}>
            <span aria-hidden="true">📄</span>
            <div style={styles.selectedFileDetails}>
              <strong style={styles.selectedFileName}>
                {selectedFile.name}
              </strong>
              <span style={styles.selectedFileSize}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setRestoreMessage("");
                setRestoreError(false);

                const input = document.getElementById(
                  "backup-file",
                ) as HTMLInputElement | null;

                if (input) input.value = "";
              }}
              disabled={restoring}
              style={styles.removeFileButton}
              aria-label="Remove selected backup file"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => void restoreBackup()}
          disabled={!selectedFile || restoring}
          style={{
            ...styles.restoreButton,
            ...(!selectedFile || restoring ? styles.disabledButton : {}),
          }}
        >
          {restoring ? "Restoring test database..." : "↻  Restore test database"}
        </button>

        <Alert
          message={restoreMessage}
          type={restoreError ? "error" : "success"}
        />
      </section>

      <section style={styles.card}>
        <div style={styles.historyHeader}>
          <div>
            <div style={styles.cardTop}>
              <div style={styles.cardIcon}>🧾</div>
              <span style={styles.sectionTag}>ACTIVITY</span>
            </div>
            <h2 style={styles.cardHeading}>Restore history</h2>
            <p style={styles.description}>
              Review recent restore attempts and their recorded results.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchRestoreHistory()}
            disabled={historyLoading}
            style={{
              ...styles.secondaryButton,
              ...(historyLoading ? styles.disabledButton : {}),
            }}
          >
            {historyLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {historyError && (
          <div style={styles.errorPanel} role="alert">
            <p style={styles.errorText}>{historyError}</p>
            <button
              type="button"
              onClick={() => void fetchRestoreHistory()}
              style={styles.retryButton}
            >
              Try again
            </button>
          </div>
        )}

        {historyLoading && history.length === 0 ? (
          <p style={styles.emptyState}>Loading restore history...</p>
        ) : !historyError && history.length === 0 ? (
          <p style={styles.emptyState}>
            No restore attempts have been recorded yet.
          </p>
        ) : history.length > 0 ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date &amp; time</th>
                  <th style={styles.th}>Backup file</th>
                  <th style={styles.th}>Target database</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Message</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td style={styles.fileNameCell}>
                      {item.fileName || "—"}
                    </td>
                    <td style={styles.td}>{item.targetDatabase || "—"}</td>
                    <td style={styles.td}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={styles.messageCell}>
                      {item.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p style={styles.note}>
          The server should return the latest 100 restore attempts.
        </p>
      </section>

      <footer style={styles.footer}>
        <span style={styles.footerMark}>G</span>
        <span>GasFlow</span>
        <span style={styles.footerDivider}>•</span>
        <span>Database management</span>
      </footer>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: "100%",
    maxWidth: "1180px",
    boxSizing: "border-box",
    margin: "0 auto",
    padding: "28px 24px 36px",
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#172033",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "22px",
    padding: "28px 32px 24px",
    marginBottom: "34px",
    color: "#ffffff",
    background: "linear-gradient(125deg, #111827 0%, #312e81 55%, #6d28d9 100%)",
    boxShadow: "0 16px 38px rgba(49, 46, 129, 0.18)",
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  heroIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "46px",
    height: "46px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.13)",
    border: "1px solid rgba(255,255,255,0.18)",
    fontSize: "26px",
  },
  dashboardLink: {
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 700,
    padding: "10px 14px",
    borderRadius: "9px",
    border: "1px solid rgba(255,255,255,0.28)",
    background: "rgba(255,255,255,0.08)",
  },
  heroContent: {
    maxWidth: "690px",
    padding: "28px 0 22px",
  },
  eyebrow: {
    display: "inline-block",
    color: "#c4b5fd",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1.8px",
    marginBottom: "12px",
  },
  heading: {
    margin: 0,
    fontSize: "clamp(27px, 4vw, 36px)",
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: "-0.8px",
  },
  subtitle: {
    color: "#e0e7ff",
    margin: "12px 0 0",
    lineHeight: 1.7,
    fontSize: "15px",
    maxWidth: "560px",
  },
  heroFooter: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "9px",
    paddingTop: "17px",
    borderTop: "1px solid rgba(255,255,255,0.15)",
    color: "#e0e7ff",
    fontSize: "12px",
  },
  heroDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#6ee7b7",
  },
  heroDivider: {
    color: "#a5b4fc",
  },
  sectionIntro: {
    margin: "32px 0 16px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 800,
    letterSpacing: "-0.3px",
  },
  sectionDescription: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
    margin: "6px 0 0",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "17px",
    padding: "26px",
    marginBottom: "22px",
    boxShadow: "0 5px 18px rgba(15, 23, 42, 0.035)",
    minWidth: 0,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "11px",
    marginBottom: "16px",
  },
  cardIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "43px",
    height: "43px",
    borderRadius: "12px",
    background: "#eef2ff",
    fontSize: "21px",
  },
  sectionTag: {
    color: "#4f46e5",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1.3px",
    background: "#eef2ff",
    padding: "6px 9px",
    borderRadius: "6px",
  },
  warningTag: {
    color: "#92400e",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1px",
    background: "#fef3c7",
    padding: "7px 9px",
    borderRadius: "6px",
  },
  cardHeading: {
    margin: "0 0 9px",
    fontSize: "20px",
    fontWeight: 800,
    letterSpacing: "-0.35px",
  },
  description: {
    color: "#64748b",
    lineHeight: 1.7,
    fontSize: "14px",
    margin: "0 0 18px",
  },
  includedPanel: {
    background: "#f8fafc",
    border: "1px solid #e8edf4",
    borderRadius: "12px",
    padding: "18px 20px",
    marginBottom: "22px",
  },
  smallHeading: {
    fontSize: "13px",
    margin: "0 0 9px",
    fontWeight: 800,
    color: "#334155",
  },
  list: {
    color: "#475569",
    lineHeight: 1.95,
    paddingLeft: "20px",
    margin: 0,
    fontSize: "13px",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: "linear-gradient(110deg, #4338ca, #6d28d9)",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "13px 19px",
    fontSize: "14px",
    fontWeight: 750,
    cursor: "pointer",
    boxShadow: "0 5px 12px rgba(79, 70, 229, 0.18)",
  },
  restoreButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: "#b45309",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "13px 19px",
    fontSize: "14px",
    fontWeight: 750,
    cursor: "pointer",
    marginTop: "18px",
  },
  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  alert: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    border: "1px solid",
    borderRadius: "10px",
    padding: "13px 15px",
    marginTop: "16px",
    fontSize: "13px",
    lineHeight: 1.6,
    fontWeight: 600,
    overflowWrap: "anywhere",
  },
  note: {
    margin: "20px 0 0",
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: 1.7,
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  secondaryButton: {
    background: "#eef2ff",
    color: "#4338ca",
    border: "1px solid #c7d2fe",
    borderRadius: "9px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 750,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  errorPanel: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "16px",
  },
  errorText: {
    margin: "0 0 10px",
    fontSize: "13px",
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },
  retryButton: {
    background: "#ffffff",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    borderRadius: "7px",
    padding: "8px 11px",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
  },
  emptyState: {
    color: "#64748b",
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "10px",
    padding: "22px 16px",
    margin: 0,
    fontSize: "13px",
    textAlign: "center",
    lineHeight: 1.7,
  },
  tableWrap: {
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "11px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "12px",
    minWidth: "800px",
  },
  th: {
    background: "#f8fafc",
    color: "#475569",
    fontWeight: 800,
    padding: "14px 15px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 15px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    lineHeight: 1.65,
    color: "#475569",
  },
  fileNameCell: {
    padding: "14px 15px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    lineHeight: 1.65,
    color: "#334155",
    fontWeight: 650,
    overflowWrap: "anywhere",
    minWidth: "160px",
  },
  messageCell: {
    padding: "14px 15px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    lineHeight: 1.65,
    color: "#64748b",
    overflowWrap: "anywhere",
    minWidth: "220px",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.25px",
    whiteSpace: "nowrap",
  },
  warning: {
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa",
    borderRadius: "11px",
    padding: "16px",
    margin: "18px 0 22px",
  },
  warningTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 800,
    fontSize: "13px",
    marginBottom: "8px",
  },
  warningText: {
    fontSize: "12px",
    lineHeight: 1.8,
    margin: "7px 0 0",
  },
  fileLabel: {
    display: "block",
    fontWeight: 750,
    color: "#334155",
    marginBottom: "9px",
    fontSize: "13px",
  },
  filePicker: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "11px",
    padding: "17px",
  },
  fileInput: {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    color: "#475569",
    fontSize: "13px",
  },
  fileHint: {
    color: "#94a3b8",
    fontSize: "11px",
    lineHeight: 1.6,
    margin: "10px 0 0",
  },
  selectedFile: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    borderRadius: "10px",
    padding: "12px",
    marginTop: "14px",
    minWidth: 0,
  },
  selectedFileDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    minWidth: 0,
  },
  selectedFileName: {
    color: "#3730a3",
    fontSize: "12px",
    overflowWrap: "anywhere",
  },
  selectedFileSize: {
    color: "#6366f1",
    fontSize: "11px",
  },
  removeFileButton: {
    width: "30px",
    height: "30px",
    flexShrink: 0,
    borderRadius: "8px",
    border: "1px solid #c7d2fe",
    background: "#ffffff",
    color: "#4338ca",
    fontSize: "20px",
    cursor: "pointer",
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "9px",
    color: "#94a3b8",
    fontSize: "12px",
    padding: "18px 0 0",
  },
  footerMark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "23px",
    height: "23px",
    borderRadius: "7px",
    background: "#4338ca",
    color: "#ffffff",
    fontWeight: 900,
  },
  footerDivider: {
    color: "#cbd5e1",
  },
};

export default Backups;
