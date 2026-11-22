import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const user = await login({ email: email.trim(), password });
      navigate(user.role === "admin" ? "/reports" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card card" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div>
          <h1>Log in</h1>
          <p className="muted">Welcome back. Admins can manage the data.</p>
        </div>
        {error && <p className="alert">{error}</p>}
        <label>
          Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" disabled={saving}>{saving ? "Logging in…" : "Log in"}</button>
        <p className="muted">
          No account yet? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
