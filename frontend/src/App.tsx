import { HashRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireAdmin from "./components/RequireAdmin";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import ReportFormPage from "./pages/ReportFormPage";
import ReportsPage from "./pages/ReportsPage";

function Header() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  return (
    <header className="topbar">
      <span className="brand">🦟 Dengue Dashboard</span>
      <nav>
        {isAdmin && <NavLink to="/reports" end>Manage data</NavLink>}
        {isAdmin && <NavLink to="/reports/new">Add report</NavLink>}
        {user ? (
          <>
            <span className="topbar-user">{user.name} · {user.role}</span>
            <button className="linklike" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<Navigate to="/reports" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reports" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
            <Route path="/reports/new" element={<RequireAdmin><ReportFormPage /></RequireAdmin>} />
            <Route path="/reports/:id" element={<RequireAdmin><ReportDetailPage /></RequireAdmin>} />
            <Route path="/reports/:id/edit" element={<RequireAdmin><ReportFormPage /></RequireAdmin>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </AuthProvider>
    </HashRouter>
  );
}
