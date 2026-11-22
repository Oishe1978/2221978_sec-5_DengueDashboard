import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { Role } from "../types";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [adminCode, setAdminCode] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function validate(): string[] {
    const problems: string[] = [];
    if (name.trim().length < 2) problems.push("Enter your name (at least 2 characters).");
    if (!EMAIL_PATTERN.test(email.trim())) problems.push("Enter a valid email address.");
    if (password.length < 8) problems.push("The password must be at least 8 characters.");
    if (password !== confirm) problems.push("The two passwords do not match.");
    if (role === "admin" && !adminCode.trim()) problems.push("Enter the admin code to register as an admin.");
    return problems;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (problems.length > 0) return;

    setSaving(true);
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        admin_code: role === "admin" ? adminCode.trim() : undefined,
      });
      navigate(user.role === "admin" ? "/reports" : "/");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Registration failed"]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card card" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div>
          <h1>Create an account</h1>
          <p className="muted">Admins can add, edit and delete reports. Everyone can view the dashboard.</p>
        </div>
        {errors.length > 0 && (
          <ul className="alert">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        )}
        <label>
          Full name
          <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password (8 or more characters)
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <label>
          Account type
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="user">User (view the dashboard)</option>
            <option value="admin">Admin (manage data)</option>
          </select>
        </label>
        {role === "admin" && (
          <label>
            Admin code
            <input type="password" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} />
          </label>
        )}
        <button className="btn btn-primary" disabled={saving}>{saving ? "Creating account…" : "Register"}</button>
        <p className="muted">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
