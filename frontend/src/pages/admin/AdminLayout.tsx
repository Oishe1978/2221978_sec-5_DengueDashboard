import "../../admin.css";
import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/content", label: "Content" },
  { to: "/admin/activity", label: "Activity log" },
  { to: "/admin/security", label: "Security" },
];

export default function AdminLayout() {
  return (
    <div className="dashboard">
      <div className="page-head"><div><h1>Admin dashboard</h1><p className="muted">Manage users, content and security.</p></div></div>
      <nav className="subnav">
        {TABS.map((t) => <NavLink key={t.to} to={t.to} end={t.end}>{t.label}</NavLink>)}
      </nav>
      <Outlet />
    </div>
  );
}
