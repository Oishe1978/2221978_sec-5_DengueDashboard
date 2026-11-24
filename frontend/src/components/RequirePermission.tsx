import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { can } from "../auth/permissions";
import { useAuth } from "../auth/AuthContext";

interface Props {
  permission: string;
  children: ReactNode;
}

/** Shows the page only to users whose role has the permission; guests go to the login page. */
export default function RequirePermission({ permission, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!can(user, permission)) {
    return (
      <section className="card">
        <h1>Not allowed</h1>
        <p className="muted">Your account does not have permission to open this page.</p>
        <Link to="/">Back to the dashboard</Link>
      </section>
    );
  }
  return <>{children}</>;
}
