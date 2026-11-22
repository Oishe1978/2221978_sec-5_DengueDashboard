import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** Only logged-in admins may see the wrapped page. */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") {
    return (
      <section className="card">
        <h1>Admins only</h1>
        <p className="muted">Your account can view the dashboard but cannot manage data.</p>
        <Link to="/">Back to the dashboard</Link>
      </section>
    );
  }
  return <>{children}</>;
}
