
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Boxes,
  Truck,
  ChartNoAxesCombined,
  CheckCircle2,
} from "lucide-react";
import "./Login.css";

type UserRole = "ADMIN" | "STAFF";

type LoginResponse = {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    isActive?: boolean;
  };
};

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data: LoginResponse = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.token ||
        !data.user
      ) {
        setError(data.message || "Login failed. Please try again.");
        return;
      }

      if (!["ADMIN", "STAFF"].includes(data.user.role)) {
        setError(
          "Your account does not have an authorized application role."
        );
        return;
      }

      if (data.user.isActive === false) {
        setError(
          "Your account is inactive. Please contact your administrator."
        );
        return;
      }

      // Save authenticated session
      localStorage.setItem("gasflow_token", data.token);
      localStorage.setItem(
        "gasflow_user",
        JSON.stringify(data.user)
      );

      // Redirect both ADMIN and STAFF to the dashboard
      navigate("/dashboard", { replace: true });
    } catch {
      setError(
        "Unable to connect to the server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="gf-login-page">
      <div className="gf-login-background-glow gf-login-glow-one" />
      <div className="gf-login-background-glow gf-login-glow-two" />

      <div className="gf-login-shell">
        {/* Left promotional panel */}
        <section className="gf-login-showcase">
          <header className="gf-login-brand">
            <div className="gf-login-brand-icon">
              <Flame size={25} strokeWidth={2.3} />
            </div>

            <div>
              <h1>GasFlow</h1>
              <span>AGENCY MANAGEMENT</span>
            </div>
          </header>

          <div className="gf-login-showcase-content">
            <span className="gf-login-eyebrow">
              <span className="gf-login-status-dot" />
              YOUR BUSINESS, IN CONTROL
            </span>

            <h2>
              Run your agency.
              <br />
              <span>Without the chaos.</span>
            </h2>

            <p className="gf-login-showcase-description">
              One organized workspace for customers, cylinder
              inventory, deliveries, payments, and daily operations.
            </p>

            <div className="gf-login-feature-list">
              <div className="gf-login-feature">
                <div className="gf-login-feature-icon gf-icon-blue">
                  <Boxes size={19} />
                </div>

                <div>
                  <strong>Inventory at a glance</strong>
                  <span>
                    Track cylinder stock and availability.
                  </span>
                </div>

                <CheckCircle2
                  className="gf-login-feature-check"
                  size={18}
                />
              </div>

              <div className="gf-login-feature">
                <div className="gf-login-feature-icon gf-icon-violet">
                  <Truck size={19} />
                </div>

                <div>
                  <strong>Smarter daily operations</strong>
                  <span>
                    Keep deliveries and purchases organized.
                  </span>
                </div>

                <CheckCircle2
                  className="gf-login-feature-check"
                  size={18}
                />
              </div>

              <div className="gf-login-feature">
                <div className="gf-login-feature-icon gf-icon-teal">
                  <ChartNoAxesCombined size={19} />
                </div>

                <div>
                  <strong>Clear financial records</strong>
                  <span>
                    Follow payments, balances, and reports.
                  </span>
                </div>

                <CheckCircle2
                  className="gf-login-feature-check"
                  size={18}
                />
              </div>
            </div>

            <div className="gf-login-showcase-note">
              <div className="gf-login-note-icon">
                <ShieldCheck size={19} />
              </div>

              <p>
                <strong>One place. Better control.</strong>
                <span>
                  Built for everyday agency management.
                </span>
              </p>
            </div>
          </div>

          <footer className="gf-login-showcase-footer">
            <span>GASFLOW MANAGEMENT PLATFORM</span>
            <span>© {new Date().getFullYear()} GasFlow</span>
          </footer>
        </section>

        {/* Right login panel */}
        <section className="gf-login-form-panel">
          <div className="gf-login-form-top">
            <div className="gf-login-mobile-brand">
              <div className="gf-login-brand-icon">
                <Flame size={23} />
              </div>
              <strong>GasFlow</strong>
            </div>

            <div className="gf-login-secure-label">
              <ShieldCheck size={16} />
              Secure sign in
            </div>
          </div>

          <div className="gf-login-form-content">
            <div className="gf-login-welcome">
              <span className="gf-login-form-kicker">
                WELCOME BACK
              </span>

              <h2>Sign in to GasFlow</h2>

              <p>
                Enter your credentials to access your agency workspace.
              </p>
            </div>

            <form className="gf-login-form" onSubmit={handleLogin}>
              <div className="gf-login-field">
                <label htmlFor="email">Email address</label>

                <div className="gf-login-input-wrap">
                  <Mail size={18} aria-hidden="true" />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    placeholder="you@youragency.com"
                    autoComplete="username"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="gf-login-field">
                <div className="gf-login-password-label">
                  <label htmlFor="password">Password</label>
                </div>

                <div className="gf-login-input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="gf-login-password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="gf-login-error" role="alert">
                  <span className="gf-login-error-mark">!</span>
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="gf-login-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "Signing you in..."
                    : "Sign in to your account"}
                </span>

                {!loading && <ArrowRight size={19} />}

                {loading && (
                  <span className="gf-login-spinner" />
                )}
              </button>

              <div className="gf-login-security-note">
                <ShieldCheck size={16} />
                <span>Your sign-in is handled securely.</span>
              </div>
            </form>

            <div className="gf-login-divider">
              <span />
              <span>AUTHORIZED ACCESS ONLY</span>
              <span />
            </div>

            <p className="gf-login-help">
              Need access to your agency account?
              <br />
              Contact your agency administrator.
            </p>
          </div>

          <footer className="gf-login-form-footer">
            <span>GasFlow</span>
            <span>Manage your business with confidence.</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
