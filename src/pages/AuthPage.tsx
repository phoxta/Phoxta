import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { useAuth } from "@/auth/AuthProvider";

type Mode = "login" | "signup" | "forgot" | "reset";

const ARROW = (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M0.21967 9.40717C-0.0732232 9.70006 -0.0732232 10.1749 0.21967 10.4678C0.512563 10.7607 0.987437 10.7607 1.28033 10.4678L0.21967 9.40717ZM10.6875 0.75C10.6875 0.335786 10.3517 2.97145e-09 9.9375 1.50485e-07L3.1875 -2.70983e-07C2.77329 -2.70983e-07 2.4375 0.335786 2.4375 0.75C2.4375 1.16421 2.77329 1.5 3.1875 1.5H9.1875V7.5C9.1875 7.91421 9.52329 8.25 9.9375 8.25C10.3517 8.25 10.6875 7.91421 10.6875 7.5L10.6875 0.75ZM0.75 9.9375L1.28033 10.4678L10.4678 1.28033L9.9375 0.75L9.40717 0.21967L0.21967 9.40717L0.75 9.9375Z"
      fill="currentColor"
    />
  </svg>
);

const HEADINGS: Record<Mode, { title: string; sub: string }> = {
  login: { title: "Welcome back", sub: "Sign in to your Phoxta dashboard." },
  signup: { title: "Create your account", sub: "Start running a business that already works." },
  forgot: { title: "Reset your password", sub: "We'll email you a secure reset link." },
  reset: { title: "Set a new password", sub: "Choose a strong password to finish up." },
};

export default function AuthPage() {
  const { session, configured, signIn, signUp, sendPasswordReset, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const redirectTo = useMemo(() => {
    const r = params.get("redirect");
    return r && r.startsWith("/") ? r : "/dashboard";
  }, [params]);

  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Once a session exists (sign-in, or recovery link), leave the auth screen.
  useEffect(() => {
    if (session && mode !== "reset") navigate(redirectTo, { replace: true });
  }, [session, mode, redirectTo, navigate]);

  const heading = HEADINGS[mode];

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setError("Authentication isn't configured yet. Add your Supabase keys to .env.local.");
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else if (mode === "signup") {
        const { error, needsConfirmation } = await signUp(email, password);
        if (error) setError(error);
        else if (needsConfirmation) setNotice("Check your inbox to confirm your email, then sign in.");
      } else if (mode === "forgot") {
        const { error } = await sendPasswordReset(email);
        if (error) setError(error);
        else setNotice("If that email exists, a reset link is on its way.");
      } else if (mode === "reset") {
        const { error } = await updatePassword(password);
        if (error) setError(error);
        else {
          setNotice("Password updated. Redirecting…");
          setTimeout(() => navigate(redirectTo, { replace: true }), 900);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const showEmail = mode !== "reset";
  const showPasswordField = mode !== "forgot";
  const submitLabel =
    mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password";

  return (
    <>
      <PageMeta title="Phoxta - Sign in" />
      <div className="row g-0" style={{ minHeight: "100vh" }}>
        {/* Brand panel */}
        <div
          className="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white"
          style={{ background: "#0f0f12" }}
        >
          <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none">
            <img width={30} height={30} src="/assets/imgs/template/logo/favicon-dark.svg" alt="Phoxta" loading="lazy" />
            <h6 className="fw-700 fz-24 text-white mb-0">Phoxta</h6>
          </Link>
          <div className="pe-xl-5">
            <h2 className="text-white fw-600 lh-1 mb-3">Own a business that already works.</h2>
            <p className="text-white" style={{ opacity: 0.75, maxWidth: 460 }}>
              Pick a validated, AI-powered business, make it your own, and go from launch to revenue in days — not months.
            </p>
          </div>
          <span className="fz-font-label text-white" style={{ opacity: 0.5 }}>
            © {new Date().getFullYear()} Phoxta Holdings Ltd.
          </span>
        </div>

        {/* Form panel */}
        <div className="col-lg-6 d-flex align-items-center justify-content-center bg-neutral-0">
          <div className="w-100 px-4 py-5" style={{ maxWidth: 440 }}>
            <Link to="/" className="d-inline-flex d-lg-none align-items-center gap-2 text-decoration-none mb-4">
              <img width={28} height={28} src="/assets/imgs/template/logo/favicon.svg" alt="Phoxta" loading="lazy" />
              <h6 className="fw-700 fz-24 mb-0">Phoxta</h6>
            </Link>

            <h3 className="fw-600 mb-1">{heading.title}</h3>
            <p className="neutral-500 mb-4">{heading.sub}</p>

            {error && (
              <div className="alert alert-danger py-2 px-3 fz-font-md" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="alert alert-success py-2 px-3 fz-font-md" role="alert">
                {notice}
              </div>
            )}

            <form onSubmit={onSubmit} noValidate>
              {showEmail && (
                <div className="mb-3">
                  <label className="form-label fz-font-md fw-500" htmlFor="auth-email">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    className="form-control form-control-lg rounded-3"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              )}

              {showPasswordField && (
                <div className="mb-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label fz-font-md fw-500" htmlFor="auth-password">
                      {mode === "reset" ? "New password" : "Password"}
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        className="btn btn-link p-0 fz-font-sm text-decoration-none neutral-500"
                        onClick={() => switchMode("forgot")}
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="position-relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      className="form-control form-control-lg rounded-3"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 neutral-500 text-decoration-none fz-font-sm"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn w-100 py-3 rounded-3 fw-600 text-white border-0 mt-3 d-inline-flex align-items-center justify-content-center gap-2"
                style={{ background: "#0f0f12" }}
                disabled={loading}
              >
                {loading ? "Please wait…" : submitLabel}
                {!loading && ARROW}
              </button>
            </form>

            <div className="pt-4 fz-font-md neutral-500">
              {mode === "login" && (
                <>
                  New to Phoxta?{" "}
                  <button type="button" className="btn btn-link p-0 text-decoration-none fw-600" onClick={() => switchMode("signup")}>
                    Create an account
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <button type="button" className="btn btn-link p-0 text-decoration-none fw-600" onClick={() => switchMode("login")}>
                    Sign in
                  </button>
                </>
              )}
              {(mode === "forgot" || mode === "reset") && (
                <button type="button" className="btn btn-link p-0 text-decoration-none fw-600" onClick={() => switchMode("login")}>
                  ← Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
