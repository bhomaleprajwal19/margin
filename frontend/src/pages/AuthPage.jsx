import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Field from "../components/Field";

const COPY = {
  login: {
    title: "Sign in",
    cta: "Sign in",
    switchText: "New here?",
    switchLink: { to: "/register", label: "Create an account" },
  },
  register: {
    title: "Create an account",
    cta: "Create account",
    switchText: "Already have an account?",
    switchLink: { to: "/login", label: "Sign in" },
  },
};

export default function AuthPage({ mode }) {
  const { status, notice, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", email: "", first_name: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];

  if (status === "authenticated") return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (mode === "login") await login({ username: form.username, password: form.password });
      else await register(form);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setErrors({ ...err.fields, form: Object.keys(err.fields || {}).length ? "" : err.message });
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-art" aria-hidden>
        <div className="auth-art-inner">
          <div className="wordmark wordmark-lg">
            <span className="wordmark-rule" />
            Margin
          </div>
          <p className="auth-quote">
            Plan the work.
            <br />
            <em>Tick it off.</em>
          </p>
          <ul className="auth-sample">
            <li>
              <span className="check is-checked" />
              <span className="is-struck">Send the invoice to the client</span>
            </li>
            <li>
              <span className="check" />
              Fix the login redirect bug
              <span className="due is-soon">today</span>
            </li>
            <li>
              <span className="check" />
              Write up the API docs
              <span className="due">Fri</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form stack" onSubmit={submit} noValidate>
          <div className="eyebrow">{mode === "login" ? "Welcome back" : "New account"}</div>
          <h1>{copy.title}</h1>
          {notice && mode === "login" && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}

          <Field label="Username" id="a-user" error={errors.username}>
            <input id="a-user" autoComplete="username" value={form.username} onChange={set("username")} required autoFocus />
          </Field>

          {mode === "register" && (
            <>
              <Field label="First name" id="a-first" hint="Optional, used for greetings.">
                <input id="a-first" autoComplete="given-name" value={form.first_name} onChange={set("first_name")} />
              </Field>
              <Field label="Email" id="a-email" error={errors.email}>
                <input id="a-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
              </Field>
            </>
          )}

          <Field
            label="Password"
            id="a-pass"
            error={errors.password}
            hint={mode === "register" ? "At least 8 characters, not too common." : undefined}
          >
            <input
              id="a-pass"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={set("password")}
              required
            />
          </Field>

          {errors.form && <p className="form-error" role="alert">{errors.form}</p>}

          <button className="btn btn-block" disabled={busy}>
            {busy ? "Please wait…" : copy.cta}
          </button>

          <p className="auth-switch">
            {copy.switchText} <Link to={copy.switchLink.to}>{copy.switchLink.label}</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
